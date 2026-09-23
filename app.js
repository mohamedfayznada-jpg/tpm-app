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

window.showScreen = function(screenId) {
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
    const target = document.getElementById(screenId);
    if(target) { target.classList.add('active'); target.style.display = 'block'; }
    if(screenId === 'tpmTeamsScreen' && typeof window.renderTPMTeams === 'function') window.renderTPMTeams();
    if(screenId === 'settingsScreen' && typeof window.renderSettingsControlLists === 'function') window.renderSettingsControlLists();
    document.querySelectorAll('#mainSidebar .side-item').forEach(item => item.classList.remove('active')); const activeItem = [...document.querySelectorAll('#mainSidebar .side-item')].find(item => (item.getAttribute('onclick') || '').includes("'" + screenId + "'")); if(activeItem) activeItem.classList.add('active');
    window.scrollTo({top: 0, behavior: 'smooth'});
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('mainSidebar'); const overlay = document.getElementById('sidebarOverlay');
    if(sidebar && overlay) { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); }
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
// 🔐 محرك المصادقة والحماية (Enterprise Auth Flow)
// ==========================================
window.login = async function() {
    const userInp = document.getElementById('loginUsername').value.trim();
    const passInp = document.getElementById('loginPassword').value.trim();
    if(!userInp || !passInp) return showToast('⚠️ برجاء كتابة اسم المستخدم وكلمة المرور');

    const btn = document.querySelector('#loginScreen .btn-primary');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> جاري المصادقة...'; btn.disabled = true;

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
        btn.innerHTML = origText; btn.disabled = false;
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

    const btn = document.querySelector('#signupScreen .btn-success');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> جاري إنشاء الحساب...'; btn.disabled = true;

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
        setTimeout(() => { showScreen('loginScreen'); btn.innerHTML = origText; btn.disabled = false; }, 2000);
    } catch (error) {
        let msg = "حدث خطأ أثناء الاتصال"; if (error.code === 'auth/email-already-in-use') msg = "اسم المستخدم هذا محجوز وموجود بالفعل!";
        showToast("❌ " + msg); btn.innerHTML = origText; btn.disabled = false;
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

firebase.auth().onAuthStateChanged(async user => {
    document.body.classList.toggle('auth-locked', !user);
    const mainHeader = document.getElementById('mainHeader');
    
    if (user) {
        isDataLoaded = true;        if (mainHeader) mainHeader.style.display = 'flex';

        const dSnap = await db.ref('tpm_system/departments').once('value');
        departments = window.getOperationalDepartments(dSnap.val() || []); window.departments = departments;

        const uSnap = await db.ref('tpm_system/users').once('value');
        usersData = uSnap.val() || {};
        // Secrets are server-managed; the browser never reads tpm_system/api_keys.
        globalApiKeys = { imgbb: "", gemini: "" };
        window.globalApiKeys = globalApiKeys;
        
        const userEmail = user.email ? user.email.toLowerCase() : '';
        const isMasterAdmin = userEmail === 'mfayez@tpm.app';
        const savedName = localStorage.getItem('tpm_user') || userEmail.split('@')[0];
        const finalUsername = isMasterAdmin ? 'mfayez' : (localStorage.getItem('tpm_username') || userEmail.split('@')[0]);

        let role = 'viewer'; let status = 'active';

        if (isMasterAdmin) {
            role = 'admin';
            currentUser = { uid: user.uid, name: "م. محمد فايز", username: "mfayez", role: "admin", status: "active" };
            window.currentUser = currentUser; localStorage.setItem('tpm_username', 'mfayez');

            // استعادة سجل المدير القديم الذي كان يفتقد role، حتى تتطابق صلاحية الواجهة مع قواعد Realtime Database.
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
                    showToast('⚠️ تعذر مزامنة صلاحية المدير مع قاعدة البيانات. لن يتم اعتماد سجلات كايزن حتى تُنشر القواعد الجديدة.');
                }
            }
            
            let hasPending = Object.values(usersData).some(u => typeof u === 'object' && u.status === 'pending');
            let notifyIcon = document.getElementById('adminNotification');
            if(notifyIcon) notifyIcon.style.display = hasPending ? 'block' : 'none';
            if(window.renderUserManagement) window.renderUserManagement(); 
            
            dbListeners.users = db.ref('tpm_system/users').on('value', snap => {
                usersData = snap.val() || {};
                let pendingLive = Object.values(usersData).some(u => typeof u === 'object' && u.status === 'pending');
                let notifLive = document.getElementById('adminNotification');
                if(notifLive) notifLive.style.display = pendingLive ? 'block' : 'none';
                if(window.renderUserManagement) window.renderUserManagement(); 
            });
        } else {
            let uData = usersData[user.uid];
            if (typeof uData === 'string') { role = uData; } 
            else if (uData && typeof uData === 'object') { role = uData.role || 'viewer'; status = uData.status || 'active'; }
            role = window.normalizeTPMRole ? window.normalizeTPMRole(role) : role;
            role = window.normalizeTPMRole ? window.normalizeTPMRole(role) : role;
            role = window.normalizeTPMRole ? window.normalizeTPMRole(role) : role;
            currentUser = { uid: user.uid, name: savedName, username: finalUsername, role: role, status: status };
            window.currentUser = currentUser;
        }

        document.querySelectorAll('.btn-role-admin').forEach(el => el.style.display = currentUser.role === 'admin' ? 'block' : 'none');
        document.querySelectorAll('.btn-role-auditor').forEach(el => el.style.display = (currentUser.role === 'admin' || currentUser.role === 'auditor') ? 'block' : 'none');
        
        if (currentUser.status === 'pending') {
            showToast("حسابك قيد المراجعة. يرجى انتظار موافقة الإدارة."); firebase.auth().signOut(); return;
        } else { 
            const loginBtn = document.querySelector('#loginScreen .btn-primary');
            if(loginBtn) { loginBtn.innerHTML = '<i class="bx bx-log-in"></i> دخول آمن'; loginBtn.disabled = false; }
            showScreen('homeScreen'); 
        }

        if(window.updateDeptDropdown) window.updateDeptDropdown();

        dbListeners.tags = db.ref('tpm_system/tags').orderByChild('id').limitToLast(100).on('value', snap => {
            let data = snap.val() || {}; tagsData = Object.values(data).filter(x => x && x.id).sort((a,b)=>b.id-a.id); window.tagsData = tagsData; 
            if(window.renderTags) window.renderTags(); if(window.renderTagCommandCenter) window.renderTagCommandCenter(); if(currentUser.role && window.updateHomeDashboard) window.updateHomeDashboard();
        });

        dbListeners.tasks = db.ref('tpm_system/tasks').orderByChild('id').limitToLast(100).on('value', snap => {
            let data = snap.val() || {}; tasksData = Object.values(data).filter(x => x && x.id).sort((a,b)=>a.id-b.id); window.tasksData = tasksData; if(window.renderTasks) window.renderTasks();
        });

        dbListeners.history = db.ref('tpm_system/history').orderByChild('id').limitToLast(100).on('value', snap => {
            let data = snap.val() || {}; historyData = Object.values(data).filter(x => x && x.id).sort((a,b)=>a.id-b.id); window.historyData = historyData; 
            if(window.renderHistory) window.renderHistory(); if(window.renderKaizenFeed) window.renderKaizenFeed(); if(window.renderKaizenA3CommandStats) window.renderKaizenA3CommandStats(); if(currentUser.role && window.updateHomeDashboard) window.updateHomeDashboard();
        });
    
        dbListeners.goals = db.ref('tpm_system/dept_goals').on('value', snap => { 
            deptGoalsData = snap.val() || {}; 
            if(currentJHDept && document.getElementById('jhPortalScreen').classList.contains('active') && window.selectJHDept) window.selectJHDept(currentJHDept); 
        });
      
        dbListeners.losses = db.ref('tpm_system/losses').on('value', snap => {
            registeredLosses = snap.val() ? Object.values(snap.val()) : [];
            if(document.getElementById('kkScreen').classList.contains('active') && window.renderKKDashboard) window.renderKKDashboard();
        });
        
        dbListeners.points = db.ref('tpm_system/points').on('value', snap => { 
            userPoints = snap.val() || {}; if(window.updateUsersLeaderboard) window.updateUsersLeaderboard(); 
        });
        
        dbListeners.knowledgeBase = db.ref('tpm_system/knowledgeBase').on('value', snap => { 
            knowledgeBaseData = snap.val() ? Object.values(snap.val()) : []; 
            if(document.getElementById('knowledgeScreen').classList.contains('active') && window.renderKnowledgeBase) window.renderKnowledgeBase(); 
        });

        dbListeners.engineers = db.ref('tpm_system/maintenanceEngineers').on('value', snap => {
            maintenanceEngineers = snap.val() ? Object.values(snap.val()) : [];
            if(window.updateOperationalSelects) window.updateOperationalSelects();
        });

        if (currentUser.role === 'admin') {
            dbListeners.notificationSettings = db.ref('tpm_system/notification_settings').on('value', snap => {
                notificationSettings = { ...notificationSettings, ...(snap.val() || {}) };
                if(window.populateNotificationSettings) window.populateNotificationSettings();
            });
        }
        
    } else {
        isInitialLoad = true; isDataLoaded = false; 
        if (mainHeader) mainHeader.style.display = 'none'; // חجر صحي
        showScreen('loginScreen');
    }
});

// ==========================================
// 👑 إدارة النظام والأذونات (System Admin)
// ==========================================
window.renderUserManagement = function() {
    if (currentUser.username !== 'mfayez') return;
    const container = document.getElementById('usersListContainer'); if (!container) return;
    
    let html = '<h4 style="color:var(--glow-gold); margin:15px 0 10px;"><i class="bx bx-group"></i> إدارة المستخدمين والصلاحيات</h4>';
    Object.keys(usersData).forEach(uid => {
        const u = usersData[uid]; if (typeof u !== 'object') return; 
        const isPending = u.status === 'pending'; const borderColor = isPending ? 'var(--danger)' : 'var(--success)';
        
        html += `
        <div class="card glass-card" style="margin-bottom:12px; border-right:4px solid ${borderColor}; padding: 15px; background:var(--surface-inset);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div style="text-align:right;">
                    <b style="color:var(--text-main); font-size:15px;">${u.name}</b> <small style="color:var(--text-muted);">(${u.username})</small><br>
                    <span style="font-size:11px; color:var(--gold); font-weight:bold;">المطلوب: ${u.requestedRole} | الحالي: ${u.role}</span>
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
    await db.ref(`tpm_system/users/${uid}`).update({ status: 'active', role: (window.normalizeTPMRole ? window.normalizeTPMRole(u.requestedRole) : u.requestedRole), permissions: finalPerms });
    showToast(`✅ تم تفعيل حساب ${u.name}`);
};

window.deleteUser = async function(uid) { if(confirm('⚠️ تأكيد حذف المستخدم نهائياً؟')) { await db.ref('tpm_system/users/' + uid).remove(); showToast('🗑️ تم الحذف'); } };

window.openPermissionsModal = function(uid) {
    const u = usersData[uid]; if (!u || !u.permissions) return showToast('⚠️ لا توجد أذونات قابلة للتعديل لهذا المستخدم');
    window.editingUserUid = uid; const perms = u.permissions; const container = document.getElementById('permissionsContainer');
    const pages = { homeScreen: 'الرئيسية (Dashboard)', tasksScreen: 'إدارة المهام', historyScreen: 'أرشيف التقارير', kaizenScreen: 'مجتمع كايزن', tagsScreen: 'التاجات والأعطال', knowledgeScreen: 'عقل المصنع' };
    let html = `<div style="margin-bottom:15px; color:var(--glow-gold); font-weight:bold; font-size:15px;"><i class='bx bx-user-circle'></i> المستخدم: ${u.name}</div>`;
    for (let screen in pages) {
        let currentPerm = perms[screen] || 'none';
        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:10px; border-bottom:1px dashed var(--border-glass);">
            <span style="font-size:13px; color:var(--text-main); font-weight:bold;">${pages[screen]}</span>
            <select id="perm_${screen}" class="form-control" style="width:auto; padding:6px 12px; margin:0; font-size:12px; background:var(--bg-base);">
                <option value="none" ${currentPerm==='none'?'selected':''}>مخفية 🚫</option><option value="view" ${currentPerm==='view'?'selected':''}>مشاهدة 👁️</option><option value="edit" ${currentPerm==='edit'?'selected':''}>تعديل ✍️</option>
            </select>
        </div>`;    }
    container.innerHTML = html; document.getElementById('permissionsModal').style.display = 'flex';
};

window.saveUserPermissions = async function() {
    if (!window.editingUserUid) return; const pages = ['homeScreen', 'tasksScreen', 'historyScreen', 'kaizenScreen', 'tagsScreen', 'knowledgeScreen'];
    let newPerms = {}; pages.forEach(p => { let sel = document.getElementById('perm_' + p); if (sel) newPerms[p] = sel.value; });
    await db.ref(`tpm_system/users/${window.editingUserUid}/permissions`).set(newPerms); showToast('✅ تم التحديث'); document.getElementById('permissionsModal').style.display = 'none';
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
    currentDocType = type;
    const headerMap = { 
        'CLIT': '🧹 معايير التنظيف والتزييت (CLIT)', 
        'Contamination': '🛢️ حصر مصادر التلوث', 
        'SOC': '🧗‍♂️ حصر الأماكن صعبة الوصول (SOC)', 
        'Safety': '⚠️ خريطة الأمان وتقييم المخاطر', 
        'Anatomy': '⚙️ تشريح أجزاء الماكينة' 
    };
    
    const headEl = document.getElementById('jhDocHeader');
    if(headEl) headEl.innerHTML = `<i class='bx bx-file'></i> ${headerMap[type] || 'السجل'}`;
    
    // التحكم في الفلاتر (تظهر للـ CLIT فقط)
    ['clitStatsSummary', 'clitZoneFilters', 'clitOpFilters', 'clitFrequencyFilters', 'startChecklistBtnContainer'].forEach(id => { 
        const el = document.getElementById(id); 
        if(el) el.style.display = (type === 'CLIT' && currentJHDept === 'حقن الكابينة') ? (id==='clitOpFilters'?'grid':(id==='startChecklistBtnContainer'?'block':'flex')) : 'none'; 
    });
    
    if(type === 'CLIT' && currentJHDept === 'حقن الكابينة') { 
        clitSelectedZone = 'الكل'; clitSelectedOp = 'الكل'; clitSelectedFreq = 'الكل'; 
        if(window.resetFilterButtonsUI) window.resetFilterButtonsUI(); 
    }
    
    // رسم فورم الإدخال المخصص لكل شاشة
    window.renderJHDocForm(type); 
    showToast('جاري تحميل السجلات من السحابة... ⏳');
    
    const snap = await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}`).once('value'); 
    let records = snap.val() ? Object.values(snap.val()) : [];
    
    // حقن الخرائط القياسية لأول مرة إذا كانت فارغة
    if(type === 'CLIT' && currentJHDept === 'حقن الكابينة' && records.length === 0 && window.factoryCLITData) {
        showToast('جاري تهيئة الخرائط القياسية لأول مرة... ⏳'); 
        let updates = {}; 
        window.factoryCLITData.forEach(item => { updates[item.id] = item; });
        await db.ref(`tpm_system/jh_records/حقن الكابينة/CLIT`).set(updates); 
        records = window.factoryCLITData; 
        showToast('تمت التهيئة بنجاح ✅');
    }
    
    if(type === 'CLIT' && currentJHDept === 'حقن الكابينة') {
        if(document.getElementById('statTotalPoints')) document.getElementById('statTotalPoints').innerText = records.length;
        ['الجيكات', 'الهيد', 'الفرن', 'مدخل', 'عربة', 'تجهيزة'].forEach(z => { 
            let count = records.filter(item => item.region && item.region.includes(z)).length; 
            let badge = document.getElementById(`badge-count-${z}`); 
            if(badge) badge.innerText = count; 
        });
    }
    
    window.currentLoadedRecords = records; 
    window.renderJHDocList(type, records); 
    showScreen('jhDocumentScreen');
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
    const grade=totalPct>=90?'ممتاز':totalPct>=80?'جيد جداً':totalPct>=70?'جيد':totalPct>=50?'مقبول':'ضعيف';
    const gradeEl=document.getElementById('detGrade'); gradeEl.innerText=grade; gradeEl.style.color=totalPct>=80?'#20a66a':totalPct>=50?'#f1ad2f':'#ef5350';

    const rows=(a.stepsOrder||[]).filter(k=>k!=='ManualKaizen').map(k=>{const r=a.results?.[k];if(!r)return null;const p=r.skipped?0:(Number(r.max)?Math.round(Number(r.score||0)/Number(r.max)*100):0);return {k,r,p};}).filter(Boolean);
    const avgStep=rows.length?Math.round(rows.reduce((s,x)=>s+x.p,0)/rows.length):0;
    const weak=rows.slice().sort((x,y)=>x.p-y.p), critical=weak.filter(x=>x.p<50).length;
    const priority=critical?'عالية':weak.some(x=>x.p<80)?'متوسطة':'منخفضة', risk=critical?'مرتفع':weak.some(x=>x.p<80)?'متوسط':'منخفض';
    document.getElementById('detDecisionSummary').innerText=totalPct>=80?'الأداء العام ضمن المستوى المستهدف، مع فرص تحسين محددة في المحاور الأقل نتيجة.':'النتيجة أقل من المستوى المستهدف؛ يوصى بتركيز خطة الإجراء على المحاور ذات الفجوة الأكبر ومتابعة الإغلاق.';
    document.getElementById('detPriorityBadge').innerText='أولوية: '+priority;
    document.getElementById('detRiskBadge').innerText='مستوى المخاطر: '+risk;
    const dk=document.getElementById('detDecisionKpis'); if(dk)dk.innerHTML=[['النتيجة النهائية',totalPct+'%','الدرجة المسجلة'],['متوسط المحاور',avgStep+'%','متوسط نتائج البنود'],['فجوات حرجة',critical,'محاور أقل من 50%'],['محاور التحسين',weak.filter(x=>x.p<80).length,'أقل من 80%']].map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join('');

    window.__detailAuditCharts=window.__detailAuditCharts||{};
    if(window.__detailAuditCharts.radar){try{window.__detailAuditCharts.radar.destroy()}catch(e){}}
    const radar=document.getElementById('detailRadarChart');
    if(radar&&window.Chart)window.__detailAuditCharts.radar=new Chart(radar,{type:'radar',data:{labels:rows.map(x=>window.auditStepLabel(x.k)),datasets:[{label:'نتيجة المحور %',data:rows.map(x=>x.p),borderColor:'#2583e8',backgroundColor:'rgba(37,131,232,.16)',pointBackgroundColor:'#2583e8',pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,scales:{r:{min:0,max:100,ticks:{stepSize:20,callback:v=>v+'%'},pointLabels:{font:{family:'Cairo',size:11,weight:'700'}}}},plugins:{legend:{display:false}}}});

    let tableHtml='',detailsHtml='';
    rows.forEach(({k,r,p})=>{
        const pColor=p>=80?'#20a66a':p>=50?'#f1ad2f':'#ef5350';
        const imps=Array.isArray(r.improvements)&&r.improvements.length?r.improvements.map(i=>`<li>${window.escapeTPM(i)}</li>`).join(''):'<li>لم يتم تسجيل فرصة تحسين مباشرة في هذا المحور.</li>';
        let imgsHtml='';if(r.images)Object.values(r.images).forEach(img=>{if(img?.data)imgsHtml+=`<img src="${img.data}" alt="دليل المراجعة">`;});
        tableHtml+=`<tr><td>${window.escapeTPM(window.auditStepLabel(k))}</td><td>${r.skipped?'تخطي':(r.score||0)+' / '+(r.max||0)}</td><td style="color:${pColor};font-weight:900">${p}%</td></tr>`;
        detailsHtml+=`<article class="detail-step-card"><header><div><span class="eyebrow">AUDIT STEP</span><h4>${window.escapeTPM(window.auditStepLabel(k))}</h4></div><strong style="color:${pColor}">${p}%</strong></header><div class="detail-step-body"><div><b>الملاحظات / فرص التحسين</b><ul>${imps}</ul></div>${imgsHtml?`<div class="detail-step-images">${imgsHtml}</div>`:''}</div></article>`;
    });
    document.getElementById('detStepsTableBody').innerHTML=tableHtml;
    document.getElementById('detStepsContainer').innerHTML=detailsHtml||'<div class="reports-empty">لا توجد تفاصيل مسجلة.</div>';
    const opp=document.getElementById('detOpportunityContainer');
    if(opp)opp.innerHTML=weak.slice(0,5).map((x,i)=>{
        const sourceRecord=a.results?.[x.k]||{};
        const actual=Array.isArray(sourceRecord.improvements)?sourceRecord.improvements.filter(Boolean):[];
        const fallback=x.p<50?'إجراء تصحيحي عاجل مع تحديد المالك وموعد الإغلاق والتحقق من الفاعلية.':x.p<80?'تنفيذ إجراء تحسين محدد، ثم إعادة التحقق من المحور خلال دورة المراجعة القادمة.':'الحفاظ على المعيار الحالي مع تحسين تدريجي ومتابعة الاستدامة.';
        const detail=actual.length?actual.join(' — '):fallback;
        return `<div class="detail-op-row"><span>${String(i+1).padStart(2,'0')}</span><div><b>${window.escapeTPM(window.auditStepLabel(x.k))}</b><p>${window.escapeTPM(detail)}</p></div><strong>${x.p}%</strong></div>`;
    }).join('')||'<div class="reports-empty">لا توجد فرص محددة.</div>';
    const sigDiv=document.getElementById('detSignatureImg');if(a.signature)sigDiv.innerHTML=`<img src="${a.signature}" style="height:80px;max-width:200px" alt="توقيع المراجع">`;else sigDiv.innerHTML='<div style="color:#94a3b8;font-size:12px">لا يوجد توقيع</div>';
    window.__activeDetailedAuditId=String(a.id);
    showScreen('detailedReportScreen');
};

window.downloadProfessionalPDF = async function(){
    const source=document.getElementById('printableReportArea');
    if(!source) return showToast('⚠️ تعذر العثور على التقرير');
    if(!window.html2canvas || !window.jspdf?.jsPDF){
        return showToast('⚠️ مكونات إنشاء PDF غير محملة — حدّث الصفحة وحاول مرة أخرى');
    }

    const actionBar=document.querySelector('#detailedReportScreen>.row-flex');
    const originalCss=source.getAttribute('style')||'';
    const restoredCanvases=[];
    try{
        showToast('جاري إنشاء PDF مباشر... ⏳');
        if(document.fonts?.ready) await document.fonts.ready;

        /* IMPORTANT:
           Render the REAL report node, not a detached clone.
           This keeps every #detailedReportScreen CSS rule intact.
           A desktop viewport is forced so mobile @media rules do not
           compress/reflow the report during capture. */
        source.style.width='794px';
        source.style.maxWidth='794px';
        source.style.margin='0';
        source.style.background='#fff';
        source.style.direction='rtl';
        source.style.overflow='visible';
        source.style.boxSizing='border-box';

        if(actionBar) actionBar.style.visibility='hidden';

        /* Convert live Chart.js canvases to PNGs so the HTML renderer
           cannot turn them into black blocks. Restore them afterward. */
        source.querySelectorAll('canvas').forEach(canvas=>{
            try{
                const img=document.createElement('img');
                img.src=canvas.toDataURL('image/png');
                img.width=canvas.width;
                img.height=canvas.height;
                img.style.cssText='display:block;width:100%;height:100%;object-fit:contain;background:#fff;';
                canvas.parentNode.replaceChild(img,canvas);
                restoredCanvases.push({img,canvas,parent:img.parentNode});
            }catch(err){ console.warn('Chart image conversion skipped:',err); }
        });

        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

        const canvas=await window.html2canvas(source,{
            backgroundColor:'#ffffff',
            scale:2,
            useCORS:true,
            allowTaint:false,
            foreignObjectRendering:true,
            imageTimeout:15000,
            logging:false,
            windowWidth:1365,
            windowHeight:900,
            scrollX:0,
            scrollY:0
        });

        const {jsPDF}=window.jspdf;
        const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
        const pageW=210,pageH=297;
        const marginX=7,marginY=7;
        const usableW=pageW-marginX*2,usableH=pageH-marginY*2;
        const pxPerMm=canvas.width/usableW;
        const pagePx=Math.max(1,Math.floor(usableH*pxPerMm));

        let y=0,page=0;
        while(y<canvas.height){
            const sliceH=Math.min(pagePx,canvas.height-y);
            const slice=document.createElement('canvas');
            slice.width=canvas.width;
            slice.height=sliceH;
            slice.getContext('2d').drawImage(
                canvas,0,y,canvas.width,sliceH,0,0,canvas.width,sliceH
            );
            if(page>0) pdf.addPage();
            pdf.addImage(
                slice.toDataURL('image/jpeg',0.95),
                'JPEG',marginX,marginY,usableW,sliceH/pxPerMm,
                undefined,'FAST'
            );
            y+=sliceH;
            page++;
        }

        pdf.save('تقرير_تدقيق_TPM_تفصيلي.pdf');
        showToast('✅ تم إنشاء ملف PDF بنجاح');
    }catch(err){
        console.error('Professional PDF export error:',err);
        showToast('⚠️ تعذر إنشاء PDF — راجع Console للتفاصيل');
    }finally{
        /* Restore the report exactly as it was before export. */
        source.setAttribute('style',originalCss);
        restoredCanvases.reverse().forEach(item=>{
            try{ item.img.replaceWith(item.canvas); }catch(_){}
        });
        if(actionBar) actionBar.style.visibility='';
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

window.addNewTag = async function() {
    let d=document.getElementById('newTagDesc').value, c=document.getElementById('newTagColor').value, dp=document.getElementById('newTagDept').value, m=document.getElementById('newTagMachine').value, sp=document.getElementById('newTagSpareParts').value;
    if(!d) return showToast('⚠️ أدخل وصف المشكلة');
    let fullDesc = sp ? `${d} [أجزاء: ${sp}]` : d; let uploadedUrl = null;
    
    if (currentTagImg) { showToast('جاري رفع التاج والصورة... ⏳'); uploadedUrl = await uploadImageToStorage(currentTagImg); if(!uploadedUrl) showToast('⚠️ فشل رفع الصورة. سيتم الحفظ كنص.'); }
    
    let tId = window.uniqueNumericId().toString();
    window.syncRecord('tags/' + tId, {id:tId, desc:fullDesc, color:c, dept:dp, machine:m, image:uploadedUrl, status:'open', auditor:currentUser.name, date:new Date().toLocaleDateString('ar-EG'), timestamp: Date.now()});
    
    document.getElementById('newTagDesc').value=''; document.getElementById('newTagMachine').value=''; document.getElementById('newTagSpareParts').value=''; currentTagImg = null;
    let preview = document.getElementById('tagImagePreview'); if(preview) preview.innerHTML = '';
    window.awardPoints(10, 'إصدار تاج جديد'); if(uploadedUrl || !currentTagImg) showToast('تم إصدار التاج بنجاح ✅');
};

window.renderTags = function() {
    let rc = document.getElementById('redTagsContainer'); let bc = document.getElementById('blueTagsContainer');
    if(!rc || !bc) return;
    
    let fDept = document.getElementById('filterTagDept').value; let fMach = document.getElementById('filterTagMachine').value.trim().toLowerCase(); let fStatus = document.getElementById('filterTagStatus') ? document.getElementById('filterTagStatus').value : 'active';
    let redHtml = '', blueHtml = ''; let currentTime = Date.now(); const THREE_DAYS_MS = 259200000;

    tagsData.forEach(t => {
        if(fDept !== 'الكل' && t.dept !== fDept) return;
        if(fMach !== '' && (!t.machine || !t.machine.toLowerCase().includes(fMach))) return;
        let isClosed = (t.status === 'closed'); if(fStatus === 'active' && isClosed) return; if(fStatus === 'closed' && !isClosed) return;

        let isAged = (!isClosed && t.timestamp && (currentTime - t.timestamp > THREE_DAYS_MS));
        let canEdit = window.hasRole('admin', 'auditor') || currentUser.name === t.auditor;
        let controls = canEdit ? `<select class="form-control flex-2" style="font-size:12px; padding:8px; margin:0;" onchange="updateTagState('${t.id}', this.value)"><option value="open" ${t.status==='open'?'selected':''}>مفتوح</option><option value="progress" ${t.status==='progress'?'selected':''}>جاري</option><option value="review" ${t.status==='review'?'selected':''}>مراجعة</option><option value="closed" ${t.status==='closed'?'selected':''}>مغلق</option></select><button class="btn btn-sm btn-outline flex-1" style="margin:0; padding:8px;" onclick="editTag('${t.id}')"><i class='bx bx-edit'></i></button><button class="btn btn-sm btn-danger" style="margin:0; padding:8px; width:45px;" onclick="deleteTag('${t.id}')"><i class='bx bx-trash'></i></button>` : `<span style="font-size:12px; font-weight:bold; color:var(--text-main); padding:6px 12px; background:var(--surface-inset); border-radius:8px;">الحالة: ${t.status}</span>`;
        
        let ticketClass = t.color === 'red' ? 'ticket-red' : 'ticket-blue';
        let warningBadge = isAged ? `<div style="position:absolute; top:10px; left:-25px; background:var(--danger); color:white; font-size:10px; font-weight:bold; padding:2px 25px; transform:rotate(-45deg);">متأخر</div>` : '';

        let cardHtml = `<div class="tag-ticket ${ticketClass}">${warningBadge}<div style="font-size:14px; font-weight:900; color:var(--text-main); margin-bottom:10px;">${t.desc}</div><div style="font-size:11px; color:var(--text-muted); margin-bottom:15px; background:rgba(0,0,0,0.2); padding:8px; border-radius:8px;"><i class='bx bx-buildings'></i> ${t.dept} ${t.machine ? ' | <i class="bx bx-cog"></i> ' + t.machine : ''}<br><i class='bx bx-user'></i> ${t.auditor} | <i class='bx bx-calendar'></i> ${t.date}</div>${t.image ? `<img src="${t.image}" style="width:100%; border-radius:10px; margin-bottom:15px; border:1px solid var(--border-glass); cursor:pointer;" onclick="window.open('${t.image}', '_blank')">` : ''}<div class="row-flex" style="border-top:1px solid var(--border-glass); padding-top:15px;">${controls}</div></div>`;

        if(t.color === 'red') redHtml += cardHtml; else blueHtml += cardHtml;
    });

    rc.innerHTML = redHtml || '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:20px;">لا توجد تاجات صيانة</div>';
    bc.innerHTML = blueHtml || '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:20px;">لا توجد تاجات إنتاج</div>';
};

window.updateTagState = function(id, st) { let t=tagsData.find(x=>x.id==id); if(t) {t.status=st; window.syncRecord('tags/' + id, t); if(st==='closed') window.awardPoints(20, 'إغلاق تاج');} };
window.deleteTag = function(id) { if(confirm('تأكيد الحذف نهائياً؟')) { window.deleteRecord('tags/' + id); showToast('تم الحذف'); } };
window.editTag = function(id) { let t=tagsData.find(x=>x.id==id); if(!t) return; let v=prompt('تعديل الوصف:', t.desc); if(v) { t.desc=window.sanitizeInput(v); window.syncRecord('tags/' + id, t); showToast('تم التعديل'); } };


// ==========================================
// 🤖 المستشار الذكي وعقل المصنع (AI)
// ==========================================
window.getBase64FromUrl = async function(url) {
    try { const res = await fetch(url); const blob = await res.blob(); return new Promise(resolve => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(blob); }); } 
    catch(e) { return new Promise((resolve, reject) => { let img = new Image(); img.crossOrigin = 'Anonymous'; img.onload = () => { let canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height; canvas.getContext('2d').drawImage(img, 0, 0); resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]); }; img.onerror = reject; img.src = url; }); }
};

window.runAIVision = async function(itemId, itemTitle) {
    let imgObj = currentStepImages['img_' + itemId]; if(!imgObj) return showToast('لا توجد صورة لفحصها');
    document.getElementById('aiModalText').innerHTML = "<div style='text-align:center;'><i class='bx bx-loader-alt bx-spin' style='font-size:30px; color:var(--primary);'></i><br>جاري فحص الصورة...</div>"; document.getElementById('aiModal').style.display = 'flex';
    try {
        const base64Img = await window.getBase64FromUrl(imgObj.data);
        let fullPrompt = `أنت مهندس صيانة. حلل هذه الصورة بناءً على بند: "${itemTitle}". رد بـ HTML منسق (استخدم <div> و <b> و <ul> فقط). ممنوع كتابة علامات \`\`\`html نهائياً.\n`;
        if(knowledgeBaseData && knowledgeBaseData.length > 0) fullPrompt += "\nكتالوجات المصنع المعتمدة:\n" + knowledgeBaseData.map(kb => `[${kb.title}]: ${kb.content}`).join('\n');
        const response = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: fullPrompt, imageBase64: base64Img }) });
        const result = await response.json(); if(result.error) throw new Error(result.error);
        let text = result.candidates[0].content.parts[0].text; text = text.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
        document.getElementById('aiModalText').innerHTML = text; window.awardPoints(5, 'تحليل AI');
    } catch(e) { document.getElementById('aiModalText').innerHTML = `<div style="color:red; text-align:center;">خطأ في الاتصال: ${e.message}</div>`; }
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
    document.getElementById('aiModal').style.display='flex'; document.getElementById('aiModalText').innerHTML = '<div style="text-align:center; padding:30px;"><i class="bx bx-brain" style="font-size:50px; color:var(--primary); animation:pulse 1s infinite;"></i><br>جاري تحضير خطوات العمل...</div>';
    try {
        let prompt = `أنت مهندس صيانة خبير ومراجع TPM. اشرح البند التالي للفنيين: "${t}". رد بخطوات عمل محددة ومرقمة. أجب بنص عادي.`;
        let plainTextResponse = await window.fetchGeminiAPI(prompt);
        document.getElementById('aiModalText').innerHTML = `<div style="font-size:14px; line-height:1.8; text-align:right;">${plainTextResponse.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--primary);">$1</b>')}</div>`;
    } catch(e) {
        const setupHint = e.code === 'AI_NOT_CONFIGURED'
            ? '<div style="margin-top:12px; color:var(--text-muted); font-size:12px;">هذه الميزة تحتاج ضبطًا من مسؤول النظام، ثم ستكون جاهزة للاستخدام تلقائيًا.</div>'
            : '';
        document.getElementById('aiModalText').innerHTML = `<div style="color:var(--danger); text-align:center; line-height:1.8;"><i class='bx bx-error-circle' style="font-size:28px;"></i><br>⚠️ ${e.message}${setupHint}</div>`;
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
    const toolbox = document.getElementById('jhToolbox');
    if (toolbox) toolbox.style.display = 'none';
    
    let grid = departments.map(d => `
        <div class="card glass-card" style="padding:20px; text-align:center; cursor:pointer; border-right:4px solid var(--success); transition:0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="selectJHDept('${d}')">
            <b style="color:var(--success); font-size:16px;"><i class='bx bx-buildings'></i> ${d}</b>        </div>
    `).join('');
    
    const gridEl = document.getElementById('jhDeptGrid');
    if (gridEl) gridEl.innerHTML = grid;
    
    showScreen('jhPortalScreen');
};

window.selectJHDept = function(dept) {
    currentJHDept = dept;
    const titleEl = document.getElementById('selectedJHDeptTitle');
    if(titleEl) titleEl.innerHTML = `<i class='bx bx-radar'></i> داشبورد: ${dept}`;
    
    // 1. ☁️ الاتصال بالسحابة وسحب سجل التنفيذ (CLIT)
    if(isOnline) {
        db.ref(`tpm_system/clit_executions/${dept}`).on('value', snap => {
            currentJHExecutions = snap.val() ? Object.values(snap.val()) : [];
            window.renderJHCalendar(); 
        });
    }

    // 2. تجميع الإحصائيات (Stats)
    const deptAudits = historyData.filter(h => h.dept === dept && !h.stepsOrder.includes('ManualKaizen')).sort((a,b) => new Date(a.date) - new Date(b.date));
    const deptTags = tagsData.filter(t => t.dept === dept);
    const openTags = deptTags.filter(t => t.status !== 'done' && t.status !== 'closed').length;
    const lastAudit = deptAudits[deptAudits.length-1];
    const deptKaizens = historyData.filter(h => h.dept === dept && h.stepsOrder.includes('ManualKaizen')).length;
    
    if(document.getElementById('deptAuditScore')) document.getElementById('deptAuditScore').innerText = lastAudit ? lastAudit.totalPct + '%' : '0%';
    if(document.getElementById('deptOpenTags')) document.getElementById('deptOpenTags').innerText = openTags;
    if(document.getElementById('deptKaizens')) document.getElementById('deptKaizens').innerText = deptKaizens;
    
    let auditScoreVal = lastAudit ? lastAudit.totalPct : 0;
    let calculatedOEE = Math.max(0, Math.round((auditScoreVal * 0.95) - (openTags * 1.5)));
    const oeeEl = document.getElementById('deptOEE');
    if(oeeEl) oeeEl.innerText = calculatedOEE + '%';

    const goalEl = document.getElementById('deptGoalDisplay');
    if (deptGoalsData[dept]) {
        if(goalEl) { goalEl.style.display = 'inline-block'; goalEl.innerHTML = `المستهدف: <b>${deptGoalsData[dept]}%</b>`; }
        if(oeeEl) oeeEl.style.color = calculatedOEE >= deptGoalsData[dept] ? 'var(--success)' : '#00BCD4';
    } else {
        if(goalEl) goalEl.style.display = 'none';
        if(oeeEl) oeeEl.style.color = '#00BCD4';
    }

    // 3. 📈 رسم منحنى التطور (Trend Chart)
    try {
        const ctxTrend = document.getElementById('jhMiniTrendChart');
        if (ctxTrend && typeof Chart !== 'undefined') {
            if (window.jhMiniChartInstance) window.jhMiniChartInstance.destroy();
            let last5Audits = deptAudits.slice(-5);
            let labels = last5Audits.map(a => a.date.split('/')[0] + '/' + a.date.split('/')[1]);
            let data = last5Audits.map(a => a.totalPct);
            
            window.jhMiniChartInstance = new Chart(ctxTrend, { 
                type: 'line', 
                data: { 
                    labels: labels.length > 0 ? labels : ['-'], 
                    datasets: [{ label: 'كفاءة JH %', data: data.length > 0 ? data : [0], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 3 }] 
                }, 
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false, min: 0, max: 100 }, x: { ticks: { color: '#cbd5e1', font: {size: 9} }, grid: {display: false} } }, plugins: { legend: { display: false } } } 
            });
            ctxTrend.parentElement.style.display = 'block';
        }
    } catch(e) {}

    // 4. ⏱️ رسم تحليل وقت الصيانة (Time/MTTR Chart)
    try {
        const ctxTime = document.getElementById('jhTimeChart');
        if (ctxTime && typeof Chart !== 'undefined') {
            if (window.jhTimeChartInstance) window.jhTimeChartInstance.destroy();
            let timeData = [120, 105, 90, 75, Math.max(45, 120 - (deptKaizens * 5) - (auditScoreVal / 2))]; 
            let timeLabels = ['W1', 'W2', 'W3', 'W4', 'Current'];
            
            window.jhTimeChartInstance = new Chart(ctxTime, {
                type: 'bar',
                data: { labels: timeLabels, datasets: [{ label: 'وقت الصيانة (د)', data: timeData, backgroundColor: '#00BCD4', borderRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false }, x: { ticks: { color: '#cbd5e1', font:{size:9} }, grid:{display:false} } }, plugins: { legend: { display: false } } }
            });
            ctxTime.parentElement.style.display = 'block';
        }
    } catch(e) {}

    // 5. 🏷️ رسم مصفوفة التاجات (Tag Matrix Doughnut)
    try {
        const ctxMatrix = document.getElementById('jhTagMatrixChart');
        if (ctxMatrix && typeof Chart !== 'undefined') {
            if (window.jhTagMatrixChartInstance) window.jhTagMatrixChartInstance.destroy();
            
            let redOpen = deptTags.filter(t => t.color === 'red' && t.status !== 'closed').length;
            let redClosed = deptTags.filter(t => t.color === 'red' && t.status === 'closed').length;
            let blueOpen = deptTags.filter(t => t.color === 'blue' && t.status !== 'closed').length;
            let blueClosed = deptTags.filter(t => t.color === 'blue' && t.status === 'closed').length;

            window.jhTagMatrixChartInstance = new Chart(ctxMatrix, {
                type: 'doughnut',
                data: {
                    labels: ['صيانة مفتوح', 'صيانة مغلق', 'إنتاج مفتوح', 'إنتاج مغلق'],
                    datasets: [{ data: [redOpen, redClosed, blueOpen, blueClosed], backgroundColor: ['#ef4444', '#b91c1c', '#3b82f6', '#1d4ed8'], borderWidth: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { color: '#cbd5e1', font:{size:9, family:'Cairo'}, boxWidth: 10 } } } }
            });
            ctxMatrix.parentElement.style.display = 'block';
        }
    } catch(e) {}

    if(window.renderInternalDeptLeaderboard) window.renderInternalDeptLeaderboard(dept);
    
    const toolbox = document.getElementById('jhToolbox');
    if(toolbox) {
        toolbox.style.display = 'block';
        window.scrollTo({ top: toolbox.offsetTop - 20, behavior: 'smooth' });
    }
};

window.setDeptGoal = function() {
    if(!currentJHDept) return showToast('⚠️ يرجى اختيار القسم أولاً');
    let currentGoal = deptGoalsData[currentJHDept] || 85;
    let newGoal = prompt(`أدخل النسبة المئوية للمستهدف (Target OEE) لقسم ${currentJHDept}:\n(مثال: 85)`, currentGoal);
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
