// ==========================================
// 🚀 FACTORY OS - V5.0 (ENTERPRISE MASTER CORE - FULL VERSION)
// Architected By: Architect-Prime
// ==========================================

const db = firebase.database();
const auth = firebase.auth();

// 🛡️ المتغيرات العالمية المحصنة (كاملة)
let tpmSystemRef = null, tpmSystemListener = null;
let globalApiKeys = { imgbb: "", gemini: "" };
let departments = [], historyData = [], tasksData = [], usersData = {}, logsData = [], likesData = {}, tagsData = [], kaizenComments = {}, userPoints = {}, knowledgeBaseData = [], deptPhones = {}, maintenanceEngineers = [];
let currentUser = { name: '', username: '', role: '', status: '' };
let currentAudit = null, isOnline = true, isDataLoaded = false, isInitialLoad = true;
let radarChartInstance = null, trendChartInstance = null, currentViewedDept = null;
let currentStepSelections = {}, currentStepImages = {}, currentStepImprovements = [];
let currentTagImg = null, currentTaskDept = null, kaizenImgs = { before: null, after: null };
let sigCanvas, sigCtx, isDrawing = false, canvasRect = null;
let screenHistory = ['homeScreen'];
let jhMiniChartInstance = null;
let deptGoalsData = {};
let currentJHDept = null; 
let registeredLosses = [];

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
    window.scrollTo({top: 0, behavior: 'smooth'});
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('mainSidebar'); const overlay = document.getElementById('sidebarOverlay');
    if(sidebar && overlay) { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); }
};

window.goBack = function() { showScreen('homeScreen'); };
window.uniqueNumericId = function() { return Date.now() + Math.floor(Math.random() * 1000); };
window.sanitizeInput = function(str) { return String(str).replace(/[<>]/g, '').trim(); };
window.syncRecord = async function(path, data) { await db.ref('tpm_system/' + path).set(data); };
window.deleteRecord = async function(path) { await db.ref('tpm_system/' + path).remove(); };
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
        departments = dSnap.val() || ['إنتاج', 'صيانة'];

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
            currentUser = { name: "م. محمد فايز", username: "mfayez", role: "admin", status: "active" };
            window.currentUser = currentUser; localStorage.setItem('tpm_username', 'mfayez'); 
            
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
            currentUser = { name: savedName, username: finalUsername, role: role, status: status };
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
            if(window.renderTags) window.renderTags(); if(currentUser.role && window.updateHomeDashboard) window.updateHomeDashboard();
        });

        dbListeners.tasks = db.ref('tpm_system/tasks').orderByChild('id').limitToLast(100).on('value', snap => {
            let data = snap.val() || {}; tasksData = Object.values(data).filter(x => x && x.id).sort((a,b)=>a.id-b.id); if(window.renderTasks) window.renderTasks();
        });

        dbListeners.history = db.ref('tpm_system/history').orderByChild('id').limitToLast(100).on('value', snap => {
            let data = snap.val() || {}; historyData = Object.values(data).filter(x => x && x.id).sort((a,b)=>a.id-b.id); window.historyData = historyData; 
            if(window.renderHistory) window.renderHistory(); if(window.renderKaizenFeed) window.renderKaizenFeed(); if(currentUser.role && window.updateHomeDashboard) window.updateHomeDashboard();
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

window.switchSettingsTab = function(tabId) {
    document.querySelectorAll('.settings-tab-content').forEach(c => { c.classList.remove('active'); c.style.display = 'none'; });
    document.querySelectorAll('#settingsScreen .row-flex .btn').forEach(b => { b.classList.remove('active'); b.style.background='transparent'; b.style.color='var(--text-main)'; });
    const targetTab = document.getElementById('tab-' + tabId); if(targetTab) { targetTab.classList.add('active'); targetTab.style.display = 'block'; }
    const clickedBtn = event.currentTarget; if(clickedBtn) { clickedBtn.classList.add('active'); clickedBtn.style.background='var(--primary)'; clickedBtn.style.color='white'; }
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

window.submitManualKaizen = function() {
    let t = document.getElementById('newKaizenTitle').value; let d = document.getElementById('newKaizenDept').value;
    if(!t || !kaizenImgs.before || !kaizenImgs.after) return showToast('⚠️ برجاء كتابة الوصف وإرفاق الصورتين');
    
    const btn = document.getElementById('submitKaizenBtn'); btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري الدمج..."; btn.disabled = true;
    
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
    const imgBefore = new Image(); const imgAfter = new Image();
    
    imgBefore.onload = function() {
        imgAfter.onload = async function() {
            canvas.width = 600; canvas.height = 300; ctx.fillStyle = "#0f172a"; ctx.fillRect(0,0,600,300); ctx.drawImage(imgBefore, 0, 0, 295, 300); ctx.drawImage(imgAfter, 305, 0, 295, 300);
            ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.moveTo(280, 150); ctx.lineTo(320, 130); ctx.lineTo(320, 170); ctx.fill();
            ctx.fillStyle = "rgba(239,68,68,0.9)"; ctx.fillRect(10, 10, 60, 30); ctx.fillStyle = "white"; ctx.font = "bold 16px Cairo"; ctx.fillText("قبل", 25, 32);
            ctx.fillStyle = "rgba(16,185,129,0.9)"; ctx.fillRect(530, 10, 60, 30); ctx.fillStyle = "white"; ctx.font = "bold 16px Cairo"; ctx.fillText("بعد", 545, 32);
            
            const mergedB64 = canvas.toDataURL('image/jpeg', 0.8);
            const uploadedUrl = await uploadImageToStorage(mergedB64);
            if (uploadedUrl) {
                let kId = window.uniqueNumericId().toString();
                window.syncRecord('history/' + kId, { id: kId, dept: d, auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG'), stepsOrder: ['ManualKaizen'], totalPct: 100, results: { 'ManualKaizen': { images: { 'img_1': { title: t, data: uploadedUrl } } } } });
                document.getElementById('newKaizenTitle').value = ''; document.getElementById('kaizenBeforePreview').innerHTML = ''; document.getElementById('kaizenAfterPreview').innerHTML = ''; kaizenImgs = { before: null, after: null }; document.getElementById('kaizenUploadModal').style.display = 'none';
                window.awardPoints(40, 'مشاركة كايزن'); showToast('تم نشر الكايزن بنجاح 🚀');
            } else { showToast('فشل الرفع'); }
            btn.innerHTML = "اعتماد التحسين"; btn.disabled = false;
        }; imgAfter.src = kaizenImgs.after;
    }; imgBefore.src = kaizenImgs.before;
};

window.renderKaizenFeed = function() {
    let c = document.getElementById('kaizenFeedContainer'); if(!c) return;
    let selectedDept = document.getElementById('kaizenDeptSelect').value;
    
    let html = historyData.filter(h=>h.stepsOrder.includes('ManualKaizen') && (selectedDept === 'الكل' || h.dept === selectedDept)).reverse().map(k=> {
        let lId = k.id; let liked = likesData[lId] && likesData[lId].includes(currentUser.name); let canEdit = window.hasRole('admin') || currentUser.name === k.auditor;
        let controls = canEdit ? `<button class="btn btn-sm btn-outline flex-1" onclick="editKaizen('${k.id}')"><i class='bx bx-edit'></i> تعديل</button><button class="btn btn-sm btn-danger flex-1" onclick="deleteKaizen('${k.id}')"><i class='bx bx-trash'></i> حذف</button>` : '';
        let comments = kaizenComments[lId] || []; let commentsHtml = comments.map(cm => `<div style="background:var(--surface-inset); padding:10px 15px; border-radius:10px; margin-bottom:8px; border-right:3px solid var(--primary); font-size:13px;"><b style="color:var(--primary); display:block; margin-bottom:3px;">${cm.user}:</b> ${cm.text} <span style="font-size:10px; color:var(--text-muted); float:left;">${cm.date}</span></div>`).join('');

        return `<div class="card glass-card" style="padding:0; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 20px; background:rgba(0,0,0,0.2); border-bottom:1px solid var(--border-glass);">
                <div style="display:flex; align-items:center; gap:10px;"><i class='bx bx-user-circle' style="font-size:24px; color:var(--gold);"></i><b style="color:var(--text-main); font-size:15px;">${k.auditor}</b></div>
                <span style="font-size:12px; color:var(--text-muted); background:var(--surface-inset); padding:4px 10px; border-radius:12px;"><i class='bx bx-buildings'></i> ${k.dept} | ${k.date}</span>
            </div>
            <div style="padding:20px;">
                <b style="font-size:16px; color:var(--text-main); display:block; margin-bottom:15px;">${k.results.ManualKaizen.images.img_1.title}</b>
                <img src="${k.results.ManualKaizen.images.img_1.data}" style="width:100%; border-radius:12px; border:1px solid var(--border-glass); margin-bottom:20px; box-shadow:var(--shadow-raised);">
                <div class="row-flex" style="margin-bottom:20px;">
                    <button class="btn btn-sm ${liked?'btn-primary':'btn-outline'} flex-1" onclick="toggleKaizenLike('${lId}')"><i class='bx ${liked?'bxs-like':'bx-like'}'></i> إعجاب (${likesData[lId]?likesData[lId].length:0})</button>
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
window.addKaizenComment = function(id) { let el=document.getElementById(`comment_input_${id}`); let txt=window.sanitizeInput(el.value); if(!txt) return; if(!kaizenComments[id]) kaizenComments[id]=[]; kaizenComments[id].push({user:currentUser.name, text:txt, date:new Date().toLocaleTimeString('ar-EG')}); window.syncRecord('kaizenComments/' + id, kaizenComments[id]); el.value=''; window.awardPoints(2, 'تعليق'); };

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

window.updateDeptDropdown = function() { let opts = departments.map(d=>`<option value="${d}">${d}</option>`).join(''); document.querySelectorAll('select').forEach(s => {if(s.id.includes('Dept')) s.innerHTML=opts;}); };
window.addOrUpdateDept = function() { let v = document.getElementById('newDeptInput').value; if(v){ departments.push(v); window.syncRecord('departments', departments); window.updateDeptDropdown(); showToast('تم الحفظ'); } };
window.addEngineer = function() { let n=document.getElementById('newEngName').value, p=document.getElementById('newEngPhone').value; if(n&&p) { maintenanceEngineers.push({name:n, phone:p}); window.syncRecord('maintenanceEngineers', maintenanceEngineers); document.getElementById('newTagEngineer').innerHTML+=`<option value="${p}">${n}</option>`; showToast('تم الإضافة'); } };

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
    if(!file) return;
    showToast('جاري رفع الصورة... ⏳');
    
    if (typeof processAndEnhanceImage === 'function') {
        processAndEnhanceImage(file, function(dataUrl) { window.finalize5SImage(dataUrl, type); });
    } else {
        const reader = new FileReader();
        reader.onload = function(e) { window.finalize5SImage(e.target.result, type); };
        reader.readAsDataURL(file);
    }
};

window.finalize5SImage = function(dataUrl, type) {
    document.getElementById(type === 'standard' ? 'imgStandard' : 'imgCurrent').src = dataUrl;
    showToast('تم إرفاق الصورة بنجاح ✅');
    
    const stdSrc = document.getElementById('imgStandard').src;
    const curSrc = document.getElementById('imgCurrent').src;
    if(stdSrc && curSrc && stdSrc !== window.location.href && curSrc !== window.location.href) {
        document.getElementById('fiveSSliderContainer').style.display = 'block';
        window.init5SSlider();
    }
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

window.generate5STask = function() {
    if(!departments || departments.length === 0) return showToast('لا توجد أقسام مسجلة');
    let dept = prompt('لأي قسم تريد تسجيل عدم المطابقة؟\n' + departments.join(' - '), departments[0]);
    if(!dept || !departments.includes(dept)) return showToast('قسم غير صالح');
    let desc = prompt('اكتب وصف المشكلة (عدم المطابقة في 5S):');
    if(!desc) return;
    
    let id = window.uniqueNumericId().toString();
    window.syncRecord('tasks/' + id, {
        id: id, task: '[5S] ' + window.sanitizeInput(desc), dept: dept, status: 'pending'
    });
    window.awardPoints(10, 'تسجيل عدم مطابقة 5S');
    showToast('تم تحويل عدم المطابقة إلى مهمة صيانة/تنظيم 🚀');
};
