// مسار الملف: js/main.js
import { ENV } from './config/env.js';
import { db, auth } from './core/firebase-init.js';
import { UI } from './utils/ui.js';
import { Auth } from './auth/auth.js';
import { Services } from './core/services.js';
import { Scanner } from './modules/scanner.js';
import { Settings } from './modules/settings.js';

console.log(`🚀 FACTORY OS - V${ENV.APP_VERSION} ARCHITECTURE LOADED`);

// ربط دوال الإعدادات والملف الشخصي.
window.renderProfileAndSettings = () => Settings.renderProfileAndSettings();
window.switchSettingsTab = (id, button) => Settings.switchSettingsTab(id, button);
window.openMyFullProfile = () => Settings.openMyFullProfile();
window.updateProfilePic = (event) => Settings.updateProfilePic(event);
window.saveApiKeys = () => Settings.saveApiKeys();
window.enableApiKeysEdit = () => Settings.enableApiKeysEdit();

// ربط دوال الواجهة.
window.showScreen = (id) => UI.showScreen(id);
window.goBack = () => UI.goBack();
window.showToast = (message) => UI.showToast(message);
window.toggleSidebar = () => UI.toggleSidebar();
window.toggleDarkMode = () => UI.toggleDarkMode();
window.sanitizeInput = (value) => UI.sanitizeInput(value);
window.uniqueNumericId = () => UI.uniqueNumericId();

// ربط دوال المصادقة.
window.login = () => Auth.login();
window.signup = () => Auth.signup();
window.logout = () => Auth.logout();
window.biometricLogin = () => Auth.biometricLogin();

// ربط محرك الباركود.
window.scanBarcodeFromImage = (event) => Scanner.scanBarcodeFromImage(event);
window.forceAcceptBarcode = (text) => Scanner.forceAcceptBarcode(text);

// ربط دوال الخدمات (قاعدة البيانات والواجهة البرمجية).
window.syncRecord = (path, data) => Services.syncRecord(path, data);
window.deleteRecord = (path) => Services.deleteRecord(path);
window.logAction = (action) => Services.logAction(action, window.currentUser?.name);
window.uploadImageToStorage = (file, options = {}) => Services.uploadImageToStorage(file, options);
window.processAndEnhanceImage = (file, callback) => Services.processAndEnhanceImage(file, callback);
window.fetchGeminiAPI = (prompt, base64) => Services.fetchGeminiAPI(prompt, base64);

// تطبيق الثيم المحفوظ.
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('tpm_theme') === 'light') {
        document.body.classList.add('light-theme');
    }
});
