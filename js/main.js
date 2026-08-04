// مسار الملف: js/main.js
import { ENV } from './config/env.js';
import { db, auth } from './core/firebase-init.js';
import { UI } from './utils/ui.js';
import { Auth } from './auth/auth.js';
import { Services } from './core/services.js'; // ⬅️ الإضافة الجديدة
import { Scanner } from './modules/scanner.js';
console.log(`🚀 FACTORY OS - V${ENV.APP_VERSION} ARCHITECTURE LOADED`);

// 🌐 ربط دوال الواجهة
window.showScreen = (id) => UI.showScreen(id);
window.goBack = () => UI.goBack();
window.showToast = (msg) => UI.showToast(msg);
window.toggleSidebar = () => UI.toggleSidebar();
window.toggleDarkMode = () => UI.toggleDarkMode();
window.sanitizeInput = (val) => UI.sanitizeInput(val);
window.uniqueNumericId = () => UI.uniqueNumericId();

// 🌐 ربط دوال المصادقة
window.login = () => Auth.login();
window.signup = () => Auth.signup();
window.logout = () => Auth.logout();
window.biometricLogin = () => Auth.biometricLogin();
// 🌐 ربط محرك الباركود
window.scanBarcodeFromImage = (e) => Scanner.scanBarcodeFromImage(e);
window.forceAcceptBarcode = (text) => Scanner.forceAcceptBarcode(text);
// 🌐 ربط دوال الخدمات (قاعدة البيانات والـ API)
window.syncRecord = (path, data) => Services.syncRecord(path, data);
window.deleteRecord = (path) => Services.deleteRecord(path);
window.logAction = (act) => Services.logAction(act, window.currentUser?.name);
window.uploadImageToStorage = (file) => Services.uploadImageToStorage(file);
window.processAndEnhanceImage = (file, callback) => Services.processAndEnhanceImage(file, callback);
window.fetchGeminiAPI = (prompt, base64) => Services.fetchGeminiAPI(prompt, base64);

// تطبيق الثيم المحفوظ
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('tpm_theme') === 'light') {
        document.body.classList.add('light-theme');
    }
});
