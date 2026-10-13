// مسار الملف: js/main.js
import { ENV } from './config/env.js';
import { db, auth } from './core/firebase-init.js';
import { UI } from './utils/ui.js?v=20260927-tpm-route-fix1';
import { Auth } from './auth/auth.js';
import { Services } from './core/services.js';
import { Scanner } from './modules/scanner.js';
import { Settings } from './modules/settings.js';
import { mountEnterpriseOperations } from './modules/enterprise-operations.js';
import { mountFactoryOSGlobal } from './modules/factory-os-global-v30.js';
import { TPM_DOMAIN, getTPMPillar } from './core/tpm-domain.js';
import { normalizeRole, roleLabel, canAccessRole } from './core/role-policy.js';
console.log(`🚀 TPM OS - V${ENV.APP_VERSION} ENTERPRISE CORE`);
window.auth=auth;window.db=db;window.TPM_DOMAIN=TPM_DOMAIN;window.getTPMPillar=getTPMPillar;window.normalizeTPMRole=normalizeRole;window.getTPMRoleLabel=roleLabel;
const loadStylesheet=(id,href)=>{if(document.getElementById(id))return;const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=href;document.head.appendChild(link)};
loadStylesheet('enterprise-v26-theme','./css/enterprise-v26.css?v=29');loadStylesheet('mobile-v27-theme','./css/mobile-v27.css?v=29');loadStylesheet('ux-v28-polish','./css/ux-v28-polish.css?v=1');loadStylesheet('factory-os-executive-v32','./css/factory-os-executive-v32.css?v=1');loadStylesheet('factory-os-v32-industrial','./css/factory-os-v32-industrial.css?v=1');loadStylesheet('factory-os-v33-editorial','./css/factory-os-v33-editorial.css?v=2');loadStylesheet('factory-os-v34-reference','./css/factory-os-v34-reference.css?v=18');
function installImageSourcePicker(){
  if(window.__tpmImageSourcePickerInstalled)return;
  window.__tpmImageSourcePickerInstalled=true;
  const bypass=new WeakSet();
  let activeInput=null;
  const style=document.createElement('style');
  style.id='tpm-image-source-picker-style';
  style.textContent=`
    .tpm-image-source-overlay{position:fixed;inset:0;z-index:1000000;background:rgba(12,22,34,.62);display:flex;align-items:center;justify-content:center;padding:18px}
    .tpm-image-source-dialog{width:min(100%,390px);background:var(--card-bg,#fff);color:var(--text-main,#1f2937);border:1px solid var(--border-color,rgba(100,116,139,.25));border-radius:18px;padding:22px;box-shadow:0 22px 70px rgba(0,0,0,.28);font-family:Cairo,Tajawal,sans-serif;direction:rtl}
    .tpm-image-source-dialog h3{margin:0 0 7px;font-size:18px;font-weight:800}
    .tpm-image-source-dialog p{margin:0 0 18px;font-size:13px;opacity:.75}
    .tpm-image-source-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .tpm-image-source-actions button,.tpm-image-source-cancel{font:inherit;border:0;border-radius:11px;padding:12px 9px;cursor:pointer;font-weight:700}
    .tpm-image-source-camera{background:#176b57;color:#fff}.tpm-image-source-gallery{background:#e8eef5;color:#243447}
    .tpm-image-source-cancel{width:100%;margin-top:10px;background:transparent;color:inherit;border:1px solid var(--border-color,rgba(100,116,139,.25))!important}
    .tpm-image-source-actions button:focus-visible,.tpm-image-source-cancel:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}
  `;
  document.head.appendChild(style);
  const overlay=document.createElement('div');
  overlay.className='tpm-image-source-overlay';
  overlay.hidden=true;
  overlay.innerHTML='<section class="tpm-image-source-dialog" role="dialog" aria-modal="true" aria-labelledby="tpmImageSourceTitle"><h3 id="tpmImageSourceTitle">إضافة صورة</h3><p>اختار طريقة إضافة الصورة</p><div class="tpm-image-source-actions"><button type="button" class="tpm-image-source-camera">📷 فتح الكاميرا</button><button type="button" class="tpm-image-source-gallery">🖼️ رفع صورة من الجهاز</button></div><button type="button" class="tpm-image-source-cancel">إلغاء</button></section>';
  document.body.appendChild(overlay);
  const close=()=>{overlay.hidden=true;activeInput=null};
  const choose=mode=>{
    const input=activeInput;
    if(!input){close();return}
    if(mode==='camera')input.setAttribute('capture','environment');
    else input.removeAttribute('capture');
    try{input.value=''}catch(_){}
    close();
    bypass.add(input);
    input.click();
  };
  overlay.querySelector('.tpm-image-source-camera').addEventListener('click',()=>choose('camera'));
  overlay.querySelector('.tpm-image-source-gallery').addEventListener('click',()=>choose('gallery'));
  overlay.querySelector('.tpm-image-source-cancel').addEventListener('click',close);
  overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
  document.addEventListener('keydown',event=>{if(!overlay.hidden&&event.key==='Escape')close()});
  document.addEventListener('click',event=>{
    const input=event.target;
    if(!(input instanceof HTMLInputElement)||input.type!=='file')return;
    if(bypass.has(input)){bypass.delete(input);return}
    const accept=(input.getAttribute('accept')||'').toLowerCase().trim();
    if(accept&&!/(^|[,\s])image\//.test(accept)&&!/\.(jpg|jpeg|png|webp|gif|heic|heif)([,\s]|$)/.test(accept))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    activeInput=input;
    overlay.hidden=false;
    overlay.querySelector('.tpm-image-source-camera').focus();
  },true);
}
function configureCharts(){if(!window.Chart||window.__factoryChartsConfigured)return;window.__factoryChartsConfigured=true;const C=window.Chart;C.defaults.font.family="Cairo, sans-serif";C.defaults.font.size=11;C.defaults.color="#46525f";C.defaults.responsive=true;C.defaults.maintainAspectRatio=false;C.defaults.plugins.legend.position='bottom';C.defaults.plugins.legend.labels.usePointStyle=true;C.defaults.plugins.legend.labels.boxWidth=8;C.defaults.plugins.legend.labels.padding=16;C.defaults.plugins.tooltip.backgroundColor='#20303f';C.defaults.plugins.tooltip.titleColor='#fff';C.defaults.plugins.tooltip.bodyColor='#fff';C.defaults.plugins.tooltip.padding=10;C.defaults.plugins.tooltip.cornerRadius=7;C.defaults.scale.grid.color='rgba(83,101,117,.12)';C.defaults.scale.border.color='rgba(83,101,117,.22)';C.defaults.scale.ticks.color='#778391';}
window.renderProfileAndSettings=()=>Settings.renderProfileAndSettings();window.switchSettingsTab=(id,button)=>Settings.switchSettingsTab(id,button);window.openMyFullProfile=()=>Settings.openMyFullProfile();window.updateProfilePic=e=>Settings.updateProfilePic(e);window.saveApiKeys=()=>Settings.saveApiKeys();window.enableApiKeysEdit=()=>Settings.enableApiKeysEdit();
window.showScreen=id=>UI.showScreen(id);window.goBack=()=>UI.goBack();window.showToast=m=>UI.showToast(m);window.toggleSidebar=()=>UI.toggleSidebar();window.toggleDarkMode=()=>UI.toggleDarkMode();window.sanitizeInput=v=>UI.sanitizeInput(v);window.uniqueNumericId=()=>UI.uniqueNumericId();window.__tpmModularLogin=()=>Auth.login();window.__tpmModularSignup=()=>Auth.signup();window.__tpmModularLogout=()=>Auth.logout();window.__tpmModularQuickLogin=()=>Auth.biometricLogin();window.login=window.__tpmModularLogin;window.signup=window.__tpmModularSignup;window.logout=window.__tpmModularLogout;window.biometricLogin=window.__tpmModularQuickLogin;window.scanBarcodeFromImage=e=>Scanner.scanBarcodeFromImage(e);window.forceAcceptBarcode=t=>Scanner.forceAcceptBarcode(t);
window.syncRecord=(p,d)=>Services.syncRecord(p,d);window.deleteRecord=p=>Services.deleteRecord(p);window.logAction=a=>Services.logAction(a,window.currentUser?.name);window.uploadImageToStorage=(f,o={})=>Services.uploadImageToStorage(f,o);window.processAndEnhanceImage=(f,c)=>Services.processAndEnhanceImage(f,c);window.fetchGeminiAPI=(p,b)=>Services.fetchGeminiAPI(p,b);
window.TPMAccess={role(){return normalizeRole(window.currentUser?.role)},label(){return roleLabel(this.role())},permission(id){const p=window.currentUser?.permissions?.[id];return p==='edit'||p==='view'?p:(p==='none'?'none':null)},canAccess(id){if(['loginScreen','signupScreen'].includes(id))return true;if(!window.auth?.currentUser)return false;const role=this.role();if(role==='admin')return true;const explicit=this.permission(id);if(explicit)return explicit!=='none';return canAccessRole(role,id)},canEdit(id){if(this.role()==='admin')return true;const explicit=this.permission(id);if(explicit)return explicit==='edit';return this.role()==='engineer'},require(...roles){const ok=roles.map(normalizeRole).includes(this.role());if(!ok)this.deny();return ok},deny(){UI.showToast('🔒 لا تملك صلاحية الوصول إلى هذه المساحة.');return false}};window.hasRole=(...allowed)=>allowed.map(normalizeRole).includes(normalizeRole(window.currentUser?.role));
function installBackHistoryGuard(){const original=UI.goBack.bind(UI);UI.goBack=()=>{if(UI.screenHistory.length>1)return original();return undefined};}
window.addEventListener('load',()=>{installImageSourcePicker();configureCharts();const legacy=window.showScreen;if(typeof legacy==='function'&&!legacy.__tpmGuarded){const guarded=id=>{if(!window.TPMAccess.canAccess(id))return window.TPMAccess.deny();return legacy(id)};guarded.__tpmGuarded=true;window.showScreen=guarded}window.showToast=m=>UI.showToast(m);installBackHistoryGuard();mountEnterpriseOperations();mountFactoryOSGlobal();});
const canonicalizeSessionRole=()=>{if(!window.currentUser)return;const canonical=normalizeRole(window.currentUser.role);if(window.currentUser.role!==canonical)window.currentUser.role=canonical;window.currentUser.roleLabel=roleLabel(canonical);document.querySelectorAll('[data-current-role]').forEach(el=>el.textContent=roleLabel(canonical))};
window.addEventListener('DOMContentLoaded',()=>{if(localStorage.getItem('tpm_theme')==='light')document.body.classList.add('light-theme');canonicalizeSessionRole();setTimeout(canonicalizeSessionRole,500);setTimeout(canonicalizeSessionRole,1500)});auth.onAuthStateChanged(()=>{setTimeout(canonicalizeSessionRole,0);setTimeout(canonicalizeSessionRole,300)});