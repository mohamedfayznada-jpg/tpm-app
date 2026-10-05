// FACTORY OS — Canonical Authentication Engine V2
import { auth, db } from '../core/firebase-init.js';
import { UI } from '../utils/ui.js';

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;
const REQUESTED_ROLES = Object.freeze(['operator','auditor','engineer']);
const DEFAULT_PERMISSIONS = Object.freeze({
    homeScreen: 'view', tasksScreen: 'none', historyScreen: 'none',
    kaizenScreen: 'view', tagsScreen: 'none', knowledgeScreen: 'none',
    skillMatrixScreen: 'none'
});

function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase();
}
function usernameToEmail(value) {
    const input = normalizeUsername(value);
    return input.includes('@') ? input : input + '@tpm.app';
}
function getLoginButton() {
    return document.querySelector('#loginScreen .auth-primary-btn');
}
function setButtonBusy(button, busy, busyText, fallbackText) {
    if (!button) return;
    if (busy) {
        if (!button.dataset.originalHtml) button.dataset.originalHtml = button.innerHTML;
        button.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i><span>' + busyText + '</span>';
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
    } else {
        button.innerHTML = button.dataset.originalHtml || fallbackText || button.innerHTML;
        button.disabled = false;
        button.removeAttribute('aria-busy');
    }
}
function mapAuthError(error) {
    switch (error?.code) {
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials':
        case 'auth/user-not-found':
        case 'auth/wrong-password': return 'بيانات الدخول غير صحيحة. راجع اسم المستخدم وكلمة المرور.';
        case 'auth/user-disabled': return 'هذا الحساب موقوف. تواصل مع مسؤول النظام.';
        case 'auth/too-many-requests': return 'تم إيقاف المحاولات مؤقتًا بسبب كثرة المحاولات. حاول بعد قليل.';
        case 'auth/network-request-failed': return 'تعذر الاتصال بالخدمة. تحقق من الإنترنت وحاول مرة أخرى.';
        case 'auth/invalid-email': return 'اسم المستخدم غير صالح.';
        default: return 'تعذر إتمام العملية الآن. حاول مرة أخرى.';
    }
}

export const Auth = {
    async login() {
        const usernameEl = document.getElementById('loginUsername');
        const passwordEl = document.getElementById('loginPassword');
        if (!usernameEl || !passwordEl) return UI.showToast('⚠️ واجهة تسجيل الدخول غير جاهزة. حدّث الصفحة.');
        const usernameInput = normalizeUsername(usernameEl.value);
        const passwordInput = passwordEl.value; // Do not trim passwords.
        if (!usernameInput || !passwordInput) return UI.showToast('⚠️ اكتب اسم المستخدم وكلمة المرور.');
        if (!usernameInput.includes('@') && !USERNAME_RE.test(usernameInput)) return UI.showToast('⚠️ اسم المستخدم يجب أن يكون من 3 إلى 32 حرفًا/رقمًا.');
        if (usernameInput.includes('@') && !/^\S+@\S+\.\S+$/.test(usernameInput)) return UI.showToast('⚠️ البريد الإلكتروني غير صالح.');

        const button = getLoginButton();
        setButtonBusy(button, true, 'جاري التحقق من الهوية...', 'دخول آمن');
        try {
            const remember = !!document.getElementById('rememberMe')?.checked;
            await auth.setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
            await auth.signInWithEmailAndPassword(usernameToEmail(usernameInput), passwordInput);
            if (remember) localStorage.setItem('tpm_saved_username', usernameInput.split('@')[0]);
            else localStorage.removeItem('tpm_saved_username');
            localStorage.removeItem('tpm_saved_pass');
            // app.js owns the authoritative post-login profile/status gate.
        } catch (error) {
            console.error('[Auth] login failed:', error?.code || error);
            UI.showToast('❌ ' + mapAuthError(error));
            setButtonBusy(button, false, '', 'دخول آمن');
        }
    },

    async signup() {
        const fullName = document.getElementById('signupFullName')?.value.trim();
        const username = normalizeUsername(document.getElementById('signupUsername')?.value);
        const password = document.getElementById('signupPassword')?.value || '';
        const confirmPassword = document.getElementById('signupConfirmPassword')?.value || '';
        const requestedRole = document.getElementById('signupRole')?.value;
        if (!fullName || !username || !password || !confirmPassword) return UI.showToast('⚠️ أكمل جميع البيانات المطلوبة.');
        if (fullName.length < 2 || fullName.length > 80) return UI.showToast('⚠️ الاسم الكامل غير صالح.');
        if (!USERNAME_RE.test(username)) return UI.showToast('⚠️ اسم المستخدم: 3–32 حرفًا/رقمًا، بدون مسافات.');
        if (password.length < 8) return UI.showToast('⚠️ كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
        if (password !== confirmPassword) return UI.showToast('⚠️ تأكيد كلمة المرور غير مطابق.');
        if (!REQUESTED_ROLES.includes(requestedRole)) return UI.showToast('⚠️ اختر دورًا صالحًا.');

        const button = document.querySelector('#signupScreen .signup-submit-btn, #signupScreen .auth-primary-btn');
        setButtonBusy(button, true, 'جاري إنشاء الحساب...', 'إرسال طلب الانضمام');
        let credential = null;
        try {
            const email = usernameToEmail(username);
            credential = await auth.createUserWithEmailAndPassword(email, password);
            const now = firebase.database.ServerValue.TIMESTAMP;
            const newUser = {
                schemaVersion: 2,
                uid: credential.user.uid,
                name: UI.sanitizeInput(fullName),
                username,
                requestedRole,
                role: 'viewer',
                status: 'pending',
                permissions: { ...DEFAULT_PERMISSIONS },
                createdAt: now,
                updatedAt: now,
                lastLoginAt: null
            };
            await db.ref('tpm_system/users/' + credential.user.uid).set(newUser);
            await auth.signOut();
            document.getElementById('signupFullName').value = '';
            document.getElementById('signupUsername').value = '';
            document.getElementById('signupPassword').value = '';
            document.getElementById('signupConfirmPassword').value = '';
            UI.showToast('✅ تم إنشاء طلبك بنجاح. سيظهر للمسؤول لاعتماد الدور والصلاحيات.');
            UI.showScreen('loginScreen');
        } catch (error) {
            console.error('[Auth] signup failed:', error?.code || error);
            // Prevent orphan Auth accounts when profile creation fails.
            if (credential?.user && auth.currentUser?.uid === credential.user.uid && error?.code !== 'auth/email-already-in-use') {
                try { await credential.user.delete(); } catch (cleanupError) { console.warn('[Auth] orphan cleanup failed:', cleanupError); }
            }
            let message = mapAuthError(error);
            if (error?.code === 'auth/email-already-in-use') message = 'اسم المستخدم هذا مستخدم بالفعل.';
            if (error?.code === 'auth/weak-password') message = 'كلمة المرور ضعيفة.';
            UI.showToast('❌ ' + message);
        } finally {
            setButtonBusy(button, false, '', 'إرسال طلب الانضمام');
        }
    },

    async logout() {
        try { await auth.signOut(); } finally { sessionStorage.clear(); }
    },

    biometricLogin() {
        const savedUser = localStorage.getItem('tpm_saved_username');
        if (!savedUser) return UI.showToast('⚠️ لا يوجد حساب محفوظ. سجّل الدخول مرة واحدة مع تفعيل «تذكر بياناتي».');
        const userField = document.getElementById('loginUsername');
        const passField = document.getElementById('loginPassword');
        if (userField) userField.value = savedUser;
        if (passField) { passField.focus(); passField.select?.(); }
        UI.showToast('⚡ تم تجهيز الحساب المحفوظ. أدخل كلمة المرور لإكمال الدخول.');
    },

    init() {
        const saved = localStorage.getItem('tpm_saved_username');
        const userField = document.getElementById('loginUsername');
        if (saved && userField && !userField.value) userField.value = saved;
        const submitOnEnter = (event) => { if (event.key === 'Enter') { event.preventDefault(); this.login(); } };
        document.getElementById('loginUsername')?.addEventListener('keydown', submitOnEnter);
        document.getElementById('loginPassword')?.addEventListener('keydown', submitOnEnter);
        document.getElementById('signupConfirmPassword')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); this.signup(); } });
    }
};

window.toggleLoginPassword = function() {
    const input = document.getElementById('loginPassword');
    const button = document.querySelector('#loginScreen .auth-eye');
    if (!input) return;
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    if (button) {
        button.setAttribute('aria-label', visible ? 'إظهار كلمة المرور' : 'إخفاء كلمة المرور');
        const icon = button.querySelector('i');
        if (icon) icon.className = visible ? 'bx bx-show' : 'bx bx-hide';
    }
};
window.toggleSignupPassword = function(id = 'signupPassword') {
    const input = document.getElementById(id);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Auth.init(), { once: true });
else Auth.init();
