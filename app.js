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
let currentUser = { name: '', username: '', role: '', status: '' };
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
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
    const target = document.getElementById(screenId);
    if(target) { target.classList.add('active'); target.style.display = 'block'; }
    if(screenId === 'tpmTeamsScreen' && typeof window.renderTPMTeams === 'function') window.renderTPMTeams();
    if(screenId === 'settingsScreen' && typeof window.renderSettingsControlLists === 'function') window.renderSettingsControlLists();
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
    const mainHeader = document.getElementById('mainHeader');
    
    if (user) {
        isDataLoaded = true;
        if (mainHeader) mainHeader.style.display = 'flex';

        const dSnap = await db.ref('tpm_system/departments').once('value');
        departments = window.getOperationalDepartments(dSnap.val() || []);

        const uSnap = await db.ref('tpm_system/users').once('value');
        usersData = uSnap.val() || {};

        const kSnap = await db.ref('tpm_system/api_keys').once('value');
        globalApiKeys = kSnap.val() || { imgbb: "", gemini: "" };
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
            let data = snap.val() || {}; tasksData = Object.values(data).filter(x => x && x.id).sort((a,b)=>a.id-b.id); if(window.renderTasks) window.renderTasks();
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
    await db.ref(`tpm_system/users/${uid}`).update({ status: 'active', role: u.requestedRole, permissions: finalPerms });
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
        </div>`;
    }
    container.innerHTML = html; document.getElementById('permissionsModal').style.display = 'flex';
};

window.saveUserPermissions = async function() {
    if (!window.editingUserUid) return; const pages = ['homeScreen', 'tasksScreen', 'historyScreen', 'kaizenScreen', 'tagsScreen', 'knowledgeScreen'];
    let newPerms = {}; pages.forEach(p => { let sel = document.getElementById('perm_' + p); if (sel) newPerms[p] = sel.value; });
    await db.ref(`tpm_system/users/${window.editingUserUid}/permissions`).set(newPerms); showToast('✅ تم التحديث'); document.getElementById('permissionsModal').style.display = 'none';
};

window.saveApiKeys = async function() {
    const imgbb = document.getElementById('imgbbKeyInput').value.trim(); const gemini = document.getElementById('geminiKeyInput').value.trim();
    if(!imgbb && !gemini) return showToast('لم تقم بإدخال أي مفاتيح');
    let updates = {}; if(imgbb) updates.imgbb = imgbb; if(gemini) updates.gemini = gemini;
    await db.ref('tpm_system/api_keys').update(updates); showToast('✅ تم حفظ وتشفير المفاتيح بنجاح');
    document.getElementById('imgbbKeyInput').value = ''; document.getElementById('geminiKeyInput').value = '';
};
window.enableApiKeysEdit = function() { showToast('⚠️ المفاتيح الحالية مشفرة. أدخل المفاتيح الجديدة للكتابة فوقها.'); document.getElementById('imgbbKeyInput').focus(); };

// ==========================================
// 🏆 نظام النقاط والرتب (Enterprise Elite)
// ==========================================
window.awardPoints = function(pts, reason) {
    const uid = firebase.auth().currentUser.uid; if(!uid) return;
    let currentPts = (userPoints[uid] || 0) + pts; window.syncRecord('points/' + uid, currentPts);
    let achievementId = window.uniqueNumericId(); window.syncRecord('global_achievements/' + achievementId, { user: currentUser.name, uid: uid, reason: reason, points: pts, date: new Date().toLocaleString('ar-EG') });
    showToast(`🎖️ حصلت على ${pts} نقطة: ${reason}`);
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

// ==========================================
// 📝 محرك التقييم والمراجعات الصارم (Full Audit Engine)
// ==========================================

// 1. الدالة المفقودة التي تسببت في الانهيار (تم إضافتها وتأمينها)
window.startNewAuditFlowFromPortal = function() {
    if(!currentJHDept) return showToast('⚠️ يرجى اختيار القسم أولاً');
    currentViewedDept = currentJHDept;
    window.startNewAuditFlow();
};

window.saveAuditDraft = function() { 
    if(currentAudit) localStorage.setItem('tpm_audit_draft', JSON.stringify(currentAudit)); 
};

window.loadAuditDraft = function() { 
    const draft = localStorage.getItem('tpm_audit_draft'); 
    if(draft) { 
        currentAudit = JSON.parse(draft); 
        window.renderCurrentAuditStep(); 
    } 
};

window.clearAuditDraft = function() { 
    localStorage.removeItem('tpm_audit_draft'); 
};

window.startNewAuditFlow = function() { 
    if(currentViewedDept) { 
        const sd = document.getElementById('selectDept'); 
        if(sd) sd.value = currentViewedDept; 
    }
    const draft = localStorage.getItem('tpm_audit_draft');
    if(draft) { 
        let dObj = JSON.parse(draft); 
        if(confirm(`يوجد تقييم غير مكتمل لقسم (${dObj.dept}). هل تريد استكماله؟`)) { 
            window.loadAuditDraft(); 
            return; 
        } else { 
            window.clearAuditDraft(); 
        } 
    }
    showScreen('setupScreen'); 
};

window.initAuditSequential = function() {
    currentAudit = { 
        id: window.uniqueNumericId().toString(), 
        dept: document.getElementById('selectDept').value, 
        machine: document.getElementById('setupMachine').value || 'عام', 
        auditor: currentUser.name, 
        date: new Date().toLocaleDateString('ar-EG'), 
        stepsOrder: ['JH-0','JH-1','JH-2','JH-3','JH-4','JH-5','JH-6'], 
        currentStepIndex: 0, 
        results: {} 
    };
    window.renderCurrentAuditStep();
};

window.renderCurrentAuditStep = function() {
    const k = currentAudit.stepsOrder[currentAudit.currentStepIndex]; 
    
    // تأمين جلب البيانات من ملف tpm_data.js
    if(typeof AUDIT_DATA === 'undefined' || !AUDIT_DATA[k]) {
        return showToast(`⚠️ خطأ قاتل: بيانات المراجعة للخطوة ${k} غير موجودة في ملف tpm_data.js`);
    }
    
    const sd = AUDIT_DATA[k];
    currentStepSelections = (currentAudit.results[k] && currentAudit.results[k].selections) ? currentAudit.results[k].selections : {};
    currentStepImages = (currentAudit.results[k] && currentAudit.results[k].images) ? currentAudit.results[k].images : {};

    const titleEl = document.getElementById('auditStepTitle'); 
    if(titleEl) titleEl.innerText = `${k}: ${sd.name}`;
    
    const countEl = document.getElementById('stepCounter'); 
    if(countEl) countEl.innerText = `خطوة ${currentAudit.currentStepIndex + 1} من 7`;
    
    const barEl = document.getElementById('auditProgressBar'); 
    if(barEl) barEl.style.width = `${((currentAudit.currentStepIndex + 1) / 7) * 100}%`;

    const container = document.getElementById('auditItemsContainer');
    if(container) {
        // رسم البنود بالكامل وبدون أي اختصار
        container.innerHTML = sd.items.map(item => {
            let hasImage = currentStepImages['img_' + item.id] ? `<div style="margin-top:15px; display:flex; align-items:center; gap:10px;"><img src="${currentStepImages['img_' + item.id].data}" style="height:60px; width:60px; object-fit:cover; border-radius:10px; border:2px solid var(--primary); cursor:pointer;" onclick="window.open('${currentStepImages['img_' + item.id].data}')"><button class="btn btn-outline btn-sm" onclick="runAIVision(${item.id}, '${item.title.replace(/'/g, "\\'")}')"><i class='bx bx-bot'></i> تحليل الذكاء الاصطناعي</button></div>` : '';
            
            return `
            <div class="card glass-card" style="padding:20px; border-right:4px solid var(--primary);">
                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px; border-bottom:1px solid var(--border-glass); padding-bottom:15px;">
                    <div style="display:flex; align-items:flex-start; gap:12px; width:100%;">
                        <div style="background:var(--primary); color:white; width:35px; height:35px; display:flex; align-items:center; justify-content:center; border-radius:10px; font-weight:900; flex-shrink:0; font-size:16px;">${item.id}</div>
                        <div style="flex:1; font-weight:bold; font-size:15px; color:var(--text-main); line-height:1.4;">${item.title}</div>
                        <span style="font-size:11px; background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:20px; white-space:nowrap; font-weight:bold; color:var(--gold);">الدرجة القصوى: ${item.maxScore}</span>
                    </div>
                    <div class="row-flex" style="justify-content:flex-end;">
                        <button class="btn btn-sm btn-outline" style="border-radius:20px; font-size:11px;" onclick="explainItem('${item.title}')"><i class='bx bx-info-circle'></i> شرح البند للفني</button>
                        <button class="btn btn-sm btn-outline" style="border-radius:20px; font-size:11px; color:var(--primary); border-color:var(--primary);" onclick="openImageSourcePicker(${item.id}, '${item.title.replace(/'/g, "\\'")}')"><i class='bx bx-camera'></i> إرفاق دليل مرئي</button>
                    </div>
                </div>
                <div id="preview_img_${item.id}">${hasImage}</div>
                <div style="margin-top:15px;">
                    ${item.levels.map(lvl => {
                        let isSel = (currentStepSelections['item_'+item.id] && currentStepSelections['item_'+item.id].score === lvl.score) ? 'selected' : '';
                        let selStyle = isSel ? 'background:rgba(16,185,129,0.1); border-color:var(--success); color:var(--success); box-shadow:0 0 15px rgba(16,185,129,0.2);' : 'background:var(--surface-inset); border-color:transparent; color:var(--text-main);';
                        return `<div style="padding:15px; border-radius:12px; margin-bottom:10px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:0.3s; border:1px solid var(--border-glass); ${selStyle}" onclick="selectLevel(${item.id}, ${lvl.score}, ${item.maxScore}, this)"><div style="background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:8px; font-weight:bold; font-size:12px; white-space:nowrap;">${lvl.score} ن</div><div style="flex:1; font-size:13px; line-height:1.5;">${lvl.desc}</div></div>`;
                    }).join('')}
                </div>
            </div>`;
        }).join('');
    }
    currentStepImprovements = []; 
    showScreen('auditScreen'); 
    window.saveAuditDraft(); 
    window.updateCumulativeScoreUI();
};

window.updateCumulativeScoreUI = function() {
    let totalScoreSoFar = 0, totalMaxSoFar = 0;
    for (let i = 0; i < currentAudit.currentStepIndex; i++) {
        let stepKey = currentAudit.stepsOrder[i]; let res = currentAudit.results[stepKey];
        if (res && !res.skipped) { totalScoreSoFar += res.score; totalMaxSoFar += res.max; }
    }
    for (let key in currentStepSelections) { totalScoreSoFar += currentStepSelections[key].score; totalMaxSoFar += currentStepSelections[key].max; }
    
    const pct = totalMaxSoFar === 0 ? 0 : Math.round((totalScoreSoFar / totalMaxSoFar) * 100);
    const pctEl = document.getElementById('cumulativeScoreText'); 
    const pointsEl = document.getElementById('cumulativePointsText');
    if (pctEl) { pctEl.innerText = pct + '%'; pctEl.style.color = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)'); }
    if (pointsEl) pointsEl.innerText = `${totalScoreSoFar} / ${totalMaxSoFar}`;
};

window.selectLevel = function(id, score, max, el) { 
    currentStepSelections['item_'+id] = {score, max}; 
    el.parentElement.querySelectorAll('div[onclick]').forEach(o=>{ o.style.background='var(--surface-inset)'; o.style.borderColor='transparent'; o.style.color='var(--text-main)'; o.style.boxShadow='none'; }); 
    el.style.background='rgba(16,185,129,0.1)'; el.style.borderColor='var(--success)'; el.style.color='var(--success)'; el.style.boxShadow='0 0 15px rgba(16,185,129,0.2)';
    window.saveAuditDraft(); window.updateCumulativeScoreUI();
};

window.finishCurrentStep = function() {
    const k = currentAudit.stepsOrder[currentAudit.currentStepIndex]; const sd = AUDIT_DATA[k];
    
    // حماية صارمة: منع تجاوز الخطوة بدون إكمال التقييم
    if(Object.keys(currentStepSelections).length < sd.items.length) { 
        showToast('⚠️ يرجى تقييم جميع البنود بدون استثناء قبل حفظ المرحلة'); 
        return; 
    }
    
    let totalScore = 0, totalMax = 0; currentStepImprovements = [];
    for(let key in currentStepSelections) { 
        let itemData = currentStepSelections[key]; 
        totalScore += itemData.score; 
        totalMax += itemData.max; 
        
        // محرك استخراج فرص التحسين التلقائي
        if(itemData.score < itemData.max) { 
            let id = key.split('_')[1]; 
            let itm = sd.items.find(i=>i.id == id); 
            if(itm) {
                let maxLvl = itm.levels.find(l => l.score === itm.maxScore); 
                let targetAction = maxLvl ? maxLvl.desc : "الوصول للمعايير القياسية";
                currentStepImprovements.push(`[${itm.title}] 🎯 الإجراء التصحيحي: ${targetAction}`); 
            }
        }
    }
    
    currentAudit.results[k] = { skipped: false, score: totalScore, max: totalMax, improvements: currentStepImprovements, selections: currentStepSelections, images: currentStepImages };
    window.saveAuditDraft();
    
    const pct = Math.round((totalScore/totalMax)*100);
    const sumPctEl = document.getElementById('summaryPct'); 
    if(sumPctEl) { sumPctEl.innerText = pct + '%'; sumPctEl.style.color = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)'); }
    
    const sumScoreEl = document.getElementById('summaryScoreStr'); 
    if(sumScoreEl) sumScoreEl.innerText = `الدرجة المستحقة: ${totalScore} من أصل ${totalMax} نقطة`;
    
    const oppContainer = document.getElementById('opportunitiesContainer');
    if(oppContainer) {
        oppContainer.innerHTML = currentStepImprovements.length > 0 ? currentStepImprovements.map(i=>`<div style="background:var(--surface-inset); padding:15px; border-radius:12px; margin-bottom:10px; border-right:4px solid var(--warning); font-size:13px; text-align:right; color:var(--text-main);"><i class='bx bx-error-alt' style="color:var(--warning);"></i> ${i}</div>`).join('') : '<div style="color:var(--success); font-weight:bold; text-align:center; padding:20px; background:rgba(16,185,129,0.1); border-radius:12px;"><i class="bx bx-check-shield" style="font-size:40px; display:block; margin-bottom:10px;"></i> أداء مثالي في هذه الخطوة، لا توجد ملاحظات!</div>';
    }
    showScreen('stepSummaryScreen');
};

window.skipCurrentStep = function() { 
    currentAudit.results[currentAudit.stepsOrder[currentAudit.currentStepIndex]] = {skipped:true, score:0, max:0, improvements:[], selections:{}, images:{}}; 
    window.saveAuditDraft(); 
    window.goToNextStep(); 
};

window.goToNextStep = function() { 
    currentAudit.currentStepIndex++; 
    if(currentAudit.currentStepIndex < 7) {
        window.renderCurrentAuditStep(); 
    } else {
        window.generateFinalReport(); 
    }
};

window.generateFinalReport = function() {
    let s=0, m=0; 
    currentAudit.stepsOrder.forEach(k=>{
        if(!currentAudit.results[k].skipped){
            s+=currentAudit.results[k].score; 
            m+=currentAudit.results[k].max;
        }
    });
    let p=m===0?0:Math.round((s/m)*100); 
    currentAudit.totalPct = p;
    
    const finalPctEl = document.getElementById('finalTotalPct'); 
    if(finalPctEl) finalPctEl.innerText = p+'%'; 
    
    const finalDeptEl = document.getElementById('finalDeptName'); 
    if(finalDeptEl) finalDeptEl.innerText = currentAudit.dept;
    
    showScreen('finalReportScreen'); 
    window.initSignaturePad();
};

window.saveFinalAudit = async function() {
    if(!window.hasRole('auditor', 'admin')) { return showToast('⚠️ غير مصرح لك باعتماد وحفظ المراجعات النهائية'); }
    if(!confirm("هل أنت متأكد من اعتماد وحفظ هذه المراجعة؟ سيتم إنشاء قائمة مهام تلقائية بالفجوات المكتشفة.")) return;
    
    showToast('جاري تشفير البيانات وحفظ التقرير... ⏳');
    if(sigCanvas) currentAudit.signature = sigCanvas.toDataURL('image/jpeg', 0.8);
    
    // إنشاء المهام التلقائية (Auto-Task Generation)
    let allImprovements = [];
    currentAudit.stepsOrder.forEach(step => { 
        if(currentAudit.results[step] && currentAudit.results[step].improvements) { 
            allImprovements.push(...currentAudit.results[step].improvements); 
        } 
    });
    
    if(allImprovements.length > 0) {
        let fId = window.uniqueNumericId().toString();
        let folderTask = { 
            id: fId, isFolder: true, dept: currentAudit.dept, date: currentAudit.date, machine: currentAudit.machine || 'عام', 
            task: `تحسينات تدقيق (${currentAudit.date})`, subTasks: allImprovements.map(imp => ({ text: imp, status: 'pending' })), status: 'pending' 
        };
        await db.ref('tpm_system/tasks/' + fId).set(folderTask);
    }
    
    await db.ref('tpm_system/history/' + currentAudit.id).set(currentAudit); 
    window.awardPoints(50, 'إتمام مراجعة رسمية (Audit)'); 
    window.clearAuditDraft(); 
    showToast('✅ تم حفظ التقرير بنجاح وتوليد المهام! جاري تحويلك...');
    
    setTimeout(() => { showScreen('historyScreen'); }, 1500);
};

// ==========================================
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
window.renderHistory = function() {
    const container = document.getElementById('historyListContainer'); if (!container) return; 
    let real = historyData.filter(h=>!h.stepsOrder.includes('ManualKaizen')).reverse();
    let html = real.map(a => {
        let controls = (window.hasRole('admin') || currentUser.name === a.auditor) ? `<div style="margin-top:15px; display:flex; gap:10px; border-top:1px solid var(--border-glass); padding-top:15px;"><button class="btn btn-sm btn-outline flex-1" onclick="event.stopPropagation(); editReport('${a.id}')"><i class='bx bx-edit'></i> تعديل</button><button class="btn btn-sm btn-danger flex-1" onclick="event.stopPropagation(); deleteReport('${a.id}')"><i class='bx bx-trash'></i> حذف</button></div>` : '';
        let colorClass = a.totalPct >= 80 ? 'success' : (a.totalPct >= 50 ? 'warning' : 'danger');
        return `
        <div class="card glass-card" style="cursor:pointer; padding: 20px; border-right: 4px solid var(--${colorClass});" onclick="viewDetailedReport('${a.id}')">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div><h3 style="color:var(--text-main); font-size:16px; margin:0 0 8px;"><i class='bx bx-buildings'></i> ${a.dept}</h3><div style="font-size:12px; color:var(--text-muted); display:flex; flex-direction:column; gap:4px;"><span><i class='bx bx-user'></i> ${a.auditor}</span><span><i class='bx bx-calendar'></i> ${a.date}</span><span><i class='bx bx-cog'></i> ${a.machine || 'عام'}</span></div></div>
                <div style="font-size:26px; font-weight:900; color:var(--${colorClass}); background:rgba(255,255,255,0.05); padding:10px 15px; border-radius:16px; border:1px solid var(--border-glass);">${a.totalPct}%</div>
            </div>${controls}
        </div>`;
    }).join('');
    container.innerHTML = html || '<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:14px; width:100%;"><i class="bx bx-archive" style="font-size:50px; display:block; margin-bottom:10px;"></i> لا توجد تقارير في الأرشيف حالياً</div>';
};

window.deleteReport = function(id) { if(confirm('تأكيد الحذف النهائي للتقرير؟')) { window.deleteRecord('history/' + id); showToast('تم الحذف بنجاح'); } };
window.editReport = function(id) { let rep = historyData.find(h => h.id === id); if(!rep) return; currentAudit = JSON.parse(JSON.stringify(rep)); currentAudit.currentStepIndex = 0; window.renderCurrentAuditStep(); };

window.viewDetailedReport = function(id) {
    let a = historyData.find(h => h.id === id); if(!a) return;
    document.getElementById('detDept').innerText = a.dept; document.getElementById('detMachine').innerText = a.machine || 'عام'; document.getElementById('detAuditor').innerText = a.auditor; document.getElementById('detDate').innerText = a.date;
    const totalPct = a.totalPct || 0; document.getElementById('detPct').innerText = totalPct + '%';
    let grade = "ضعيف"; if (totalPct >= 90) grade = "ممتاز"; else if (totalPct >= 80) grade = "جيد جداً"; else if (totalPct >= 70) grade = "جيد"; else if (totalPct >= 50) grade = "مقبول";
    document.getElementById('detGrade').innerText = grade; document.getElementById('detGrade').style.color = totalPct >= 80 ? '#10b981' : (totalPct >= 50 ? '#f59e0b' : '#ef4444');

    let tableHtml = ''; let detailsHtml = '';
    a.stepsOrder.forEach(k => {
        let r = a.results[k]; if (!r) return;
        let p = r.skipped ? 0 : Math.round((r.score / r.max) * 100); let statusText = r.skipped ? 'تخطي' : `${r.score} / ${r.max}`; let pColor = p >= 80 ? '#10b981' : (p >= 50 ? '#f59e0b' : '#ef4444');
        tableHtml += `<tr><td style="padding:12px; border:1px solid #cbd5e1; font-weight:bold; color:#0f172a;">${k}</td><td style="padding:12px; border:1px solid #cbd5e1; font-weight:bold; color:#0f172a;">${statusText}</td><td style="padding:12px; border:1px solid #cbd5e1; font-weight:900; color:${pColor};">${p}%</td></tr>`;
        if (!r.skipped) {
            let imps = (r.improvements && r.improvements.length > 0) ? r.improvements.map(i => `<div style="font-size:14px; margin-bottom:8px; color:#1e293b;"><i class='bx bx-check-circle' style="color:#f59e0b;"></i> ${i}</div>`).join('') : '<div style="color:#10b981; font-weight:bold; text-align:center;">أداء مثالي</div>';
            let imgsHtml = ''; if(r.images) { Object.values(r.images).forEach(img => { if (img.data) imgsHtml += `<img src="${img.data}" style="height:100px; width:100px; object-fit:cover; margin:5px; border-radius:8px; border:1px solid #cbd5e1;">`; }); }
            detailsHtml += `<div style="margin-bottom:20px; padding:20px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; border-right:4px solid ${pColor};"><div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px dashed #cbd5e1; padding-bottom:10px;"><b style="color:#0f172a;">${k}</b><b style="color:${pColor};">${p}%</b></div><div style="margin-bottom:15px;">${imps}</div><div style="text-align:center;">${imgsHtml}</div></div>`;
        }
    });
    document.getElementById('detStepsTableBody').innerHTML = tableHtml; document.getElementById('detStepsContainer').innerHTML = detailsHtml;
    const sigDiv = document.getElementById('detSignatureImg'); if (a.signature) { sigDiv.innerHTML = `<img src="${a.signature}" style="height:80px; max-width:200px;">`; } else { sigDiv.innerHTML = '<div style="color:#94a3b8; font-size:12px;">لا يوجد توقيع</div>'; }
    showScreen('detailedReportScreen');
};

window.downloadProfessionalPDF = function() { window.scrollTo(0,0); const btns = document.querySelectorAll('#detailedReportScreen .row-flex'); btns.forEach(b => b.style.display = 'none'); html2pdf().set({margin:0.2, filename:'تقرير_مراجعة.pdf', image:{type:'jpeg',quality:1}, html2canvas:{scale:2, useCORS:true}, jsPDF:{unit:'in', format:'a4', orientation:'portrait'}}).from(document.getElementById('printableReportArea')).save().then(()=>{ btns.forEach(b => b.style.display = 'flex'); }); };
window.shareWhatsApp = function() { showToast("جاري تجهيز النص..."); };

// ==========================================
// 📋 إدارة المهام (Tasks Kanban)
// ==========================================
window.renderTasks = function() {
    let htmlFolders = ''; const cols = { pending: '', progress: '', done: '' }; const counts = { pending: 0, progress: 0, done: 0 };
    let currentDeptTasks = tasksData.filter(t => t.dept === currentTaskDept);

    currentDeptTasks.forEach(t => {
        let deleteBtnHTML = window.hasRole('admin') ? `<button class="btn btn-sm btn-danger" style="padding:4px 8px; margin:0;" onclick="deleteTask('${t.id}')"><i class='bx bx-trash'></i></button>` : '';
        if(t.isFolder) {
            let total = t.subTasks ? t.subTasks.length : 0; let done = t.subTasks ? t.subTasks.filter(s=>s.status==='done').length : 0;
            htmlFolders += `
                <div class="card glass-card" style="border-right: 4px solid var(--gold); margin-bottom:15px; padding:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid var(--border-glass); padding-bottom:10px;">
                        <b style="color:var(--gold); font-size:14px;"><i class='bx bx-folder'></i> ${t.task}</b>
                        <div style="display:flex; gap:10px; align-items:center;"><span style="background:var(--surface-inset); padding:4px 10px; border-radius:8px; font-size:11px;">${done}/${total}</span>${deleteBtnHTML}</div>
                    </div>
                    ${t.subTasks ? t.subTasks.map((s,i)=>`<div style="font-size:13px; padding:8px 0; border-bottom:1px solid var(--border-glass);"><label style="cursor:pointer; display:flex; gap:10px; align-items:flex-start; ${s.status==='done'?'text-decoration:line-through; color:var(--text-muted);':''}"><input type="checkbox" style="margin-top:4px;" ${s.status==='done'?'checked':''} onclick="toggleFolderSubTask('${t.id}', ${i})"> <span style="flex:1; line-height:1.5;">${s.text}</span></label></div>`).join('') : ''}
                </div>`;
        } else {
            const status = t.status || 'pending'; counts[status]++;
            let actions = '';
            if(status === 'pending') actions = `<button class="btn btn-sm btn-warning flex-1" onclick="changeTaskStatus('${t.id}', 'progress')"><i class='bx bx-play'></i> بدء</button>`;
            else if(status === 'progress') actions = `<button class="btn btn-sm btn-success flex-1" onclick="changeTaskStatus('${t.id}', 'done')"><i class='bx bx-check'></i> إنجاز</button>`;
            else if(status === 'done') actions = `<button class="btn btn-sm btn-outline flex-1" onclick="changeTaskStatus('${t.id}', 'pending')"><i class='bx bx-undo'></i> إعادة</button>`;

            cols[status] += `
            <div class="kanban-item">
                <div style="font-weight:bold; margin-bottom:10px; font-size:14px;">${t.task}</div>
                ${t.image ? `<img src="${t.image}" style="width:100%; border-radius:10px; margin-bottom:10px; border:1px solid var(--border-glass); cursor:pointer;" onclick="window.open('${t.image}')">` : ''}
                <div style="font-size:11px; color:var(--text-muted); margin-bottom:15px;"><i class='bx bx-buildings'></i> ${t.dept}</div>
                <div class="row-flex" style="gap:8px;">${actions}${window.hasRole('admin') ? `<button class="btn btn-sm btn-danger" style="width:40px; padding:0;" onclick="deleteTask('${t.id}')"><i class='bx bx-trash'></i></button>` : ''}</div>
            </div>`;
        }
    });

    ['pending', 'progress', 'done'].forEach(s => {
        const listEl = document.getElementById('kanban_' + s); const countEl = document.getElementById('count_' + s);
        if(listEl) listEl.innerHTML = cols[s] || '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:15px;">لا توجد مهام</div>';
        if(countEl) countEl.innerText = counts[s];
    });

    let fC = document.getElementById('auditFoldersContainer'); 
    if(fC) fC.innerHTML = htmlFolders || '<div style="font-size:13px; color:var(--text-muted); text-align:center; width:100%; padding:20px;">لا توجد مجلدات تحسين</div>';
    window.updateTasksDeptGrid();
};

window.deleteTask = function(id) { if(confirm('⚠️ تأكيد الحذف نهائياً؟')) { window.deleteRecord('tasks/' + id); showToast('تم الحذف 🗑️'); } };

window.updateTasksDeptGrid = function() {
    let deptStats = {}; departments.forEach(d => deptStats[d] = { p:0 }); let pendAll=0, progAll=0, doneAll=0;
    tasksData.forEach(t => {
        let isDone = t.isFolder ? (t.subTasks && t.subTasks.every(s=>s.status==='done') && t.subTasks.length>0) : (t.status==='done');
        let isProg = t.isFolder ? (t.subTasks && t.subTasks.some(s=>s.status==='done') && !isDone) : (t.status==='progress');
        if(isDone) doneAll++; else if(isProg) progAll++; else pendAll++;
        if(!isDone && t.dept && deptStats[t.dept]) deptStats[t.dept].p++;
    });
    
    let paEl = document.getElementById('kpiTasksPendingAll'); if(paEl) paEl.innerText = pendAll;
    let prEl = document.getElementById('kpiTasksProgressAll'); if(prEl) prEl.innerText = progAll;
    let daEl = document.getElementById('kpiTasksDoneAll'); if(daEl) daEl.innerText = doneAll;
    
    let dG = document.getElementById('tasksDeptGrid');
    if(dG) dG.innerHTML = departments.map(d => `<div class="card glass-card" style="padding:20px; text-align:center; cursor:pointer; border-bottom:3px solid ${deptStats[d].p>0?'var(--danger)':'var(--success)'};" onclick="openTasksDept('${d}')"><h4 style="color:var(--text-main); font-size:16px; margin:0 0 10px;"><i class='bx bx-buildings'></i> ${d}</h4><div style="font-size:12px; color:var(--text-muted);">مهام نشطة: <b style="color:var(--danger); font-size:16px;">${deptStats[d].p}</b></div></div>`).join('');
};

window.openTasksDept = function(dept) { currentTaskDept = dept; document.getElementById('tasksDeptTitle').innerText = `مهام ${dept}`; document.getElementById('tasksMainView').style.display='none'; document.getElementById('tasksDeptView').style.display='block'; window.renderTasks(); };
window.closeTasksDept = function() { currentTaskDept = null; document.getElementById('tasksDeptView').style.display='none'; document.getElementById('tasksMainView').style.display='block'; window.renderTasks(); };
window.toggleFolderSubTask = function(fId, sIdx) { let f = tasksData.find(x=>x.id==fId); if(f) { f.subTasks[sIdx].status = f.subTasks[sIdx].status==='done'?'pending':'done'; window.syncRecord('tasks/' + fId, f); } };
window.changeTaskStatus = function(id, st) { let t=tasksData.find(x=>x.id==id); if(t) {t.status=st; window.syncRecord('tasks/' + id, t);} };
window.addManualTaskDept = function() { let v=document.getElementById('newTaskInput').value; if(v){ let id = window.uniqueNumericId().toString(); window.syncRecord('tasks/' + id, {id:id, task:v, dept:currentTaskDept, status:'pending'}); document.getElementById('newTaskInput').value=''; showToast('تمت الإضافة'); } };

// ==========================================
// 💡 مجتمع كايزن (Kaizen Engine)
// ==========================================
window.handleKaizenImage = function(e, type) {
    const f=e.target.files[0]; if(!f) return; showToast('جاري تحضير الصورة...');
    processAndEnhanceImage(f, function(dataUrl) { kaizenImgs[type] = dataUrl; document.getElementById(type==='before'?'kaizenBeforePreview':'kaizenAfterPreview').innerHTML=`<span style="color:var(--success); font-size:12px; font-weight:bold; display:block; margin-top:10px;"><i class='bx bx-check'></i> تم الإرفاق</span>`; });
};

window.submitManualKaizen = async function() {
    const authUser = firebase?.auth?.().currentUser;
    if (!authUser) return showToast('⚠️ سجّل الدخول أولًا قبل مشاركة كايزن.');
    const title = document.getElementById('newKaizenTitle')?.value.trim() || '';
    const dept = document.getElementById('newKaizenDept')?.value || '';
    const a3 = {
        impact: document.getElementById('newKaizenImpact')?.value || 'Q',
        owner: window.sanitizeInput(document.getElementById('newKaizenOwner')?.value.trim() || currentUser.name || 'مستخدم'),
        problem: window.sanitizeInput(document.getElementById('newKaizenProblem')?.value.trim() || ''),
        rootCause: window.sanitizeInput(document.getElementById('newKaizenRootCause')?.value.trim() || ''),
        countermeasure: window.sanitizeInput(document.getElementById('newKaizenCountermeasure')?.value.trim() || ''),
        expectedBenefit: window.sanitizeInput(document.getElementById('newKaizenExpectedBenefit')?.value.trim() || ''),
        verification: window.sanitizeInput(document.getElementById('newKaizenVerification')?.value.trim() || ''),
        standardization: window.sanitizeInput(document.getElementById('newKaizenStandardization')?.value.trim() || ''),
        stage: 'plan',
        stageHistory: [{ stage: 'plan', by: currentUser.name || 'مستخدم', at: Date.now(), note: 'تم تسجيل بطاقة A3' }]
    };
    if (!title || !a3.problem || !a3.rootCause || !a3.countermeasure || !kaizenImgs.before || !kaizenImgs.after) return showToast('⚠️ أكمل عنوان التحسين والمشكلة والسبب الجذري والإجراء المضاد وأرفق الصورتين');

    const btn = document.getElementById('submitKaizenBtn');
    const originalLabel = btn.innerHTML;
    btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري دمج الصور…";
    btn.disabled = true;

    let uploadedUrl = null;
    try {
        const [imgBefore, imgAfter] = await Promise.all([window.loadImageForCanvas(kaizenImgs.before), window.loadImageForCanvas(kaizenImgs.after)]);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 600; canvas.height = 300;
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 600, 300);
        ctx.drawImage(imgBefore, 0, 0, 295, 300); ctx.drawImage(imgAfter, 305, 0, 295, 300);
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(280, 150); ctx.lineTo(320, 130); ctx.lineTo(320, 170); ctx.fill();
        ctx.fillStyle = 'rgba(239,68,68,0.9)'; ctx.fillRect(10, 10, 60, 30); ctx.fillStyle = 'white'; ctx.font = 'bold 16px Cairo'; ctx.fillText('قبل', 25, 32);
        ctx.fillStyle = 'rgba(16,185,129,0.9)'; ctx.fillRect(530, 10, 60, 30); ctx.fillStyle = 'white'; ctx.font = 'bold 16px Cairo'; ctx.fillText('بعد', 545, 32);

        btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري رفع الصورة…";
        uploadedUrl = await uploadImageToStorage(canvas.toDataURL('image/jpeg', 0.8), { folder: 'kaizen' });
        if (!uploadedUrl) throw new Error('تعذر رفع صورة كايزن إلى التخزين.');

        const kId = window.uniqueNumericId().toString();
        const record = {
            id: kId,
            dept: window.sanitizeInput(dept),
            auditor: window.sanitizeInput(currentUser.name || 'مستخدم'),
            authorUid: authUser.uid,
            authorName: window.sanitizeInput(currentUser.name || 'مستخدم'),
            date: new Date().toLocaleDateString('ar-EG'),
            createdAt: Date.now(),
            stepsOrder: ['ManualKaizen'],
            totalPct: 100,
            improvementStatus: 'plan',
            a3,
            results: { ManualKaizen: { images: { img_1: { title: window.sanitizeInput(title), data: uploadedUrl } } } }
        };

        btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري اعتماد السجل…";
        await window.syncRecord('history/' + kId, record);

        ['newKaizenTitle', 'newKaizenOwner', 'newKaizenProblem', 'newKaizenRootCause', 'newKaizenCountermeasure', 'newKaizenExpectedBenefit', 'newKaizenVerification', 'newKaizenStandardization'].forEach(id => { const field = document.getElementById(id); if (field) field.value = ''; });
        document.getElementById('kaizenBeforePreview').innerHTML = '';
        document.getElementById('kaizenAfterPreview').innerHTML = '';
        kaizenImgs = { before: null, after: null };
        document.getElementById('kaizenUploadModal').style.display = 'none';
        window.awardPoints(40, 'مشاركة كايزن');
        window.renderKaizenFeed?.();
        window.renderKaizenA3CommandStats?.();
        showToast('✅ تم حفظ بطاقة A3 كايزن وصورتها؛ وهي الآن في مرحلة التخطيط.');
    } catch (error) {
        console.error('Manual Kaizen save error:', error);
        if (uploadedUrl) {
            try { await window.deleteStorageImage(uploadedUrl); } catch (cleanupError) { console.error('Kaizen image cleanup error:', cleanupError); }
        }
        showToast(`⚠️ لم يُعتمد كايزن: ${error.message || 'تعذر حفظ السجل في قاعدة البيانات.'}`);
    } finally {
        btn.innerHTML = originalLabel;
        btn.disabled = false;
    }
};

window.loadImageForCanvas = function(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('تعذر تجهيز إحدى صور كايزن للدمج.'));
        image.src = source;
    });
};

window.kaizenStageFilter = 'all';
window.renderKaizenFeed = function() {
    let c = document.getElementById('kaizenFeedContainer'); if(!c) return;
    let selectedDept = document.getElementById('kaizenDeptSelect')?.value || 'الكل';
    const activeStage = window.kaizenStageFilter || 'all';
    const safe = (value, fallback = '—') => window.escapeTPM(String(value ?? fallback));
    const records = Array.isArray(historyData) ? historyData : [];
    
    let html = records.filter(h => {
        const stageKey = window.getKaizenStage?.(h)?.key || 'plan';
        return Array.isArray(h?.stepsOrder) && h.stepsOrder.includes('ManualKaizen') && (selectedDept === 'الكل' || h.dept === selectedDept) && (activeStage === 'all' || stageKey === activeStage);
    }).slice().reverse().map(k=> {
        const manual = k?.results?.ManualKaizen;
        const image = manual?.images?.img_1;
        if (!image?.data || !image?.title) return '';
        let lId = String(k.id || ''); let liked = Array.isArray(likesData[lId]) && likesData[lId].includes(currentUser.name); let canEdit = window.hasRole('admin') || window.hasRole('auditor') || (!!currentUser.uid && currentUser.uid === k.authorUid);
        const stage = window.getKaizenStage?.(k) || { key: 'plan', label: 'PLAN · تخطيط', className: 'plan', nextLabel: 'بدء التنفيذ' };
        const owner = k.a3?.owner || k.auditor || 'غير محدد';
        const imageSrc = /^(data:image\/|https?:\/\/)/i.test(String(image.data)) ? safe(image.data, '') : '';
        if (!imageSrc) return '';
        const canProgress = window.canAdvanceKaizenPDCA?.(k) && stage.key !== 'standardized';
        const progressControl = canProgress ? `<button class="btn btn-sm btn-success flex-1" onclick="advanceKaizenPDCA('${safe(k.id)}')"><i class='bx bx-right-arrow-alt'></i> ${safe(stage.nextLabel)}</button>` : '';
        const a3Summary = k.a3 ? `<div class="kaizen-a3-summary"><div><span>المشكلة</span><b>${safe(k.a3.problem)}</b></div><div><span>السبب الجذري</span><b>${safe(k.a3.rootCause)}</b></div><div><span>الإجراء</span><b>${safe(k.a3.countermeasure)}</b></div></div>` : `<div class="kaizen-a3-summary legacy"><div><span>بطاقة كايزن سابقة</span><b>يمكن اعتمادها في دورة A3 من خلال مرحلة التخطيط.</b></div></div>`;
        let controls = canEdit ? `<button class="btn btn-sm btn-outline flex-1" onclick="editKaizen('${safe(k.id)}')"><i class='bx bx-edit'></i> تعديل</button><button class="btn btn-sm btn-danger flex-1" onclick="deleteKaizen('${safe(k.id)}')"><i class='bx bx-trash'></i> حذف</button>` : '';
        let comments = Array.isArray(kaizenComments[lId]) ? kaizenComments[lId] : []; let commentsHtml = comments.map(cm => `<div style="background:var(--surface-inset); padding:10px 15px; border-radius:10px; margin-bottom:8px; border-right:3px solid var(--primary); font-size:13px;"><b style="color:var(--primary); display:block; margin-bottom:3px;">${safe(cm?.user)}</b> ${safe(cm?.text, '')} <span style="font-size:10px; color:var(--text-muted); float:left;">${safe(cm?.date)}</span></div>`).join('');

        return `<div class="card glass-card" style="padding:0; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 20px; background:rgba(0,0,0,0.2); border-bottom:1px solid var(--border-glass);">
                <div style="display:flex; align-items:center; gap:10px;"><i class='bx bx-user-circle' style="font-size:24px; color:var(--gold);"></i><b style="color:var(--text-main); font-size:15px;">${safe(k.auditor, 'مستخدم')}</b></div>
                <div style="display:flex; align-items:center; gap:7px; flex-wrap:wrap; justify-content:flex-end;"><span class="kaizen-stage-chip ${safe(stage.className)}">${safe(stage.label)}</span><span style="font-size:12px; color:var(--text-muted); background:var(--surface-inset); padding:4px 10px; border-radius:12px;"><i class='bx bx-buildings'></i> ${safe(k.dept)} | ${safe(k.date)}</span></div>
            </div>
            <div style="padding:20px;">
                <b style="font-size:16px; color:var(--text-main); display:block; margin-bottom:8px;">${safe(image.title)}</b>
                <div class="kaizen-owner-line"><i class='bx bx-user-pin'></i><span>مالك التحسين:</span><b>${window.escapeTPM(owner)}</b></div>
                ${a3Summary}
                <img src="${imageSrc}" alt="صورة تحسين كايزن" loading="lazy" style="width:100%; border-radius:12px; border:1px solid var(--border-glass); margin-bottom:20px; box-shadow:var(--shadow-raised);">
                <div class="row-flex" style="margin-bottom:20px;">
                    <button class="btn btn-sm ${liked?'btn-primary':'btn-outline'} flex-1" onclick="toggleKaizenLike('${lId}')"><i class='bx ${liked?'bxs-like':'bx-like'}'></i> إعجاب (${likesData[lId]?likesData[lId].length:0})</button>
                    ${progressControl}
                    ${controls}
                </div>
                <div style="border-top: 1px solid var(--border-glass); padding-top: 15px;">
                    <div style="max-height: 150px; overflow-y: auto; margin-bottom: 15px; padding-right:5px;">${commentsHtml || '<div style="font-size:12px; text-align:center; color:var(--text-muted); padding:10px;">لا توجد تعليقات</div>'}</div>
                    <div class="row-flex"><input type="text" id="comment_input_${lId}" class="form-control flex-2" placeholder="اكتب تعليقاً..." style="margin:0;"><button class="btn btn-primary btn-sm flex-1" style="margin:0;" onclick="addKaizenComment('${lId}')"><i class='bx bx-send'></i> إرسال</button></div>
                </div>
            </div>
        </div>`;
    }).join('');
    c.innerHTML = html || '<div style="text-align:center; color:var(--text-muted); padding:40px; width:100%;"><i class="bx bx-bulb" style="font-size:50px; display:block; margin-bottom:10px; opacity:0.5;"></i>لا توجد مشاركات مسجلة</div>';
};

window.toggleKaizenLike = function(id) { if(!likesData[id]) likesData[id]=[]; let i=likesData[id].indexOf(currentUser.name); if(i>-1) likesData[id].splice(i,1); else likesData[id].push(currentUser.name); window.syncRecord('likes/' + id, likesData[id]); };
window.deleteKaizen = function(id) { if(confirm('تأكيد مسح الكايزن؟')) { window.deleteRecord('history/' + id); showToast('تم الحذف'); } };
window.editKaizen = function(id) { let k=historyData.find(x=>x.id===id); if(!k) return; let v=prompt('تعديل الوصف:', k.results.ManualKaizen.images.img_1.title); if(v) { k.results.ManualKaizen.images.img_1.title=window.sanitizeInput(v); window.syncRecord('history/' + id, k); showToast('تم التعديل'); } };
window.addKaizenComment = function(id) { let el=document.getElementById(`comment_input_${id}`); let txt=window.sanitizeInput(el.value); if(!txt) return; if(!kaizenComments[id]) kaizenComments[id]=[]; let comment = {user:currentUser.name, text:txt, date:new Date().toLocaleTimeString('ar-EG')}; kaizenComments[id].push(comment); window.syncRecord('kaizenComments/' + id, kaizenComments[id]).then(() => { el.value=''; window.awardPoints(2, 'تعليق'); }).catch(error => { kaizenComments[id].pop(); showToast(`⚠️ تعذر حفظ التعليق: ${error.message || 'خطأ في قاعدة البيانات'}`); }); };

// A3 / PDCA Kaizen workflow. Legacy cards default to PLAN and remain readable.
window.KAIZEN_PDCA_STAGES = [
    { key: 'plan', label: 'PLAN · تخطيط', className: 'plan', next: 'do', nextLabel: 'بدء التنفيذ' },
    { key: 'do', label: 'DO · تنفيذ', className: 'do', next: 'check', nextLabel: 'إرسال للتحقق' },
    { key: 'check', label: 'CHECK · تحقق', className: 'check', next: 'act', nextLabel: 'اعتماد النتيجة' },
    { key: 'act', label: 'ACT · تثبيت', className: 'act', next: 'standardized', nextLabel: 'تثبيت كمعيار' },
    { key: 'standardized', label: 'STANDARD · معياري', className: 'standardized', next: null, nextLabel: 'تم التثبيت' }
];
window.getKaizenStage = function(kaizen) {
    const key = kaizen?.a3?.stage || kaizen?.improvementStatus || 'plan';
    return window.KAIZEN_PDCA_STAGES.find(stage => stage.key === key) || window.KAIZEN_PDCA_STAGES[0];
};
window.canAdvanceKaizenPDCA = function(kaizen) {
    const stage = window.getKaizenStage(kaizen);
    if (stage.key === 'standardized') return false;
    const isAdmin = window.hasRole?.('admin');
    const isOwner = [kaizen?.auditor, kaizen?.a3?.owner].filter(Boolean).includes(currentUser?.name);
    return ['check', 'act'].includes(stage.key) ? isAdmin : (isAdmin || isOwner);
};
window.advanceKaizenPDCA = async function(id) {
    const kaizen = historyData.find(item => item.id == id);
    if (!kaizen) return showToast('⚠️ تعذر العثور على بطاقة كايزن');
    const stage = window.getKaizenStage(kaizen);
    if (!window.canAdvanceKaizenPDCA(kaizen)) return showToast('⚠️ لا تملك صلاحية نقل هذه البطاقة في الدورة الحالية');
    if (!stage.next) return showToast('✅ هذا التحسين مثبت بالفعل كمعيار');
    kaizen.a3 = kaizen.a3 || { owner: kaizen.auditor || currentUser.name || 'مستخدم', stageHistory: [] };
    if (stage.key === 'check' && !kaizen.a3.verification) return showToast('⚠️ أضف طريقة التحقق قبل اعتماد النتيجة');
    if (stage.key === 'act' && !kaizen.a3.standardization) return showToast('⚠️ أضف إجراء التثبيت أو OPL قبل تحويل التحسين إلى معيار');
    const nextStage = window.KAIZEN_PDCA_STAGES.find(item => item.key === stage.next);
    kaizen.a3.stage = nextStage.key;
    kaizen.improvementStatus = nextStage.key;
    kaizen.a3.stageHistory = Array.isArray(kaizen.a3.stageHistory) ? kaizen.a3.stageHistory : [];
    kaizen.a3.stageHistory.push({ stage: nextStage.key, by: currentUser.name || 'مستخدم', at: Date.now(), note: `انتقال إلى ${nextStage.label}` });
    if (nextStage.key === 'standardized') { kaizen.standardizedAt = Date.now(); kaizen.standardizedBy = currentUser.name || 'مدير'; }
    try {
        await window.syncRecord('history/' + id, kaizen);
        if (nextStage.key === 'standardized') window.awardPoints(25, 'تثبيت كايزن كمعيار');
        window.renderKaizenFeed?.();
        window.renderKaizenA3CommandStats?.();
        showToast(`✅ تم نقل بطاقة كايزن إلى مرحلة: ${nextStage.label}`);
    } catch (error) {
        showToast(`⚠️ تعذر تحديث مرحلة كايزن: ${error.message || 'خطأ في قاعدة البيانات'}`);
    }
};
window.applyKaizenStageFilter = function(stage) {
    window.kaizenStageFilter = stage || 'all';
    document.querySelectorAll('.kaizen-stage-steps button').forEach(button => button.classList.toggle('active', button.getAttribute('onclick')?.includes(`'${window.kaizenStageFilter}'`)));
    window.renderKaizenFeed?.();
};
window.renderKaizenA3CommandStats = function() {
    const container = document.getElementById('kaizenA3CommandStats');
    if (!container) return;
    const kaizens = historyData.filter(item => item.stepsOrder?.includes('ManualKaizen'));
    const count = key => kaizens.filter(item => window.getKaizenStage(item).key === key).length;
    container.innerHTML = `<div class="kaizen-a3-stat plan"><span>تخطيط</span><b>${count('plan')}</b></div><div class="kaizen-a3-stat do"><span>تنفيذ</span><b>${count('do')}</b></div><div class="kaizen-a3-stat check"><span>تحقق</span><b>${count('check')}</b></div><div class="kaizen-a3-stat act"><span>تثبيت</span><b>${count('act')}</b></div><div class="kaizen-a3-stat standardized"><span>مثبّت كمعيار</span><b>${count('standardized')}</b></div>`;
};

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
// 📚 عقل المصنع (Digital Datapads)
// ==========================================
let tempBase64Pdf = null;
window.handleMaterialUpload = function(event) {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert("⚠️ أقصى حجم للملف 5 ميجابايت.");
    document.getElementById('pdfExtractStatus').innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري التجهيز...";
    const reader = new FileReader(); reader.onload = function(e) { tempBase64Pdf = e.target.result; document.getElementById('pdfExtractStatus').innerHTML = `<i class='bx bx-check-circle' style='color:var(--success);'></i> جاهز: <b style="color:var(--text-main);">${file.name}</b>`; }; reader.readAsDataURL(file);
};

window.saveNewBook = async function() {
    const title = document.getElementById('kbTitle').value; if (!title) return showToast("⚠️ يرجى إدخال عنوان المرجع.");
    let bookId = Date.now().toString(); let catEl = document.getElementById('kbCategory'); let cat = catEl ? catEl.value : 'JH'; let newBook = { id: bookId, title: title, category: cat, hasPdf: !!tempBase64Pdf };
    if(tempBase64Pdf) { showToast("جاري الرفع لقاعدة البيانات... ⏳"); try { await db.ref('tpm_system/pdf_files/' + bookId).set({ base64: tempBase64Pdf }); } catch(e) { return alert("⚠️ فشل رفع الملف."); } }
    let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {}); kbArray.push(newBook); knowledgeBaseData = kbArray; window.syncRecord('knowledgeBase', knowledgeBaseData);
    document.getElementById('addBookModal').style.display = 'none'; document.getElementById('kbTitle').value = ''; document.getElementById('pdfExtractStatus').innerHTML = "<i class='bx bxs-file-pdf'></i> اختر ملف PDF"; tempBase64Pdf = null; showToast("✅ تم حفظ المرجع بنجاح!"); window.renderKnowledgeBase();
};

window.renderKnowledgeBase = function() {
    const container = document.getElementById('knowledgeListContainer'); if(!container) return;
    let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {});
    if(kbArray.length === 0) { container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px 20px; background:var(--surface-inset); border-radius:var(--radius-lg); border:1px dashed var(--border-glass);"><i class='bx bx-ghost' style="font-size:60px; color:var(--text-muted); margin-bottom:15px; display:block;"></i><h3 style="color:var(--text-main); font-size:16px;">لا توجد مراجع أو كتالوجات في الأرشيف حالياً</h3></div>`; return; }
    
    container.innerHTML = kbArray.map(kb => {
        let badgeColor = 'var(--primary)'; let badgeBg = 'var(--primary-glow)';
        if(kb.category === 'JH') { badgeColor = 'var(--success)'; badgeBg = 'rgba(16, 185, 129, 0.1)'; } else if(kb.category === 'PM') { badgeColor = 'var(--danger)'; badgeBg = 'rgba(239, 68, 68, 0.1)'; } else if(kb.category === 'SOP') { badgeColor = 'var(--warning)'; badgeBg = 'rgba(249, 115, 22, 0.1)'; }
        return `
        <div class="card glass-card" style="display:flex; flex-direction:column; justify-content:space-between; height:100%; min-height:200px; padding:20px;">
            <div style="flex:1;">
                <span style="display:inline-block; padding:4px 12px; border-radius:8px; font-size:11px; font-weight:900; margin-bottom:15px; background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeColor};">${kb.category || 'عام'}</span>
                <h4 style="font-size:16px; color:var(--text-main); font-weight:800; line-height:1.4; margin-bottom:10px;">${kb.title}</h4>
                <div style="display:flex; align-items:center; gap:5px; color:var(--text-muted); font-size:11px;"><i class='bx bxs-file-pdf' style="color:var(--danger); font-size:16px;"></i> ملف PDF مؤرشف</div>
            </div>
            <div class="row-flex" style="border-top:1px solid var(--border-glass); padding-top:15px; margin-top:15px;">
                <button class="btn btn-sm btn-primary flex-2" onclick="openBookDetail('${kb.id}')"><i class='bx bx-book-open'></i> عرض المستند</button>
                ${(currentUser && currentUser.role === 'admin') ? `<button class="btn btn-sm btn-danger" style="width:40px; padding:0;" onclick="deleteKnowledgeBook('${kb.id}')"><i class='bx bx-trash'></i></button>` : ''}
            </div>
        </div>`;
    }).join('');
};

window.openBookDetail = async function(id) {
    let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {}); let kb = kbArray.find(x => x.id == id); if(!kb) return;
    if(kb.hasPdf) {
        document.getElementById('aiModal').style.display = 'flex'; document.getElementById('aiModalText').innerHTML = '<div style="padding:20px; text-align:center; color:var(--primary); font-weight:bold;"><i class="bx bx-loader-alt bx-spin"></i> جاري جلب الملف...</div>';
        try {
            let snap = await db.ref('tpm_system/pdf_files/' + id).once('value');
            if(snap.val() && snap.val().base64) {
                const b64 = snap.val().base64.split(',')[1] || snap.val().base64; const bin = atob(b64); const arr = new Uint8Array(bin.length); for(let i=0; i<bin.length; i++) arr[i] = bin.charCodeAt(i);
                const blob = new Blob([arr], {type: 'application/pdf'}); const url = URL.createObjectURL(blob); window.open(url, '_blank'); document.getElementById('aiModal').style.display = 'none';
            } else { alert("الملف غير متوفر حالياً على السيرفر."); document.getElementById('aiModal').style.display = 'none'; }
        } catch(e) { alert("خطأ في الاتصال بقاعدة البيانات."); document.getElementById('aiModal').style.display = 'none'; }
    }
};

window.deleteKnowledgeBook = async function(id) {
    if(confirm("⚠️ هل أنت متأكد من الحذف النهائي؟")) {
        let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {}); knowledgeBaseData = kbArray.filter(b => b.id != id); window.syncRecord('knowledgeBase', knowledgeBaseData);
        try { await db.ref('tpm_system/pdf_files/' + id).remove(); } catch(e){} window.renderKnowledgeBase(); showToast("تم الحذف 🗑️");
    }
};

window.updateDeptDropdown = function() {
    departments = window.getOperationalDepartments(departments);
    const options = departments.map(dept => `<option value="${window.escapeTPM(dept)}">${window.escapeTPM(dept)}</option>`).join('');
    document.querySelectorAll('select').forEach(select => {
        if (!select.id.includes('Dept')) return;
        const previous = select.value;
        const supportsAll = /filter|Global/.test(select.id);
        const requiresChoice = select.id === 'newTagDept';
        const prefix = supportsAll ? '<option value="الكل">كل الأقسام</option>' : (requiresChoice ? '<option value="" disabled>اختر القسم التشغيلي</option>' : '');
        select.innerHTML = prefix + options;
        if ([...select.options].some(option => option.value === previous)) select.value = previous;
        else if (requiresChoice) select.value = '';
    });
    window.updateOperationalSelects?.();
};
window.updateOperationalSelects = function() {
    const teamOptions = (window.TPM_TEAM_HUB || window.TPM_TEAM_CATALOG || []).map(team => `<option value="${team.id}">${team.code} — ${window.escapeTPM(team.name)}</option>`).join('');
    ['newTagTeam', 'newTaskTeam'].forEach(id => { const el = document.getElementById(id); if(el) { const previous = el.value; const placeholder = id === 'newTagTeam' ? 'لا يوجد فريق مرتبط' : 'فريق TPM (اختياري)'; el.innerHTML = `<option value="">${placeholder}</option>${teamOptions}`; if ([...el.options].some(option => option.value === previous)) el.value = previous; } });
    const engineerOptions = maintenanceEngineers.map(engineer => `<option value="${window.escapeTPM(engineer.name)}" data-phone="${window.escapeTPM(engineer.phone || '')}">${window.escapeTPM(engineer.name)}</option>`).join('');
    ['newTagEngineer', 'newTaskAssignee'].forEach(id => { const el = document.getElementById(id); if(el) { const previous = el.value; const placeholder = id === 'newTagEngineer' ? 'غير مُسند الآن' : 'مسؤول التنفيذ'; el.innerHTML = `<option value="">${placeholder}</option>${engineerOptions}`; if ([...el.options].some(option => option.value === previous)) el.value = previous; } });
};
window.addOrUpdateDept = function() {
    if (!window.hasRole('admin')) return showToast('⚠️ إدارة الأقسام متاحة للمدير فقط');
    const input = document.getElementById('newDeptInput'); const value = String(input?.value || '').trim();
    if (!value) return showToast('⚠️ اكتب اسم القسم المساند أولًا');
    departments = window.getOperationalDepartments([...departments, value]);
    window.syncRecord('departments', departments); window.updateDeptDropdown(); window.renderSettingsControlLists?.();
    if (input) input.value = ''; showToast('تم حفظ القسم وإتاحته في كل نماذج التشغيل');
};
window.addEngineer = function() {
    if (!window.hasRole('admin')) return showToast('⚠️ إدارة الإسناد متاحة للمدير فقط');
    const nameInput = document.getElementById('newEngName'); const phoneInput = document.getElementById('newEngPhone');
    const name = String(nameInput?.value || '').trim(); const phone = String(phoneInput?.value || '').trim();
    if (!name || !phone) return showToast('⚠️ اكتب الاسم ورقم الهاتف لإضافة المسؤول');
    if (maintenanceEngineers.some(engineer => engineer.name === name)) return showToast('⚠️ هذا المسؤول موجود بالفعل في قائمة الإسناد');
    maintenanceEngineers.push({ name, phone }); window.syncRecord('maintenanceEngineers', maintenanceEngineers); window.updateOperationalSelects(); window.renderSettingsControlLists?.();
    nameInput.value = ''; phoneInput.value = ''; showToast('تمت إضافة المسؤول وتحديث قوائم الإسناد');
};
window.removeSupportDepartment = function(dept) {
    if (!window.hasRole('admin')) return showToast('⚠️ إدارة الأقسام متاحة للمدير فقط');
    if (window.isCoreOperationalDepartment(dept)) return showToast('⚠️ لا يمكن إزالة قسم تشغيلي أساسي');
    if (!confirm(`إزالة «${dept}» من قائمة الأقسام المساندة؟ لن تتأثر السجلات القديمة المرتبطة به.`)) return;
    departments = window.getOperationalDepartments(departments.filter(item => item !== dept));
    window.syncRecord('departments', departments); window.updateDeptDropdown(); window.renderSettingsControlLists?.(); showToast('تمت إزالة القسم من قوائم الإدخال الجديدة');
};
window.removeEngineer = function(name) {
    if (!window.hasRole('admin')) return showToast('⚠️ إدارة الإسناد متاحة للمدير فقط');
    if (!confirm(`إزالة «${name}» من قائمة الإسناد؟ لن تتأثر التاجات أو المهام القديمة.`)) return;
    maintenanceEngineers = maintenanceEngineers.filter(engineer => engineer.name !== name);
    window.syncRecord('maintenanceEngineers', maintenanceEngineers); window.updateOperationalSelects(); window.renderSettingsControlLists?.(); showToast('تمت إزالة المسؤول من قائمة الإسناد الجديدة');
};
window.renderSettingsControlLists = function() {
    const departmentList = document.getElementById('managedDeptsList');
    if (departmentList) {
        const support = window.getOperationalDepartments(departments).filter(dept => !window.isCoreOperationalDepartment(dept));
        departmentList.innerHTML = support.length ? support.map(dept => `<div class="settings-list-row"><span><i class='bx bx-layer'></i>${window.escapeTPM(dept)}</span><button class="btn btn-sm btn-outline" onclick="removeSupportDepartment(decodeURIComponent('${window.encodeTPMArgument(dept)}'))"><i class='bx bx-x'></i> إزالة</button></div>`).join('') : '<p class="settings-empty-state">لا توجد أقسام مساندة مضافة. الأقسام الأساسية الأربعة تعمل تلقائيًا.</p>';
    }
    const engineerList = document.getElementById('managedEngsList');
    if (engineerList) engineerList.innerHTML = maintenanceEngineers.length ? maintenanceEngineers.map(engineer => `<div class="settings-list-row"><span><i class='bx bx-user'></i><b>${window.escapeTPM(engineer.name)}</b><small>${window.escapeTPM(engineer.phone || 'بدون رقم')}</small></span><button class="btn btn-sm btn-outline" onclick="removeEngineer(decodeURIComponent('${window.encodeTPMArgument(engineer.name)}'))"><i class='bx bx-x'></i> إزالة</button></div>`).join('') : '<p class="settings-empty-state">أضف مسؤولين ليظهروا عند إسناد التاجات والمهام.</p>';
};

// ==========================================
// 📉 محرك التحسين المستمر وشجرة الفواقد (KK Engine)
// ==========================================
const tpmLosses = [
    { id: 'L1', name: 'أعطال الماكينات', type: 'availability', icon: 'bx bx-wrench', color: '--danger' }, { id: 'L2', name: 'الإعداد والضبط', type: 'availability', icon: 'bx bx-cog', color: '--warning' }, { id: 'L3', name: 'تغيير أدوات ومقاسات', type: 'availability', icon: 'bx bx-cut', color: '--warning' }, { id: 'L4', name: 'بدء التشغيل', type: 'availability', icon: 'bx bx-power-off', color: '--primary' }, { id: 'L5', name: 'توقفات صغيرة عابرة', type: 'performance', icon: 'bx bx-time', color: '--gold' }, { id: 'L6', name: 'انخفاض السرعة', type: 'performance', icon: 'bx bx-tachometer', color: '--gold' }, { id: 'L7', name: 'العيوب وإعادة العمل', type: 'quality', icon: 'bx bx-error', color: '--danger' }, { id: 'L8', name: 'نقص الخامات', type: 'availability', icon: 'bx bx-package', color: '--text-muted' }
];

const COST_PER_MINUTE = 50;
let pdcaData = []; let isPdcaListenerActive = false; let currentPDCAImg = null; let pdcaChartInstance = null;

window.switchKKTab = function(tabId, btnElement) {
    document.querySelectorAll('.kk-tab-content').forEach(c => c.style.display = 'none'); document.querySelectorAll('#kkScreen .row-flex .btn').forEach(b => { b.classList.remove('btn-primary'); b.classList.add('btn-outline'); b.style.border = 'none'; });
    const targetTab = document.getElementById('kkTab-' + tabId); if(targetTab) targetTab.style.display = 'block';
    if(btnElement) { btnElement.classList.add('btn-primary'); btnElement.classList.remove('btn-outline'); }
};

window.renderKKDashboard = function() {
    const lossContainer = document.getElementById('kkLossTreeContainer'); const pdcaContainer = document.getElementById('kkPdcaContainer'); if (!lossContainer || !pdcaContainer) return;
    if(!isPdcaListenerActive && isOnline && firebase.auth().currentUser) { db.ref('tpm_system/pdca').on('value', snap => { pdcaData = snap.val() ? Object.values(snap.val()) : []; window.renderKKDashboard(); }); isPdcaListenerActive = true; }

    let filterEl = document.getElementById('kkGlobalDeptFilter'); let selectedDept = filterEl ? filterEl.value : 'الكل';
    let filteredLosses = registeredLosses; if (selectedDept !== 'الكل') filteredLosses = registeredLosses.filter(l => l.dept === selectedDept);

    lossContainer.innerHTML = tpmLosses.map(loss => {
        let currentLossMins = filteredLosses.filter(l => l.lossId === loss.id).reduce((sum, curr) => sum + curr.minutes, 0); let currentLossCost = currentLossMins * COST_PER_MINUTE; let borderColor = currentLossMins > 60 ? 'var(--danger)' : (currentLossMins > 0 ? 'var(--warning)' : 'var(--border-glass)');
        return `<div class="card glass-card" style="border-top:4px solid ${borderColor}; text-align:center; padding:20px; cursor:pointer;" onclick="openLossRegistration('${loss.id}', '${loss.name}')"><i class='${loss.icon}' style="font-size:36px; color:var(${loss.color}); margin-bottom:10px; display:block;"></i><div style="font-size:13px; font-weight:bold; color:var(--text-main); margin-bottom:15px;">${loss.name}</div><div style="background:var(--surface-inset); padding:10px; border-radius:10px; border:1px solid var(--border-glass);"><div style="font-size:12px; color:var(--text-muted);"><i class='bx bx-time'></i> ${currentLossMins} دقيقة</div><div style="font-size:14px; font-weight:900; color:${currentLossCost > 0 ? 'var(--danger)' : 'var(--success)'}; margin-top:5px;">${currentLossCost.toLocaleString()} ج.م</div></div></div>`;
    }).join('');

    let totalMins = filteredLosses.reduce((sum, l) => sum + l.minutes, 0);
    if(document.getElementById('kkTotalLossHours')) document.getElementById('kkTotalLossHours').innerText = (totalMins / 60).toFixed(1);
    if(document.getElementById('kkTotalLossCost')) document.getElementById('kkTotalLossCost').innerText = (totalMins * COST_PER_MINUTE).toLocaleString();

    let filteredPDCA = pdcaData; if (selectedDept !== 'الكل') filteredPDCA = pdcaData.filter(p => p.dept === selectedDept);
    let activePDCACount = filteredPDCA.filter(p => p.status !== 'Closed').length; if(document.getElementById('kkActiveProjects')) document.getElementById('kkActiveProjects').innerText = activePDCACount;

    if(filteredPDCA.length === 0) { pdcaContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:40px; background:var(--surface-inset); border-radius:var(--radius-lg);"><i class="bx bx-bulb" style="font-size:50px; display:block; margin-bottom:15px; opacity:0.5;"></i>لا توجد مشاريع تحسين مسجلة لهذا القسم.</div>'; } 
    else {
        pdcaContainer.innerHTML = filteredPDCA.reverse().map(p => {
            let statusColor = p.status === 'Plan' ? 'var(--warning)' : (p.status === 'Do' ? 'var(--primary)' : (p.status === 'Check' ? 'var(--gold)' : (p.status === 'Act' ? 'var(--success)' : 'var(--text-muted)')));
            let controls = window.hasRole('admin') || currentUser.name === p.owner ? `<select class="form-control flex-2" style="margin:0; padding:6px; font-size:11px; border-color:${statusColor}; color:${statusColor}; font-weight:bold;" onclick="event.stopPropagation()" onchange="updatePDCAStatus('${p.id}', this.value)"><option value="Plan" ${p.status==='Plan'?'selected':''}>خطط (Plan)</option><option value="Do" ${p.status==='Do'?'selected':''}>نفذ (Do)</option><option value="Check" ${p.status==='Check'?'selected':''}>تحقق (Check)</option><option value="Act" ${p.status==='Act'?'selected':''}>اعتمد (Act)</option><option value="Closed" ${p.status==='Closed'?'selected':''}>مغلق</option></select><button class="btn btn-sm btn-danger flex-1" style="margin:0; padding:6px;" onclick="event.stopPropagation(); deletePDCA('${p.id}')"><i class='bx bx-trash'></i></button>` : `<div style="font-size:12px; font-weight:bold; color:${statusColor}; background:var(--surface-inset); padding:6px 15px; border-radius:8px;">${p.status}</div>`;
            return `<div class="card glass-card" style="padding:20px; border-right:4px solid ${statusColor}; cursor:pointer;" onclick="viewPDCADetails('${p.id}')"><div style="display:flex; justify-content:space-between; margin-bottom:10px;"><b style="color:var(--text-main); font-size:15px;">${p.title}</b><span style="font-size:11px; color:var(--text-muted);"><i class='bx bx-calendar'></i> ${p.date}</span></div><div style="font-size:12px; color:var(--text-muted); margin-bottom:15px; background:var(--surface-inset); padding:10px; border-radius:8px; border:1px solid var(--border-glass);"><i class='bx bx-buildings'></i> ${p.dept} | <i class='bx bx-user'></i> ${p.owner} | 🎯 ${p.impact}</div><div class="row-flex" style="align-items:center;">${controls}</div></div>`;
        }).join('');
    }
};

window.createNewPDCA = function() {
    let opts = departments.map(d => `<option value="${d}">${d}</option>`).join(''); document.getElementById('pdcaDept').innerHTML = opts;
    let filterEl = document.getElementById('kkGlobalDeptFilter'); if(filterEl && filterEl.value !== 'الكل') document.getElementById('pdcaDept').value = filterEl.value;
    document.getElementById('pdcaTitle').value = ''; document.getElementById('pdcaBefore').value = ''; document.getElementById('pdcaAfter').value = ''; document.getElementById('pdcaUnit').value = ''; document.getElementById('pdcaPlan').value = ''; document.getElementById('pdcaDo').value = ''; document.getElementById('pdcaCheck').value = ''; document.getElementById('pdcaAct').value = ''; currentPDCAImg = null; document.getElementById('pdcaImgPreview').innerHTML = ''; document.getElementById('pdcaCreateModal').style.display = 'flex';
};

window.handlePDCAImage = function(e) { const f = e.target.files[0]; if(!f) return; showToast('جاري تحضير الصورة...'); processAndEnhanceImage(f, function(dataUrl) { currentPDCAImg = dataUrl; document.getElementById('pdcaImgPreview').innerHTML = `<span style="color:var(--success);"><i class='bx bx-check'></i> صورة جاهزة للرفع</span>`; }); };

window.saveNewPDCA = async function() {
    let t = document.getElementById('pdcaTitle').value; let b = parseFloat(document.getElementById('pdcaBefore').value) || 0; let a = parseFloat(document.getElementById('pdcaAfter').value) || 0; let unit = document.getElementById('pdcaUnit').value || 'وحدة';
    if(!t) return showToast('⚠️ عنوان المشروع مطلوب!');
    let uploadedUrl = null; if (currentPDCAImg) { showToast('جاري رفع صورة المشروع... ⏳'); uploadedUrl = await uploadImageToStorage(currentPDCAImg); }
    let pdcaObj = { id: window.uniqueNumericId().toString(), title: window.sanitizeInput(t), dept: document.getElementById('pdcaDept').value, impact: document.getElementById('pdcaImpact').value, beforeVal: b, afterVal: a, unit: window.sanitizeInput(unit), planText: window.sanitizeInput(document.getElementById('pdcaPlan').value), doText: window.sanitizeInput(document.getElementById('pdcaDo').value), checkText: window.sanitizeInput(document.getElementById('pdcaCheck').value), actText: window.sanitizeInput(document.getElementById('pdcaAct').value), image: uploadedUrl, status: 'Plan', owner: currentUser.name || 'مجهول', date: new Date().toLocaleDateString('ar-EG') };
    if (pdcaObj.actText !== '') pdcaObj.status = 'Closed'; else if (pdcaObj.checkText !== '') pdcaObj.status = 'Check'; else if (pdcaObj.doText !== '') pdcaObj.status = 'Do';
    pdcaData.push(pdcaObj); window.renderKKDashboard(); window.syncRecord('pdca/' + pdcaObj.id, pdcaObj); document.getElementById('pdcaCreateModal').style.display = 'none'; window.awardPoints(25, 'إطلاق PDCA'); showToast('تم إطلاق المشروع بنجاح 🚀');
};

window.viewPDCADetails = function(id) {
    let p = pdcaData.find(x => x.id == id); if(!p) return;
    document.getElementById('viewPdcaTitle').innerText = p.title; document.getElementById('viewPdcaDept').innerHTML = `<i class='bx bx-buildings'></i> ${p.dept}`; document.getElementById('viewPdcaImpact').innerHTML = `🎯 ${p.impact}`; document.getElementById('viewPdcaOwner').innerHTML = `<i class='bx bx-user'></i> ${p.owner}`;
    document.getElementById('viewPdcaPlan').innerText = p.planText || 'لم يسجل'; document.getElementById('viewPdcaDo').innerText = p.doText || 'لم يسجل'; document.getElementById('viewPdcaCheck').innerText = p.checkText || 'لم يسجل'; document.getElementById('viewPdcaAct').innerText = p.actText || 'لم يسجل';
    if(p.image) { document.getElementById('viewPdcaImg').src = p.image; document.getElementById('viewPdcaImgContainer').style.display = 'block'; } else { document.getElementById('viewPdcaImgContainer').style.display = 'none'; }
    const ctx = document.getElementById('pdcaChart'); if (pdcaChartInstance) pdcaChartInstance.destroy(); 
    pdcaChartInstance = new Chart(ctx, { type: 'bar', data: { labels: ['قبل التحسين', 'الهدف / بعد'], datasets: [{ label: p.unit, data: [p.beforeVal, p.afterVal], backgroundColor: ['rgba(239, 68, 68, 0.8)', 'rgba(16, 185, 129, 0.8)'], borderWidth: 0, borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: '#94a3b8', font: {family: 'Cairo'} }, grid:{color:'rgba(255,255,255,0.05)'} }, x: { ticks: { color: '#f8fafc', font: {family: 'Cairo', weight: 'bold'} }, grid:{display:false} } }, plugins: { legend: { display: false } } } });
    document.getElementById('pdcaViewModal').style.display = 'flex';
};

window.updatePDCAStatus = function(id, newStatus) { let p = pdcaData.find(x => x.id == id); if(p) { p.status = newStatus; window.syncRecord('pdca/' + id, p); if(newStatus === 'Act') window.awardPoints(20, 'اعتماد تحسين (Act)'); } };
window.deletePDCA = function(id) { if(confirm('هل أنت متأكد من حذف هذا المشروع نهائياً؟')) { window.deleteRecord('pdca/' + id); showToast('تم مسح المشروع 🗑️'); } };

window.openLossRegistration = function(lossId, lossName) {
    let filterEl = document.getElementById('kkGlobalDeptFilter'); let targetDept = filterEl ? filterEl.value : 'الكل';
    if(targetDept === 'الكل') { targetDept = prompt(`لأي قسم تريد تسجيل هذا الفقد؟\n(${departments.join(' أو ')})`, departments[0]); if(!targetDept || !departments.includes(targetDept)) return showToast('⚠️ يرجى إدخال اسم قسم صحيح.'); }
    let mins = prompt(`تسجيل فقد لـ [${targetDept}]:\nنوع الفقد: ${lossName}\n\nأدخل مدة التوقف (بالدقائق):`);
    if(mins && !isNaN(mins) && parseInt(mins) > 0) { let lossObj = { id: window.uniqueNumericId().toString(), lossId: lossId, dept: targetDept, minutes: parseInt(mins), date: new Date().toLocaleDateString('ar-EG'), user: currentUser.name || 'مجهول' }; registeredLosses.push(lossObj); window.renderKKDashboard(); window.syncRecord('losses/' + lossObj.id, lossObj); window.awardPoints(5, 'تسجيل فقد'); showToast(`✅ تم تسجيل الفقد.`); } else if (mins) showToast('⚠️ إدخال غير صحيح');
};
window.startKKAudit = function() { const selectedDept = document.getElementById('kkAuditDeptSelect').value; if(!selectedDept) return showToast('يرجى اختيار القسم أولاً'); showToast(`تم تجهيز بيئة المراجعة. جاري البرمجة! 🚀`); };

if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW Registration Failed', err)); }); }

// ==========================================
// 📊 JH KPIs Engine
// ==========================================
const TPM_MASTER_KPIs = [
    { id: "oee", name: "الكفاءة الكلية للمعدات (OEE)", cat: "P", type: "auto", unit: "%", target: 85, dir: "up" },
    { id: "mtbf", name: "متوسط الوقت بين الأعطال (MTBF)", cat: "P", type: "manual", unit: "ساعة", target: 120, dir: "up" },
    { id: "breakdowns", name: "تاجات الصيانة الحمراء", cat: "P", type: "auto", unit: "عطل", target: 0, dir: "down" },
    { id: "defect_rate", name: "نسبة العيوب / الهالك", cat: "Q", type: "manual", unit: "%", target: 1, dir: "down" },
    { id: "maintenance_cost", name: "تكلفة الصيانة", cat: "C", type: "manual", unit: "جنيه", target: 5000, dir: "down" },
    { id: "plan_achievement", name: "تحقيق الخطة", cat: "D", type: "manual", unit: "%", target: 98, dir: "up" },
    { id: "safety_tags", name: "إغلاق تاجات الأمان", cat: "S", type: "manual", unit: "%", target: 100, dir: "up" },
    { id: "jh_audit_score", name: "مراجعة الصيانة الذاتية", cat: "M", type: "auto", unit: "%", target: 90, dir: "up" },
    { id: "kaizen_implemented", name: "كايزن المطبقة", cat: "M", type: "auto", unit: "فكرة", target: 10, dir: "up" }
];

window.currentPQCDSMFilter = 'All';

window.openJHKPIsScreen = function() { showScreen('jhKPIsScreen'); window.renderKPIDeptTabs(); window.loadKPIsForDepartment(currentKPIDept); window.calculateGlobalKPIs(); window.filterKPITable('All'); setTimeout(() => { window.initEnterpriseCharts(); }, 300); };
window.renderKPIDeptTabs = function() { let opts = departments.map(d => `<option value="${d}">${d}</option>`).join(''); let f1 = document.getElementById('kpiDeptFilter'); if(f1) f1.innerHTML = `<option value="factory">المصنع بالكامل</option>` + opts; let mFilter = document.getElementById('kpiMonthFilter'); if(mFilter && mFilter.options.length === 0) { let cm = new Date().toISOString().slice(0, 7); mFilter.innerHTML = `<option value="${cm}">الشهر الحالي</option>`; } };
window.reloadEnterpriseKPIs = function() { let d = document.getElementById('kpiDeptFilter').value; if(d !== 'factory') currentKPIDept = d; window.loadKPIsForDepartment(currentKPIDept); };

window.loadKPIsForDepartment = async function(dept) {
    let currentMonth = document.getElementById('kpiMonthFilter') ? document.getElementById('kpiMonthFilter').value : new Date().toISOString().slice(0, 7); 
    const snap = await db.ref(`tpm_system/jh_kpis/${currentMonth}/${dept}`).once('value'); let kpiDataStore = snap.val() || {}; window.kpiDataStore = kpiDataStore;

    let deptAudits = historyData.filter(h => h.dept === dept && !h.stepsOrder.includes('ManualKaizen')); let auditScore = deptAudits.length > 0 ? deptAudits[deptAudits.length-1].totalPct : 0;
    let openTags = tagsData.filter(t => t.dept === dept && t.color === 'red' && t.status !== 'closed').length; let closedTags = tagsData.filter(t => t.dept === dept && t.color === 'red' && t.status === 'closed').length;
    let kaizens = historyData.filter(h => h.dept === dept && h.stepsOrder.includes('ManualKaizen')).length; let oee = Math.max(0, Math.round((auditScore * 0.95) - (openTags * 1.5)));

    if(document.getElementById('kpiDashOEE')) document.getElementById('kpiDashOEE').innerText = oee + '%';
    if(document.getElementById('kpiDashAudit')) document.getElementById('kpiDashAudit').innerText = auditScore + '%';
    if(document.getElementById('kpiDashTags')) document.getElementById('kpiDashTags').innerText = `${closedTags}/${openTags}`;
    if(document.getElementById('kpiDashKaizen')) document.getElementById('kpiDashKaizen').innerText = kaizens;
    window.renderEnterpriseKPITable();
};

window.calculateGlobalKPIs = function() {}; 
window.filterKPITable = function(category) { window.currentPQCDSMFilter = category; document.querySelectorAll('#jhKPIsScreen .row-flex button').forEach(btn => { if(btn.innerText.includes(category) || (category === 'All' && btn.innerText.includes('الكل'))) { btn.classList.add('btn-primary'); btn.classList.remove('btn-outline'); } else { btn.classList.remove('btn-primary'); btn.classList.add('btn-outline'); } }); window.renderEnterpriseKPITable(); };

window.renderEnterpriseKPITable = function() {
    let tbody = document.getElementById('enterpriseKPITableBody'); if(!tbody) return; tbody.innerHTML = '';
    let filteredKPIs = TPM_MASTER_KPIs.filter(kpi => window.currentPQCDSMFilter === 'All' || kpi.cat === window.currentPQCDSMFilter);
    let kpiDataStore = window.kpiDataStore || {};
    filteredKPIs.forEach(kpi => {
        let val = 0; let sourceBadge = '';
        if(kpi.type === 'manual') { val = kpiDataStore[kpi.id] || 0; sourceBadge = '<span style="color:var(--warning);"><i class="bx bx-edit"></i></span>'; } 
        else {
            sourceBadge = '<span style="color:var(--success);"><i class="bx bx-bot"></i></span>';
            if (kpi.id === 'breakdowns') val = tagsData.filter(t => t.dept === currentKPIDept && t.color === 'red' && t.status !== 'closed').length;
            else if (kpi.id === 'jh_audit_score') { let auds = historyData.filter(h => h.dept === currentKPIDept && !h.stepsOrder.includes('ManualKaizen')); val = auds.length > 0 ? auds[auds.length-1].totalPct : 0; }
            else if (kpi.id === 'kaizen_implemented') val = historyData.filter(h => h.dept === currentKPIDept && h.stepsOrder.includes('ManualKaizen')).length;
            else if (kpi.id === 'oee') { let auds = historyData.filter(h => h.dept === currentKPIDept && !h.stepsOrder.includes('ManualKaizen')); let sc = auds.length > 0 ? auds[auds.length-1].totalPct : 0; let ops = tagsData.filter(t => t.dept === currentKPIDept && t.color === 'red' && t.status !== 'closed').length; val = Math.max(0, Math.round((sc * 0.95) - (ops * 1.5))); }
        }
        let isGood = kpi.dir === 'up' ? (val >= kpi.target) : (val <= kpi.target); let statusIcon = isGood ? '<i class="bx bx-check-circle"></i>' : '<i class="bx bx-error-circle"></i>'; let statusClass = isGood ? 'success-text' : 'danger-text';
        tbody.innerHTML += `<tr style="border-bottom: 1px solid var(--border-glass);"><td style="text-align:center; padding:12px;"><span class="kpi-category-badge cat-${kpi.cat}">${kpi.cat}</span></td><td style="color:var(--text-main); font-weight:bold;">${kpi.name} ${sourceBadge}</td><td style="text-align:center; color:var(--gold);">${kpi.target}</td><td style="text-align:center; font-weight:900; color:${val>0?'#fff':'var(--text-muted)'};">${val}</td><td style="text-align:center;" class="${statusClass}">${statusIcon}</td></tr>`;
    });
};

window.openKPIEntryModal = function() { let nameEl = document.getElementById('manualKPIDeptName'); if(nameEl) nameEl.innerHTML = `<i class='bx bx-edit'></i> إدخال بيانات: ${currentKPIDept}`; let kpiDataStore = window.kpiDataStore || {}; let fieldsHtml = TPM_MASTER_KPIs.filter(k => k.type === 'manual').map(kpi => `<div class="form-group"><label style="color:var(--text-muted); font-size:12px;">${kpi.name} (${kpi.unit})</label><input type="number" id="manual_kpi_${kpi.id}" class="form-control" value="${kpiDataStore[kpi.id] || 0}"></div>`).join(''); let fieldsContainer = document.getElementById('manualKPIFields'); if(fieldsContainer) fieldsContainer.innerHTML = fieldsHtml; let modal = document.getElementById('manualKPIModal'); if(modal) modal.style.display = 'flex'; };

window.saveManualKPIs = async function() {
    let currentMonth = document.getElementById('kpiMonthFilter') ? document.getElementById('kpiMonthFilter').value : new Date().toISOString().slice(0, 7);
    let updates = {}; TPM_MASTER_KPIs.filter(k => k.type === 'manual').forEach(kpi => { let el = document.getElementById(`manual_kpi_${kpi.id}`); if(el) updates[kpi.id] = parseFloat(el.value) || 0; });
    await db.ref(`tpm_system/jh_kpis/${currentMonth}/${currentKPIDept}`).set(updates); document.getElementById('manualKPIModal').style.display = 'none'; showToast('تم حفظ المؤشرات ✅'); window.loadKPIsForDepartment(currentKPIDept); 
};

window.initEnterpriseCharts = function() {
    let ctxRadar = document.getElementById('kpiMaturityRadar'); if(ctxRadar) { if(window.kpiRadarChartInst) window.kpiRadarChartInst.destroy(); window.kpiRadarChartInst = new Chart(ctxRadar, { type: 'radar', data: { labels: ['إنتاجية', 'جودة', 'تكلفة', 'تسليم', 'سلامة', 'معنويات'], datasets: [{ label: 'الحالي', data: [85, 92, 70, 88, 100, 95], backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#f59e0b', pointBackgroundColor: '#f59e0b', borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' }, angleLines: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { font: { family: 'Cairo' }, color: '#94a3b8' } } }, plugins: { legend: { display: false } } } }); }
    let ctxTrend = document.getElementById('kpiTrendLine'); if(ctxTrend) { if(window.kpiTrendChartInst) window.kpiTrendChartInst.destroy(); window.kpiTrendChartInst = new Chart(ctxTrend, { type: 'line', data: { labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'], datasets: [{ label: 'OEE %', data: [72, 75, 74, 78, 80, 82], borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 3, fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Cairo' } } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } } }, plugins: { legend: { display: false } } } }); }
};

// ==========================================
// 🧹 CLIT Checklists & Mapping Engine (Restored fully)
// ==========================================
let clitSelectedZone = 'الكل'; let clitSelectedOp = 'الكل'; let clitSelectedFreq = 'الكل'; let currentDocType = ''; let activeChecklistTasks = [];

window.openJHDocument = async function(type) {
    currentDocType = type;
    const headerMap = { 'CLIT': '🧹 خرائط (CLIT)', 'Contamination': '🛢️ مصادر التلوث', 'SOC': '🧗‍♂️ أماكن صعبة الوصول', 'Safety': '⚠️ خريطة الأمان', 'Anatomy': '⚙️ تشريح الماكينة' };
    document.getElementById('jhDocHeader').innerText = headerMap[type] || 'السجل';
    
    ['clitStatsSummary', 'clitZoneFilters', 'clitOpFilters', 'clitFrequencyFilters', 'startChecklistBtnContainer'].forEach(id => { const el = document.getElementById(id); if(el) el.style.display = (type === 'CLIT' && currentJHDept === 'حقن الكابينة') ? (id==='clitOpFilters'?'grid':(id==='startChecklistBtnContainer'?'block':'flex')) : 'none'; });
    
    if(type === 'CLIT' && currentJHDept === 'حقن الكابينة') { clitSelectedZone = 'الكل'; clitSelectedOp = 'الكل'; clitSelectedFreq = 'الكل'; window.resetFilterButtonsUI(); }
    
    window.renderJHDocForm(type); showToast('جاري تحميل السجلات... ⏳');
    const snap = await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}`).once('value'); let records = snap.val() ? Object.values(snap.val()) : [];
    
    if(type === 'CLIT' && currentJHDept === 'حقن الكابينة' && records.length === 0 && window.factoryCLITData) {
        showToast('جاري تهيئة الخرائط القياسية... ⏳'); let updates = {}; window.factoryCLITData.forEach(item => { updates[item.id] = item; });
        await db.ref(`tpm_system/jh_records/حقن الكابينة/CLIT`).set(updates); records = window.factoryCLITData; showToast('تمت التهيئة ✅');
    }
    
    if(type === 'CLIT' && currentJHDept === 'حقن الكابينة') {
        if(document.getElementById('statTotalPoints')) document.getElementById('statTotalPoints').innerText = records.length;
        ['الجيكات', 'الهيد', 'الفرن', 'مدخل', 'عربة', 'تجهيزة'].forEach(z => { let count = records.filter(item => item.region && item.region.includes(z)).length; let badge = document.getElementById(`badge-count-${z}`); if(badge) badge.innerText = count; });
    }
    window.currentLoadedRecords = records; window.renderJHDocList(type, records); showScreen('jhDocumentScreen');
};

window.resetFilterButtonsUI = function() {
    document.querySelectorAll('.clit-zone-btn, .clit-op-btn, .clit-freq-btn').forEach(btn => { btn.classList.remove('active', 'btn-primary', 'btn-success'); btn.classList.add('btn-outline'); });
    const zbs = document.querySelectorAll('.clit-zone-btn'); if(zbs.length>0) zbs[0].classList.add('active');
    const obs = document.querySelectorAll('.clit-op-btn'); if(obs.length>0) obs[0].classList.add('active', 'btn-primary');
    const fbs = document.querySelectorAll('.clit-freq-btn'); if(fbs.length>0) fbs[0].classList.add('active');
};

window.filterCLITZone = function(zone, btnEl) { clitSelectedZone = zone; document.querySelectorAll('.clit-zone-btn').forEach(b => b.classList.remove('active')); btnEl.classList.add('active'); window.renderJHDocList('CLIT', window.currentLoadedRecords); };
window.filterCLITOp = function(op, btnEl) { clitSelectedOp = op; document.querySelectorAll('.clit-op-btn').forEach(b => { b.classList.remove('active', 'btn-primary'); b.classList.add('btn-outline'); }); btnEl.classList.add('active', 'btn-primary'); window.renderJHDocList('CLIT', window.currentLoadedRecords); };
window.filterCLITFreq = function(freq, btnEl) { clitSelectedFreq = freq; document.querySelectorAll('.clit-freq-btn').forEach(b => b.classList.remove('active')); btnEl.classList.add('active'); window.renderJHDocList('CLIT', window.currentLoadedRecords); };

window.renderJHDocList = function(type, records) {
    let container = document.getElementById('jhDocListContainer'); if(!container) return;
    if(type === 'CLIT' && currentJHDept === 'حقن الكابينة') {
        let filtered = records.filter(item => { let matchZone = (clitSelectedZone === 'الكل') || (item.region && item.region.includes(clitSelectedZone)); let itemOp = item.operation || ''; let matchOp = (clitSelectedOp === 'الكل') || (clitSelectedOp === 'تزييت' && (itemOp.includes('تزييت') || itemOp.includes('تشحيم'))) || (itemOp.includes(clitSelectedOp)); let matchFreq = (clitSelectedFreq === 'الكل') || (item.frequency && item.frequency.includes(clitSelectedFreq)); return matchZone && matchOp && matchFreq; });
        if(document.getElementById('statActiveFiltered')) document.getElementById('statActiveFiltered').innerText = filtered.length;
        if(document.getElementById('statEstimatedTime')) document.getElementById('statEstimatedTime').innerText = Math.round(filtered.length * 1.5) + 'm';
        if(filtered.length === 0) { container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">لا توجد أي نقاط فحص مطابقة.</div>'; return; }
        const opGroups = { '🧹 التنظيف (C)': [], '🛢️ التزييت والتشحيم (L)': [], '🔍 الفحص (I)': [], '🔧 التربيط (T)': [] };
        filtered.forEach(r => { let op = r.operation || r.clitType || ''; if(op.includes('تنظيف') || op.includes('تنطيف')) opGroups['🧹 التنظيف (C)'].push(r); else if(op.includes('تزييت') || op.includes('تشحيم')) opGroups['🛢️ التزييت والتشحيم (L)'].push(r); else if(op.includes('فحص')) opGroups['🔍 الفحص (I)'].push(r); else if(op.includes('تربيط') || op.includes('ربط')) opGroups['🔧 التربيط (T)'].push(r); else opGroups['🔍 الفحص (I)'].push(r); });
        let html = ''; for (let groupName in opGroups) { if(opGroups[groupName].length > 0) { html += `<h4 style="color:var(--gold); margin:20px 0 10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">${groupName}</h4>` + opGroups[groupName].map(r => window.generateCLITCard(r, type)).join(''); } }
        container.innerHTML = html;
    } else { container.innerHTML = records.reverse().map(r => window.generateCLITCard(r, type)).join('') || '<div style="text-align:center; padding:20px; color:var(--text-muted);">لا توجد سجلات</div>'; }
};

window.generateCLITCard = function(r, type) {
    let content = ''; let borderColor = 'var(--gold)'; let bgGlow = 'rgba(255,255,255,0.02)';
    if(type === 'CLIT') {
        let op = r.operation || r.clitType || ''; let icon = '⚙️';
        if(op.includes('تنظيف')) { borderColor = '#3b82f6'; icon = '🧹'; bgGlow = 'rgba(59, 130, 246, 0.05)'; } else if(op.includes('تزييت')) { borderColor = '#f97316'; icon = '🛢️'; bgGlow = 'rgba(249, 115, 22, 0.05)'; } else if(op.includes('فحص')) { borderColor = '#22c55e'; icon = '🔍'; bgGlow = 'rgba(34, 197, 94, 0.05)'; } else if(op.includes('تربيط')) { borderColor = '#ef4444'; icon = '🔧'; bgGlow = 'rgba(239, 68, 68, 0.05)'; }
        content = `<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;"><b style="color:var(--text-main); font-size:14px;">${icon} [${r.region}] ${r.part ? ' - ' + r.part : ''}</b><span style="font-size:10px; background:${borderColor}; color:white; padding:2px 8px; border-radius:10px;">${r.frequency || 'دوري'}</span></div><div style="font-size:12px; color:var(--text-muted); margin-bottom:5px;"><span style="color:${borderColor}; font-weight:bold;">الإجراء:</span> ${r.action || r.standard}</div><div style="font-size:11px; background:rgba(0,0,0,0.3); padding:8px; border-radius:8px; border:1px dashed ${borderColor};"><b>🎯 المعيار:</b> ${r.optimalState || r.standard || 'حسب المواصفة'}<br>${r.degradation ? `<b>⚠️ التدهور:</b> <span style="color:var(--danger);">${r.degradation}</span><br>` : ''}<b>🛠️ الأدوات/الماكينة:</b> ${r.tools || 'يدوي'} | <span style="color:var(--warning);">${r.machineState || 'مجهول'}</span><br><b>⏱️ الزمن:</b> ${r.timeBefore || '-'} / <span style="color:var(--success);">${r.timeAfter || '-'}</span></div>`;
    } else if(type === 'Contamination') { borderColor = '#795548'; bgGlow = 'rgba(121, 85, 72, 0.05)'; content = `<b>📍 ${r.location}</b><br><small style="color:#795548;">التلوث: ${r.typeDesc}</small>`; } else if(type === 'SOC') { borderColor = 'var(--warning)'; bgGlow = 'rgba(255, 193, 7, 0.05)'; content = `<b>🚧 ${r.location}</b><br><small style="color:var(--warning);">السبب: ${r.reason}</small>`; } else if(type === 'Safety') { borderColor = 'var(--danger)'; bgGlow = 'rgba(244, 67, 54, 0.05)'; content = `<b>${r.level==='high'?'🔴':'🟡'} ${r.hazard}</b>`; } else { borderColor = 'var(--gold)'; bgGlow = 'rgba(255, 193, 7, 0.05)'; content = `<b>⚙️ ${r.name}</b><br><small style="color:var(--gold);">${r.desc}</small>`; }
    let actionBtns = window.hasRole('admin') && r.id ? `<button class="btn btn-sm btn-warning" style="padding:4px; width:100%; margin-top:5px;" onclick="editJHRecord('${type}','${r.id}')"><i class='bx bx-edit'></i></button><button class="btn btn-sm btn-danger" style="padding:4px; width:100%; margin-top:5px;" onclick="deleteJHRecord('${type}','${r.id}')"><i class='bx bx-trash'></i></button>` : '';
    return `<div class="card glass-card" style="border-right:4px solid ${borderColor}; background:${bgGlow}; padding:15px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;"><div style="flex:1;">${content}</div><div style="border-left:1px solid rgba(255,255,255,0.05); padding-left:10px; margin-left:10px;">${actionBtns}</div></div>`;
};

window.renderJHDocForm = function(type) {
    let formHtml = '';
    if(type === 'CLIT') { formHtml = `<h4 style="margin:0 0 10px; color:#00BCD4;">تسجيل نقطة CLIT</h4><div class="row-flex"><select id="clitType" class="form-control flex-1"><option value="تنظيف">تنظيف</option><option value="تزييت">تزييت/تشحيم</option><option value="فحص">فحص</option><option value="تربيط">تربيط</option></select><select id="clitFreq" class="form-control flex-1"><option value="يومي">يومي</option><option value="أسبوعي">أسبوعي</option><option value="شهري">شهري</option><option value="سنوي">سنوي</option></select></div><div class="row-flex"><input type="text" id="clitRegion" class="form-control flex-1" placeholder="المنطقة"><input type="text" id="clitPart" class="form-control flex-1" placeholder="الجزء"></div><textarea id="clitAction" class="form-control" rows="2" placeholder="الإجراء المطلوب"></textarea><div class="row-flex"><input type="text" id="clitStandard" class="form-control flex-1" placeholder="المعيار"><input type="text" id="clitDegradation" class="form-control flex-1" placeholder="التدهور"></div><div class="row-flex"><input type="text" id="clitTools" class="form-control flex-1" placeholder="الأدوات"><select id="clitMachineState" class="form-control flex-1"><option value="لا تعمل">لا تعمل</option><option value="تعمل">تعمل</option></select></div><div class="row-flex"><input type="text" id="clitTimeBefore" class="form-control flex-1" placeholder="وقت قبل"><input type="text" id="clitTimeAfter" class="form-control flex-1" placeholder="وقت بعد"></div><button class="btn btn-primary full-width" onclick="saveJHRecord('CLIT')">➕ إضافة</button>`; } else if(type === 'Contamination') { formHtml = `<input type="text" id="contLocation" class="form-control" placeholder="المكان"><input type="text" id="contType" class="form-control" placeholder="نوع التلوث"><button class="btn btn-primary full-width" onclick="saveJHRecord('Contamination')">➕ رصد</button>`; } else if(type === 'SOC') { formHtml = `<input type="text" id="socLocation" class="form-control" placeholder="المكان"><input type="text" id="socReason" class="form-control" placeholder="سبب الصعوبة"><button class="btn btn-warning full-width" onclick="saveJHRecord('SOC')">➕ إضافة</button>`; } else if(type === 'Safety') { formHtml = `<input type="text" id="safeHazard" class="form-control" placeholder="وصف الخطر"><select id="safeLevel" class="form-control"><option value="high">حرج</option><option value="med">متوسط</option></select><button class="btn btn-danger full-width" onclick="saveJHRecord('Safety')">➕ تسجيل</button>`; } else { formHtml = `<input type="text" id="partName" class="form-control" placeholder="اسم الجزء"><textarea id="partDesc" class="form-control" placeholder="وصف وفحص" rows="2"></textarea><button class="btn btn-primary full-width" onclick="saveJHRecord('Anatomy')">💾 حفظ</button>`; }
    document.getElementById('jhDocActionArea').innerHTML = formHtml;
};

window.saveJHRecord = async function(type) {
    let data = { id: window.uniqueNumericId().toString(), date: new Date().toLocaleDateString('ar-EG'), user: currentUser.name };
    if(type === 'CLIT') { data.operation = document.getElementById('clitType').value; data.frequency = document.getElementById('clitFreq').value; data.region = document.getElementById('clitRegion').value || 'عام'; data.part = document.getElementById('clitPart').value; data.action = document.getElementById('clitAction').value; data.optimalState = document.getElementById('clitStandard').value; data.degradation = document.getElementById('clitDegradation').value; data.tools = document.getElementById('clitTools').value; data.machineState = document.getElementById('clitMachineState').value; data.timeBefore = document.getElementById('clitTimeBefore').value; data.timeAfter = document.getElementById('clitTimeAfter').value; if(!data.action) return showToast('الإجراء مطلوب'); } else if(type === 'Contamination') { data.location = document.getElementById('contLocation').value; data.typeDesc = document.getElementById('contType').value; if(!data.location) return; } else if(type === 'SOC') { data.location = document.getElementById('socLocation').value; data.reason = document.getElementById('socReason').value; if(!data.location) return; } else if(type === 'Safety') { data.hazard = document.getElementById('safeHazard').value; data.level = document.getElementById('safeLevel').value; if(!data.hazard) return; } else { data.name = document.getElementById('partName').value; data.desc = document.getElementById('partDesc').value; if(!data.name) return; }
    await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}/${data.id}`).set(data); showToast('تم الحفظ ✅'); window.openJHDocument(type); 
};

window.editJHRecord = async function(type, id) {
    const snap = await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}/${id}`).once('value'); let r = snap.val(); if(!r) return showToast('خطأ: تعذر سحب البيانات');
    document.getElementById('editJhId').value = id; document.getElementById('editJhType').value = type;
    let fieldsHtml = ''; if(type === 'CLIT') { fieldsHtml = `<div class="row-flex"><div class="form-group flex-1"><label>العملية</label><input type="text" id="ed_clitOp" class="form-control" value="${r.operation||r.clitType||''}"></div><div class="form-group flex-1"><label>الدورية</label><input type="text" id="ed_clitFreq" class="form-control" value="${r.frequency||''}"></div></div><div class="row-flex"><div class="form-group flex-1"><label>المنطقة</label><input type="text" id="ed_clitRegion" class="form-control" value="${r.region||''}"></div><div class="form-group flex-1"><label>الجزء</label><input type="text" id="ed_clitPart" class="form-control" value="${r.part||''}"></div></div><div class="form-group"><label>الإجراء (Action)</label><textarea id="ed_clitAction" class="form-control" rows="2">${r.action||r.standard||''}</textarea></div><div class="row-flex"><div class="form-group flex-1"><label>الحالة المثلى</label><input type="text" id="ed_clitStandard" class="form-control" value="${r.optimalState||r.standard||''}"></div><div class="form-group flex-1"><label>التدهور</label><input type="text" id="ed_clitDegradation" class="form-control" value="${r.degradation||''}"></div></div><div class="row-flex"><div class="form-group flex-1"><label>الأدوات</label><input type="text" id="ed_clitTools" class="form-control" value="${r.tools||''}"></div><div class="form-group flex-1"><label>الماكينة</label><input type="text" id="ed_clitMachineState" class="form-control" value="${r.machineState||''}"></div></div>`; } 
    document.getElementById('editJhFormFields').innerHTML = fieldsHtml; document.getElementById('editJHRecordModal').style.display = 'flex';
};

window.updateJHRecordData = async function() {
    let id = document.getElementById('editJhId').value; let type = document.getElementById('editJhType').value; let updates = {};
    if(type === 'CLIT') { updates = { operation: document.getElementById('ed_clitOp').value, frequency: document.getElementById('ed_clitFreq').value, region: document.getElementById('ed_clitRegion').value, part: document.getElementById('ed_clitPart').value, action: document.getElementById('ed_clitAction').value, optimalState: document.getElementById('ed_clitStandard').value, degradation: document.getElementById('ed_clitDegradation').value, tools: document.getElementById('ed_clitTools').value, machineState: document.getElementById('ed_clitMachineState').value }; }
    await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}/${id}`).update(updates); showToast('تم التعديل ✅'); document.getElementById('editJHRecordModal').style.display = 'none'; window.openJHDocument(type); 
};

window.deleteJHRecord = async function(type, id) { if(confirm('هل أنت متأكد من الحذف نهائياً؟')) { await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}/${id}`).remove(); showToast('تم الحذف 🗑️'); window.openJHDocument(type); } };

window.startCLITChecklist = function() {
    if (clitSelectedFreq === 'الكل') return showToast('⚠️ يرجى اختيار دورية محددة لبدء الفحص.');
    let recordsToExecute = [];
    if (window.currentLoadedRecords) { recordsToExecute = window.currentLoadedRecords.filter(item => { let matchZone = (clitSelectedZone === 'الكل') || (item.region && item.region.includes(clitSelectedZone)); let itemOp = item.operation || ''; let matchOp = (clitSelectedOp === 'الكل') || (clitSelectedOp === 'تزييت' && (itemOp.includes('تزييت') || itemOp.includes('تشحيم'))) || (itemOp.includes(clitSelectedOp)); let matchFreq = (item.frequency && item.frequency.includes(clitSelectedFreq)); return matchZone && matchOp && matchFreq; }); }
    if(recordsToExecute.length === 0) return showToast('لا توجد مهام مطابقة للفلتر.');
    document.getElementById('checklistCurrentDate').innerText = new Date().toLocaleDateString('ar-EG');
    activeChecklistTasks = recordsToExecute.map(r => ({ ...r, status: 'pending', tagId: null }));
    document.getElementById('activeChecklistFreq').innerText = `${clitSelectedFreq} - ${currentJHDept}`;
    window.renderChecklistUI(); showScreen('clitChecklistScreen');
};

window.renderChecklistUI = function() {
    let container = document.getElementById('checklistItemsContainer'); let completedCount = activeChecklistTasks.filter(t => t.status !== 'pending').length; let totalCount = activeChecklistTasks.length;
    document.getElementById('checklistProgress').innerText = completedCount; document.getElementById('checklistTotal').innerText = totalCount; document.getElementById('checklistProgressBar').style.width = `${(completedCount / totalCount) * 100}%`;
    container.innerHTML = activeChecklistTasks.map((t, idx) => {
        let isDone = t.status === 'done'; let isIssue = t.status === 'issue';
        let cardStyle = isDone ? 'border-color:var(--success); background:rgba(16,185,129,0.05);' : (isIssue ? 'border-color:var(--danger); background:rgba(239,68,68,0.05);' : `border-left:5px solid var(--primary);`);
        let tagBadge = t.tagId ? `<div style="margin-top:10px; padding:8px; background:var(--danger); color:white; border-radius:8px; font-size:11px; text-align:center; font-weight:bold; cursor:pointer;" onclick="showScreen('tagsScreen'); document.getElementById('filterTagMachine').value='${t.part || t.region}'; window.renderTags();">🚨 مشكلة تم الإبلاغ عنها [${t.tagId.substring(t.tagId.length - 4)}]</div>` : '';
        return `<div class="card glass-card" style="padding:15px; transition:0.3s; ${cardStyle}"><div style="display:flex; justify-content:space-between; margin-bottom:10px;"><b style="font-size:13px; color:var(--text-main);">${idx+1}. [${t.operation}] ${t.region} ${t.part ? ' - ' + t.part : ''}</b></div><div style="font-size:12px; color:var(--text-muted); margin-bottom:5px;"><b>الإجراء:</b> ${t.action}</div><div class="row-flex" style="gap:10px; margin-top:15px;"><button class="btn btn-sm ${isDone ? 'btn-success' : 'btn-outline'} flex-1" style="border-radius:20px;" onclick="markChecklistItem(${idx}, 'done')">✅ سليم</button><button class="btn btn-sm ${isIssue ? 'btn-danger' : 'btn-outline'} flex-1" style="border-radius:20px;" onclick="openCLITIssueModal(${idx})">❌ عطل</button></div>${tagBadge}</div>`;
    }).join('');
};

window.markChecklistItem = function(idx, status) { activeChecklistTasks[idx].status = status; window.renderChecklistUI(); };
window.currentTaggingChecklistIdx = null;

window.openCLITIssueModal = function(idx) { let t = activeChecklistTasks[idx]; window.currentTaggingChecklistIdx = idx; document.getElementById('clitTagItemName').innerText = `${t.region} - ${t.part || t.action}`; document.getElementById('clitTagDegradation').innerText = t.degradation || 'ظاهرة غير طبيعية'; document.getElementById('clitTagDesc').value = ''; document.getElementById('clitTagModal').style.display = 'flex'; };

window.submitCLITTag = async function() {
    let desc = document.getElementById('clitTagDesc').value.trim(); if(!desc) return showToast('⚠️ يرجى كتابة وصف المشكلة.');
    let t = activeChecklistTasks[window.currentTaggingChecklistIdx]; let fullDesc = `[مكتشف بالصيانة الذاتية]: ${desc} \n(المنطقة: ${t.region} - ${t.part})`; let tId = window.uniqueNumericId().toString();
    window.syncRecord('tags/' + tId, { id: tId, desc: fullDesc, color: 'red', dept: currentJHDept, machine: t.part || t.region, status: 'open', auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG'), timestamp: Date.now() });
    t.status = 'issue'; t.tagId = tId; document.getElementById('clitTagModal').style.display = 'none'; window.awardPoints(15, 'اكتشاف عطل بالصيانة الذاتية'); showToast('🚨 تم إصدار التاج وربطه بنجاح!'); window.renderChecklistUI(); 
};

window.submitFinalChecklist = async function() {
    let pending = activeChecklistTasks.filter(t => t.status === 'pending').length; if(pending > 0) { if(!confirm(`⚠️ يتبقى ${pending} مهام لم يتم فحصها! حفظ القائمة؟`)) return; }
    showToast('جاري أرشفة القائمة في السجل الذكي... ⏳');
    let executionObj = { id: window.uniqueNumericId().toString(), dept: currentJHDept, frequency: clitSelectedFreq, date: new Date().toLocaleDateString('ar-EG'), time: new Date().toLocaleTimeString('ar-EG'), user: currentUser.name, tasks: activeChecklistTasks };
    await db.ref(`tpm_system/clit_executions/${currentJHDept}/${executionObj.id}`).set(executionObj); window.awardPoints(30, `تنفيذ قائمة فحص (${clitSelectedFreq})`); showToast('تم حفظ دورة الصيانة بنجاح ✅'); showScreen('jhDocumentScreen');
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
            <b style="color:var(--success); font-size:16px;"><i class='bx bx-buildings'></i> ${d}</b>
        </div>
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
                border = '2px solid var(--warning)';
            } else {
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
// ✨ محرك المطابقة لبيئة العمل (5S Visual Engine)
// ==========================================
window.load5SImage = function(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const processImage = (dataUrl) => window.save5SImage(dataUrl, type);
    showToast('جاري تجهيز الصورة ورفعها إلى التخزين السحابي…');

    if (typeof processAndEnhanceImage === 'function') {
        processAndEnhanceImage(file, processImage);
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => processImage(e.target.result);
    reader.onerror = () => showToast('⚠️ تعذر قراءة ملف الصورة.');
    reader.readAsDataURL(file);
};

window.save5SImage = async function(dataUrl, type) {
    const previewTarget = document.getElementById(type === 'standard' ? 'imgStandard' : 'imgCurrent');
    if (!previewTarget) return;

    // تُعرض المعاينة فورًا، ثم يُستبدل مصدرها برابط Firebase الدائم بعد نجاح الرفع.
    previewTarget.src = dataUrl;
    fiveSImages[type] = { previewUrl: dataUrl, storageUrl: null };
    window.finalize5SImage(dataUrl, type, false);

    const storageUrl = await window.uploadImageToStorage(dataUrl, { folder: '5s' });
    if (!storageUrl) {
        showToast('⚠️ لم تُحفظ صورة 5S في التخزين. أعد اختيار الصورة قبل تسجيل عدم المطابقة.');
        return;
    }

    fiveSImages[type] = { previewUrl: dataUrl, storageUrl };
    previewTarget.src = storageUrl;
    window.finalize5SImage(storageUrl, type, true);
    showToast('✅ تم حفظ صورة 5S في Firebase Storage.');
};

window.finalize5SImage = function(sourceUrl, type, isStored = true) {
    const target = document.getElementById(type === 'standard' ? 'imgStandard' : 'imgCurrent');
    if (target) target.src = sourceUrl;

    const stdSrc = document.getElementById('imgStandard')?.src;
    const curSrc = document.getElementById('imgCurrent')?.src;
    if (stdSrc && curSrc && stdSrc !== window.location.href && curSrc !== window.location.href) {
        document.getElementById('fiveSSliderContainer').style.display = 'block';
        window.init5SSlider();
    }

    if (!isStored) showToast('تم تجهيز المعاينة، جارٍ حفظ الصورة في التخزين…');
};

window.init5SSlider = function() {
    const container = document.getElementById('fiveSSliderContainer');
    const overlay = document.getElementById('sliderOverlay');
    const handle = document.getElementById('sliderHandle');
    let isSliding = false;

    const slide = (e) => {
        if(!isSliding) return;
        let rect = container.getBoundingClientRect();
        let clientX = e.type.includes('mouse') ? e.clientX : (e.touches ? e.touches[0].clientX : 0);
        let x = clientX - rect.left;
        if(x < 0) x = 0; if(x > rect.width) x = rect.width;
        let pct = (x / rect.width) * 100;
        overlay.style.width = pct + '%';
        handle.style.left = pct + '%';
    };

    handle.onmousedown = () => isSliding = true;
    container.onmouseup = () => isSliding = false;
    container.onmouseleave = () => isSliding = false;
    container.onmousemove = slide;

    handle.ontouchstart = () => isSliding = true;
    container.ontouchend = () => isSliding = false;
    container.ontouchmove = slide;
};

window.generate5STask = async function() {
    if (!departments || departments.length === 0) return showToast('لا توجد أقسام مسجلة');
    if (!fiveSImages.standard?.storageUrl || !fiveSImages.current?.storageUrl) {
        return showToast('⚠️ انتظر اكتمال رفع صورتي 5S إلى التخزين قبل تسجيل عدم المطابقة.');
    }

    const dept = prompt('لأي قسم تريد تسجيل عدم المطابقة؟\n' + departments.join(' - '), departments[0]);
    if (!dept || !departments.includes(dept)) return showToast('قسم غير صالح');
    const desc = prompt('اكتب وصف المشكلة (عدم المطابقة في 5S):');
    if (!desc) return;

    const id = window.uniqueNumericId().toString();
    const record = {
        id,
        task: '[5S] ' + window.sanitizeInput(desc),
        dept,
        status: 'pending',
        source: '5S',
        createdAt: Date.now(),
        createdBy: currentUser.name || 'مستخدم',
        images: {
            standard: fiveSImages.standard.storageUrl,
            current: fiveSImages.current.storageUrl
        }
    };

    try {
        await window.syncRecord('tasks/' + id, record);
        window.awardPoints(10, 'تسجيل عدم مطابقة 5S');
        showToast('✅ تم حفظ عدم المطابقة وصورتي 5S في المهمة.');
    } catch (error) {
        console.error('5S task save error:', error);
        showToast('⚠️ رُفعت الصور لكن تعذر حفظ المهمة. لم تُمنح نقاط ولم يُعتمد السجل.');
    }
};


// ==========================================
// 🌐 TPM OPERATING MODEL EXTENSIONS (V6)
// ==========================================
window.escapeTPM = function(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};
window.formatTPMDate = function(value) {
    if (!value) return 'غير محدد';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? window.escapeTPM(value) : date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
};
window.getTeamLabel = function(teamId) {
    const team = (window.TPM_TEAM_HUB || window.TPM_TEAM_CATALOG || []).find(item => item.id === teamId);
    return team ? `${team.code} — ${team.name}` : 'مسار عام';
};
window.getPriorityMeta = function(priority) {
    return {
        critical: { label: 'حرج', className: 'priority-critical' },
        high: { label: 'عالية', className: 'priority-high' },
        medium: { label: 'متوسطة', className: 'priority-medium' },
        low: { label: 'منخفضة', className: 'priority-low' }
    }[priority] || { label: 'متوسطة', className: 'priority-medium' };
};
window.isOverdue = function(item) {
    return Boolean(item && item.dueDate && item.status !== 'done' && new Date(`${item.dueDate}T23:59:59`).getTime() < Date.now());
};
window.getEngineer = function(name) {
    return maintenanceEngineers.find(engineer => engineer.name === name) || null;
};

// ---------- المهام ----------
window.renderTasks = function() {
    const cols = { pending: '', progress: '', done: '' }; const counts = { pending: 0, progress: 0, done: 0 };
    const scopedTasks = currentTaskDept ? tasksData.filter(task => task.dept === currentTaskDept) : [];
    let folders = '';
    scopedTasks.forEach(task => {
        if (task.isFolder) {
            const subtasks = task.subTasks || []; const done = subtasks.filter(item => item.status === 'done').length;
            folders += `<div class="audit-folder-card"><div class="folder-header"><b><i class='bx bx-folder'></i> ${window.escapeTPM(task.task)}</b><span>${done}/${subtasks.length}</span></div>${subtasks.map((subtask, index) => `<label class="folder-subtask ${subtask.status === 'done' ? 'is-done' : ''}"><input type="checkbox" ${subtask.status === 'done' ? 'checked' : ''} onclick="toggleFolderSubTask('${task.id}', ${index})"><span>${window.escapeTPM(subtask.text)}</span></label>`).join('')}</div>`;
            return;
        }
        const status = ['pending', 'progress', 'done'].includes(task.status) ? task.status : 'pending';
        counts[status] += 1;
        const priority = window.getPriorityMeta(task.priority); const overdue = window.isOverdue(task);
        const actions = status === 'pending' ? `<button class="btn btn-sm btn-warning flex-1" onclick="changeTaskStatus('${task.id}', 'progress')"><i class='bx bx-play'></i> بدء</button>` : status === 'progress' ? `<button class="btn btn-sm btn-success flex-1" onclick="changeTaskStatus('${task.id}', 'done')"><i class='bx bx-check'></i> إنجاز</button>` : `<button class="btn btn-sm btn-outline flex-1" onclick="changeTaskStatus('${task.id}', 'pending')"><i class='bx bx-reset'></i> إعادة</button>`;
        cols[status] += `<article class="kanban-item enriched-task-card ${overdue ? 'is-overdue' : ''}"><div class="task-card-top"><span class="priority-badge ${priority.className}">${priority.label}</span>${overdue ? '<span class="overdue-badge"><i class="bx bx-time-five"></i> متأخرة</span>' : ''}</div><h4>${window.escapeTPM(task.task)}</h4><div class="task-metadata"><span><i class='bx bx-buildings'></i> ${window.escapeTPM(task.dept || 'عام')}</span>${task.assignee ? `<span><i class='bx bx-user-check'></i> ${window.escapeTPM(task.assignee)}</span>` : ''}${task.team ? `<span><i class='bx bx-network-chart'></i> ${window.escapeTPM(window.getTeamLabel(task.team))}</span>` : ''}${task.dueDate ? `<span><i class='bx bx-calendar-event'></i> ${window.formatTPMDate(task.dueDate)}</span>` : ''}</div>${task.image ? `<img src="${window.escapeTPM(task.image)}" alt="مرفق المهمة" class="task-attachment" onclick="window.open('${window.escapeTPM(task.image)}')">` : ''}<div class="row-flex task-card-actions">${actions}${window.hasRole('admin') ? `<button class="btn btn-sm btn-danger" onclick="deleteTask('${task.id}')"><i class='bx bx-trash'></i></button>` : ''}</div></article>`;
    });
    ['pending', 'progress', 'done'].forEach(status => { const list = document.getElementById(`kanban_${status}`); const count = document.getElementById(`count_${status}`); if (list) list.innerHTML = cols[status] || '<div class="empty-kanban-state">لا توجد مهام في هذا المسار</div>'; if (count) count.textContent = counts[status]; });
    const folderContainer = document.getElementById('auditFoldersContainer'); if (folderContainer) folderContainer.innerHTML = folders || '<div class="empty-kanban-state">لا توجد حزم مراجعات حالياً</div>';
    window.updateTasksDeptGrid();
};
window.updateTasksDeptGrid = function() {
    let pending = 0, progress = 0, done = 0, overdue = 0;
    tasksData.forEach(task => { if (task.isFolder) return; const status = task.status || 'pending'; if (status === 'done') done++; else if (status === 'progress') progress++; else pending++; if (window.isOverdue(task)) overdue++; });
    [['kpiTasksPendingAll', pending], ['kpiTasksProgressAll', progress], ['kpiTasksDoneAll', done], ['kpiTasksOverdueAll', overdue]].forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value; });
    const summary = document.getElementById('tasksCommandSummary');
    const highPriority = tasksData.filter(task => !task.isFolder && task.status !== 'done' && ['critical', 'high'].includes(task.priority)).slice(0, 3);
    if (summary) summary.innerHTML = `<div class="tasks-command-card"><div><span class="eyebrow"><i class='bx bx-radar'></i> قراءة تنفيذية</span><h3>${overdue ? `هناك ${overdue} مهام تحتاج تدخلًا فوريًا` : 'المسارات تحت السيطرة'}</h3><p>${highPriority.length ? `أولوية الآن: ${highPriority.map(task => window.escapeTPM(task.task)).join(' • ')}` : 'لا توجد مهام عالية الأولوية مفتوحة حالياً.'}</p></div><button class="btn btn-outline btn-sm" onclick="showScreen('tpmTeamsScreen'); renderTPMTeams();"><i class='bx bx-network-chart'></i> عرض فرق TPM</button></div>`;
    const deptGrid = document.getElementById('tasksDeptGrid'); if (!deptGrid) return;
    deptGrid.innerHTML = departments.map(dept => { const items = tasksData.filter(task => task.dept === dept && !task.isFolder); const active = items.filter(task => task.status !== 'done'); const late = active.filter(task => window.isOverdue(task)).length; const topTeam = active.find(task => task.team); return `<article class="dept-task-station" onclick="openTasksDept('${window.escapeTPM(dept)}')"><div class="dept-station-icon"><i class='bx bx-buildings'></i></div><div><h4>${window.escapeTPM(dept)}</h4><p>${topTeam ? window.escapeTPM(window.getTeamLabel(topTeam.team)) : 'مسار تشغيلي عام'}</p></div><div class="dept-station-count"><b>${active.length}</b><span>مفتوحة</span></div>${late ? `<span class="dept-late-chip">${late} متأخرة</span>` : '<span class="dept-ok-chip">مستقر</span>'}</article>`; }).join('') || '<div class="empty-kanban-state">أضف الأقسام من الإعدادات لبدء توزيع المهام</div>';
};
window.openTasksDept = function(dept) { currentTaskDept = dept; const title = document.getElementById('tasksDeptTitle'); if(title) title.textContent = `محطة تنفيذ — ${dept}`; document.getElementById('tasksMainView').style.display = 'none'; document.getElementById('tasksDeptView').style.display = 'block'; window.updateOperationalSelects(); window.renderTasks(); };
window.closeTasksDept = function() { currentTaskDept = null; document.getElementById('tasksDeptView').style.display = 'none'; document.getElementById('tasksMainView').style.display = 'block'; window.renderTasks(); };
window.addManualTaskDept = async function() {
    const taskText = window.sanitizeInput(document.getElementById('newTaskInput')?.value || ''); if (!taskText) return showToast('⚠️ اكتب وصفاً واضحاً للمهمة'); if (!currentTaskDept) return showToast('⚠️ اختر القسم أولاً');
    const id = window.uniqueNumericId().toString();
    const assignee = document.getElementById('newTaskAssignee')?.value || ''; const team = document.getElementById('newTaskTeam')?.value || ''; const priority = document.getElementById('newTaskPriority')?.value || 'medium'; const dueDate = document.getElementById('newTaskDueDate')?.value || '';
    await window.syncRecord(`tasks/${id}`, { id, task: taskText, dept: currentTaskDept, assignee, team, priority, dueDate, status: 'pending', createdAt: Date.now(), createdBy: currentUser.name || '' });
    document.getElementById('newTaskInput').value = ''; showToast('تمت إضافة المهمة إلى مسار التنفيذ ✅');
};
window.changeTaskStatus = async function(id, status) { const task = tasksData.find(item => item.id == id); if (!task) return; task.status = status; if (status === 'done') task.completedAt = Date.now(); await window.syncRecord(`tasks/${id}`, task); };

// ---------- التاجات والإشعار ----------
window.addNewTag = async function() {
    const desc = window.sanitizeInput(document.getElementById('newTagDesc')?.value || ''); const color = document.getElementById('newTagColor')?.value || 'red'; const dept = document.getElementById('newTagDept')?.value || ''; const machine = window.sanitizeInput(document.getElementById('newTagMachine')?.value || ''); const spareParts = window.sanitizeInput(document.getElementById('newTagSpareParts')?.value || ''); const priority = document.getElementById('newTagPriority')?.value || 'high'; const team = document.getElementById('newTagTeam')?.value || ''; const engineerName = document.getElementById('newTagEngineer')?.value || '';
    if (!desc) return showToast('⚠️ أدخل وصف المشكلة قبل تسجيل التاج');
    if (!dept) return showToast('⚠️ اختر القسم التشغيلي الذي ظهر فيه التاج');
    let image = null; if (currentTagImg) { showToast('جاري حفظ التاج والصورة…'); image = await uploadImageToStorage(currentTagImg); if (!image) showToast('⚠️ تعذر رفع الصورة؛ سيُحفظ التاج من دونها.'); }
    const engineer = window.getEngineer(engineerName); const id = window.uniqueNumericId().toString();
    const record = { id, desc: spareParts ? `${desc} [قطع مطلوبة: ${spareParts}]` : desc, color, dept, machine, image, priority, team, engineer: engineerName, engineerPhone: engineer?.phone || '', status: 'open', auditor: currentUser.name || '', date: new Date().toLocaleDateString('ar-EG'), timestamp: Date.now(), notification: { requested: Boolean(engineer?.phone), status: engineer?.phone ? 'pending' : 'not_requested' } };
    await window.syncRecord(`tags/${id}`, record);
    document.getElementById('newTagDesc').value = ''; document.getElementById('newTagMachine').value = ''; document.getElementById('newTagSpareParts').value = ''; currentTagImg = null; const preview = document.getElementById('tagImagePreview'); if (preview) preview.innerHTML = '';
    window.awardPoints(10, 'إصدار تاج جديد'); showToast('تم تسجيل التاج بنجاح ✅');
    const shouldNotify = engineer?.phone && (notificationSettings.onTagAssigned || (priority === 'critical' && notificationSettings.onCriticalTag));
    if (shouldNotify) window.dispatchWhatsAppNotification(record, priority === 'critical' ? 'critical_tag' : 'tag_assigned');
};
window.renderTags = function() {
    const redContainer = document.getElementById('redTagsContainer'); const blueContainer = document.getElementById('blueTagsContainer'); if (!redContainer || !blueContainer) return;
    const deptFilter = document.getElementById('filterTagDept')?.value || 'الكل'; const statusFilter = document.getElementById('filterTagStatus')?.value || 'active'; const priorityFilter = document.getElementById('filterTagPriority')?.value || 'all'; const textFilter = (document.getElementById('filterTagMachine')?.value || '').trim().toLowerCase();
    const ageLimit = 3 * 24 * 60 * 60 * 1000; let red = '', blue = '';
    const commandView = window.activeTagCommandView || 'all'; const normalizedText = textFilter.startsWith('__TAG_') ? '' : textFilter;
    const visible = tagsData.filter(tag => { const closed = ['closed', 'verified'].includes(tag.status); const matchesText = !normalizedText || `${tag.machine || ''} ${tag.engineer || ''} ${tag.desc || ''}`.toLowerCase().includes(normalizedText); const sla = window.getTagSLA ? window.getTagSLA(tag) : { overdue: !closed && tag.timestamp && Date.now() - tag.timestamp > ageLimit }; const matchesCommand = commandView === 'all' || (commandView === 'critical' && (tag.priority || 'high') === 'critical') || (commandView === 'unassigned' && !tag.engineer) || (commandView === 'overdue' && sla.overdue) || (commandView === 'review' && tag.status === 'review'); return (deptFilter === 'الكل' || tag.dept === deptFilter) && (statusFilter !== 'active' || !closed) && (statusFilter !== 'closed' || closed) && (priorityFilter === 'all' || (tag.priority || 'high') === priorityFilter) && matchesText && matchesCommand; });
    visible.forEach(tag => {
        const closed = ['closed', 'verified'].includes(tag.status); const sla = window.getTagSLA(tag); const aged = sla.overdue; const priority = window.getPriorityMeta(tag.priority || 'high'); const canEdit = window.hasRole('admin', 'auditor') || currentUser.name === tag.auditor;
        const stateControl = `<select class="form-control flex-2 tag-state-select" onchange="updateTagState('${tag.id}', this.value)"><option value="open" ${tag.status === 'open' ? 'selected' : ''}>مفتوح</option><option value="progress" ${tag.status === 'progress' ? 'selected' : ''}>جاري التنفيذ</option><option value="review" ${tag.status === 'review' ? 'selected' : ''}>بانتظار مراجعة</option></select>`;
        const assignButton = window.hasRole('admin', 'auditor') ? `<button class="btn btn-sm btn-outline" onclick="assignTagOwner('${tag.id}')"><i class='bx bx-user-plus'></i> إسناد</button>` : '';
        const verifyButton = tag.status === 'review' && window.hasRole('admin', 'auditor') ? `<button class="btn btn-sm btn-success" onclick="verifyTagClosure('${tag.id}')"><i class='bx bx-check-shield'></i> تحقق</button>` : '';
        const control = canEdit ? `${stateControl}${assignButton}${verifyButton}<button class="btn btn-sm btn-outline" onclick="editTag('${tag.id}')"><i class='bx bx-edit'></i></button><button class="btn btn-sm btn-danger" onclick="deleteTag('${tag.id}')"><i class='bx bx-trash'></i></button>` : `<span class="tag-state-readonly">${window.escapeTPM(tag.status || 'open')}</span>`;
        const notificationButton = tag.engineerPhone && window.hasRole('admin', 'auditor') ? `<button class="btn btn-sm btn-outline" onclick="resendTagNotification('${tag.id}')"><i class='bx bxl-whatsapp'></i> تنبيه</button>` : '';
        const card = `<article class="tag-ticket ${tag.color === 'red' ? 'ticket-red' : 'ticket-blue'} ${aged ? 'tag-is-aged' : ''}"><div class="tag-ticket-head"><span class="priority-badge ${priority.className}">${priority.label}</span>${aged ? '<span class="overdue-badge">متأخر</span>' : ''}</div><h4>${window.escapeTPM(tag.desc)}</h4><div class="tag-context-row"><span><i class='bx bx-buildings'></i>${window.escapeTPM(tag.dept || 'غير محدد')}</span>${tag.machine ? `<span><i class='bx bx-cog'></i>${window.escapeTPM(tag.machine)}</span>` : ''}</div><div class="tag-ownership"><div><i class='bx bx-user-check'></i><span>المسؤول</span><b>${window.escapeTPM(tag.engineer || 'غير مُسند')}</b></div><div><i class='bx bx-network-chart'></i><span>المسار</span><b>${window.escapeTPM(window.getTeamLabel(tag.team))}</b></div></div><div class="tag-sla-row ${aged ? 'is-overdue' : ''}"><i class='bx bx-timer'></i><span>${window.formatTagSLA(tag)}</span>${tag.assignedAt ? `<small>أُسند ${window.formatTPMDate(tag.assignedAt)}</small>` : ''}</div>${tag.image ? `<img src="${window.escapeTPM(tag.image)}" alt="صورة التاج" class="tag-attachment" onclick="window.open('${window.escapeTPM(tag.image)}', '_blank')">` : ''}<div class="tag-footer"><small><i class='bx bx-calendar'></i> ${window.escapeTPM(tag.date || '')} · ${window.escapeTPM(tag.auditor || '')}</small><div class="row-flex tag-controls">${notificationButton}${control}</div></div></article>`;
        if (tag.color === 'red') red += card; else blue += card;
    });
    redContainer.innerHTML = red || '<div class="empty-kanban-state">لا توجد تاجات صيانة مطابقة للفلاتر</div>'; blueContainer.innerHTML = blue || '<div class="empty-kanban-state">لا توجد تاجات إنتاج مطابقة للفلاتر</div>';
    const stats = document.getElementById('tagCommandStats'); if (stats) { const open = tagsData.filter(tag => !['closed', 'verified'].includes(tag.status)); const critical = open.filter(tag => (tag.priority || 'high') === 'critical').length; const aged = open.filter(tag => window.getTagSLA(tag).overdue).length; const assigned = open.filter(tag => tag.engineer).length; stats.innerHTML = `<div class="tag-stat"><span>تاجات مفتوحة</span><b>${open.length}</b></div><div class="tag-stat critical"><span>حرجة</span><b>${critical}</b></div><div class="tag-stat"><span>تجاوزت SLA</span><b>${aged}</b></div><div class="tag-stat"><span>مُسندة</span><b>${assigned}</b></div>`; }
    window.renderTagCommandCenter?.();
};
window.updateTagState = async function(id, status) { const tag = tagsData.find(item => item.id == id); if (!tag) return; if (status === 'closed' || status === 'verified') return window.verifyTagClosure(id); const previousStatus = tag.status; tag.status = status; if (status === 'review' && previousStatus !== 'review') { tag.reviewRequestedAt = Date.now(); tag.reviewRequestedBy = currentUser.name || ''; } await window.syncRecord(`tags/${id}`, tag); if (status === 'review' && previousStatus !== 'review' && tag.engineerPhone && notificationSettings.onTagEscalation) window.dispatchWhatsAppNotification(tag, 'tag_escalated'); };
window.resendTagNotification = function(id) { const tag = tagsData.find(item => item.id == id); if (!tag?.engineerPhone) return showToast('⚠️ لا يوجد رقم WhatsApp صالح للمسؤول'); window.dispatchWhatsAppNotification(tag, 'tag_assigned', true); };
window.dispatchWhatsAppNotification = async function(tag, eventType = 'tag_assigned', manual = false) {
    try {
        const authToken = await auth.currentUser?.getIdToken();
        if (!authToken) throw new Error('سجّل الدخول بحساب إداري قبل إرسال الإشعار');
        const response = await fetch('/api/whatsapp-notify', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ eventType, tag: { id: tag.id, desc: tag.desc, dept: tag.dept, machine: tag.machine || '', priority: tag.priority || 'high', engineer: tag.engineer || '', engineerPhone: tag.engineerPhone || '', team: tag.team || '' }, manual }) });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || result.error || 'تعذر إرسال الإشعار');
        tag.notification = { ...(tag.notification || {}), status: 'sent', sentAt: Date.now() }; await window.syncRecord(`tags/${tag.id}`, tag); showToast('تم إرسال إشعار WhatsApp للمسؤول ✅');
    } catch (error) {
        tag.notification = { ...(tag.notification || {}), status: 'not_configured', lastError: String(error.message || '') }; await window.syncRecord(`tags/${tag.id}`, tag); if (manual) showToast('⚠️ تم تسجيل التاج، لكن إشعار WhatsApp غير مهيأ على الخادم بعد');
    }
};

// ---------- المكتبة ----------
window.filterKnowledgeLibrary = function(category, button) { knowledgeActiveFilter = category; document.querySelectorAll('.knowledge-filter').forEach(item => item.classList.remove('active')); if (button) button.classList.add('active'); window.renderKnowledgeBase(); };
window.renderKnowledgeBase = function() {
    const container = document.getElementById('knowledgeListContainer'); if (!container) return; const books = (Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {}));
    const filtered = knowledgeActiveFilter === 'all' ? books : books.filter(book => book.category === knowledgeActiveFilter);
    const stats = document.getElementById('knowledgeCommandStats'); if (stats) { const byCategory = category => books.filter(book => book.category === category).length; stats.innerHTML = `<div class="library-stat"><i class='bx bx-library'></i><b>${books.length}</b><span>مرجع</span></div><div class="library-stat"><i class='bx bx-book-open'></i><b>${byCategory('JH') + byCategory('PM')}</b><span>صيانة وتشغيل</span></div><div class="library-stat"><i class='bx bx-file'></i><b>${byCategory('OPL')}</b><span>دروس نقطة واحدة</span></div><div class="library-stat"><i class='bx bx-badge-check'></i><b>${byCategory('SOP')}</b><span>إجراءات معيارية</span></div>`; }
    if (!filtered.length) { container.innerHTML = `<div class="library-empty"><i class='bx bx-folder-open'></i><h3>لا توجد مراجع في هذا التصنيف بعد</h3><p>يمكن للإدارة رفع مرجع PDF ثم ربطه بمسار TPM مناسب.</p></div>`; return; }
    const appearance = { JH: ['var(--success)', 'bx-wrench', 'الصيانة الذاتية'], PM: ['var(--danger)', 'bx-cog', 'الصيانة المخططة'], OPL: ['var(--warning)', 'bx-bulb', 'درس نقطة واحدة'], SOP: ['var(--primary)', 'bx-list-check', 'إجراء معياري'] };
    container.innerHTML = filtered.map(book => { const [color, icon, label] = appearance[book.category] || ['var(--primary)', 'bx-book', 'مرجع']; return `<article class="knowledge-card" style="--book-color:${color}"><div class="book-icon"><i class='bx ${icon}'></i></div><span class="book-category">${label}</span><h4>${window.escapeTPM(book.title)}</h4><p>${book.hasPdf ? 'مرجع PDF متاح للقراءة' : 'مادة معرفية مسجلة داخل النظام'}</p><div class="knowledge-card-footer"><button class="btn btn-sm btn-primary" onclick="openBookDetail('${book.id}')"><i class='bx bx-book-open'></i> فتح</button>${currentUser?.role === 'admin' ? `<button class="btn btn-sm btn-outline" onclick="deleteKnowledgeBook('${book.id}')"><i class='bx bx-trash'></i></button>` : ''}</div></article>`; }).join('');
};

// ---------- إعدادات التنبيهات ----------
window.populateNotificationSettings = function() { ['notifyOnTagAssigned', 'notifyOnCriticalTag', 'notifyOnTagEscalation'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = notificationSettings[{ notifyOnTagAssigned: 'onTagAssigned', notifyOnCriticalTag: 'onCriticalTag', notifyOnTagEscalation: 'onTagEscalation' }[id]] !== false; }); };
window.saveNotificationSettings = async function() { if (!window.hasRole('admin')) return showToast('⚠️ إعدادات الإشعار متاحة للمدير فقط'); notificationSettings = { onTagAssigned: document.getElementById('notifyOnTagAssigned')?.checked !== false, onCriticalTag: document.getElementById('notifyOnCriticalTag')?.checked !== false, onTagEscalation: document.getElementById('notifyOnTagEscalation')?.checked !== false, updatedAt: Date.now(), updatedBy: currentUser.name || '' }; await window.syncRecord('notification_settings', notificationSettings); showToast('تم حفظ قواعد الإشعار. الإرسال الفعلي يبدأ بعد إعداد Meta على الخادم.'); };

// إعادة تهيئة عناصر التشغيل بعد اكتمال تحميل الصفحة.
document.addEventListener('DOMContentLoaded', () => { window.updateOperationalSelects?.(); });

// ===================== TPM Teams Gateway =====================
// The gateway deliberately lists the six teams and opens each existing workspace without injecting new content.
window.escapeTPMHub = function(value) {
    return window.escapeTPM ? window.escapeTPM(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
};
window.getTPMHubTeam = function(teamId) {
    return (window.TPM_TEAM_HUB || []).find(team => team.id === teamId) || null;
};
window.renderTPMTeams = function() {
    const teams = window.TPM_TEAM_HUB || [];
    const grid = document.getElementById('tpmTeamsGrid');
    const kpis = document.getElementById('tpmTeamKpis');
    if (!grid || !kpis) return;

    kpis.innerHTML =         `<div class="tpm-kpi-card"><i class='bx bx-group'></i><b>${teams.length}</b><span>فرق TPM</span></div>         <div class="tpm-kpi-card"><i class='bx bx-window-open'></i><b>5</b><span>مساحات عمل قائمة</span></div>         <div class="tpm-kpi-card"><i class='bx bx-shield-quarter'></i><b>1</b><span>مساحة HSE</span></div>`;

    grid.innerHTML = teams.map(team =>         `<article class="tpm-team-card" style="--team-color:${team.color}" onclick="showTPMTeam('${team.id}')">            <div class="tpm-team-card-head"><div class="tpm-team-icon"><i class='bx ${team.icon}'></i></div><span class="tpm-team-code">${team.code}</span></div>            <h3>${window.escapeTPMHub(team.name)}</h3>            <p>${window.escapeTPMHub(team.description)}</p>            <div class="tpm-team-card-footer"><span class="tpm-formation-state"><i class='bx bx-window-open'></i> مساحة العمل</span><button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); showTPMTeam('${team.id}')">فتح الفريق <i class='bx bx-left-arrow-alt'></i></button></div>        </article>`
    ).join('');
};
window.showTPMTeam = function(teamId) {
    return window.openTPMExistingWorkspace(teamId);
};
window.openTPMExistingWorkspace = function(teamId) {
    const team = window.getTPMHubTeam(teamId);
    if (!team || !team.workspace) return showToast('⚠️ مساحة الفريق غير متاحة حاليًا');
    if (team.id === 'jh' && typeof window.showJHPortal === 'function') window.showJHPortal();
    else window.showScreen(team.workspace);
    if (team.id === 'kk' && typeof window.renderKKDashboard === 'function') window.renderKKDashboard();
};
// =================== End TPM Teams Gateway ===================


// ==========================================
// 👷‍♂️ هيكل فريق الصيانة الذاتية الرئيسي (JH)
// ==========================================
let jhMainTeam = null;
let jhMainTeamRoleFiles = {};
let jhMainTeamDraftMembers = [];

function jhTeamEmptyRole() {
    return { name: '', photo: '' };
}

function jhTeamDefaultData() {
    return {
        leader: jhTeamEmptyRole(),
        facilitator: jhTeamEmptyRole(),
        recorder: jhTeamEmptyRole(),
        members: []
    };
}

function jhTeamSafePhoto(url) {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    return /^https:\/\//i.test(trimmed) ? trimmed : '';
}

function jhTeamSafeName(name) {
    return window.sanitizeInput ? window.sanitizeInput(String(name || '').trim()) : String(name || '').trim();
}

function jhTeamInitials(name) {
    const clean = String(name || '').trim();
    if (!clean) return '<i class="bx bx-user"></i>';
    return jhTeamSafeName(clean.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join(''));
}

function jhTeamPhotoMarkup(person, className = '') {
    const photo = jhTeamSafePhoto(person?.photo);
    const name = jhTeamSafeName(person?.name);
    if (photo) {
        return `<img class="jh-person-photo ${className}" src="${photo}" alt="صورة ${name || 'عضو الفريق'}" loading="lazy" referrerpolicy="no-referrer">`;
    }
    return `<div class="jh-person-photo jh-person-initials ${className}" aria-label="صورة افتراضية لـ ${name || 'عضو الفريق'}">${jhTeamInitials(name)}</div>`;
}

function jhTeamNode(role, person, variant = '') {
    const name = jhTeamSafeName(person?.name);
    if (!name) return '';
    return `<article class="jh-tree-person ${variant}">
        ${jhTeamPhotoMarkup(person)}
        <div class="jh-tree-person-copy"><span>${role}</span><strong>${name}</strong></div>
    </article>`;
}

window.renderJHMainTeam = function() {
    const mount = document.getElementById('jhMainTeamTree');
    if (!mount) return;

    const team = { ...jhTeamDefaultData(), ...(jhMainTeam || {}) };
    const leader = team.leader || jhTeamEmptyRole();
    const facilitator = team.facilitator || jhTeamEmptyRole();
    const recorder = team.recorder || jhTeamEmptyRole();
    const members = Array.isArray(team.members) ? team.members.filter(member => member && jhTeamSafeName(member.name)) : [];
    const hasPeople = [leader, facilitator, recorder].some(person => jhTeamSafeName(person.name)) || members.length > 0;

    if (!hasPeople) {
        mount.innerHTML = `<div class="jh-team-empty"><i class='bx bx-network-chart'></i><strong>هيكل فريق JH جاهز للتعبئة</strong><span>أضف قائد الفريق والميّسر والمقرر والأعضاء من زر «إدارة أسماء وصور الفريق».</span></div>`;
        return;
    }

    const supportNodes = [
        jhTeamNode('ميّسر الفريق', facilitator, 'jh-tree-support'),
        jhTeamNode('مقرر الفريق', recorder, 'jh-tree-support')
    ].filter(Boolean).join('');
    const memberNodes = members.map(member => jhTeamNode('عضو الفريق', member, 'jh-tree-member')).join('');

    mount.innerHTML = `<div class="jh-team-ladder">
        <div class="jh-team-level jh-team-level-lead">${jhTeamNode('قائد فريق الصيانة الذاتية', leader, 'jh-tree-leader') || `<div class="jh-tree-placeholder">قائد الفريق غير محدد</div>`}</div>
        <div class="jh-team-connector" aria-hidden="true"></div>
        <div class="jh-team-level jh-team-level-support">${supportNodes || `<div class="jh-tree-placeholder">أضف ميّسر الفريق ومقرره</div>`}</div>
        <div class="jh-team-connector" aria-hidden="true"></div>
        <div class="jh-team-level jh-team-level-members">${memberNodes || `<div class="jh-tree-placeholder">أضف أعضاء الفريق</div>`}</div>
    </div>`;
};

window.loadJHMainTeam = function() {
    if (!firebase.auth().currentUser) return;
    if (dbListeners.jhMainTeam) db.ref('tpm_system/jh_main_team').off('value', dbListeners.jhMainTeam);
    dbListeners.jhMainTeam = db.ref('tpm_system/jh_main_team').on('value', snap => {
        jhMainTeam = { ...jhTeamDefaultData(), ...(snap.val() || {}) };
        window.renderJHMainTeam();
    });
};

function jhMainTeamPhotoStatus(role, message, isReady = false) {
    const status = document.getElementById(`jhTeam${role.charAt(0).toUpperCase() + role.slice(1)}PhotoStatus`);
    if (status) status.innerHTML = message ? `<i class='bx ${isReady ? 'bx-check-circle' : 'bx-image'}'></i> ${jhTeamSafeName(message)}` : '';
}

window.cacheJHMainTeamPhoto = function(role, input) {
    const file = input?.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        input.value = '';
        return showToast('⚠️ استخدم صورة بصيغة JPG أو PNG أو WEBP فقط');
    }
    if (file.size > 4 * 1024 * 1024) {
        input.value = '';
        return showToast('⚠️ أقصى حجم لصورة الفريق هو 4 ميجابايت');
    }
    jhMainTeamRoleFiles[role] = file;
    jhMainTeamPhotoStatus(role, `الصورة جاهزة: ${file.name}`, true);
};

window.renderJHMainTeamMembersDraft = function() {
    const mount = document.getElementById('jhMainTeamMembersDraft');
    if (!mount) return;
    if (!jhMainTeamDraftMembers.length) {
        mount.innerHTML = `<div class="jh-members-draft-empty">لم تُضف أعضاء بعد.</div>`;
        return;
    }
    mount.innerHTML = jhMainTeamDraftMembers.map((member, index) => {
        const photo = jhTeamSafePhoto(member.photo);
        const preview = member.preview || photo;
        const avatar = preview
            ? `<img class="jh-draft-avatar" src="${preview}" alt="صورة ${jhTeamSafeName(member.name)}">`
            : `<div class="jh-draft-avatar jh-person-initials">${jhTeamInitials(member.name)}</div>`;
        return `<div class="jh-member-draft-item">${avatar}<strong>${jhTeamSafeName(member.name)}</strong><span>${member.localFile ? 'صورة جديدة جاهزة للرفع' : (photo ? 'صورة محفوظة' : 'دون صورة')}</span><button type="button" class="icon-btn" onclick="removeJHMainTeamMember(${index})" aria-label="حذف العضو ${jhTeamSafeName(member.name)}"><i class='bx bx-trash'></i></button></div>`;
    }).join('');
};

window.addJHMainTeamMember = function() {
    const nameInput = document.getElementById('jhNewMemberName');
    const photoInput = document.getElementById('jhNewMemberPhoto');
    const name = jhTeamSafeName(nameInput?.value);
    const file = photoInput?.files?.[0] || null;
    if (!name) return showToast('⚠️ اكتب اسم عضو الفريق أولاً');
    if (file && !/^image\/(jpeg|png|webp)$/i.test(file.type)) return showToast('⚠️ استخدم صورة بصيغة JPG أو PNG أو WEBP فقط');
    if (file && file.size > 4 * 1024 * 1024) return showToast('⚠️ أقصى حجم لصورة العضو هو 4 ميجابايت');

    jhMainTeamDraftMembers.push({
        id: `member_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name,
        photo: '',
        localFile: file,
        preview: file ? URL.createObjectURL(file) : ''
    });
    if (nameInput) nameInput.value = '';
    if (photoInput) photoInput.value = '';
    window.renderJHMainTeamMembersDraft();
};

window.removeJHMainTeamMember = function(index) {
    const member = jhMainTeamDraftMembers[index];
    if (member?.preview?.startsWith('blob:')) URL.revokeObjectURL(member.preview);
    jhMainTeamDraftMembers.splice(index, 1);
    window.renderJHMainTeamMembersDraft();
};

window.openJHMainTeamEditor = function() {
    if (currentUser?.role !== 'admin') return showToast('⚠️ تعديل هيكل الفريق متاح لمدير المصنع فقط');
    const editor = document.getElementById('jhMainTeamEditor');
    if (!editor) return;
    const team = { ...jhTeamDefaultData(), ...(jhMainTeam || {}) };
    const roleMap = {
        leader: 'jhTeamLeaderName',
        facilitator: 'jhTeamFacilitatorName',
        recorder: 'jhTeamRecorderName'
    };
    jhMainTeamRoleFiles = {};
    Object.entries(roleMap).forEach(([role, inputId]) => {
        const input = document.getElementById(inputId);
        if (input) input.value = team[role]?.name || '';
        jhMainTeamPhotoStatus(role, team[role]?.photo ? 'توجد صورة محفوظة حاليًا' : 'لم تُرفع صورة بعد');
        const photoInput = document.getElementById(`jhTeam${role.charAt(0).toUpperCase() + role.slice(1)}Photo`);
        if (photoInput) photoInput.value = '';
    });
    jhMainTeamDraftMembers = (Array.isArray(team.members) ? team.members : []).filter(member => member && jhTeamSafeName(member.name)).map(member => ({ ...member, localFile: null, preview: '' }));
    const newMemberName = document.getElementById('jhNewMemberName');
    const newMemberPhoto = document.getElementById('jhNewMemberPhoto');
    if (newMemberName) newMemberName.value = '';
    if (newMemberPhoto) newMemberPhoto.value = '';
    window.renderJHMainTeamMembersDraft();
    editor.hidden = false;
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.closeJHMainTeamEditor = function() {
    const editor = document.getElementById('jhMainTeamEditor');
    if (editor) editor.hidden = true;
    jhMainTeamDraftMembers.forEach(member => { if (member?.preview?.startsWith('blob:')) URL.revokeObjectURL(member.preview); });
    jhMainTeamDraftMembers = [];
    jhMainTeamRoleFiles = {};
};

window.saveJHMainTeam = async function() {
    if (currentUser?.role !== 'admin') return showToast('⚠️ تعديل هيكل الفريق متاح لمدير المصنع فقط');
    const roleConfig = {
        leader: { inputId: 'jhTeamLeaderName', label: 'قائد الفريق' },
        facilitator: { inputId: 'jhTeamFacilitatorName', label: 'ميّسر الفريق' },
        recorder: { inputId: 'jhTeamRecorderName', label: 'مقرر الفريق' }
    };
    const existing = { ...jhTeamDefaultData(), ...(jhMainTeam || {}) };
    const saved = { members: [] };

    try {
        showToast('جاري حفظ هيكل الفريق وصوره…');
        for (const [role, config] of Object.entries(roleConfig)) {
            const name = jhTeamSafeName(document.getElementById(config.inputId)?.value);
            const existingRole = existing[role] || jhTeamEmptyRole();
            let photo = jhTeamSafePhoto(existingRole.photo);
            if (jhMainTeamRoleFiles[role]) photo = await window.uploadImageToStorage(jhMainTeamRoleFiles[role], { folder: 'jh-team' });
            if (jhMainTeamRoleFiles[role] && !photo) throw new Error(`تعذر رفع صورة ${config.label}`);
            saved[role] = { name, photo };
        }

        for (const member of jhMainTeamDraftMembers) {
            let photo = jhTeamSafePhoto(member.photo);
            if (member.localFile) photo = await window.uploadImageToStorage(member.localFile, { folder: 'jh-team' });
            if (member.localFile && !photo) throw new Error(`تعذر رفع صورة ${member.name}`);
            saved.members.push({ id: member.id || `member_${Date.now()}`, name: jhTeamSafeName(member.name), photo });
        }

        saved.updatedAt = Date.now();
        saved.updatedBy = currentUser?.name || '';
        await db.ref('tpm_system/jh_main_team').set(saved);
        showToast('تم حفظ هيكل فريق الصيانة الذاتية بنجاح ✅');
        window.closeJHMainTeamEditor();
    } catch (error) {
        console.error('JH main team save failed:', error);
        showToast(`⚠️ ${error.message || 'تعذر حفظ هيكل الفريق'}`);
    }
};


// تحميل شجرة فريق JH للقراءة فقط بعد توثيق المستخدم.
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        window.loadJHMainTeam();
    } else if (dbListeners.jhMainTeam) {
        db.ref('tpm_system/jh_main_team').off('value', dbListeners.jhMainTeam);
        delete dbListeners.jhMainTeam;
        jhMainTeam = null;
        window.renderJHMainTeam();
    }
});


// ==========================================
// 🛰️ Tag Command Center — ownership, SLA & verification
// ==========================================
window.getTagSLA = function(tag) {
    const priority = tag?.priority || (tag?.color === 'red' ? 'high' : 'medium');
    const hours = { critical: 4, high: 24, medium: 72, low: 168 }[priority] || 72;
    const openedAt = Number(tag?.timestamp || Date.now()); const deadline = openedAt + hours * 60 * 60 * 1000;
    const closed = ['closed', 'verified'].includes(tag?.status);
    const remaining = deadline - Date.now();
    return { priority, hours, deadline, closed, overdue: !closed && remaining < 0, approaching: !closed && remaining >= 0 && remaining < Math.min(hours * 0.25 * 60 * 60 * 1000, 8 * 60 * 60 * 1000), remaining };
};
window.formatTagSLA = function(tag) {
    const sla = window.getTagSLA(tag); if (sla.closed) return 'تم الإغلاق';
    const absoluteHours = Math.ceil(Math.abs(sla.remaining) / 3600000);
    if (sla.overdue) return `متجاوز للمهلة بـ ${absoluteHours} س`;
    return `متبقي ${Math.max(1, absoluteHours)} س`;
};
window.renderTagCommandCenter = function() {
    const open = tagsData.filter(tag => !['closed', 'verified'].includes(tag.status));
    const critical = open.filter(tag => (tag.priority || (tag.color === 'red' ? 'high' : 'medium')) === 'critical');
    const unassigned = open.filter(tag => !tag.engineer);
    const overdue = open.filter(tag => window.getTagSLA(tag).overdue);
    const review = open.filter(tag => tag.status === 'review');
    const counters = { tagQuickCritical: critical.length, tagQuickUnassigned: unassigned.length, tagQuickOverdue: overdue.length, tagQuickReview: review.length };
    Object.entries(counters).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value; });
    const queue = document.getElementById('tagEscalationQueue'); if (!queue) return;
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const actionList = [...overdue, ...critical.filter(tag => !overdue.includes(tag)), ...unassigned.filter(tag => !overdue.includes(tag) && !critical.includes(tag))]
        .sort((a, b) => (priorityOrder[a.priority || 'medium'] ?? 2) - (priorityOrder[b.priority || 'medium'] ?? 2) || Number(a.timestamp || 0) - Number(b.timestamp || 0))
        .slice(0, 5);
    queue.innerHTML = actionList.length ? actionList.map(tag => {
        const sla = window.getTagSLA(tag); const needsOwner = !tag.engineer;
        return `<div class="tag-escalation-item ${sla.overdue ? 'overdue' : ''}"><i class='bx ${sla.overdue ? 'bx-alarm-exclamation' : needsOwner ? 'bx-user-x' : 'bx-error-circle'}'></i><div><b>${window.escapeTPM(tag.desc || 'تاج بلا وصف')}</b><small>${window.escapeTPM(tag.dept || 'قسم غير محدد')} · ${window.formatTagSLA(tag)}${needsOwner ? ' · يحتاج إسنادًا' : ''}</small></div><button class="btn btn-sm btn-outline" onclick="focusTagFromCommand('${tag.id}')">فتح</button></div>`;
    }).join('') : '<div class="tag-escalation-item"><i class="bx bx-check-shield"></i><div><b>لا توجد استثناءات حرجة حاليًا</b><small>كل التاجات المفتوحة لها مسار متابعة ضمن المهلة.</small></div></div>';
};
window.applyTagQuickView = function(view) {
    const status = document.getElementById('filterTagStatus'); const priority = document.getElementById('filterTagPriority'); const search = document.getElementById('filterTagMachine');
    if (status) status.value = 'active'; if (priority) priority.value = 'all'; if (search) search.value = '';
    window.activeTagCommandView = view;
    if (view === 'critical' && priority) priority.value = 'critical';
    if (view === 'review' && search) search.value = '__TAG_REVIEW__';
    if (view === 'unassigned' && search) search.value = '__TAG_UNASSIGNED__';
    if (view === 'overdue' && search) search.value = '__TAG_OVERDUE__';
    window.renderTags();
};
window.focusTagFromCommand = function(id) {
    const tag = tagsData.find(item => item.id == id); if (!tag) return;
    const dept = document.getElementById('filterTagDept'); const status = document.getElementById('filterTagStatus'); const search = document.getElementById('filterTagMachine');
    if (dept) dept.value = tag.dept || 'الكل'; if (status) status.value = 'active'; if (search) search.value = tag.machine || tag.desc || '';
    window.activeTagCommandView = 'all'; window.renderTags(); document.getElementById('redTagsContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
window.assignTagOwner = async function(id) {
    const tag = tagsData.find(item => item.id == id); if (!tag) return;
    const choices = maintenanceEngineers.map(engineer => engineer.name).filter(Boolean);
    if (!choices.length) return showToast('⚠️ أضف مسؤولي الصيانة من الإعدادات أولًا');
    const selected = prompt(`اكتب اسم المسؤول كما يظهر في القائمة:\n${choices.join(' • ')}`, tag.engineer || '');
    if (selected === null) return; const engineer = window.getEngineer(selected.trim());
    if (!engineer) return showToast('⚠️ اختر اسمًا مطابقًا لمسؤولي الصيانة في الإعدادات');
    tag.engineer = engineer.name; tag.engineerPhone = engineer.phone || ''; tag.assignedAt = Date.now(); tag.assignedBy = currentUser.name || '';
    await window.syncRecord(`tags/${tag.id}`, tag); showToast(`تم إسناد التاج إلى ${engineer.name} ✅`);
    if (engineer.phone && notificationSettings.onTagAssigned) window.dispatchWhatsAppNotification(tag, 'tag_assigned');
};
window.verifyTagClosure = async function(id) {
    const tag = tagsData.find(item => item.id == id); if (!tag) return;
    if (!window.hasRole('admin', 'auditor')) return showToast('⚠️ التحقق من الإغلاق متاح للمراجع أو المدير فقط');
    if (tag.status !== 'review') return showToast('⚠️ انقل التاج إلى «بانتظار مراجعة» قبل التحقق');
    const note = prompt('ملاحظة التحقق (اختياري):', tag.verificationNote || ''); if (note === null) return;
    tag.status = 'closed'; tag.verifiedAt = Date.now(); tag.verifiedBy = currentUser.name || ''; tag.verificationNote = window.sanitizeInput(note); tag.closedAt = Date.now();
    await window.syncRecord(`tags/${tag.id}`, tag); window.awardPoints(20, 'إغلاق تاج بعد التحقق'); showToast('تم التحقق من الإغلاق وتوثيقه ✅');
};
