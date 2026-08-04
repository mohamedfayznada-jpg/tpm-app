// مسار الملف: js/main.js
import { ENV } from './config/env.js';
import { db, auth } from './core/firebase-init.js';
import { UI } from './utils/ui.js';
import { Auth } from './auth/auth.js';

console.log(`🚀 FACTORY OS - V${ENV.APP_VERSION} ARCHITECTURE LOADED`);

// 🌐 ربط الدوال بكائن Window عشان ملف index.html يقدر يشوفها (مرحلة انتقالية)
window.showScreen = (id) => UI.showScreen(id);
window.goBack = () => UI.goBack();
window.showToast = (msg) => UI.showToast(msg);
window.toggleSidebar = () => UI.toggleSidebar();
window.toggleDarkMode = () => UI.toggleDarkMode();
window.sanitizeInput = (val) => UI.sanitizeInput(val);
window.uniqueNumericId = () => UI.uniqueNumericId();

window.login = () => Auth.login();
window.signup = () => Auth.signup();
window.logout = () => Auth.logout();
window.biometricLogin = () => Auth.biometricLogin();

// تطبيق الثيم المحفوظ
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('tpm_theme') === 'light') {
        document.body.classList.add('light-theme');
    }
});
