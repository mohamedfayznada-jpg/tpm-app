// مسار الملف: js/main.js
import { ENV } from './config/env.js';
import { db, auth } from './core/firebase-init.js';
import { UI } from './utils/ui.js';
import { Auth } from './auth/auth.js';
import { Services } from './core/services.js';
import { Scanner } from './modules/scanner.js';
import { Settings } from './modules/settings.js';
import { TPM_DOMAIN, getTPMPillar } from './core/tpm-domain.js';
import { normalizeRole, roleLabel, canAccessRole } from './core/role-policy.js';

console.log(`🚀 FACTORY OS - V${ENV.APP_VERSION} ENTERPRISE CORE`);

window.auth = auth;
window.db = db;
window.TPM_DOMAIN = TPM_DOMAIN;
window.getTPMPillar = getTPMPillar;
window.normalizeTPMRole = normalizeRole;
window.getTPMRoleLabel = roleLabel;

const loadEnterpriseTheme = () => {
    if (document.getElementById('enterprise-v26-theme')) return;
    const link = document.createElement('link');
    link.id = 'enterprise-v26-theme';
    link.rel = 'stylesheet';
    link.href = './css/enterprise-v26.css?v=27';
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

// Canonical RBAC — legacy "operator" records are intentionally mapped to "technician".
window.TPMAccess = {
    role() {
        return normalizeRole(window.currentUser?.role);
    },
    label() {
        return roleLabel(this.role());
    },
    canAccess(screenId) {
        if (['loginScreen', 'signupScreen'].includes(screenId)) return true;
        if (!window.auth?.currentUser) return false;
        return canAccessRole(this.role(), screenId);
    },
    require(...roles) {
        const allowed = roles.map(normalizeRole);
        if (allowed.includes(this.role())) return true;
        this.deny();
        return false;
    },
    deny() {
        UI.showToast('🔒 لا تملك صلاحية الوصول إلى هذه المساحة.');
        return false;
    }
};

// Patch the legacy helper as well so old modules use the same role vocabulary.
window.hasRole = (...allowed) => {
    const current = normalizeRole(window.currentUser?.role);
    return allowed.map(normalizeRole).includes(current);
};

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
    window.showToast = (message) => UI.showToast(message);
});

// Keep the session object canonical without changing legacy database records in-place.
const canonicalizeSessionRole = () => {
    if (!window.currentUser) return;
    const canonical = normalizeRole(window.currentUser.role);
    if (window.currentUser.role !== canonical) window.currentUser.role = canonical;
    window.currentUser.roleLabel = roleLabel(canonical);
    document.querySelectorAll('[data-current-role]').forEach(el => { el.textContent = roleLabel(canonical); });
};

window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('tpm_theme') === 'light') document.body.classList.add('light-theme');
    canonicalizeSessionRole();
    setTimeout(canonicalizeSessionRole, 500);
    setTimeout(canonicalizeSessionRole, 1500);
});

auth.onAuthStateChanged(() => {
    setTimeout(canonicalizeSessionRole, 0);
    setTimeout(canonicalizeSessionRole, 300);
});
