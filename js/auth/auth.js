// مسار الملف: js/auth/auth.js
import { auth, db } from '../core/firebase-init.js';
import { UI } from '../utils/ui.js';

export const Auth = {
    async login() {
        const username = UI.sanitizeInput(document.getElementById('loginUsername').value).toLowerCase();
        const password = document.getElementById('loginPassword').value.trim();
        
        if (!username || !password) return UI.showToast('برجاء كتابة اسم المستخدم وكلمة المرور');
        document.getElementById('cloudStatus').innerHTML = "جاري الدخول...";
        
        if (document.getElementById('rememberMe') && document.getElementById('rememberMe').checked) { 
            localStorage.setItem('tpm_username', username); 
        }
        
        try { 
            await auth.signInWithEmailAndPassword(username + "@tpm.app", password); 
        } catch (e) { 
            UI.showToast('بيانات الدخول غير صحيحة'); 
            document.getElementById('cloudStatus').innerHTML = "غير متصل";
        }
    },

    async signup() {
        const fullName = UI.sanitizeInput(document.getElementById('signupFullName').value);
        const user = UI.sanitizeInput(document.getElementById('signupUsername').value).toLowerCase().trim();
        const pass = document.getElementById('signupPassword').value.trim();
        const requestedRole = document.getElementById('signupRole').value;

        if (!user || !pass || !fullName) return UI.showToast("برجاء إكمال كافة البيانات");

        try {
            UI.showToast("جاري إرسال طلب الانضمام...");
            const res = await auth.createUserWithEmailAndPassword(user + "@tpm.app", pass);
            
            const newUserObj = {
                name: fullName,
                username: user,
                requestedRole: requestedRole,
                role: 'viewer', 
                status: 'pending', 
                permissions: {
                    homeScreen: 'view', tasksScreen: 'none', historyScreen: 'none',
                    kaizenScreen: 'view', tagsScreen: 'none', knowledgeScreen: 'none'
                }
            };

            await db.ref('tpm_system/users/' + res.user.uid).set(newUserObj);
            
            UI.showToast("تم إرسال طلبك للمدير mfayez بنجاح! يرجى انتظار الموافقة.");
            setTimeout(() => auth.signOut().then(() => window.location.reload()), 2000);
        } catch (e) {
            UI.showToast("خطأ: اسم المستخدم محجوز أو البيانات غير صحيحة");
        }
    },

    logout() {
        auth.signOut().then(() => { 
            localStorage.clear(); 
            window.location.reload(); 
        });
    },

    biometricLogin() {
        const u = localStorage.getItem('tpm_username');
        if (!u) return UI.showToast('سجل دخولك يدوياً أول مرة لتفعيل الدخول السريع'); 
        document.getElementById('loginUsername').value = u;
        UI.showToast('تم استدعاء بياناتك، أدخل كلمة المرور فقط');
    }
};
