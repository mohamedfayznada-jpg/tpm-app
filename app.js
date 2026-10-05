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
let currentTagImg = null, currentTaskDept = null, kaizenImgs = { before: null, after: null }, kaizenEditId = null, fiveSImages = { standard: null, current: null };
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

window.__tpmNavigation = window.__tpmNavigation || { stack: [], current: null, suppressPush: false };
function isActiveScreen(screenId){const el=document.getElementById(screenId);return !!el&&el.classList.contains('active');}
function refreshVisibleDataScreen(screenId){switch(screenId){case 'homeScreen':if(currentUser?.role&&typeof window.updateHomeDashboard==='function')window.updateHomeDashboard();break;case 'tagsScreen':if(typeof window.renderTags==='function')window.renderTags();if(typeof window.renderTagCommandCenter==='function')window.renderTagCommandCenter();break;case 'tasksScreen':if(typeof window.renderTasks==='function')window.renderTasks();break;case 'historyScreen':if(typeof window.renderHistory==='function')window.renderHistory();break;case 'kkScreen':if(typeof window.renderKKDashboard==='function')window.renderKKDashboard();break;case 'knowledgeScreen':if(typeof window.renderKnowledgeBase==='function')window.renderKnowledgeBase();break;case 'tpmTeamsScreen':if(typeof window.renderTPMTeams==='function')window.renderTPMTeams();break;}}


window.showScreen = function(screenId, options = {}) {
    const nav = window.__tpmNavigation;
    const previous = nav.current;
    const shouldPush = !options.fromBack && !nav.suppressPush && previous && previous !== screenId;

    if (shouldPush) {
        nav.stack.push(previous);
        if (nav.stack.length > 30) nav.stack.shift();
    }

    nav.current = screenId;
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
    const target = document.getElementById(screenId);
    if(target) {
        target.classList.add('active');
        target.style.display = 'block';
        if(screenId === 'tpmTeamsScreen') {
            target.style.setProperty('display', 'block', 'important');
            target.style.setProperty('visibility', 'visible', 'important');
            target.style.setProperty('opacity', '1', 'important');
            target.style.setProperty('transform', 'none', 'important');
            target.style.setProperty('animation', 'none', 'important');
            target.style.setProperty('position', 'relative', 'important');
            target.style.setProperty('z-index', '10', 'important');
            document.body.classList.add('tpm-teams-open');
            // Self-heal the gateway if a stale/partial DOM was loaded.
            window.ensureTPMTeamsGateway?.();
        } else {
            document.body.classList.remove('tpm-teams-open');
        }
    }
    if(screenId === 'tpmTeamsScreen' && typeof window.renderTPMTeams === 'function') window.renderTPMTeams();
    if(screenId === 'settingsScreen' && typeof window.renderSettingsControlLists === 'function') window.renderSettingsControlLists();
    if(screenId === 'jhSkillMatrixScreen') { window.dispatchEvent(new Event('tpm:jh-skill-matrix-open')); window.renderSkillMatrix?.(); const title=document.getElementById('jhSkillDeptName'); if(title) title.textContent=window.currentJHDept||'القسم'; }
    document.querySelectorAll('#mainSidebar .side-item').forEach(item => item.classList.remove('active')); const activeItem = [...document.querySelectorAll('#mainSidebar .side-item')].find(item => (item.getAttribute('onclick') || '').includes("'" + screenId + "'")); if(activeItem) activeItem.classList.add('active');
    refreshVisibleDataScreen(screenId);
    window.scrollTo({top: 0, behavior: 'smooth'});
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if(!sidebar) return;

    const isDesktop = window.matchMedia && window.matchMedia('(min-width: 801px)').matches;

    if(isDesktop) {
        sidebar.classList.toggle('sidebar-collapsed');
        document.body.classList.toggle('sidebar-collapsed', sidebar.classList.contains('sidebar-collapsed'));
        if(overlay) overlay.classList.remove('active');
        return;
    }

    if(overlay) overlay.classList.toggle('active');
    sidebar.classList.toggle('active');
};

window.goBack = function() {
    const nav = window.__tpmNavigation || { stack: [], current: null };
    while (nav.stack.length) {
        const previous = nav.stack.pop();
        if (previous && previous !== nav.current && document.getElementById(previous)) {
            showScreen(previous, { fromBack:true });
            return;
        }
    }
    showScreen('homeScreen', { fromBack:true });
};
window.uniqueNumericId = function() { return Date.now() + Math.floor(Math.random() * 1000); };
window.sanitizeInput = function(str) { return String(str).replace(/[<>]/g, '').trim(); };

window.escapeTPM = window.escapeTPM || function(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
};

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
// 🔐 محرك المصادقة والحماية (Enterprise Auth Flow)
// ==========================================
window.login = async function() {
    if (typeof window.__tpmModularLogin === 'function') return window.__tpmModularLogin();
    const userInp = document.getElementById('loginUsername').value.trim();
    const passInp = document.getElementById('loginPassword').value.trim();
    if(!userInp || !passInp) return showToast('⚠️ برجاء كتابة اسم المستخدم وكلمة المرور');

    const btn = document.querySelector('#loginScreen .auth-primary-btn');
    const origText = btn?.innerHTML || '';
    if(btn){ btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> جاري المصادقة...'; btn.disabled = true; }

    const email = userInp.includes('@') ? userInp : `${userInp.toLowerCase().replace(/\s+/g, '')}@tpm.app`;

    try {
        const rem = document.getElementById('rememberMe')?.checked;
        const persistence = rem
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;

        await auth.setPersistence(persistence);
        await auth.signInWithEmailAndPassword(email, passInp);

        // لا نخزّن كلمة المرور في المتصفح؛ Firebase يدير جلسة المصادقة بأمان.
        if(rem) localStorage.setItem('tpm_saved_email', email);
        else localStorage.removeItem('tpm_saved_email');
        localStorage.removeItem('tpm_saved_pass');
    } catch (e) {
        showToast('❌ بيانات الدخول غير صحيحة أو الحساب غير موجود');
        if(btn){ btn.innerHTML = origText; btn.disabled = false; }
    }
};

window.signup = async function() {
    const fullName = document.getElementById('signupFullName').value.trim();
    const username = document.getElementById('signupUsername').value.trim().toLowerCase().replace(/\s+/g, '');
    const password = document.getElementById('signupPassword').value.trim();
    const requestedRole = document.getElementById('signupRole').value;

    if (!fullName || !username || !password) return showToast("⚠️ برجاء إكمال كافة البيانات");
    if (username.length < 3) return showToast("⚠️ اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
    if (password.length < 6) return showToast("⚠️ كلمة المرور ضعيفة! يجب أن تكون 6 أحرف أو أكثر");

    const btn = document.querySelector('#signupScreen .auth-signup-submit, #signupScreen .auth-primary-btn, #signupScreen .btn-success');
    const origText = btn?.innerHTML || '';
    if(btn){ btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> جاري إنشاء الحساب...'; btn.disabled = true; }

    try {
        const email = `${username}@tpm.app`;
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        const newUserObj = {
            name: window.sanitizeInput(fullName), username: username, requestedRole: requestedRole,
            role: 'viewer', status: 'pending', 
            permissions: { homeScreen: 'view', tasksScreen: 'none', historyScreen: 'none', kaizenScreen: 'view', tagsScreen: 'none', knowledgeScreen: 'none' },
            createdAt: new Date().toISOString()
        };

        await db.ref('tpm_system/users/' + userCredential.user.uid).set(newUserObj);
        showToast("✅ تم إرسال طلبك للمدير بنجاح! يرجى انتظار الموافقة.");
        await auth.signOut();
        setTimeout(() => { showScreen('loginScreen'); if(btn){ btn.innerHTML = origText; btn.disabled = false; } }, 2000);
    } catch (error) {
        let msg = "حدث خطأ أثناء الاتصال"; if (error.code === 'auth/email-already-in-use') msg = "اسم المستخدم هذا محجوز وموجود بالفعل!";
        showToast("❌ " + msg); if(btn){ btn.innerHTML = origText; btn.disabled = false; }
    }
};

window.logout = function() {
    if(confirm('تأكيد تسجيل الخروج؟')) { auth.signOut().then(() => { sessionStorage.clear(); window.location.reload(); }); }
};

window.biometricLogin = async function() {
    const savedEmail = localStorage.getItem('tpm_saved_email');
    if(!savedEmail) return showToast('⚠️ يرجى تسجيل الدخول يدوياً أولاً وتفعيل "تذكر بياناتي"');

    try {
        if (window.PublicKeyCredential) {
            const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge);
            await navigator.credentials.get({ publicKey: { challenge: challenge, rpId: window.location.hostname, userVerification: 'preferred' } });
        }

        // التحقق البيومتري هنا لا يملك خادمًا للتحقق من التحدي، لذلك لا نعتبره بديلاً عن كلمة المرور.
        document.getElementById('loginUsername').value = savedEmail.split('@')[0];
        document.getElementById('loginPassword').focus();
        showToast('🔐 تم التحقق من الجهاز. أدخل كلمة المرور لإكمال تسجيل الدخول.');
    } catch (err) {
        showToast('❌ تم إلغاء أو فشل التحقق البيومتري');
    }
};

// ==========================================
// 🔄 محرك المزامنة وإدارة الحالة (State Manager)
// ==========================================
let dbListeners = {};

function bindDbListener(name, query, handler, event = 'value') {
    const previous = dbListeners[name];
    if (previous?.query && previous?.handler) previous.query.off(previous.event || event, previous.handler);
    query.on(event, handler);
    dbListeners[name] = { query, handler, event };
}

function clearDbListeners() {
    Object.values(dbListeners).forEach(entry => {
        try { entry?.query?.off(entry.event || 'value', entry.handler); }
        catch (error) { console.warn('[TPM] Failed to detach Firebase listener:', error); }
    });
    dbListeners = {};
}

let homeDashboardRefreshQueued = false;
function scheduleHomeDashboardRefresh() {
    if (homeDashboardRefreshQueued || !currentUser?.role || typeof window.updateHomeDashboard !== 'function') return;
    homeDashboardRefreshQueued = true;
    const flush = () => {
        homeDashboardRefreshQueued = false;
        if (currentUser?.role && typeof window.updateHomeDashboard === 'function') window.updateHomeDashboard();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(flush);
    else setTimeout(flush, 0);
}

firebase.auth().onAuthStateChanged(async user => {
    clearDbListeners();
    homeDashboardRefreshQueued = false;
    document.body.classList.toggle('auth-locked', !user);
    const mainHeader = document.getElementById('mainHeader');
    
    if (user) {
        isDataLoaded = true;        if (mainHeader) mainHeader.style.display = 'flex';

        const dSnap = await db.ref('tpm_system/departments').once('value');
        departments = window.getOperationalDepartments(dSnap.val() || []); window.departments = departments;

        const userEmail = user.email ? user.email.toLowerCase() : '';
        const isMasterAdmin = userEmail === 'mfayez@tpm.app';
        const profileSnap = await db.ref('tpm_system/users/' + user.uid).once('value');
        const profileData = profileSnap.val();
        const savedName = localStorage.getItem('tpm_user') || userEmail.split('@')[0];
        const finalUsername = isMasterAdmin ? 'mfayez' : (profileData?.username || localStorage.getItem('tpm_username') || userEmail.split('@')[0]);

        let role = 'viewer';
        let status = 'pending';
        let permissions = {};

        if (isMasterAdmin) {
            const uSnap = await db.ref('tpm_system/users').once('value');
            usersData = uSnap.val() || {};
            window.usersData = usersData;
            role = 'admin';
            status = 'active';
            permissions = {};
            currentUser = { uid: user.uid, name: "م. محمد فايز", username: "mfayez", role: "admin", status: "active", permissions };
            window.currentUser = currentUser; localStorage.setItem('tpm_username', 'mfayez');

            const storedMaster = (usersData[user.uid] && typeof usersData[user.uid] === 'object') ? usersData[user.uid] : {};
            if (storedMaster.role !== 'admin' || storedMaster.status !== 'active') {
                try {
                    await db.ref(`tpm_system/users/${user.uid}`).update({
                        role: 'admin',
                        status: 'active',
                        updatedAt: Date.now()
                    });
                    usersData[user.uid] = { ...storedMaster, role: 'admin', status: 'active' };
                } catch (error) {
                    console.error('Master administrator role synchronization failed:', error);
                    showToast('⚠️ تعذر مزامنة صلاحية المدير مع قاعدة البيانات.');
                }
            }

            let hasPending = Object.values(usersData).some(u => typeof u === 'object' && u.status === 'pending');
            let notifyIcon = document.getElementById('adminNotification');
            if(notifyIcon) notifyIcon.style.display = hasPending ? 'block' : 'none';
            if(isActiveScreen('settingsScreen')&&window.renderUserManagement)window.renderUserManagement();

            bindDbListener('users', db.ref('tpm_system/users'), snap => {
                usersData = snap.val() || {};
                window.usersData = usersData;
                window.dispatchEvent(new Event('tpm:skill-matrix-data'));
                let pendingLive = Object.values(usersData).some(u => typeof u === 'object' && u.status === 'pending');
                let notifLive = document.getElementById('adminNotification');
                if(notifLive) notifLive.style.display = pendingLive ? 'block' : 'none';
                if(isActiveScreen('settingsScreen')&&window.renderUserManagement)window.renderUserManagement();
            });
        } else {
            const uData = (profileData && typeof profileData === 'object') ? profileData : {};
            role = window.normalizeTPMRole ? window.normalizeTPMRole(uData.role || 'viewer') : (uData.role || 'viewer');
            status = uData.status || 'pending';
            permissions = (uData.permissions && typeof uData.permissions === 'object') ? uData.permissions : {};
            usersData = { [user.uid]: uData };
            window.usersData = usersData;
            currentUser = {
                uid: user.uid,
                name: uData.name || savedName,
                username: finalUsername,
                role,
                status,
                permissions,
                dept: uData.dept || ''
            };
            window.currentUser = currentUser;
            window.dispatchEvent(new CustomEvent('tpm:auth-ready'));
        }

        document.querySelectorAll('.btn-role-admin').forEach(el => el.style.display = currentUser.role === 'admin' ? 'block' : 'none');
        document.querySelectorAll('.btn-role-auditor').forEach(el => el.style.display = (currentUser.role === 'admin' || currentUser.role === 'auditor') ? 'block' : 'none');
        
        if (currentUser.status === 'pending') {
            showToast("⏳ حسابك قيد المراجعة. سيظهر لك النظام بعد اعتماد الإدارة للدور والصلاحيات.");
            await firebase.auth().signOut();
            return;
        } else if (currentUser.status !== 'active') {
            showToast("🔒 الحساب غير نشط حاليًا. تواصل مع مسؤول النظام.");
            await firebase.auth().signOut();
            return;
        } else {
            try {
                await db.ref('tpm_system/users/' + user.uid).update({ lastLoginAt: firebase.database.ServerValue.TIMESTAMP });
            } catch (error) {
                console.warn('[Auth] lastLoginAt update skipped:', error);
            }
            const loginBtn = document.querySelector('#loginScreen .auth-primary-btn, #loginScreen .btn-primary');
            if(loginBtn) { loginBtn.disabled = false; loginBtn.removeAttribute('aria-busy'); }
            showScreen('homeScreen');
        }

        if(window.updateDeptDropdown) window.updateDeptDropdown();

        bindDbListener('tags', db.ref('tpm_system/tags').orderByChild('id').limitToLast(100), snap => {
            let data = snap.val() || {}; tagsData = Object.values(data).filter(x => x && x.id).sort((a,b)=>b.id-a.id); window.tagsData = tagsData; 
            if(isActiveScreen('tagsScreen')){if(window.renderTags)window.renderTags();if(window.renderTagCommandCenter)window.renderTagCommandCenter();}if(isActiveScreen('tpmTeamsScreen'))window.renderTPMTeams?.();if(isActiveScreen('homeScreen'))scheduleHomeDashboardRefresh();
        });

        bindDbListener('tasks', db.ref('tpm_system/tasks').orderByChild('id').limitToLast(100), snap => {
            let data=snap.val()||{};tasksData=Object.values(data).filter(x=>x&&x.id).sort((a,b)=>a.id-b.id);window.tasksData=tasksData;if(isActiveScreen('tasksScreen'))window.renderTasks?.();if(isActiveScreen('tpmTeamsScreen'))window.renderTPMTeams?.();
        });

        bindDbListener('history', db.ref('tpm_system/history').orderByChild('id').limitToLast(100), snap => {
            let data = snap.val() || {}; historyData = Object.values(data).filter(x => x && x.id).sort((a,b)=>a.id-b.id); window.historyData = historyData; 
            if(isActiveScreen('historyScreen')){if(window.renderHistory)window.renderHistory();if(window.renderKaizenFeed)window.renderKaizenFeed();if(window.renderKaizenA3CommandStats)window.renderKaizenA3CommandStats();}if(isActiveScreen('homeScreen'))scheduleHomeDashboardRefresh();
        });
    
        bindDbListener('goals', db.ref('tpm_system/dept_goals'), snap => { 
            deptGoalsData = snap.val() || {}; 
            if(currentJHDept&&isActiveScreen('jhPortalScreen')&&window.selectJHDept)window.selectJHDept(currentJHDept); 
        });
      
        bindDbListener('losses', db.ref('tpm_system/losses'), snap => {
            registeredLosses = snap.val() ? Object.values(snap.val()) : [];
            if(document.getElementById('kkScreen').classList.contains('active') && window.renderKKDashboard) window.renderKKDashboard();
        });
        
        bindDbListener('points', db.ref('tpm_system/points'), snap => { 
            userPoints = snap.val() || {}; if(window.updateUsersLeaderboard) window.updateUsersLeaderboard(); 
        });
        
        bindDbListener('knowledgeBase', db.ref('tpm_system/knowledgeBase'), snap => { 
            knowledgeBaseData = snap.val() ? Object.values(snap.val()) : []; 
            if(document.getElementById('knowledgeScreen').classList.contains('active') && window.renderKnowledgeBase) window.renderKnowledgeBase(); 
        });

        bindDbListener('engineers', db.ref('tpm_system/maintenanceEngineers'), snap => {
            maintenanceEngineers = snap.val() ? Object.values(snap.val()) : [];
            if(window.updateOperationalSelects) window.updateOperationalSelects();
        });

        if (currentUser.role === 'admin') {
            bindDbListener('notificationSettings', db.ref('tpm_system/notification_settings'), snap => {
                notificationSettings = { ...notificationSettings, ...(snap.val() || {}) };
                if(window.populateNotificationSettings) window.populateNotificationSettings();
            });
        }
        
    } else {
        clearDbListeners();
        isInitialLoad = true; isDataLoaded = false; 
        if (mainHeader) mainHeader.style.display = 'none'; // חجر صحي
        showScreen('loginScreen');
    }
});

// ==========================================
// 👑 إدارة النظام والأذونات (System Admin)
// ==========================================
const isSystemAdmin = () => (window.normalizeTPMRole ? window.normalizeTPMRole(currentUser?.role) : currentUser?.role) === "admin";
const USER_ROLE_LABELS_V2 = { admin:"مدير المصنع", engineer:"مهندس", technician:"فني / مشغل", auditor:"مراجع TPM", viewer:"مشاهد" };
const USER_STATUS_LABELS_V2 = { active:"نشط", pending:"بانتظار الاعتماد", disabled:"موقوف" };
window.renderUserManagement = function() {
    if (!isSystemAdmin()) return;
    const container = document.getElementById('usersListContainer'); if (!container) return;
    
    let html = '<h4 style="color:var(--glow-gold); margin:15px 0 10px;"><i class="bx bx-group"></i> إدارة المستخدمين والصلاحيات</h4>';
    Object.keys(usersData).forEach(uid => {
        const u = usersData[uid]; if (typeof u !== 'object') return; 
        const normalizedRole = window.normalizeTPMRole ? window.normalizeTPMRole(u.role || 'viewer') : (u.role || 'viewer'); const isPending = u.status === 'pending'; const borderColor = isPending ? 'var(--danger)' : (u.status === 'disabled' ? 'var(--danger)' : 'var(--success)');
        
        html += `
        <div class="card glass-card" style="margin-bottom:12px; border-right:4px solid ${borderColor}; padding: 15px; background:var(--surface-inset);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div style="text-align:right;">
                    <b style="color:var(--text-main); font-size:15px;">${u.name}</b> <small style="color:var(--text-muted);">(${u.username})</small><br>
                    <span style="font-size:11px; color:var(--gold); font-weight:bold;">المطلوب: ${USER_ROLE_LABELS_V2[window.normalizeTPMRole ? window.normalizeTPMRole(u.requestedRole) : u.requestedRole] || u.requestedRole || '—'} | الحالي: ${USER_ROLE_LABELS_V2[normalizedRole] || normalizedRole} | الحالة: ${USER_STATUS_LABELS_V2[u.status] || u.status || 'نشط'}</span>
                </div>
                <div style="display:flex; gap:8px;">
                    ${isPending ? `<button class="btn btn-sm btn-success" style="padding:6px 12px;" onclick="approveUser('${uid}')"><i class='bx bx-check'></i></button>` : ''}
                    <button class="btn btn-sm btn-outline" style="padding:6px 12px;" onclick="openPermissionsModal('${uid}')"><i class='bx bx-lock-alt'></i> الأذونات</button>
                    <button class="btn btn-sm btn-danger" style="padding:6px 12px;" onclick="deleteUser('${uid}')"><i class='bx bx-trash'></i></button>
                </div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
};

window.approveUser = async function(uid) {
    const u = usersData[uid]; if (!u) return;
    let finalPerms = u.permissions || { homeScreen: 'view', tasksScreen: 'none', historyScreen: 'none', kaizenScreen: 'view', tagsScreen: 'none', knowledgeScreen: 'none' };
    const approvedRole = window.normalizeTPMRole ? window.normalizeTPMRole(u.requestedRole) : u.requestedRole;
    await db.ref(`tpm_system/users/${uid}`).update({
        status: 'active',
        role: approvedRole,
        permissions: finalPerms,
        approvedAt: firebase.database.ServerValue.TIMESTAMP,
        approvedBy: currentUser.uid,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    });
    showToast(`✅ تم تفعيل حساب ${u.name} — ${window.getTPMRoleLabel ? window.getTPMRoleLabel(approvedRole) : approvedRole}`);
};

window.deleteUser = async function(uid) { if (!isSystemAdmin() || uid === currentUser.uid) return showToast('🛡️ لا يمكن حذف حساب المدير الحالي.'); if(confirm('⚠️ تأكيد حذف المستخدم نهائياً؟')) { await db.ref('tpm_system/users/' + uid).remove(); showToast('🗑️ تم الحذف'); } };

window.openPermissionsModal = function(uid) {
    const u = usersData[uid]; if (!u || !u.permissions) return showToast('⚠️ لا توجد أذونات قابلة للتعديل لهذا المستخدم');
    window.editingUserUid = uid; const perms = u.permissions; const container = document.getElementById('permissionsContainer');
    const pages = { homeScreen: 'الرئيسية (Dashboard)', settingsScreen: 'الإعدادات', tasksScreen: 'إدارة المهام', historyScreen: 'أرشيف التقارير', kaizenScreen: 'مجتمع كايزن', tagsScreen: 'التاجات والأعطال', tpmTeamsScreen: 'فرق TPM', fiveSScreen: '5S', jhPortalScreen: 'JH Portal', jhDocumentScreen: 'JH Document', jhKPIsScreen: 'JH KPIs', kkScreen: 'KK', pmScreen: 'PM', etScreen: 'ET', hseScreen: 'HSE', knowledgeScreen: 'عقل المصنع', externalAuditScreen: 'المراجعة الخارجية', skillMatrixScreen: 'Skill Matrix' };
    let html = `<div style="margin-bottom:15px; color:var(--glow-gold); font-weight:bold; font-size:15px;"><i class='bx bx-user-circle'></i> المستخدم: ${u.name}</div>`;
    html += `<div class="row-flex" style="margin-bottom:12px;"><div class="form-group flex-1"><label>الدور</label><select id="adminRole" class="form-control"><option value="admin">مدير المصنع</option><option value="engineer">مهندس</option><option value="technician">فني / مشغل</option><option value="auditor">مراجع TPM</option><option value="viewer">مشاهد</option></select></div><div class="form-group flex-1"><label>الحالة</label><select id="adminStatus" class="form-control"><option value="active">نشط</option><option value="pending">بانتظار الاعتماد</option><option value="disabled">موقوف</option></select></div><div class="form-group flex-1"><label>القسم</label><select id="adminDept" class="form-control"><option value="">بدون قسم محدد</option>${departments.map(d=>`<option value="${d}">${d}</option>`).join("")}</select></div></div>`;
    for (let screen in pages) {
        let currentPerm = perms[screen] || 'none';
        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:10px; border-bottom:1px dashed var(--border-glass);">
            <span style="font-size:13px; color:var(--text-main); font-weight:bold;">${pages[screen]}</span>
            <select id="perm_${screen}" class="form-control" style="width:auto; padding:6px 12px; margin:0; font-size:12px; background:var(--bg-base);">
                <option value="none" ${currentPerm==='none'?'selected':''}>مخفية 🚫</option><option value="view" ${currentPerm==='view'?'selected':''}>مشاهدة 👁️</option><option value="edit" ${currentPerm==='edit'?'selected':''}>تعديل ✍️</option>
            </select>
        </div>`;    }
    container.innerHTML = html; document.getElementById('adminRole').value = window.normalizeTPMRole ? window.normalizeTPMRole(u.role || 'viewer') : (u.role || 'viewer'); document.getElementById('adminStatus').value = u.status || 'pending'; document.getElementById('adminDept').value = u.dept || ''; document.getElementById('permissionsModal').style.display = 'flex';
};

window.saveUserPermissions = async function() {
    if (!isSystemAdmin() || !window.editingUserUid) return; const uid = window.editingUserUid; const target = usersData[uid]; if (!target) return; const pages = ['homeScreen', 'tasksScreen', 'historyScreen', 'kaizenScreen', 'tagsScreen', 'skillMatrixScreen', 'externalAuditScreen', 'tpmTeamsScreen', 'fiveSScreen', 'jhPortalScreen', 'jhDocumentScreen', 'jhKPIsScreen', 'kkScreen', 'pmScreen', 'etScreen', 'hseScreen', 'settingsScreen', 'knowledgeScreen'];
    const newPerms = {}; pages.forEach(p => { let sel = document.getElementById('perm_' + p); if (sel) newPerms[p] = sel.value; });
    const newRole = window.normalizeTPMRole ? window.normalizeTPMRole(document.getElementById('adminRole')?.value || target.role) : (document.getElementById('adminRole')?.value || target.role); const newStatus = document.getElementById('adminStatus')?.value || target.status || 'pending'; const newDept = document.getElementById('adminDept')?.value || '';
    if (uid === currentUser.uid && (newRole !== 'admin' || newStatus !== 'active')) return showToast('🛡️ لا يمكن تخفيض أو تعطيل حساب المدير الحالي.');
    try { await db.ref('tpm_system/users/' + uid).update({ role: newRole, status: newStatus, dept: newDept, permissions: newPerms, updatedAt: firebase.database.ServerValue.TIMESTAMP, updatedByUid: currentUser.uid, ...(newStatus === 'active' && target.status === 'pending' ? { approvedAt: firebase.database.ServerValue.TIMESTAMP, approvedBy: currentUser.uid } : {}) }); showToast('✅ تم تحديث الدور والحالة والصلاحيات'); document.getElementById('permissionsModal').style.display = 'none'; } catch (error) { console.error('[UserAdmin] update failed:', error); showToast('❌ تعذر حفظ إعدادات المستخدم.'); }
};

window.saveApiKeys = async function() {
    showToast('🔐 مفاتيح الخدمة تُدار على الخادم فقط. استخدم Vercel Environment Variables.');
};
window.enableApiKeysEdit = function() {
    showToast('🔐 لا يتم عرض أو تخزين مفاتيح الخدمة داخل المتصفح.');
};

window.updateUsersLeaderboard = function() {
    const lc = document.getElementById('usersLeaderboardContainer'); if(!lc) return;
    let sortable = [];
    for (let uid in userPoints) { let uInfo = usersData[uid] || { name: "مستخدم مجهول" }; sortable.push({ uid: uid, name: uInfo.name, avatar: uInfo.avatar, points: userPoints[uid] }); }
    sortable.sort((a, b) => b.points - a.points);
    if(sortable.length === 0) { lc.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px; width:100%;">المصنع بانتظار أول بطل... 🚀</div>'; return; }

    const topLimit = 20; const topUsers = sortable.slice(0, topLimit);
    let html = topUsers.map((item, idx) => window.generateEliteCardHTML(item, idx)).join('');
    const myUid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null; const myRankIndex = sortable.findIndex(u => u.uid === myUid);

    if (myUid && myRankIndex >= topLimit) {
        let myData = sortable[myRankIndex]; html += `<div style="width:100%; text-align:center; color:var(--gold); margin: 15px 0 5px; font-size:12px; font-weight:bold;">🔻 مركزك الحالي 🔻</div>`; html += window.generateEliteCardHTML(myData, myRankIndex); 
    }
    lc.innerHTML = html;
};

window.generateEliteCardHTML = function(item, idx) {
    let rankClass = (idx === 0) ? 'gold-glow' : (idx === 1 ? 'silver-glow' : (idx === 2 ? 'bronze-glow' : ''));
    let rankIcon = (idx === 0) ? '<i class="bx bxs-medal"></i>' : (idx === 1 ? '<i class="bx bx-medal"></i>' : (idx === 2 ? '<i class="bx bx-award"></i>' : idx + 1));
    let rankTitle = "مبتدئ تقني"; let rankColor = "var(--text-muted)";
    if(item.points > 1500) { rankTitle = "أسطورة المصنع"; rankColor = "var(--gold)"; } else if(item.points > 800) { rankTitle = "خبير TPM سينيور"; rankColor = "var(--primary)"; } else if(item.points > 300) { rankTitle = "تقني محترف"; rankColor = "var(--success)"; }

    return `
    <div class="elite-card ${rankClass}" onclick="viewOtherUserProfile('${item.uid}')">
        <div class="elite-rank">${rankIcon}</div>
        <img class="elite-avatar" src="${item.avatar || 'https://ui-avatars.com/api/?name='+item.name+'&background=1e293b&color=3b82f6'}">
        <div class="elite-info">
            <div class="elite-name">${item.name}</div><div class="elite-level" style="color:${rankColor}; font-weight:900;">${rankTitle}</div>
        </div>
        <div class="elite-score"><span class="pts-val">${item.points}</span><small style="color:var(--text-muted); font-size:10px;">نقطة</small></div>
    </div>`;
};

// ==========================================
// 👤 محرك مركز القيادة الشخصي
// ==========================================
window.openMyFullProfile = async function() {
    const uid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    if(!uid || !usersData[uid]) return showToast('خطأ في جلب بيانات المستخدم');
    const u = usersData[uid]; const activeName = currentUser.name; 

    document.getElementById('myBigAvatar').src = u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=1e293b&color=3b82f6`;
    document.getElementById('myDisplayName').innerText = u.name; document.getElementById('editName').value = u.name; document.getElementById('editPhone').value = u.phone || '';
    document.getElementById('myDisplayRank').innerText = `الرصيد المعرفي: ${userPoints[uid] || 0} نقطة`;
    document.getElementById('editDept').innerHTML = departments.map(d=>`<option value="${d}" ${u.dept===d?'selected':''}>${d}</option>`).join('');

    const myAudits = historyData.filter(h => h.auditor === activeName && !h.stepsOrder.includes('ManualKaizen'));
    const myTags = tagsData.filter(t => t.auditor === activeName);
    const myKaizens = historyData.filter(h => h.auditor === activeName && h.stepsOrder.includes('ManualKaizen'));

    let allActivity = [ ...myAudits.map(a => ({ type: 'audit', text: `📝 مراجعة قسم ${a.dept} (${a.totalPct}%)`, date: a.date })), ...myTags.map(t => ({ type: 'tag', text: `🚨 أصدرت تاج ${t.color==='red'?'صيانة':'إنتاج'}: ${t.desc}`, date: t.date })), ...myKaizens.map(k => ({ type: 'kaizen', text: `💡 شاركت بفكرة كايزن في ${k.dept}`, date: k.date })) ].reverse().slice(0, 10); 

    let timelineHtml = allActivity.map(item => `<div class="item-row" style="border-right-color: ${item.type === 'tag' ? 'var(--danger)' : (item.type === 'kaizen' ? 'var(--success)' : 'var(--primary)')}; padding:15px; margin-bottom:10px; background:var(--surface-inset); border-radius:10px;"><span style="flex:1; font-size:13px;">${item.text}</span><small style="color:var(--text-muted); font-size:10px; display:block; margin-top:5px;">${item.date}</small></div>`).join('');

    const timelineContainer = document.getElementById('myActivityTimeline');
    if(timelineContainer) {
        timelineContainer.innerHTML = `
            <div class="dashboard-stats" style="margin-bottom:20px;">
                <div class="stat-card" style="border-color:var(--primary);"><div class="stat-value primary-text">${myAudits.length}</div><div class="stat-label">مراجعة</div></div>
                <div class="stat-card" style="border-color:var(--danger);"><div class="stat-value danger-text">${myTags.length}</div><div class="stat-label">تاج</div></div>
                <div class="stat-card" style="border-color:var(--success);"><div class="stat-value success-text">${myKaizens.length}</div><div class="stat-label">كايزن</div></div>
            </div>
            ${timelineHtml || '<div style="text-align:center; padding:10px; font-size:12px; color:var(--text-muted);">لم يتم رصد أي نشاط ميداني لاسمك الحالي بعد 🚀</div>'}
        `;
    }
    showScreen('profileDetailsScreen');
};

window.savePersonalData = async function() {
    const uid = firebase.auth().currentUser.uid;
    const newName = document.getElementById('editName').value.trim(); const newPhone = document.getElementById('editPhone').value.trim(); const newDept = document.getElementById('editDept').value;
    if(!newName) return showToast('الاسم مطلوب'); showToast('جاري التحديث... ⏳');
    await db.ref(`tpm_system/users/${uid}`).update({ name: newName, phone: newPhone, dept: newDept });
    currentUser.name = newName; localStorage.setItem('tpm_user', newName); showToast('تم التحديث ✅'); window.openMyFullProfile();
};

window.switchSettingsTab = function(tabId, button) {
    document.querySelectorAll('.settings-tab-content').forEach(content => { content.classList.remove('active'); content.style.display = 'none'; });
    document.querySelectorAll('#settingsScreen .settings-navigation .btn').forEach(item => item.classList.remove('active'));
    const targetTab = document.getElementById('tab-' + tabId); if(targetTab) { targetTab.classList.add('active'); targetTab.style.display = 'block'; }
    if(button) button.classList.add('active');
    window.renderSettingsControlLists?.();
};

// ==========================================
// 📈 محرك الشاشة الرئيسية (Home Dashboard)
// ==========================================
window.updateHomeDashboard = function() {
    let tScore = 0, aCount = 0; let deptLabels = [], deptScores = [];
    
    let grid = departments.map(d => {
        let auds = historyData.filter(h => h.dept === d && !h.stepsOrder.includes('ManualKaizen'));
        let sc = auds.length > 0 ? auds[auds.length-1].totalPct : 0;
        if(auds.length > 0) { tScore+=sc; aCount++; }
        let rTags = tagsData.filter(t => t.dept === d && t.status === 'open' && t.color === 'red').length;
        deptLabels.push(d); deptScores.push(sc);
        let colorClass = sc>=80 ? 'success-text' : (sc>=50 ? 'warning-text' : 'danger-text');
        
        return `<div class="card glass-card" style="padding:20px; text-align:center; cursor:pointer; border-bottom:3px solid var(--primary);" onclick="openDeptDashboard('${d}')"><div style="font-size:15px; font-weight:bold; color:var(--text-main); margin-bottom:10px;">${d}</div><div class="stat-value ${colorClass}">${sc}%</div><div style="font-size:11px; color:var(--text-muted); margin-top:8px;">تاجات مفتوحة: <span style="color:var(--danger); font-weight:bold;">${rTags}</span></div></div>`;
    }).join('');
    
    const gridEl = document.getElementById('homeDeptGrid'); if(gridEl) gridEl.innerHTML = grid;
    const avgEl = document.getElementById('homeAvgScore'); if(avgEl) avgEl.innerText = aCount > 0 ? Math.round(tScore/aCount) + '%' : '0%';
    const openEl = document.getElementById('homeOpenTags'); if(openEl) openEl.innerText = tagsData.filter(t => t.status === 'open').length;
    const closedEl = document.getElementById('homeClosedTags'); if(closedEl) closedEl.innerText = tagsData.filter(t => t.status === 'closed').length;
    
    const ctx = document.getElementById('mainDashboardChart');
    if (ctx) {
        if (window.mainChartInstance) window.mainChartInstance.destroy(); 
        window.mainChartInstance = new Chart(ctx, { type: 'bar', data: { labels: deptLabels, datasets: [{ label: 'كفاءة القسم %', data: deptScores, backgroundColor: deptScores.map(s => s >= 80 ? 'rgba(16, 185, 129, 0.2)' : (s >= 50 ? 'rgba(249, 115, 22, 0.2)' : 'rgba(239, 68, 68, 0.2)')), borderColor: deptScores.map(s => s >= 80 ? '#10b981' : (s >= 50 ? '#f97316' : '#ef4444')), borderWidth: 1, borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#94a3b8', font: {family: 'Cairo'} } }, x: { ticks: { color: '#f8fafc', font: {family: 'Cairo', weight: 'bold'} } } }, plugins: { legend: { display: false } } } });
    }

    let criticalTags = tagsData.filter(t => t.status === 'open' && t.color === 'red').slice(0, 5);
    let cTagsHtml = criticalTags.map(t => `<div style="background:rgba(239, 68, 68, 0.1); border-right:3px solid var(--danger); padding:10px; margin-bottom:10px; border-radius:8px; font-size:12px; cursor:pointer;" onclick="showScreen('tagsScreen'); document.getElementById('filterTagDept').value='${t.dept}'; renderTags();"><b style="color:var(--text-main);">${t.desc}</b><br><div style="margin-top:5px;"><span style="color:var(--danger); font-weight:bold;">${t.dept}</span> <span style="color:var(--text-muted);">- ${t.machine||'عام'}</span></div></div>`).join('');
    
    const critContainer = document.getElementById('criticalTagsList');
    if(critContainer) critContainer.innerHTML = cTagsHtml || '<div style="text-align:center; color:var(--success); font-size:12px; padding:20px 0;"><i class="bx bx-check-shield" style="font-size:30px; display:block; margin-bottom:10px;"></i>لا توجد أعطال حرجة متوقفة 🎉</div>';
};

// ==========================================
// 🏭 لوحة تحكم القسم (Department Dashboard)
// ==========================================
window.deptRadarInstance = null; window.deptTrendInstance = null;
window.openDeptDashboard = function(dept) {
    currentViewedDept = dept; showScreen('deptDashboardScreen');
    const titleEl = document.getElementById('deptViewTitle'); if(titleEl) titleEl.innerText = `لوحة قيادة: ${dept}`;
    
    const deptAudits = historyData.filter(h => h.dept === dept && !h.stepsOrder.includes('ManualKaizen')).sort((a,b) => new Date(a.date) - new Date(b.date));
    const deptTags = tagsData.filter(t => t.dept === dept && t.status === 'open');
    const deptTasks = tasksData.filter(t => t.dept === dept && t.status !== 'done');
    const lastAudit = deptAudits[deptAudits.length-1];
    
    if(document.getElementById('deptAvgScore')) document.getElementById('deptAvgScore').innerText = lastAudit ? lastAudit.totalPct + '%' : '0%';
    if(document.getElementById('deptOpenTags')) document.getElementById('deptOpenTags').innerText = deptTags.length;
    if(document.getElementById('deptTasksCount')) document.getElementById('deptTasksCount').innerText = deptTasks.length;

    try {
        const steps = ['JH-0', 'JH-1', 'JH-2', 'JH-3', 'JH-4', 'JH-5', 'JH-6'];
        const stepScores = steps.map(s => { if (!lastAudit || !lastAudit.results[s] || lastAudit.results[s].skipped) return 0; return Math.round((lastAudit.results[s].score / lastAudit.results[s].max) * 100); });
        const radarCtx = document.getElementById('deptRadarChart');
        if (radarCtx && typeof Chart !== 'undefined') {
            if (window.deptRadarInstance) window.deptRadarInstance.destroy();
            window.deptRadarInstance = new Chart(radarCtx, { type: 'radar', data: { labels: ['التحضيرية', 'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'], datasets: [{ label: 'مستوى التنفيذ %', data: stepScores, backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6', pointBackgroundColor: '#3b82f6', borderWidth: 2 }] }, options: { scales: { r: { beginAtZero: true, max: 100, ticks: { display: false }, grid: {color:'rgba(255,255,255,0.1)'}, angleLines: {color:'rgba(255,255,255,0.1)'} } }, plugins: { legend: { display: false } } } });
        }
    } catch(e) {}

    try {
        const trendCtx = document.getElementById('deptTrendChart');
        if (trendCtx && typeof Chart !== 'undefined') {
            if (window.deptTrendInstance) window.deptTrendInstance.destroy();
            window.deptTrendInstance = new Chart(trendCtx, { type: 'line', data: { labels: deptAudits.slice(-5).map(a => a.date.split('/')[0] + '/' + a.date.split('/')[1]), datasets: [{ label: 'الكفاءة %', data: deptAudits.slice(-5).map(a => a.totalPct), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 }] }, options: { scales: { y: { beginAtZero: true, max: 100, grid:{color:'rgba(255,255,255,0.05)'} }, x: {grid:{display:false}} }, plugins: { legend: { display: false } } } });
        }
    } catch(e) {}

    const actionItemsEl = document.getElementById('deptActionItems');
    if(actionItemsEl) {
        actionItemsEl.innerHTML = deptTags.slice(0,3).map(t => `<div style="background:var(--surface-inset); padding:15px; border-right:4px solid var(--danger); border-radius:12px; margin-bottom:10px; border: 1px solid var(--border-glass);"><div style="font-size:13px; font-weight:bold; color:var(--text-main);"><i class='bx bx-error-circle' style="color:var(--danger);"></i> ${t.desc}</div><div style="font-size:11px; color:var(--text-muted); margin-top:8px;"><i class='bx bx-cog'></i> ${t.machine || 'عام'} | <i class='bx bx-user'></i> ${t.auditor}</div></div>`).join('') || '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:20px;"><i class="bx bx-check-double" style="font-size:40px; color:var(--success); display:block; margin-bottom:10px;"></i>القسم مستقر ولا توجد أعطال حرجة</div>';
    }
};

// 📂 محرك الشاشات الداخلية والسجلات (JH Tools Engine)
// ==========================================
window.openJHDocument = async function(type) {
    if (type === 'CLIT' && typeof window.openJHDocumentCLITMap === 'function') {
        return window.openJHDocumentCLITMap(type);
    }

    currentDocType = type;
    const configs = {
        'Contamination': {
            kicker:'LOSS SOURCE',
            title:'خريطة مصادر التلوث',
            description:'حصر مصادر التلوث ومواقعها وأسبابها وإجراءات السيطرة عليها.',
            icon:'bx-water',
            color:'#795548',
            empty:'لا توجد مصادر تلوث مسجلة لهذا القسم.'
        },
        'SOC': {
            kicker:'ACCESS / METHOD',
            title:'خريطة الأماكن صعبة الوصول',
            description:'تحديد نقاط الوصول الصعبة وأسباب الصعوبة والإجراءات اللازمة لتحسين الوصول.',
            icon:'bx-map-pin',
            color:'#f59e0b',
            empty:'لا توجد نقاط وصول صعبة مسجلة لهذا القسم.'
        },
        'Safety': {
            kicker:'SAFETY',
            title:'خريطة مخاطر الأمان',
            description:'حصر المخاطر، تقييم مستوى الخطورة، وربط كل خطر بموقعه وإجراء التحكم.',
            icon:'bx-shield-quarter',
            color:'#ef4444',
            empty:'لا توجد مخاطر أمان مسجلة لهذا القسم.'
        },
        'Anatomy': {
            kicker:'EQUIPMENT',
            title:'تشريح أجزاء الماكينة',
            description:'قاعدة معرفة فنية لأجزاء المعدة ووظائفها ونقاط الفحص والحالة القياسية.',
            icon:'bx-cog',
            color:'#d4a017',
            empty:'لا توجد أجزاء ماكينة مسجلة لهذا القسم.'
        }
    };
    const cfg = configs[type] || {
        kicker:'JH WORKSPACE',
        title:'سجل القسم',
        description:'سجلات تشغيلية خاصة بالقسم الحالي.',
        icon:'bx-file',
        color:'#1686a5',
        empty:'لا توجد سجلات لهذا القسم.'
    };

    const screen = document.getElementById('jhDocumentScreen');
    if (screen) {
        screen.dataset.docType = type;
        screen.style.setProperty('--jh-doc-color', cfg.color);
    }

    const headEl = document.getElementById('jhDocHeader');
    if (headEl) headEl.innerHTML = "<i class='bx " + cfg.icon + "'></i> " + cfg.title;

    const contextBar = document.getElementById('jhDocContextBar');
    if (contextBar) {
        contextBar.innerHTML =
            "<div class='jh-doc-context-icon' style='--jh-doc-color:" + cfg.color + "'><i class='bx " + cfg.icon + "'></i></div>" +
            "<div class='jh-doc-context-copy'><span>" + cfg.kicker + "</span><h3>" + cfg.title + "</h3><p>" + cfg.description + "</p></div>" +
            "<div class='jh-doc-context-meta'><b id='jhDocRecordCount'>0</b><span>سجلات القسم</span></div>";
        contextBar.style.display = 'grid';
    }

    const clitWorkspace = document.getElementById('clitMapWorkspace');
    if (clitWorkspace) {
        clitWorkspace.hidden = true;
        clitWorkspace.style.display = 'none';
    }

    const actionArea = document.getElementById('jhDocActionArea');
    const listContainer = document.getElementById('jhDocListContainer');
    if (actionArea) {
        actionArea.style.display = '';
        actionArea.innerHTML = '';
    }
    if (listContainer) {
        listContainer.style.display = '';
        listContainer.innerHTML = '';
    }

    ['clitStatsSummary', 'clitZoneFilters', 'clitOpFilters', 'clitFrequencyFilters', 'startChecklistBtnContainer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    window.__jhActiveDocType = type;
    window.renderJHDocForm(type);
    window.mountJHDataTools?.(type);

    showToast('جاري تحميل سجلات " + cfg.title + "... ⏳');

    try {
        const snap = await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}`).once('value');
        const records = snap.val() ? Object.values(snap.val()) : [];

        window.currentLoadedRecords = records;
        const countEl = document.getElementById('jhDocRecordCount');
        if (countEl) countEl.innerText = records.length;

        window.renderJHDocList(type, records);
        showScreen('jhDocumentScreen');
    } catch (error) {
        console.error('[JH] document load failed', error);
        if (listContainer) {
            listContainer.innerHTML = "<div class='jh-doc-empty'><i class='bx bx-error-circle'></i><b>تعذر تحميل سجلات هذا القسم</b><span>تحقق من الاتصال وحاول مرة أخرى.</span></div>";
        }
        showToast('⚠️ تعذر تحميل سجلات القسم. حاول مرة أخرى.');
    }
};

window.renderJHDocForm = function(type) {
    let formHtml = '';
    const actionArea = document.getElementById('jhDocActionArea');
    if(!actionArea) return;

    if(type === 'CLIT') { 
        formHtml = `
            <h4 style="margin:0 0 15px; color:#00BCD4;"><i class='bx bx-plus-circle'></i> تسجيل نقطة CLIT جديدة بالخريطة</h4>
            <div class="row-flex">
                <div class="form-group flex-1">
                    <label style="font-size:12px; color:var(--text-muted);">نوع العملية</label>
                    <select id="clitType" class="form-control"><option value="تنظيف">تنظيف (C)</option><option value="تزييت">تزييت/تشحيم (L)</option><option value="فحص">فحص (I)</option><option value="تربيط">تربيط (T)</option></select>
                </div>
                <div class="form-group flex-1">
                    <label style="font-size:12px; color:var(--text-muted);">الدورية (التكرار)</label>
                    <select id="clitFreq" class="form-control"><option value="يومي">يومي / وردية</option><option value="أسبوعي">أسبوعي</option><option value="شهري">شهري</option><option value="سنوي">سنوي</option></select>
                </div>
            </div>
            <div class="row-flex">
                <div class="form-group flex-1"><label style="font-size:12px; color:var(--text-muted);">المنطقة</label><input type="text" id="clitRegion" class="form-control" placeholder="مثال: الفرن"></div>
                <div class="form-group flex-1"><label style="font-size:12px; color:var(--text-muted);">الجزء</label><input type="text" id="clitPart" class="form-control" placeholder="مثال: البلي / الرولمان"></div>
            </div>
            <div class="form-group"><label style="font-size:12px; color:var(--text-muted);">الإجراء المطلوب بدقة</label><textarea id="clitAction" class="form-control" rows="2" placeholder="ما الذي سيفعله الفني بالتحديد؟"></textarea></div>
            <div class="row-flex">
                <div class="form-group flex-1"><label style="font-size:12px; color:var(--text-muted);">الحالة المثلى / المعيار</label><input type="text" id="clitStandard" class="form-control" placeholder="خالي من الأتربة.."></div>
                <div class="form-group flex-1"><label style="font-size:12px; color:var(--text-muted);">حالة التدهور المتوقعة</label><input type="text" id="clitDegradation" class="form-control" placeholder="تراكم رايش.."></div>
            </div>
            <div class="row-flex">
                <div class="form-group flex-1"><label style="font-size:12px; color:var(--text-muted);">الأدوات المستخدمة</label><input type="text" id="clitTools" class="form-control" placeholder="فوطة، مزيتة.."></div>
                <div class="form-group flex-1">
                    <label style="font-size:12px; color:var(--text-muted);">حالة الماكينة</label>
                    <select id="clitMachineState" class="form-control"><option value="لا تعمل">يجب أن تكون متوقفة 🛑</option><option value="تعمل">أثناء التشغيل 🟢</option></select>
                </div>
            </div>
            <div class="row-flex">
                <div class="form-group flex-1"><label style="font-size:12px; color:var(--text-muted);">الزمن قبل التحسين</label><input type="text" id="clitTimeBefore" class="form-control" placeholder="مثال: 5m"></div>
                <div class="form-group flex-1"><label style="font-size:12px; color:var(--text-muted);">الزمن المستهدف (بعد)</label><input type="text" id="clitTimeAfter" class="form-control" placeholder="مثال: 2m"></div>
            </div>
            <button class="btn btn-primary full-width" style="background:#00BCD4; border:none;" onclick="saveJHRecord('CLIT')"><i class='bx bx-save'></i> إضافة وتحديث الخريطة</button>
        `; 
    } else if(type === 'Contamination') { 
        formHtml = `
            <h4 style="margin:0 0 15px; color:#795548;"><i class='bx bx-water'></i> رصد مصدر تلوث</h4>
            <div class="form-group"><label style="font-size:12px; color:var(--text-muted);">مكان التلوث أو التسريب</label><input type="text" id="contLocation" class="form-control" placeholder="مثال: أسفل طلمبة الهيدروليك"></div>
            <div class="form-group"><label style="font-size:12px; color:var(--text-muted);">نوع المادة الملوثة</label><input type="text" id="contType" class="form-control" placeholder="زيت، بودرة، مياه، هالك إنتاج.."></div>
            <button class="btn btn-primary full-width" style="background:#795548; color:white; border:none;" onclick="saveJHRecord('Contamination')"><i class='bx bx-target-lock'></i> رصد المصدر</button>
        `; 
    } else if(type === 'SOC') { 
        formHtml = `
            <h4 style="margin:0 0 15px; color:var(--warning);"><i class='bx bx-map-pin'></i> تسجيل منطقة صعبة الوصول</h4>
            <div class="form-group"><label style="font-size:12px; color:var(--text-muted);">المنطقة</label><input type="text" id="socLocation" class="form-control" placeholder="أين تقع الصعوبة بالتحديد؟"></div>
            <div class="form-group"><label style="font-size:12px; color:var(--text-muted);">سبب الصعوبة</label><input type="text" id="socReason" class="form-control" placeholder="ضيق مساحة، حرارة عالية، ارتفاع.."></div>
            <button class="btn btn-warning full-width" style="border:none;" onclick="saveJHRecord('SOC')"><i class='bx bx-plus-circle'></i> تسجيل في الخريطة</button>
        `; 
    } else if(type === 'Safety') { 
        formHtml = `
            <h4 style="margin:0 0 15px; color:var(--danger);"><i class='bx bx-error-alt'></i> تسجيل خطر أمان (Safety Hazard)</h4>
            <div class="form-group"><label style="font-size:12px; color:var(--text-muted);">وصف الخطر والمكان</label><input type="text" id="safeHazard" class="form-control" placeholder="مثال: كابل كهرباء مكشوف بجوار الفرن"></div>
            <div class="form-group">
                <label style="font-size:12px; color:var(--text-muted);">مستوى الخطورة</label>
                <select id="safeLevel" class="form-control"><option value="high">حرج (مطلوب إيقاف فوري) 🔴</option><option value="med">متوسط 🟡</option></select>
            </div>
            <button class="btn btn-danger full-width" style="border:none;" onclick="saveJHRecord('Safety')"><i class='bx bx-shield-x'></i> تسجيل الخطر فوراً</button>
        `; 
    } else { 
        formHtml = `
            <h4 style="margin:0 0 15px; color:var(--gold);"><i class='bx bx-cogs'></i> تشريح جزء من الماكينة (Anatomy)</h4>
            <div class="form-group"><label style="font-size:12px; color:var(--text-muted);">اسم الجزء</label><input type="text" id="partName" class="form-control" placeholder="مثال: الرولمان بلي رقم 3"></div>
            <div class="form-group"><label style="font-size:12px; color:var(--text-muted);">الوظيفة وطريقة الفحص السليمة</label><textarea id="partDesc" class="form-control" placeholder="اشرح بالتفصيل..." rows="3"></textarea></div>
            <button class="btn btn-primary full-width" style="background:var(--gold); color:#000; border:none;" onclick="saveJHRecord('Anatomy')"><i class='bx bx-save'></i> حفظ البيانات الفنية</button>
        `; 
    }
    
    actionArea.innerHTML = `<div style="background:var(--surface-inset); padding:20px; border-radius:var(--radius-lg); border:1px solid var(--border-glass); box-shadow:var(--shadow-pressed);">${formHtml}</div>`;
};

// ==========================================
// 📷 التقاط الصور والتوقيع الرقمي
// ==========================================
window.openImageSourcePicker = function(itemId, itemTitle) { window.currentUploadItemId = itemId; window.currentUploadItemTitle = itemTitle; document.getElementById('imageSourceModal').style.display = 'flex'; };
window.triggerCamera = function() { document.getElementById('cameraInput').click(); document.getElementById('imageSourceModal').style.display = 'none'; };
window.triggerGallery = function() { document.getElementById('galleryInput').click(); document.getElementById('imageSourceModal').style.display = 'none'; };

window.handleImageSelection = async function(event) {
    const file = event.target.files[0]; if(!file || !window.currentUploadItemId) return;
    showToast('جاري رفع وتحليل الصورة...');
    processAndEnhanceImage(file, async function(dataUrl) {
        const url = await uploadImageToStorage(dataUrl);
        if (url) { currentStepImages['img_' + window.currentUploadItemId] = { title: window.currentUploadItemTitle, data: url }; window.saveAuditDraft(); window.renderCurrentAuditStep(); showToast('تم الرفع'); } 
        else { showToast('فشل الرفع'); }
    });
};

window.deleteAuditEvidence = async function(itemId) {
    const key = 'img_' + itemId;
    const imgObj = currentStepImages?.[key];
    if(!imgObj) return;

    if(!confirm('حذف صورة الدليل لهذا البند؟')) return;

    try {
        if(imgObj.data) {
            try { await window.deleteStorageImage(imgObj.data); }
            catch(storageError) { console.warn('[JH Audit] Storage image delete failed:', storageError); }
        }
        delete currentStepImages[key];
        if(currentAudit?.stepsOrder) {
            const stepKey = currentAudit.stepsOrder[currentAudit.currentStepIndex];
            const step = window.AuditState?.ensureStep(stepKey);
            if(step) step.images = currentStepImages;
        }
        window.saveAuditDraft();
        window.renderCurrentAuditStep();
        showToast('🗑️ تم حذف صورة الدليل');
    } catch(error) {
        console.error('[JH Audit] Evidence delete failed:', error);
        showToast('❌ تعذر حذف صورة الدليل');
    }
};

window.initSignaturePad = function() {
    setTimeout(() => {
        sigCanvas = document.getElementById('signatureCanvas'); if(!sigCanvas) return;
        sigCtx = sigCanvas.getContext('2d'); sigCtx.lineWidth = 3; sigCtx.strokeStyle = '#3b82f6'; sigCtx.lineCap = 'round'; window.clearSignature(); 
        const startDrawing = (x, y) => { isDrawing = true; canvasRect = sigCanvas.getBoundingClientRect(); sigCtx.beginPath(); sigCtx.moveTo(x - canvasRect.left, y - canvasRect.top); };
        const draw = (x, y) => { if(isDrawing) { sigCtx.lineTo(x - canvasRect.left, y - canvasRect.top); sigCtx.stroke(); } };
        sigCanvas.onmousedown = (e) => startDrawing(e.clientX, e.clientY); sigCanvas.onmousemove = (e) => draw(e.clientX, e.clientY); sigCanvas.onmouseup = () => isDrawing = false; sigCanvas.onmouseleave = () => isDrawing = false;
        sigCanvas.ontouchstart = (e) => { startDrawing(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }; sigCanvas.ontouchmove = (e) => { draw(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }; sigCanvas.ontouchend = () => isDrawing=false;
    }, 300); 
};
window.clearSignature = function() { if(sigCtx) { sigCtx.fillStyle = "#ffffff"; sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height); } };

// ==========================================
// 📊 أرشيف التقارير (History Engine)
// ==========================================
window.__auditCharts = window.__auditCharts || {};

window.auditStepLabel = function(key) {
    const map = {
        'JH': 'JH / التحسين الذاتي', 'JHPortal': 'JH / التحسين الذاتي',
        'AM': 'الصيانة الذاتية', 'PM': 'الصيانة المخططة', 'QM': 'الصيانة الجودة',
        'ET': 'التعليم والتدريب', 'HSE': 'السلامة والبيئة', 'KK': 'تحسين الخسائر',
        '5S': '5S / التنظيم', 'Safety': 'السلامة', 'Quality': 'الجودة',
        'Production': 'الإنتاج', 'ManualKaizen': 'كايزن'
    };
    return map[key] || String(key || 'محور غير محدد').replace(/_/g,' ');
};

window.auditDateValue = function(a) {
    const raw = a?.createdAt || a?.timestamp || a?.date;
    const d = raw ? new Date(raw) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
};

window.getFilteredAuditRecords = function() {
    const dept = document.getElementById('reportsDeptFilter')?.value || 'all';
    const period = document.getElementById('reportsPeriodFilter')?.value || 'all';
    const cutoff = period !== 'all' ? Date.now() - Number(period) * 86400000 : 0;
    return (Array.isArray(historyData) ? historyData : []).filter(a => {
        if (!a || !Array.isArray(a.stepsOrder) || a.stepsOrder.includes('ManualKaizen')) return false;
        if (dept !== 'all' && String(a.dept || '') !== dept) return false;
        const d = window.auditDateValue(a);
        if (cutoff && d && d.getTime() < cutoff) return false;
        return true;
    });
};

window.destroyAuditChart = function(id) {
    if (window.__auditCharts[id]) { try { window.__auditCharts[id].destroy(); } catch(e) {} delete window.__auditCharts[id]; }
};

window.renderHistoryAnalytics = function() {
    const records = window.getFilteredAuditRecords();
    const total = records.length;
    const avg = total ? Math.round(records.reduce((s,a)=>s+Number(a.totalPct||0),0)/total) : 0;
    const pass = total ? Math.round(records.filter(a=>Number(a.totalPct||0)>=80).length/total*100) : 0;
    const critical = records.filter(a=>Number(a.totalPct||0)<50).length;
    const recent = records.slice().sort((a,b)=>(window.auditDateValue(b)?.getTime()||0)-(window.auditDateValue(a)?.getTime()||0))[0];

    const kpi = document.getElementById('reportsKpiGrid');
    if(kpi) kpi.innerHTML = [
        ['إجمالي المراجعات', total, 'مراجعة مسجلة', 'blue', 'bx-file-find'],
        ['متوسط الأداء', avg+'%', 'متوسط النتيجة', avg>=80?'green':avg>=50?'amber':'red', 'bx-trending-up'],
        ['نسبة الاجتياز', pass+'%', 'مراجعات ≥ 80%', pass>=80?'green':'amber', 'bx-check-shield'],
        ['حالات حرجة', critical, 'أقل من 50%', critical?'red':'green', 'bx-error-circle']
    ].map(x=>`<div class="reports-kpi-card ${x[3]}"><div class="reports-kpi-icon"><i class='bx ${x[4]}'></i></div><div><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div></div>`).join('');

    const deptSel=document.getElementById('reportsDeptFilter');
    if(deptSel){
        const selected=deptSel.value||'all';
        const depts=[...new Set((Array.isArray(historyData)?historyData:[]).filter(a=>a&&!a.stepsOrder?.includes('ManualKaizen')).map(a=>a.dept).filter(Boolean))].sort();
        deptSel.innerHTML='<option value="all">كل الأقسام</option>'+depts.map(d=>`<option value="${window.escapeTPM(d)}">${window.escapeTPM(d)}</option>`).join('');
        if(depts.includes(selected)||selected==='all') deptSel.value=selected; else deptSel.value='all';
    }
    const stamp=document.getElementById('reportsDataStamp'); if(stamp) stamp.textContent=`متزامن • آخر تحديث ${new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}`;
    const count=document.getElementById('reportsArchiveCount'); if(count) count.textContent=`${total} مراجعة${total===1?'':'ات'} ضمن الفلتر الحالي`;

    const sorted=records.slice().sort((a,b)=>(window.auditDateValue(a)?.getTime()||0)-(window.auditDateValue(b)?.getTime()||0));
    const trendLabels=sorted.map(a=>{const d=window.auditDateValue(a); return d?d.toLocaleDateString('ar-EG',{day:'2-digit',month:'2-digit'}):String(a.date||'').slice(0,10)});
    const trendData=sorted.map(a=>Number(a.totalPct||0));
    window.destroyAuditChart('trend');
    const tc=document.getElementById('auditTrendChart');
    if(tc && window.Chart) window.__auditCharts.trend=new Chart(tc,{type:'line',data:{labels:trendLabels,datasets:[{label:'النتيجة %',data:trendData,borderColor:'#2583e8',backgroundColor:'rgba(37,131,232,.10)',fill:true,tension:.35,pointRadius:4,pointHoverRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{rtl:true}},scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'}},x:{grid:{display:false}}}}});

    const deptMap={}; records.forEach(a=>{const d=a.dept||'غير محدد';(deptMap[d] ||= []).push(Number(a.totalPct||0));});
    const deptRows=Object.entries(deptMap).map(([d,v])=>[d,Math.round(v.reduce((x,y)=>x+y,0)/v.length)]).sort((a,b)=>b[1]-a[1]);
    window.destroyAuditChart('dept');
    const dc=document.getElementById('auditDeptChart');
    if(dc&&window.Chart) window.__auditCharts.dept=new Chart(dc,{type:'bar',data:{labels:deptRows.map(x=>x[0]),datasets:[{label:'المتوسط %',data:deptRows.map(x=>x[1]),backgroundColor:'#2583e8',borderRadius:7}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{min:0,max:100,ticks:{callback:v=>v+'%'}},y:{grid:{display:false}}}}});

    const stepMap={}; records.forEach(a=>{(a.stepsOrder||[]).forEach(k=>{const r=a.results?.[k];if(!r||r.skipped||!Number(r.max))return;(stepMap[k] ||= []).push(Number(r.score)/Number(r.max)*100);});});
    const stepRows=Object.entries(stepMap).map(([k,v])=>[k,Math.round(v.reduce((x,y)=>x+y,0)/v.length)]).sort((a,b)=>a[1]-b[1]).slice(0,8);
    window.destroyAuditChart('steps');
    const sc=document.getElementById('auditStepChart');
    if(sc&&window.Chart) window.__auditCharts.steps=new Chart(sc,{type:'bar',data:{labels:stepRows.map(x=>window.auditStepLabel(x[0])),datasets:[{label:'المتوسط %',data:stepRows.map(x=>x[1]),backgroundColor:stepRows.map(x=>x[1]<50?'#ef5350':x[1]<80?'#f1ad2f':'#20a66a'),borderRadius:7}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{min:0,max:100,ticks:{callback:v=>v+'%'}},y:{grid:{display:false}}}}});

    const risk={critical:records.filter(a=>Number(a.totalPct||0)<50).length,warning:records.filter(a=>Number(a.totalPct||0)>=50&&Number(a.totalPct||0)<80).length,good:records.filter(a=>Number(a.totalPct||0)>=80).length};
    window.destroyAuditChart('risk');
    const rc=document.getElementById('auditRiskChart');
    if(rc&&window.Chart) window.__auditCharts.risk=new Chart(rc,{type:'doughnut',data:{labels:['حرج <50%','تحت الهدف 50–79%','مستقر ≥80%'],datasets:[{data:[risk.critical,risk.warning,risk.good],backgroundColor:['#ef5350','#f1ad2f','#20a66a'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{display:false}}}});
    const legend=document.getElementById('reportsRiskLegend');
    if(legend) legend.innerHTML=[['#ef5350','حرج',risk.critical],['#f1ad2f','تحت الهدف',risk.warning],['#20a66a','مستقر',risk.good]].map(x=>`<div><i style="background:${x[0]}"></i><span>${x[1]}</span><b>${x[2]}</b></div>`).join('');

    window.renderHistoryArchive?.();
    const opportunities=[];
    stepRows.forEach(([k,p])=>{opportunities.push({title:window.auditStepLabel(k),score:p,count:stepMap[k].length,text:p<50?'أولوية فورية: فجوة أداء كبيرة تحتاج إجراء تصحيحي.':p<80?'أولوية تحسين: الأداء دون المستوى المستهدف.':'فرصة تحسين مستمرة: الأداء جيد مع قابلية للرفع.'});});
    const oc=document.getElementById('reportsOpportunityList');
    if(oc) oc.innerHTML=opportunities.slice(0,6).map((o,i)=>`<div class="report-opportunity-row"><span class="report-op-rank">${String(i+1).padStart(2,'0')}</span><div><b>${window.escapeTPM(o.title)}</b><p>${o.text} • ${o.count} مراجعة</p></div><strong class="${o.score<50?'red':o.score<80?'amber':'green'}">${o.score}%</strong></div>`).join('')||'<div class="reports-empty">لا توجد بيانات كافية لبناء فرص التحسين.</div>';

};

window.renderHistoryArchive = function() {
    const container=document.getElementById('historyListContainer'); if(!container)return;
    const real=window.getFilteredAuditRecords().slice().reverse();
    container.innerHTML=real.map(a=>{
        const pct=Number(a.totalPct||0), cls=pct>=80?'green':pct>=50?'amber':'red';
        const d=window.auditDateValue(a); const dateText=d?d.toLocaleDateString('ar-EG',{year:'numeric',month:'2-digit',day:'2-digit'}):window.escapeTPM(a.date||'—');
        const canEdit=window.hasRole('admin')||currentUser.name===a.auditor;
        return `<article class="report-archive-card" onclick="viewDetailedReport('${window.escapeTPM(a.id)}')">
            <div class="report-card-top"><div><span class="report-dept"><i class='bx bx-buildings'></i>${window.escapeTPM(a.dept||'غير محدد')}</span><h3>${window.escapeTPM(a.machine||'مراجعة تشغيلية')}</h3></div><strong class="report-score ${cls}">${pct}%</strong></div>
            <div class="report-card-meta"><span><i class='bx bx-user'></i>${window.escapeTPM(a.auditor||'—')}</span><span><i class='bx bx-calendar'></i>${dateText}</span></div>
            <div class="report-mini-progress"><span class="${cls}" style="width:${Math.max(0,Math.min(100,pct))}%"></span></div>
            <div class="report-card-footer"><span>${(a.stepsOrder||[]).filter(k=>k!=='ManualKaizen').length} محاور مراجعة</span><span>فتح التقرير <i class='bx bx-left-arrow-alt'></i></span></div>
            ${canEdit?`<div class="report-card-actions"><button class="btn btn-sm btn-outline" onclick="event.stopPropagation();editReport('${window.escapeTPM(a.id)}')"><i class='bx bx-edit'></i> تعديل</button><button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteReport('${window.escapeTPM(a.id)}')"><i class='bx bx-trash'></i> حذف</button></div>`:''}
        </article>`;
    }).join('')||'<div class="reports-empty"><i class="bx bx-archive"></i><b>لا توجد مراجعات ضمن الفلتر الحالي</b><span>أنشئ أول مراجعة لبدء التحليل.</span></div>';
};

window.renderHistory = function() {
    window.renderHistoryArchive?.();
    window.renderHistoryAnalytics?.();
};

window.deleteReport = function(id) { if(confirm('تأكيد الحذف النهائي للتقرير؟')) { window.deleteRecord('history/' + id); showToast('تم الحذف بنجاح'); } };
window.editReport = function(id) { let rep = historyData.find(h => String(h.id) === String(id)); if(!rep) return; currentAudit = JSON.parse(JSON.stringify(rep)); currentAudit.currentStepIndex = 0; window.renderCurrentAuditStep(); };

window.viewDetailedReport = function(id) {
    const a=historyData.find(h=>String(h.id)===String(id)); if(!a)return;
    document.getElementById('detDept').innerText=a.dept||'غير محدد';
    document.getElementById('detMachine').innerText=a.machine||'عام';
    document.getElementById('detAuditor').innerText=a.auditor||'—';
    document.getElementById('detDate').innerText=a.date||'—';
    const totalPct=Math.round(Number(a.totalPct||0));
    document.getElementById('detPct').innerText=totalPct+'%';
    const ring=document.querySelector('#detailedReportScreen .audit-score-ring'); if(ring) ring.style.setProperty('--score-angle',Math.max(0,Math.min(100,totalPct))*3.6+'deg');
    const grade=totalPct>=90?'ممتاز':totalPct>=80?'جيد جداً':totalPct>=70?'جيد':totalPct>=50?'مقبول':'ضعيف';
    const gradeEl=document.getElementById('detGrade'); gradeEl.innerText=grade; gradeEl.style.color=totalPct>=80?'#20a66a':totalPct>=50?'#f1ad2f':'#ef5350';

    const rows=(a.stepsOrder||[]).filter(k=>k!=='ManualKaizen').map(k=>{const r=a.results?.[k];if(!r)return null;const p=r.skipped?0:(Number(r.max)?Math.round(Number(r.score||0)/Number(r.max)*100):0);return {k,r,p};}).filter(Boolean);
    const avgStep=rows.length?Math.round(rows.reduce((s,x)=>s+x.p,0)/rows.length):0;
    const weak=rows.slice().sort((x,y)=>x.p-y.p), critical=weak.filter(x=>x.p<50).length;
    const priority=critical?'عالية':weak.some(x=>x.p<80)?'متوسطة':'منخفضة', risk=critical?'مرتفع':weak.some(x=>x.p<80)?'متوسط':'منخفض';
    document.getElementById('detDecisionSummary').innerText=totalPct>=80?'الأداء العام ضمن المستوى المستهدف، مع فرص تحسين محددة في المحاور الأقل نتيجة.':'النتيجة أقل من المستوى المستهدف؛ يوصى بتركيز خطة الإجراء على المحاور ذات الفجوة الأكبر ومتابعة الإغلاق.';
    document.getElementById('detPriorityBadge').innerHTML='<i class=\'bx bx-target-lock\'></i> أولوية: '+priority;
    document.getElementById('detRiskBadge').innerHTML='<i class=\'bx bx-error-circle\'></i> مستوى المخاطر: '+risk;
    const ds=document.getElementById('detDecisionState'), dh=document.getElementById('detDecisionHint');
    if(ds) ds.textContent=totalPct>=80?'مستقر':totalPct>=50?'تحسين مطلوب':'إجراء عاجل';
    if(dh) dh.textContent=critical?'توجد فجوة حرجة تتطلب إجراءً ومتابعة.':weak.some(x=>x.p<80)?'توجد فجوات محددة تحتاج خطة تحسين.':'المستوى العام مستقر مع متابعة الاستدامة.';
    const dk=document.getElementById('detDecisionKpis'); if(dk)dk.innerHTML=[['النتيجة النهائية',totalPct+'%','الدرجة المسجلة'],['متوسط المحاور',avgStep+'%','متوسط نتائج البنود'],['فجوات حرجة',critical,'محاور أقل من 50%'],['محاور التحسين',weak.filter(x=>x.p<80).length,'أقل من 80%']].map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join('');

    window.__detailAuditCharts=window.__detailAuditCharts||{};
    if(window.__detailAuditCharts.radar){try{window.__detailAuditCharts.radar.destroy()}catch(e){}}
    const radar=document.getElementById('detailRadarChart');
    if(radar&&window.Chart)window.__detailAuditCharts.radar=new Chart(radar,{type:'radar',data:{labels:rows.map(x=>window.auditStepLabel(x.k)),datasets:[{label:'نتيجة المحور %',data:rows.map(x=>x.p),borderColor:'#2583e8',backgroundColor:'rgba(37,131,232,.16)',pointBackgroundColor:'#2583e8',pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,scales:{r:{min:0,max:100,ticks:{stepSize:20,callback:v=>v+'%'},pointLabels:{font:{family:'Cairo',size:11,weight:'700'}}}},plugins:{legend:{display:false}}}});

    let tableHtml='',detailsHtml='';
    rows.forEach(({k,r,p},idx)=>{
        const pColor=p>=80?'#20a66a':p>=50?'#f1ad2f':'#ef5350';
        const status=p>=80?'مستقر':p>=50?'يحتاج تحسين':'حرج';
        const statusIcon=p>=80?'bx-check-circle':p>=50?'bx-wrench':'bx-error-circle';
        const imps=Array.isArray(r.improvements)&&r.improvements.length?r.improvements.map(i=>`<li>${window.escapeTPM(i)}</li>`).join(''):'<li>لم يتم تسجيل فرصة تحسين مباشرة في هذا المحور.</li>';
        let imgsHtml='';if(r.images)Object.values(r.images).forEach(img=>{if(img?.data)imgsHtml+=`<button type="button" class="evidence-thumb" onclick="openAuditEvidence(this)"><img src="${img.data}" alt="دليل المراجعة"></button>`;});
        tableHtml+=`<tr onclick="focusAuditStep(${idx})"><td><span class="matrix-step"><i class='bx bx-right-top-arrow-circle'></i>${window.escapeTPM(window.auditStepLabel(k))}</span></td><td><b>${r.skipped?'تخطي':(r.score||0)+' / '+(r.max||0)}</b></td><td><strong style="color:${pColor}">${p}%</strong></td><td><span class="matrix-status" style="color:${pColor}"><i class='bx ${statusIcon}'></i>${status}</span></td></tr>`;
        detailsHtml+=`<article class="audit-evidence-card detail-step-card" id="auditStepCard-${idx}">
          <button class="audit-evidence-head" type="button" onclick="toggleAuditEvidence(${idx})">
            <span class="audit-step-number">${String(idx+1).padStart(2,'0')}</span>
            <span class="audit-evidence-title"><span class="eyebrow">AUDIT STEP</span><b>${window.escapeTPM(window.auditStepLabel(k))}</b></span>
            <span class="audit-evidence-score" style="--score-color:${pColor}">${p}%</span>
            <i class='bx bx-chevron-down audit-evidence-chevron'></i>
          </button>
          <div class="audit-evidence-body">
            <div class="audit-evidence-copy">
              <span class="audit-detail-label"><i class='bx bx-bulb'></i> الملاحظات وفرص التحسين</span>
              <ul>${imps}</ul>
            </div>
            ${imgsHtml?`<div class="audit-evidence-gallery">${imgsHtml}</div>`: '<div class="audit-no-evidence"><i class="bx bx-image-alt"></i><span>لا توجد صور مرفقة</span></div>'}
          </div>
        </article>`;
    });
    document.getElementById('detStepsTableBody').innerHTML=tableHtml;
    document.getElementById('detStepsContainer').innerHTML=detailsHtml||'<div class="reports-empty">لا توجد تفاصيل مسجلة.</div>';

    const opp=document.getElementById('detOpportunityContainer');
    if(opp)opp.innerHTML=weak.slice(0,5).map((x,i)=>{
        const sourceRecord=a.results?.[x.k]||{};
        const actual=Array.isArray(sourceRecord.improvements)?sourceRecord.improvements.filter(Boolean):[];
        const fallback=x.p<50?'إجراء تصحيحي عاجل مع تحديد المالك وموعد الإغلاق والتحقق من الفاعلية.':x.p<80?'تنفيذ إجراء تحسين محدد، ثم إعادة التحقق من المحور خلال دورة المراجعة القادمة.':'الحفاظ على المعيار الحالي مع تحسين تدريجي ومتابعة الاستدامة.';
        const detail=actual.length?actual.join(' — '):fallback;
        const sev=x.p<50?'critical':x.p<80?'warning':'stable';
        return `<article class="audit-opportunity-card ${sev}">
            <button class="audit-opportunity-head" type="button" onclick="toggleOpportunity(this)">
                <span class="opportunity-rank">${String(i+1).padStart(2,'0')}</span>
                <span class="opportunity-main"><b>${window.escapeTPM(window.auditStepLabel(x.k))}</b><small>${x.p<50?'فجوة حرجة':x.p<80?'أقل من المستوى المستهدف':'تحسين استدامة'}</small></span>
                <strong>${x.p}%</strong>
                <i class='bx bx-chevron-down'></i>
            </button>
            <div class="audit-opportunity-body">
                <p>${window.escapeTPM(detail)}</p>
                <div class="audit-opportunity-actions"><span><i class='bx bx-target-lock'></i> أولوية ${x.p<50?'عالية':x.p<80?'متوسطة':'منخفضة'}</span><span><i class='bx bx-check-square'></i> يحتاج متابعة</span></div>
            </div>
        </article>`;
    }).join('')||'<div class="reports-empty">لا توجد فرص محددة.</div>';

    ['auditPerformanceSection','auditOpportunitySection','auditScoreSection','auditEvidenceSection'].forEach((id)=>document.getElementById(id)?.classList.remove('is-collapsed'));
    const sigDiv=document.getElementById('detSignatureImg');if(a.signature)sigDiv.innerHTML=`<img src="${a.signature}" style="height:80px;max-width:200px" alt="توقيع المراجع">`;else sigDiv.innerHTML='<div style="color:#94a3b8;font-size:12px">لا يوجد توقيع</div>';
    window.__activeDetailedAuditId=String(a.id);
    showScreen('detailedReportScreen');
};

window.toggleReportSection = function(id){
    const el=document.getElementById(id); if(!el)return;
    const collapsed=el.classList.toggle('is-collapsed');
    const icon=el.querySelector('.audit-collapse-trigger .section-icon i');
    if(icon) icon.className=collapsed?'bx bx-chevron-left':'bx bx-chevron-down';
};
window.toggleAllReportSections = function(){
    const sections=['auditPerformanceSection','auditOpportunitySection','auditScoreSection','auditEvidenceSection'];
    const active=sections.map(id=>document.getElementById(id)).filter(Boolean);
    const collapse=active.some(x=>!x.classList.contains('is-collapsed'));
    active.forEach(el=>el.classList.toggle('is-collapsed',collapse));
    active.forEach(el=>{
        const icon=el.querySelector('.audit-collapse-trigger .section-icon i');
        if(icon) icon.className=collapse?'bx bx-chevron-left':'bx bx-chevron-down';
    });
};
window.toggleAuditEvidence = function(idx){
    const card=document.getElementById('auditStepCard-'+idx); if(!card)return;
    card.classList.toggle('is-open');
};
window.focusAuditStep = function(idx){
    const card=document.getElementById('auditStepCard-'+idx); if(!card)return;
    document.getElementById('auditEvidenceSection')?.classList.remove('is-collapsed');
    card.classList.add('is-open');
    card.scrollIntoView({behavior:'smooth',block:'center'});
};
window.toggleOpportunity = function(btn){
    btn.closest('.audit-opportunity-card')?.classList.toggle('is-open');
};
window.openAuditEvidence = function(btn){
    const img=btn.querySelector('img'); if(!img)return;
    const overlay=document.createElement('div');
    overlay.className='audit-lightbox';
    overlay.innerHTML=`<button class="audit-lightbox-close" onclick="this.parentElement.remove()"><i class='bx bx-x'></i></button><img src="${img.src}" alt="${img.alt||'دليل المراجعة'}">`;
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
    document.body.appendChild(overlay);
};
window.downloadProfessionalPDF = async function(){
    const area=document.getElementById('printableReportArea');
    if(!area) return showToast('⚠️ تعذر العثور على التقرير');
    try{await window.TPMVendorLoader.ensure('html2canvas','https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');await window.TPMVendorLoader.ensure('jspdf','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');}catch(error){console.error('[TPM] PDF vendor load failed:',error);return showToast('⚠️ تعذر تحميل مكونات PDF. تحقق من الاتصال وحاول مرة أخرى.');}if(!window.html2canvas||!window.jspdf?.jsPDF)return showToast('⚠️ مكونات PDF غير متاحة حاليًا.');

    const actionRow=document.querySelector('#detailedReportScreen>.row-flex');
    const oldDisplay=actionRow?.style.display;
    try{
        showToast('جاري إنشاء PDF مباشر... ⏳');
        if(document.fonts?.ready) await document.fonts.ready;

        /* Capture the ACTUAL visible report. No clone, no foreignObject,
           no print engine, and no off-screen rendering. This keeps the
           browser's already-correct Arabic/RTL layout exactly as seen. */
        if(actionRow) actionRow.style.display='none';
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

        const canvas=await window.html2canvas(area,{
            backgroundColor:'#ffffff',
            scale:2,
            useCORS:true,
            allowTaint:false,
            foreignObjectRendering:false,
            imageTimeout:15000,
            logging:false,
            scrollX:0,
            scrollY:0
        });

        if(!canvas || !canvas.width || !canvas.height) throw new Error('Empty PDF canvas');

        const {jsPDF}=window.jspdf;
        const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
        const pageW=210, pageH=297, margin=7;
        const usableW=pageW-margin*2, usableH=pageH-margin*2;
        const pxPerMm=canvas.width/usableW;
        const pagePx=Math.max(1,Math.floor(usableH*pxPerMm));

        let y=0, page=0;
        while(y<canvas.height){
            const h=Math.min(pagePx,canvas.height-y);
            const slice=document.createElement('canvas');
            slice.width=canvas.width;
            slice.height=h;
            const ctx=slice.getContext('2d',{alpha:false});
            ctx.fillStyle='#ffffff';
            ctx.fillRect(0,0,slice.width,slice.height);
            ctx.drawImage(canvas,0,y,canvas.width,h,0,0,canvas.width,h);

            if(page) pdf.addPage();
            pdf.addImage(
                slice.toDataURL('image/jpeg',0.96),
                'JPEG',margin,margin,usableW,h/pxPerMm,
                undefined,'FAST'
            );
            y+=h;
            page++;
        }

        pdf.save('تقرير_تدقيق_TPM_تفصيلي.pdf');
        showToast('✅ تم إنشاء PDF بنجاح');
    }catch(err){
        console.error('Direct PDF export error:',err);
        showToast('⚠️ تعذر إنشاء PDF — راجع Console للتفاصيل');
    }finally{
        if(actionRow) actionRow.style.display=oldDisplay;
    }
};

window.shareWhatsApp = function() { showToast("جاري تجهيز النص..."); };

// ==========================================
// 🏷️ التاجات (Tags Engine)
// ==========================================
window.handleTagImage = function(e) {
    const f=e.target.files[0]; if(!f) return; showToast('جاري تحضير الصورة...');
    processAndEnhanceImage(f, function(dataUrl) { currentTagImg=dataUrl; document.getElementById('tagImagePreview').innerHTML=`<span style="color:var(--success); font-size:12px; font-weight:bold;"><i class='bx bx-check'></i> صورة جاهزة</span>`; });
};

window.updateTagState = function(id, st) { let t=tagsData.find(x=>x.id==id); if(t) {t.status=st; window.syncRecord('tags/' + id, t); if(st==='closed') window.awardPoints(20, 'إغلاق تاج');} };
window.deleteTag = function(id) { if(confirm('تأكيد الحذف نهائياً؟')) { window.deleteRecord('tags/' + id); showToast('تم الحذف'); } };
window.editTag = function(id) { let t=tagsData.find(x=>x.id==id); if(!t) return; let v=prompt('تعديل الوصف:', t.desc); if(v) { t.desc=window.sanitizeInput(v); window.syncRecord('tags/' + id, t); showToast('تم التعديل'); } };


// ==========================================
// 🤖 المستشار الذكي وعقل المصنع (AI)
// ==========================================
window.sanitizeAIHtml = function(value) {
    const template = document.createElement('template');
    template.innerHTML = String(value || '');
    const allowed = new Set(['DIV','B','UL','LI','BR','STRONG','EM','P']);
    template.content.querySelectorAll('*').forEach(node => {
        if (!allowed.has(node.tagName)) {
            node.replaceWith(document.createTextNode(node.textContent || ''));
            return;
        }
        [...node.attributes].forEach(attr => node.removeAttribute(attr.name));
    });
    return template.innerHTML.trim();
};

window.runAIVision = async function(itemId, itemTitle) {
    const imgObj = currentStepImages['img_' + itemId];
    if (!imgObj?.data) return showToast('لا توجد صورة دليل مرتبطة بهذا البند.');

    const modal = document.getElementById('aiModal');
    const output = document.getElementById('aiModalText');
    if (!modal || !output) return;

    output.innerHTML = "<div style='text-align:center;'><i class='bx bx-loader-alt bx-spin' style='font-size:30px; color:var(--primary);'></i><br>جاري فحص دليل البند…</div>";
    modal.style.display = 'flex';

    try {
        const prompt = [
            'أنت مراجع TPM ومهندس صيانة خبير.',
            'حلل صورة الدليل المرفقة مقابل بند المراجعة التالي:',
            '«' + String(itemTitle || '').slice(0, 1000) + '»',
            '',
            'قدّم نتيجة عملية ومنظمة بالعربية في HTML آمن باستخدام div و b و ul و li فقط:',
            '1) ما الذي يظهر في الدليل.',
            '2) هل الدليل يدعم تنفيذ البند بوضوح أم لا، مع ذكر حدود ما يمكن إثباته من الصورة فقط.',
            '3) ملاحظات المراجع أو النواقص الظاهرة.',
            '4) إجراء تحسين مقترح إذا وُجدت فجوة.',
            'لا تمنح درجة رقمية من عندك ولا تدّعِ معلومات غير ظاهرة في الصورة.',
            'ممنوع استخدام markdown أو علامات code fence أو أي JavaScript/HTML غير مطلوب.'
        ].join('\n');

        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, imageUrl: imgObj.data })
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || result?.error) {
            const err = new Error(result?.error || 'تعذر تحليل صورة الدليل.');
            err.code = result?.code || 'AI_VISION_FAILED';
            throw err;
        }

        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error('لم تصل نتيجة تحليل صالحة من المساعد الذكي.');

        output.innerHTML = window.sanitizeAIHtml(rawText) || '<div>لم ينتج المساعد الذكي نتيجة قابلة للعرض.</div>';
        window.awardPoints(5, 'تحليل AI');
    } catch (error) {
        console.error('[JH Audit AI] vision analysis failed:', error);
        output.innerHTML = `<div style="color:var(--danger); text-align:center; line-height:1.8;">
            <i class='bx bx-error-circle' style="font-size:28px;"></i><br>
            ⚠️ ${window.escapeTPM ? window.escapeTPM(error?.message || 'تعذر تحليل الصورة') : (error?.message || 'تعذر تحليل الصورة')}
        </div>`;
    }
};

window.predictMachineFailures = async function() {
    const r = document.getElementById('aiPredictionResult'); r.style.display='block'; r.innerHTML='<i class="bx bx-loader-alt bx-spin"></i> جاري التحليل...';
    try {
        let prompt = "بناءً على التاجات التالية، توقع الماكينات المعرضة للتوقف وقدم نصيحة. أجب بنص عادي أو HTML بسيط بدون علامات \`\`\`html: " + tagsData.map(t=>t.desc).join(',');
        const response = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt, imageBase64: null }) });
        const j = await response.json(); if(j.error) throw new Error(j.error);
        let text = j.candidates[0].content.parts[0].text; text = text.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim(); r.innerHTML = text;
    } catch(e) { r.innerHTML = `<span style="color:var(--danger);"><i class='bx bx-error'></i> فشل الاتصال: ${e.message}</span>`; }
};

window.explainItem = async function(t) {
    const modal = document.getElementById('aiModal');
    const output = document.getElementById('aiModalText');
    if(!modal || !output) return;
    modal.style.display='flex';
    output.innerHTML = '<div style="text-align:center; padding:24px;"><i class="bx bx-brain" style="font-size:42px; color:var(--primary); animation:pulse 1s infinite;"></i><br>جاري إعداد شرح مختصر للبند...</div>';
    try {
        const question = String(t || '').trim().slice(0, 1500);
        const prompt = `أنت مساعد فني للصيانة الذاتية TPM.
السؤال/بند المراجعة هو:
"${question}"

أجب عن هذا السؤال فقط، ولا تشرح نظام TPM بشكل عام.
قواعد الإجابة:
- إجابة مختصرة ومباشرة ومركزة على السؤال.
- 3 إلى 5 نقاط عملية كحد أقصى.
- اذكر ما الذي يجب على الفني فحصه أو تنفيذه تحديدًا.
- لا تضف مقدمة أو خاتمة أو معلومات جانبية.
- لا تتجاوز 100 كلمة.
- أجب بالعربية بنص عادي فقط.`;
        const plainTextResponse = await window.fetchGeminiAPI(prompt);
        const safeText = window.escapeTPM ? window.escapeTPM(plainTextResponse || '') : String(plainTextResponse || '');
        output.innerHTML = `<div style="font-size:14px; line-height:1.8; text-align:right; white-space:normal;">${safeText.replace(/\n/g, '<br>')}</div>`;
    } catch(e) {
        const setupHint = e.code === 'AI_NOT_CONFIGURED'
            ? '<div style="margin-top:12px; color:var(--text-muted); font-size:12px;">هذه الميزة تحتاج ضبطًا من مسؤول النظام، ثم ستكون جاهزة للاستخدام تلقائيًا.</div>'
            : '';
        output.innerHTML = `<div style="color:var(--danger); text-align:center; line-height:1.8;"><i class='bx bx-error-circle' style="font-size:28px;"></i><br>⚠️ ${window.escapeTPM ? window.escapeTPM(e.message || 'تعذر الحصول على الشرح') : (e.message || 'تعذر الحصول على الشرح')}${setupHint}</div>`;
    }
};

window.askFactoryAI = async function() {
    const q = document.getElementById('kbSearchInput').value.trim(); if(!q) return showToast('اكتب سؤالك أولاً!');
    document.getElementById('aiSearchResponse').style.display = 'block'; if(document.getElementById('oplBtnContainer')) document.getElementById('oplBtnContainer').style.display = 'none'; document.getElementById('aiResponseText').innerHTML = '<div style="text-align:center; color:var(--primary);"><i class="bx bx-loader-alt bx-spin"></i> جاري البحث في عقل المصنع...</div>';
    try {
        let prompt = `أنت مستشار فني في مصنع يطبق نظام TPM. أجب على هذا السؤال من الفنيين بشكل عملي وواضح: "${q}". أجب بنص عادي فقط.`;
        let answer = await window.fetchGeminiAPI(prompt);
        document.getElementById('aiResponseText').innerHTML = `<div style="color:var(--primary); font-weight:bold; margin-bottom:10px;"><i class='bx bx-bulb'></i> الإجابة:</div>${answer.replace(/\n/g, '<br>')}`;
        window.lastAIAnswer = answer; if(document.getElementById('oplBtnContainer')) document.getElementById('oplBtnContainer').style.display = 'block';
    } catch(e) { document.getElementById('aiResponseText').innerHTML = `<b style="color:var(--danger);"><i class='bx bx-error'></i> ${e.message}</b>`; }
};

window.generateTPMQuiz = async function() {
    const topic = prompt("أدخل موضوع الاختبار الفني:"); if(!topic) return;
    document.getElementById('aiSearchResponse').style.display = 'block'; if(document.getElementById('oplBtnContainer')) document.getElementById('oplBtnContainer').style.display = 'none'; document.getElementById('aiResponseText').innerHTML = '<div style="text-align:center; color:var(--warning);"><i class="bx bx-loader-alt bx-spin"></i> جاري تصميم الاختبار...</div>';
    try {
        let prompt = `قم بإعداد اختبار فني من 3 أسئلة اختيار من متعدد حول: ${topic}. تنبيه: أجب بنص عادي فقط.`;
        let answer = await window.fetchGeminiAPI(prompt);
        document.getElementById('aiResponseText').innerHTML = `<div style="color:var(--warning); font-weight:bold; margin-bottom:10px;"><i class='bx bx-edit'></i> الاختبار:</div>${answer.replace(/\n/g, '<br>')}`;
    } catch(e) { document.getElementById('aiResponseText').innerHTML = `<b style="color:var(--danger);"><i class='bx bx-error'></i> ${e.message}</b>`; }
};

window.convertAIToOPL = function() {
    if (!window.lastAIAnswer) return showToast("لا توجد إجابة لتحويلها!");
    document.getElementById('oplModal').style.display = 'flex';
    document.getElementById('oplTitle').value = "درس نقطة واحدة: " + (document.getElementById('kbSearchInput') ? document.getElementById('kbSearchInput').value.substring(0, 20) : '');
    document.getElementById('oplDesc').value = window.lastAIAnswer.replace(/\*/g, '');
};

// ==========================================
// 🏭 محرك بوابة الصيانة الذاتية (JH Portal Engine - Enterprise Edition)
// ==========================================

// المتغيرات المركزية للمحرك
let currentJHExecutions = [];
let viewingMonth = new Date().getMonth();
let viewingYear = new Date().getFullYear();
window.jhTimeChartInstance = null;
window.jhTagMatrixChartInstance = null;
window.deptRadarInstance = null;
window.deptTrendInstance = null;

window.showJHPortal = function() {
    currentJHDept = null;
    window.currentJHDept = null;
    const toolbox = document.getElementById('jhToolbox');
    if (toolbox) toolbox.style.display = 'none';

    const gridEl = document.getElementById('jhDeptGrid');
    if (!gridEl) return;

    const safe = v => window.escapeTPM ? window.escapeTPM(String(v || '')) : String(v || '');
    const fmt = value => Number.isFinite(Number(value)) ? Math.round(Number(value)) + '%' : '—';

    const deptIcon = {
        'حقن الكابينة': 'bx-cube',
        'حقن الباب': 'bx-door-open',
        'الفاكيوم': 'bx-wind',
        'المواسير': 'bx-git-branch'
    };
    const deptCards = departments.map((d,index) => {
        const audits = historyData
            .filter(h => h && h.dept === d && Array.isArray(h.stepsOrder) && !h.stepsOrder.includes('ManualKaizen'))
            .sort((a,b) => (Number(a.timestamp||0)-Number(b.timestamp||0)) || (String(a.date||'').localeCompare(String(b.date||''))));
        const last = audits[audits.length-1];
        const tags = tagsData.filter(t => t && t.dept === d);
        const openTags = tags.filter(t => !['closed','done','verified'].includes(t.status)).length;
        const kaizen = historyData.filter(h => h && h.dept === d && Array.isArray(h.stepsOrder) && h.stepsOrder.includes('ManualKaizen')).length;
        const goal = Number(deptGoalsData[d]);
        const score = last ? Number(last.totalPct) : null;
        const state = openTags > 0 ? 'attention' : (last ? 'stable' : 'empty');
        const icon = deptIcon[d] || 'bx-buildings';
        const selected = currentJHDept === d;
        return `
          <article class="jh-dept-card-v4 ${state} ${selected ? 'is-selected' : ''}" tabindex="0" onclick="selectJHDept('${safe(d)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectJHDept('${safe(d)}')}">
            <div class="jh-dept-glow" aria-hidden="true"></div>
            <div class="jh-dept-topline"><span class="jh-dept-index">0${index+1}</span><span class="jh-dept-state"><i class="bx ${state==='attention'?'bx-error-circle':state==='stable'?'bx-check-circle':'bx-minus-circle'}"></i>${state==='attention'?'يحتاج متابعة':state==='stable'?'بيانات متاحة':'لا توجد مراجعات'}</span></div>
            <div class="jh-dept-title"><i class='bx ${icon}'></i><div><h4>${safe(d)}</h4><span>JH · Autonomous Maintenance</span></div></div>
            <div class="jh-dept-score-row"><div><small>آخر Audit</small><strong>${last ? fmt(score) : '—'}</strong></div><div><small>الهدف</small><strong>${Number.isFinite(goal) ? fmt(goal) : '—'}</strong></div></div>
            <div class="jh-dept-bottom"><span><i class="bx bx-purchase-tag-alt"></i>${openTags} تاج مفتوح</span><span><i class="bx bx-bulb"></i>${kaizen} كايزن</span><button type="button">فتح اللوحة <i class="bx bx-left-arrow-alt"></i></button></div>
          </article>`;
    }).join('');

    const deptTabs = departments.map((d,index) => {
        const selected = currentJHDept === d;
        const icon = deptIcon[d] || 'bx-buildings';
        return `<button type="button" class="jh-dept-tab ${selected ? 'is-active' : ''}" aria-selected="${selected}" onclick="selectJHDept('${safe(d)}')">
            <span class="jh-dept-tab-icon"><i class="bx ${icon}"></i></span>
            <span><b>0${index+1}</b><strong>${safe(d)}</strong><small>JH</small></span>
            <i class="bx bx-chevron-left jh-dept-tab-arrow"></i>
        </button>`;
    }).join('');

    const tabsMount = document.getElementById('jhDeptTabs');
    if (tabsMount) tabsMount.innerHTML = deptTabs;
    gridEl.innerHTML = deptCards || '<div class="jh-dept-empty">لا توجد أقسام معرفة في النظام.</div>';
    const portal = document.getElementById('jhPortalScreen');
    if (portal) portal.classList.add('jh-v4-ready');
    showScreen('jhPortalScreen');
};

window.selectJHDept = function(dept) {
    currentJHDept = dept;
    window.currentJHDept = dept;
    document.querySelectorAll('#jhPortalScreen .jh-dept-tab').forEach(tab => {
        const isActive = tab.textContent.includes(dept);
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    document.querySelectorAll('#jhPortalScreen .jh-dept-card-v4').forEach(card => {
        const isActive = card.querySelector('h4')?.textContent?.trim() === dept;
        card.classList.toggle('is-selected', isActive);
    });
    const titleEl = document.getElementById('selectedJHDeptTitle');
    if (titleEl) titleEl.innerHTML = `<i class='bx bx-buildings'></i> ${window.escapeTPM ? window.escapeTPM(dept) : dept}`;

    const goalEl = document.getElementById('deptGoalDisplay');
    const goal = Number(deptGoalsData[dept]);
    if (goalEl) {
        goalEl.style.display = Number.isFinite(goal) ? 'inline-flex' : 'none';
        if (Number.isFinite(goal)) goalEl.innerHTML = `المستهدف المعتمد: <b>${Math.round(goal)}%</b>`;
    }

    const getAuditList = () => historyData
        .filter(h => h && h.dept === dept && Array.isArray(h.stepsOrder) && !h.stepsOrder.includes('ManualKaizen'))
        .sort((a,b) => (Number(a.timestamp||0)-Number(b.timestamp||0)) || (String(a.date||'').localeCompare(String(b.date||''))));

    const getTags = () => tagsData.filter(t => t && t.dept === dept);

    const renderJHAnalytics = () => {
        if (typeof Chart === 'undefined') return;

        const audits = getAuditList();
        const tags = getTags();

        // 1) Actual audit trend — no fabricated data.
        try {
            const ctx = document.getElementById('jhMiniTrendChart');
            if (ctx) {
                window.jhMiniChartInstance?.destroy();
                const list = audits.slice(-8);
                const labels = list.map(a => a.date || (a.timestamp ? new Date(a.timestamp).toLocaleDateString('ar-EG') : ''));
                const values = list.map(a => Number(a.totalPct) || 0);
                window.jhMiniChartInstance = new Chart(ctx,{
                    type:'line',
                    data:{labels,datasets:[{
                        label:'نتيجة المراجعة %',data:values,borderColor:'#1769aa',
                        backgroundColor:'rgba(23,105,170,.10)',borderWidth:3,fill:true,
                        tension:.28,pointRadius:4,pointHoverRadius:6,pointBackgroundColor:'#fff',pointBorderWidth:3
                    }]},
                    options:{
                        responsive:true,maintainAspectRatio:false,
                        interaction:{mode:'index',intersect:false},
                        plugins:{legend:{display:false},tooltip:{rtl:true,bodyFont:{family:'Cairo'},titleFont:{family:'Cairo'},callbacks:{label:c=>` ${c.parsed.y}% نتيجة المراجعة`}}},
                        scales:{
                            y:{min:0,max:100,ticks:{stepSize:20,font:{family:'Cairo'},callback:v=>v+'%'},grid:{color:'#e5edf4'}},
                            x:{ticks:{font:{family:'Cairo'},color:'#53697b'},grid:{display:false}}
                        }
                    }
                });
            }
        } catch(err) { console.error('[JH] audit chart',err); }

        // 2) Actual CLIT completion rate by execution record.
        try {
            const ctx = document.getElementById('jhTimeChart');
            if (ctx) {
                window.jhTimeChartInstance?.destroy();
                const records = (Array.isArray(currentJHExecutions) ? currentJHExecutions : [])
                    .map(ex => {
                        const tasks = Array.isArray(ex?.tasks) ? ex.tasks : [];
                        const done = tasks.filter(t => ['done','completed','complete','ok','pass','passed'].includes(String(t?.status||'').toLowerCase())).length;
                        return { label:ex?.date || '', total:tasks.length, done };
                    })
                    .filter(x => x.total > 0).slice(-8);
                const labels = records.map(x=>x.label);
                const values = records.map(x=>Math.round((x.done/x.total)*100));
                window.jhTimeChartInstance = new Chart(ctx,{
                    type:'bar',
                    data:{labels,datasets:[{
                        label:'نسبة الإكمال %',data:values,backgroundColor:'#2e9b72',
                        borderRadius:7,maxBarThickness:34
                    }]},
                    options:{
                        responsive:true,maintainAspectRatio:false,
                        plugins:{legend:{display:false},tooltip:{rtl:true,bodyFont:{family:'Cairo'},titleFont:{family:'Cairo'},callbacks:{label:c=>` ${c.parsed.y}% إكمال`}}},
                        scales:{
                            y:{min:0,max:100,ticks:{stepSize:20,font:{family:'Cairo'},callback:v=>v+'%'},grid:{color:'#e5edf4'}},
                            x:{ticks:{font:{family:'Cairo'},color:'#53697b'},grid:{display:false}}
                        }
                    }
                });
            }
        } catch(err) { console.error('[JH] CLIT chart',err); }

        // 3) Actual tag flow — open vs closed by source.
        try {
            const ctx = document.getElementById('jhTagMatrixChart');
            if (ctx) {
                window.jhTagMatrixChartInstance?.destroy();
                const redOpen=tags.filter(t=>t.color==='red'&&!['closed','done','verified'].includes(t.status)).length;
                const redClosed=tags.filter(t=>t.color==='red'&&['closed','done','verified'].includes(t.status)).length;
                const blueOpen=tags.filter(t=>t.color==='blue'&&!['closed','done','verified'].includes(t.status)).length;
                const blueClosed=tags.filter(t=>t.color==='blue'&&['closed','done','verified'].includes(t.status)).length;
                window.jhTagMatrixChartInstance = new Chart(ctx,{
                    type:'bar',
                    data:{
                        labels:['تاجات صيانة','تاجات إنتاج'],
                        datasets:[
                            {label:'مفتوح',data:[redOpen,blueOpen],backgroundColor:'#e45757',borderRadius:7,maxBarThickness:42},
                            {label:'مغلق',data:[redClosed,blueClosed],backgroundColor:'#1769aa',borderRadius:7,maxBarThickness:42}
                        ]
                    },
                    options:{
                        responsive:true,maintainAspectRatio:false,
                        plugins:{legend:{position:'top',rtl:true,labels:{font:{family:'Cairo'},usePointStyle:true}},tooltip:{rtl:true,bodyFont:{family:'Cairo'},titleFont:{family:'Cairo'}}},
                        scales:{
                            y:{beginAtZero:true,ticks:{precision:0,font:{family:'Cairo'}},grid:{color:'#e5edf4'}},
                            x:{ticks:{font:{family:'Cairo'},color:'#53697b'},grid:{display:false}}
                        }
                    }
                });
            }
        } catch(err) { console.error('[JH] tag chart',err); }
    };

    if (isOnline) {
        if (window.__jhExecutionRefDept && window.__jhExecutionRefDept !== dept && window.__jhExecutionRef) {
            try { window.__jhExecutionRef.off(); } catch(_) {}
        }
        window.__jhExecutionRefDept = dept;
        window.__jhExecutionRef = db.ref(`tpm_system/clit_executions/${dept}`);
        window.__jhExecutionRef.on('value', snap => {
            currentJHExecutions = snap.val() ? Object.values(snap.val()) : [];
            window.renderJHCalendar();
            renderJHAnalytics();
            updateJHLiveSummary();
        });
    }

    const audits = getAuditList();
    const tags = getTags();
    const openTags = tags.filter(t=>!['done','closed','verified'].includes(t.status)).length;
    const lastAudit = audits[audits.length-1];
    const kaizens = historyData.filter(h=>h && h.dept===dept && Array.isArray(h.stepsOrder) && h.stepsOrder.includes('ManualKaizen')).length;

    document.getElementById('deptAuditScore')?.replaceChildren(document.createTextNode(lastAudit ? Math.round(Number(lastAudit.totalPct)||0)+'%' : '—'));
    document.getElementById('deptOpenTags')?.replaceChildren(document.createTextNode(String(openTags)));
    document.getElementById('deptKaizens')?.replaceChildren(document.createTextNode(String(kaizens)));
    const targetEl=document.getElementById('deptOEE');
    if(targetEl) targetEl.textContent=Number.isFinite(goal) ? Math.round(goal)+'%' : '—';

    // render once immediately with whatever live execution data is already available
    renderJHAnalytics();

    if(window.renderInternalDeptLeaderboard) window.renderInternalDeptLeaderboard(dept);

    const toolbox = document.getElementById('jhToolbox');
    if (toolbox) {
        toolbox.style.display='block';
        toolbox.classList.add('jh-toolbox-v4');
        window.scrollTo({top:toolbox.offsetTop-20,behavior:'smooth'});
    }
};

window.updateJHLiveSummary = function(){
    if(!currentJHDept) return;
    const el=document.getElementById('jhLiveExecutionSummary');
    if(!el) return;
    const executions=Array.isArray(currentJHExecutions)?currentJHExecutions:[];
    let total=0,done=0,issues=0;
    executions.forEach(ex=>(Array.isArray(ex?.tasks)?ex.tasks:[]).forEach(t=>{
        total++;
        if(['done','completed','complete','ok','pass','passed'].includes(String(t?.status||'').toLowerCase())) done++;
        if(String(t?.status||'').toLowerCase()==='issue') issues++;
    }));
    const pct=total?Math.round(done/total*100):0;
    el.innerHTML=`<div><span>CLIT المسجل</span><b>${executions.length}</b></div><div><span>بنود مكتملة</span><b>${done}/${total}</b></div><div><span>معدل الإكمال</span><b>${total?pct+'%':'—'}</b></div><div><span>حالات تحتاج إجراء</span><b class="${issues?'is-alert':''}">${issues}</b></div>`;
};
window.setDeptGoal = function() {
    if(!currentJHDept) return showToast('⚠️ يرجى اختيار القسم أولاً');
    let currentGoal = deptGoalsData[currentJHDept] || 85;
    let newGoal = prompt(`أدخل النسبة المئوية للمستهدف (Target JH) لقسم ${currentJHDept}:\n(مثال: 85)`, currentGoal);
    if (newGoal && !isNaN(newGoal) && newGoal > 0 && newGoal <= 100) {
        window.syncRecord(`dept_goals/${currentJHDept}`, parseInt(newGoal));
        showToast('تم تحديث المستهدف بنجاح 🎯');
    }
};

// ==========================================
// 📅 محرك التقويم والسجل الميداني (Calendar Engine)
// ==========================================

window.changeCalendarMonth = function(dir) {
    viewingMonth += dir;
    if(viewingMonth > 11) { viewingMonth = 0; viewingYear++; }
    else if(viewingMonth < 0) { viewingMonth = 11; viewingYear--; }
    window.renderJHCalendar();
};

window.renderJHCalendar = function() {
    const grid = document.getElementById('jhCalendarGrid');
    if(!grid) return;

    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const monthEl = document.getElementById('currentCalendarMonth');
    if(monthEl) monthEl.innerText = `${monthNames[viewingMonth]} ${viewingYear}`;

    let daysInMonth = new Date(viewingYear, viewingMonth + 1, 0).getDate();
    let html = '';
    
    for(let d = 1; d <= daysInMonth; d++) {
        // تنسيق التاريخ ليتطابق مع (ar-EG)
        let checkDateStr = new Date(viewingYear, viewingMonth, d).toLocaleDateString('ar-EG');
        let dayExecs = currentJHExecutions.filter(ex => ex.date === checkDateStr);
        
        let bgColor = 'var(--surface-inset)'; 
        let border = '1px solid var(--border-glass)';
        let cursor = 'default';
        let clickAction = '';
        let textColor = 'var(--text-muted)';

        if(dayExecs.length > 0) {
            cursor = 'pointer';
            clickAction = `onclick="viewDayExecutions('${checkDateStr}')"`;
            textColor = '#fff';
            
            let hasOpenTags = false;
            dayExecs.forEach(ex => {
                ex.tasks.forEach(t => {
                    if(t.status === 'issue' && t.tagId) {
                        let globalTag = tagsData.find(tg => tg.id === t.tagId);
                        if(globalTag && globalTag.status !== 'closed' && globalTag.status !== 'done') {
                            hasOpenTags = true;
                        }
                    }
                });
            });

            if(hasOpenTags) {
                bgColor = 'rgba(245, 158, 11, 0.2)'; // ذهبي تحذيري
                border = '2px solid var(--warning)';            } else {
                bgColor = 'rgba(16, 185, 129, 0.2)'; // أخضر سليم
                border = '2px solid var(--success)';
            }
        }

        html += `<div style="background:${bgColor}; border:${border}; color:${textColor}; padding:10px 0; border-radius:8px; cursor:${cursor}; font-weight:bold; font-size:12px; transition:0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" ${clickAction} title="${checkDateStr}">${d}</div>`;
    }
    grid.innerHTML = html;
};

window.viewDayExecutions = function(dateStr) {
    let dayExecs = currentJHExecutions.filter(ex => ex.date === dateStr);
    let html = dayExecs.map(ex => {
        let issues = ex.tasks.filter(t => t.status === 'issue').length;
        let done = ex.tasks.filter(t => t.status === 'done').length;
        let total = ex.tasks.length;
        let borderColor = issues > 0 ? 'var(--warning)' : 'var(--success)';
        
        let detailsHtml = ex.tasks.map(t => {
            let icon = t.status === 'done' ? '<i class="bx bx-check-circle"></i>' : '<i class="bx bx-error-circle"></i>';
            let color = t.status === 'done' ? 'var(--success)' : 'var(--danger)';
            return `<div style="font-size:12px; padding:6px 0; border-bottom:1px dashed var(--border-glass); color:${color}; display:flex; align-items:center; gap:5px;">${icon} ${t.region} - ${t.part || t.action}</div>`;
        }).join('');

        return `
        <div class="card glass-card" style="border-right:4px solid ${borderColor}; padding:15px; margin-bottom:10px; background:var(--surface-inset);">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid var(--border-glass); padding-bottom:5px;">
                <b style="color:var(--text-main); font-size:14px;"><i class='bx bx-list-check'></i> دورية: ${ex.frequency}</b>
                <span style="font-size:11px; color:var(--text-muted);"><i class='bx bx-user'></i> ${ex.user} | <i class='bx bx-time'></i> ${ex.time}</span>
            </div>
            <div style="font-size:12px; font-weight:bold; margin-bottom:10px; color:var(--text-main);">
                النتيجة: إنجاز <span style="color:var(--success);">${done}</span> | مشاكل <span style="color:var(--danger);">${issues}</span> من أصل ${total}
            </div>
            <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; max-height:150px; overflow-y:auto; border:1px solid var(--border-glass);">
                ${detailsHtml}
            </div>
        </div>`;
    }).join('');

    document.getElementById('historyModalDate').innerText = dateStr;
    document.getElementById('historyModalContent').innerHTML = html;
    document.getElementById('clitHistoryModal').style.display = 'flex';
};

window.renderInternalDeptLeaderboard = function(dept) {
    const container = document.getElementById('deptInternalLeaderboard'); if(!container) return;
    let deptUsers = [];
    for (let uid in usersData) { if(usersData[uid].dept === dept) { deptUsers.push({ name: usersData[uid].name, points: userPoints[uid] || 0, avatar: usersData[uid].avatar }); } }
    deptUsers.sort((a,b) => b.points - a.points);
    container.innerHTML = deptUsers.slice(0, 3).map((u, idx) => { 
        let medal = idx === 0 ? '<i class="bx bxs-medal"></i>' : (idx === 1 ? '<i class="bx bx-medal"></i>' : '<i class="bx bx-award"></i>'); 
        let mColor = idx === 0 ? 'var(--gold)' : (idx === 1 ? '#cbd5e1' : '#b45309');
        return `<div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-inset); padding:12px 15px; border-radius:12px; border-right:3px solid ${mColor}; margin-bottom:10px; box-shadow:var(--shadow-pressed);">
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:20px; color:${mColor};">${medal}</span>
                <img src="${u.avatar || 'https://ui-avatars.com/api/?name='+u.name+'&background=1e293b&color=3b82f6'}" style="width:30px; height:30px; border-radius:50%; border:2px solid ${mColor};">
                <span style="font-size:13px; font-weight:bold; color:var(--text-main);">${u.name}</span>
            </div>
            <span style="font-size:14px; font-weight:900; color:var(--success);">${u.points} <small style="font-size:9px; color:var(--text-muted);">نقطة</small></span>
        </div>`; 
    }).join('') || '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:20px; background:var(--surface-inset); border-radius:12px;"><i class="bx bx-ghost" style="font-size:30px; display:block; margin-bottom:10px;"></i>لا يوجد أبطال مسجلين بهذا القسم بعد</div>';
};
// ==========================================
