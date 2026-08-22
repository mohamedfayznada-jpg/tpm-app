// مسار الملف: js/main.js
import { ENV } from './config/env.js';
import { db, auth } from './core/firebase-init.js';
import { UI } from './utils/ui.js';
import { Auth } from './auth/auth.js';
import { Services } from './core/services.js';
import { Scanner } from './modules/scanner.js';
import { Settings } from './modules/settings.js';

console.log(`🚀 FACTORY OS - V${ENV.APP_VERSION} ARCHITECTURE LOADED`);

const loadEnterpriseTheme = () => {
    if (document.getElementById('enterprise-v26-theme')) return;
    const link = document.createElement('link');
    link.id = 'enterprise-v26-theme';
    link.rel = 'stylesheet';
    link.href = './css/enterprise-v26.css?v=26';
    document.head.appendChild(link);
};
loadEnterpriseTheme();

window.renderProfileAndSettings = () => Settings.renderProfileAndSettings();
window.switchSettingsTab = (id, button) => Settings.switchSettingsTab(id, button);
window.openMyFullProfile = () => Settings.openMyFullProfile();
window.updateProfilePic = (event) => Settings.updateProfilePic(event);
window.saveApiKeys = () => Settings.saveApiKeys();
window.enableApiKeysEdit = () => Settings.enableApiKeysEdit();

window.showScreen = (id) => UI.showScreen(id);
window.goBack = () => UI.goBack();
window.showToast = (message) => UI.showToast(message);
window.toggleSidebar = () => UI.toggleSidebar();
window.toggleDarkMode = () => UI.toggleDarkMode();
window.sanitizeInput = (value) => UI.sanitizeInput(value);
window.uniqueNumericId = () => UI.uniqueNumericId();

window.login = () => Auth.login();
window.signup = () => Auth.signup();
window.logout = () => Auth.logout();
window.biometricLogin = () => Auth.biometricLogin();

window.scanBarcodeFromImage = (event) => Scanner.scanBarcodeFromImage(event);
window.forceAcceptBarcode = (text) => Scanner.forceAcceptBarcode(text);

window.syncRecord = (path, data) => Services.syncRecord(path, data);
window.deleteRecord = (path) => Services.deleteRecord(path);
window.logAction = (action) => Services.logAction(action, window.currentUser?.name);
window.uploadImageToStorage = (file, options = {}) => Services.uploadImageToStorage(file, options);
window.processAndEnhanceImage = (file, callback) => Services.processAndEnhanceImage(file, callback);
window.fetchGeminiAPI = (prompt, base64) => Services.fetchGeminiAPI(prompt, base64);

// Central UI authorization. Database rules remain the real security boundary.
window.TPMAccess = {
    role() { return window.currentUser?.role || 'viewer'; },
    canAccess(screenId) {
        const role = this.role();
        if (!window.auth || !window.auth.currentUser) {
            return ['loginScreen', 'signupScreen'].includes(screenId);
        }
        if (role === 'admin' || role === 'engineer') return true;

        const technicianScreens = new Set([
            'homeScreen', 'settingsScreen', 'tasksScreen', 'tagsScreen', 'fiveSScreen',
            'jhPortalScreen', 'jhDocumentScreen', 'clitChecklistScreen', 'tpmTeamsScreen',
            'kaizenScreen', 'kkScreen', 'pmScreen', 'etScreen', 'hseScreen'
        ]);
        const auditorScreens = new Set([
            'homeScreen', 'settingsScreen', 'historyScreen', 'jhPortalScreen', 'jhDocumentScreen',
            'jhKPIsScreen', 'tpmTeamsScreen', 'kaizenScreen', 'kkScreen'
        ]);

        if (role === 'technician') return technicianScreens.has(screenId);
        if (role === 'auditor') return auditorScreens.has(screenId);
        return ['homeScreen', 'settingsScreen'].includes(screenId);
    },
    deny(screenId) {
        UI.showToast(`🔒 لا تملك صلاحية الوصول إلى هذه المساحة.`);
        return false;
    }
};

// app.js is the legacy master controller and defines window.showScreen later.
// Wrap it after all deferred scripts have loaded so every navigation entry point is guarded.
window.addEventListener('load', () => {
    const legacyShowScreen = window.showScreen;
    if (typeof legacyShowScreen === 'function' && !legacyShowScreen.__tpmGuarded) {
        const guardedShowScreen = (screenId) => {
            if (!window.TPMAccess.canAccess(screenId)) return window.TPMAccess.deny(screenId);
            return legacyShowScreen(screenId);
        };
        guardedShowScreen.__tpmGuarded = true;
        window.showScreen = guardedShowScreen;
    }

    const originalToast = window.showToast;
    if (typeof originalToast === 'function' && originalToast !== UI.showToast) {
        window.showToast = (message) => UI.showToast(message);
    }
});

window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('tpm_theme') === 'light') {
        document.body.classList.add('light-theme');
    }
});
