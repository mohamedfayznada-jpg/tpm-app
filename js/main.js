// مسار الملف: js/main.js
import { ENV } from './config/env.js';
import { db, auth } from './core/firebase-init.js';
import { UI } from './utils/ui.js';
import { Auth } from './auth/auth.js';
import { Services } from './core/services.js';
import { Scanner } from './modules/scanner.js';
import { Settings } from './modules/settings.js';
import { mountEnterpriseOperations } from './modules/enterprise-operations.js';
import { mountAutonomousMaintenance } from './modules/autonomous-maintenance.js';
import { TPM_DOMAIN, getTPMPillar } from './core/tpm-domain.js';
import { normalizeRole, roleLabel, canAccessRole } from './core/role-policy.js';

console.log(`🚀 FACTORY OS - V${ENV.APP_VERSION} ENTERPRISE CORE`);
window.auth=auth; window.db=db; window.TPM_DOMAIN=TPM_DOMAIN; window.getTPMPillar=getTPMPillar;
window.normalizeTPMRole=normalizeRole; window.getTPMRoleLabel=roleLabel;
const loadStylesheet=(id,href)=>{if(document.getElementById(id))return;const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=href;document.head.appendChild(link)};
loadStylesheet('enterprise-v26-theme','./css/enterprise-v26.css?v=29');
loadStylesheet('mobile-v27-theme','./css/mobile-v27.css?v=29');
loadStylesheet('autonomous-maintenance-theme','./css/autonomous-maintenance.css?v=1');
window.renderProfileAndSettings=()=>Settings.renderProfileAndSettings();window.switchSettingsTab=(id,button)=>Settings.switchSettingsTab(id,button);window.openMyFullProfile=()=>Settings.openMyFullProfile();window.updateProfilePic=e=>Settings.updateProfilePic(e);window.saveApiKeys=()=>Settings.saveApiKeys();window.enableApiKeysEdit=()=>Settings.enableApiKeysEdit();
window.showScreen=id=>UI.showScreen(id);window.goBack=()=>UI.goBack();window.showToast=m=>UI.showToast(m);window.toggleSidebar=()=>UI.toggleSidebar();window.toggleDarkMode=()=>UI.toggleDarkMode();window.sanitizeInput=v=>UI.sanitizeInput(v);window.uniqueNumericId=()=>UI.uniqueNumericId();
window.login=()=>Auth.login();window.signup=()=>Auth.signup();window.logout=()=>Auth.logout();window.biometricLogin=()=>Auth.biometricLogin();window.scanBarcodeFromImage=e=>Scanner.scanBarcodeFromImage(e);window.forceAcceptBarcode=t=>Scanner.forceAcceptBarcode(t);
window.syncRecord=(p,d)=>Services.syncRecord(p,d);window.deleteRecord=p=>Services.deleteRecord(p);window.logAction=a=>Services.logAction(a,window.currentUser?.name);window.uploadImageToStorage=(f,o={})=>Services.uploadImageToStorage(f,o);window.processAndEnhanceImage=(f,c)=>Services.processAndEnhanceImage(f,c);window.fetchGeminiAPI=(p,b)=>Services.fetchGeminiAPI(p,b);
window.TPMAccess={role(){return normalizeRole(window.currentUser?.role)},label(){return roleLabel(this.role())},canAccess(id){if(['loginScreen','signupScreen','amMapsScreen'].includes(id))return true;if(!window.auth?.currentUser)return false;return canAccessRole(this.role(),id)},require(...roles){const ok=roles.map(normalizeRole).includes(this.role());if(!ok)this.deny();return ok},deny(){UI.showToast('🔒 لا تملك صلاحية الوصول إلى هذه المساحة.');return false}};
window.hasRole=(...allowed)=>allowed.map(normalizeRole).includes(normalizeRole(window.currentUser?.role));
window.addEventListener('load',()=>{const legacy=window.showScreen;if(typeof legacy==='function'&&!legacy.__tpmGuarded){const guarded=id=>{if(!window.TPMAccess.canAccess(id))return window.TPMAccess.deny();return legacy(id)};guarded.__tpmGuarded=true;window.showScreen=guarded}window.showToast=m=>UI.showToast(m);mountEnterpriseOperations();mountAutonomousMaintenance();});
const canonicalizeSessionRole=()=>{if(!window.currentUser)return;const canonical=normalizeRole(window.currentUser.role);if(window.currentUser.role!==canonical)window.currentUser.role=canonical;window.currentUser.roleLabel=roleLabel(canonical);document.querySelectorAll('[data-current-role]').forEach(el=>el.textContent=roleLabel(canonical))};
window.addEventListener('DOMContentLoaded',()=>{if(localStorage.getItem('tpm_theme')==='light')document.body.classList.add('light-theme');canonicalizeSessionRole();setTimeout(canonicalizeSessionRole,500);setTimeout(canonicalizeSessionRole,1500)});auth.onAuthStateChanged(()=>{setTimeout(canonicalizeSessionRole,0);setTimeout(canonicalizeSessionRole,300)});
