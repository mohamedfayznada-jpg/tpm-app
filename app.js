// ==========================================
// 🚀 FACTORY OS - V5.0 (ENTERPRISE MASTER CORE - FULL VERSION)
// Architected By: Architect-Prime
// ==========================================

const db = firebase.database();
const auth = firebase.auth();

// 🛡️ المتغيرات العالمية المحصنة (كاملة)
let tpmSystemRef = null, tpmSystemListener = null;
let globalApiKeys = { imgbb: "", gemini: "" };
let departments = [], historyData = [], tasksData = [], usersData = {}, logsData = [], likesData = {}, tagsData = [], kaizenComments = {}, userPoints = {}, knowledgeBaseData = [], deptPhones = {}, maintenanceEngineers = [], notificationSettings = { onTagAssigned: true, onCriticalTag: true, onTagEscalation: true }; let knowledgeActiveFilter = 'all';
var currentUser = { name: '', username: '', role: '', status: '' };
let currentAudit = null, isOnline = true, isDataLoaded = false, isInitialLoad = true;
let radarChartInstance = null, trendChartInstance = null, currentViewedDept = null;
let currentStepSelections = {}, currentStepImages = {}, currentStepImprovements = [];
let currentTagImg = null, currentTaskDept = null, kaizenImgs = { before: null, after: null }, fiveSImages = { standard: null, current: null };
let sigCanvas, sigCtx, isDrawing = false, canvasRect = null;
let screenHistory = ['homeScreen'];
let jhMiniChartInstance = null;
let deptGoalsData = {};
let currentJHDept = null; 
let registeredLosses = [];

// الأقسام التشغيلية الأساسية: تظهر دائمًا في المراجعات والتاجات والكايزنات والمهام، ولا تحذف الأقسام المحفوظة الأخرى.
const CORE_OPERATIONAL_DEPARTMENTS = Object.freeze(['حقن الكابينة', 'حقن الباب', 'الفاكيوم', 'المواسير']);
window.getOperationalDepartments = function(source = departments) {
    const stored = Array.isArray(source) ? source : Object.values(source || {});
    const normalized = stored.map(item => String(item || '').trim()).filter(Boolean);
    return [...CORE_OPERATIONAL_DEPARTMENTS, ...normalized.filter(item => !CORE_OPERATIONAL_DEPARTMENTS.includes(item))]
        .filter((item, index, list) => list.indexOf(item) === index);
};
window.isCoreOperationalDepartment = function(dept) { return CORE_OPERATIONAL_DEPARTMENTS.includes(dept); };
window.encodeTPMArgument = function(value) { return encodeURIComponent(String(value ?? '')); };

// ==========================================
// 🛠️ دوال النظام الأساسية (Core Utilities)
// ==========================================
window.showToast = function(msg) {
    let container = document.getElementById('toast-container');
    if(!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); }
    let toast = document.createElement('div'); toast.className = 'toast-msg'; toast.innerHTML = msg;
    container.appendChild(toast); setTimeout(() => toast.remove(), 4000);
};

window.showScreen = function(screenId) {
    const target = document.getElementById(screenId);
    if (!target) {
        console.warn('[FACTORY OS] screen not found:', screenId);
        return;
    }
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    target.classList.add('active');
    target.style.display = 'block';

    document.querySelectorAll('#mainSidebar .side-item').forEach(item => item.classList.remove('active'));
    const activeItem = [...document.querySelectorAll('#mainSidebar .side-item')]
        .find(item => (item.getAttribute('onclick') || '').includes("'" + screenId + "'"));
    if (activeItem) activeItem.classList.add('active');

    if(screenId === 'tpmTeamsScreen' && typeof window.renderTPMTeams === 'function') window.renderTPMTeams();
    if(screenId === 'settingsScreen' && typeof window.renderSettingsControlLists === 'function') window.renderSettingsControlLists();
    if(screenId === 'settingsScreen' && typeof window.renderProfileAndSettings === 'function') window.renderProfileAndSettings();
    window.scrollTo({top: 0, behavior: 'smooth'});
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;
    const open = sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active', open);
};

window.goBack = function() { showScreen('homeScreen'); };
window.uniqueNumericId = function() { return Date.now() + Math.floor(Math.random() * 1000); };
window.sanitizeInput = function(str) { return String(str).replace(/[<>]/g, '').trim(); };
window.syncRecord = async function(path, data) {
    if (!auth.currentUser) throw new Error('سجّل الدخول أولاً قبل حفظ البيانات.');
    await db.ref('tpm_system/' + path).set(data);
    return true;
};
window.deleteRecord = async function(path) {
    if (!auth.currentUser) throw new Error('سجّل الدخول أولاً قبل حذف البيانات.');
    await db.ref('tpm_system/' + path).remove();
    return true;
};
window.deleteStorageImage = async function(downloadUrl) {
    if (!downloadUrl || !auth.currentUser || !firebase.storage) return false;
    await firebase.storage().refFromURL(downloadUrl).delete();
    return true;
};
window.hasRole = function(...allowed) { return currentUser && currentUser.role && allowed.includes(currentUser.role); };

// ==========================================