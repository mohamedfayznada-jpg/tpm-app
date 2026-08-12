// مسار الملف: js/auth/auth.js
import { auth, db } from '../core/firebase-init.js';
import { UI } from '../utils/ui.js';

export const Auth = {
    // ==========================================
    // 🔐 محرك تسجيل الدخول (Login Engine)
    // ==========================================
    async login() {
        const usernameInput = document.getElementById('loginUsername').value.trim();
        const passwordInput = document.getElementById('loginPassword').value.trim();
        
        // 1. الفحص الوقائي (Validation)
        if (!usernameInput || !passwordInput) return UI.showToast('⚠️ برجاء كتابة اسم المستخدم وكلمة المرور');

        // 2. هندسة البريد الإلكتروني الافتراضي
        const email = usernameInput.includes('@') ? usernameInput : `${usernameInput.toLowerCase().replace(/\s+/g, '')}@tpm.app`;

        // 3. تأمين الواجهة أثناء التحميل (Prevent Double Clicks)
        const btn = document.querySelector('#loginScreen .btn-primary');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> جاري المصادقة...';
        btn.disabled = true;
        
        try {
            const persistence = document.getElementById('rememberMe')?.checked
                ? firebase.auth.Auth.Persistence.LOCAL
                : firebase.auth.Auth.Persistence.SESSION;

            await auth.setPersistence(persistence);
            // 4. إرسال الطلب لخوادم جوجل
            await auth.signInWithEmailAndPassword(email, passwordInput); 
            
            // 5. نظام الذاكرة (Remember Me)
            const rememberMe = document.getElementById('rememberMe')?.checked;
            if (rememberMe) {
                localStorage.setItem('tpm_saved_username', usernameInput);
            } else {
                localStorage.removeItem('tpm_saved_username');
            }

            // بمجرد النجاح، سيقوم الـ app.js باكتشاف التغيير وفتح الشاشة تلقائياً
            
        } catch (error) { 
            console.error("Login Error:", error.code);
            UI.showToast('❌ بيانات الدخول غير صحيحة أو الحساب غير موجود'); 
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    // ==========================================
    // 📝 محرك إنشاء الحساب (Signup Engine)
    // ==========================================
    async signup() {
        const fullName = document.getElementById('signupFullName').value.trim();
        const username = document.getElementById('signupUsername').value.trim().toLowerCase().replace(/\s+/g, '');
        const password = document.getElementById('signupPassword').value.trim();
        const requestedRole = document.getElementById('signupRole').value;

        // 1. الفحص الصارم للبيانات (يمنع خطأ 400 Bad Request)
        if (!fullName || !username || !password) return UI.showToast("⚠️ برجاء إكمال كافة البيانات");
        if (username.length < 3) return UI.showToast("⚠️ اسم المستخدم قصير جداً (3 أحرف على الأقل)");
        if (password.length < 6) return UI.showToast("⚠️ كلمة المرور ضعيفة! يجب أن تكون 6 أحرف أو أكثر");

        // 2. تأمين الواجهة
        const btn = document.querySelector('#signupScreen .btn-success');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> جاري تشفير الحساب...';
        btn.disabled = true;

        try {
            const email = `${username}@tpm.app`;
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // 3. إنشاء هيكل بيانات المستخدم في الـ Database
            const newUserObj = {
                name: UI.sanitizeInput(fullName),
                username: username,
                requestedRole: requestedRole,
                role: 'viewer', // 🛡️ الرتبة الافتراضية حماية للنظام
                status: 'pending', // 🛡️ معلق حتى يوافق المدير
                permissions: {
                    homeScreen: 'view', tasksScreen: 'none', historyScreen: 'none',
                    kaizenScreen: 'view', tagsScreen: 'none', knowledgeScreen: 'none'
                },
                createdAt: new Date().toISOString()
            };

            await db.ref('tpm_system/users/' + userCredential.user.uid).set(newUserObj);
            
            UI.showToast("✅ تم إرسال طلبك للمدير بنجاح! يرجى انتظار الموافقة.");
            
            // 4. تسجيل الخروج فوراً لكي لا يدخل النظام بصلاحيات معلقة
            await auth.signOut();
            setTimeout(() => {
                UI.showScreen('loginScreen');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 2000);

        } catch (error) {
            let errorMsg = "حدث خطأ أثناء الاتصال بالسيرفر";
            if (error.code === 'auth/email-already-in-use') errorMsg = "اسم المستخدم هذا محجوز وموجود بالفعل!";
            if (error.code === 'auth/invalid-email') errorMsg = "صيغة اسم المستخدم غير صحيحة";
            
            UI.showToast("❌ " + errorMsg);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    // ==========================================
    // 🚪 محرك تسجيل الخروج
    // ==========================================
    logout() {
        auth.signOut().then(() => { 
            // لا نمسح الـ localStorage لكي يعمل الدخول السريع في المرة القادمة
            sessionStorage.clear();
            window.location.reload(); 
        });
    },

    // ==========================================
    // ⚡ محرك الدخول السريع (Biometric / Quick Login Fallback)
    // ==========================================
    biometricLogin() {
        const savedUser = localStorage.getItem('tpm_saved_username');
        
        if (!savedUser) {
            return UI.showToast('⚠️ لا يوجد حساب محفوظ بالجهاز. سجل دخولك يدوياً وفعل "تذكر بياناتي" أولاً.'); 
        }
        
        // جلب البيانات وتركيز المؤشر على حقل الباسورد
        const userField = document.getElementById('loginUsername');
        const passField = document.getElementById('loginPassword');
        
        userField.value = savedUser;
        passField.focus();

        // مستقبلاً: هنا سيتم ربط الـ Web Authentication API (FaceID/TouchID)
        UI.showToast('🔐 تم استدعاء هويتك. أدخل كلمة المرور للتأكيد.');
    }
};
