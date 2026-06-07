// ==========================================
// 🚀 FACTORY OS - V5.0 (INDUSTRIAL GRADE - BUG FREE)
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyADr-QEzWt6xeT8oeF7wXfNySvXiKXMEy4",
    authDomain: "tpm-audit-system.firebaseapp.com",
    databaseURL: "https://tpm-audit-system-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "tpm-audit-system",
    storageBucket: "tpm-audit-system.firebasestorage.app",
    messagingSenderId: "1047922099229",
    appId: "1:1047922099229:web:5e3d6fd5fa4c23ab2772f4"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

let tpmSystemRef = null, tpmSystemListener = null;
let globalApiKeys = { imgbb: "", gemini: "" };
let departments = [], historyData = [], tasksData = [], usersData = {}, logsData = [], likesData = {}, tagsData = [], kaizenComments = {}, userPoints = {}, knowledgeBaseData = [], deptPhones = {}, maintenanceEngineers = [];
let currentUser = { name: '', username: '', role: '' };
let currentAudit = null, isOnline = false, isDataLoaded = false, isInitialLoad = true;
let radarChartInstance = null, trendChartInstance = null, currentViewedDept = null;
let currentStepSelections = {}, currentStepImages = {}, currentStepImprovements = [];
let currentTagImg = null, currentTaskDept = null, kaizenImgs = { before: null, after: null };
let sigCanvas, sigCtx, isDrawing = false, canvasRect = null;
let screenHistory = ['homeScreen'];
let jhMiniChartInstance = null;
let deptGoalsData = {};

function showScreen(screenId) {
    if (screenId !== 'loginScreen' && screenId !== 'signupScreen' && !canAccess(screenId)) {
        return showToast("عذراً، لا تملك صلاحية الدخول لهذه الصفحة.");
    }
    if (screenHistory[screenHistory.length - 1] !== screenId) screenHistory.push(screenId);
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    let target = document.getElementById(screenId);
    if(target) target.classList.add('active');
    window.scrollTo(0,0);
}

function goBack() {
    if (screenHistory.length > 1) {
        screenHistory.pop(); 
        let lastScreen = screenHistory[screenHistory.length - 1];
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        let target = document.getElementById(lastScreen);
        if(target) target.classList.add('active');
        window.scrollTo(0,0);
    } else {
        showScreen('homeScreen'); 
    }
}

function hasRole(...allowed) { return currentUser && currentUser.role && allowed.includes(currentUser.role); }
function sanitizeInput(val) { 
    if (!val) return '';
    const div = document.createElement('div'); div.appendChild(document.createTextNode(val));
    return div.innerHTML.trim(); 
}
function uniqueNumericId() { return (Date.now() * 1000) + Math.floor(Math.random() * 1000); }
function nl2brSafe(text) { return sanitizeInput(text).replace(/\n/g, '<br>'); }

function showToast(msg) {
    let c = document.getElementById('toast-container');
    if(!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
    let t = document.createElement('div'); t.className = 'toast-msg'; t.innerHTML = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.animation = 'fadeOut 0.3s ease-out forwards'; setTimeout(() => t.remove(), 300); }, 3000);
}

db.ref('.info/connected').on('value', snap => {
    isOnline = snap.val() === true;
    const el = document.getElementById('cloudStatus');
    if(el) { el.innerHTML = isOnline ? "متصل بقاعدة البيانات" : "غير متصل بالسيرفر"; el.style.color = isOnline ? "var(--success)" : "var(--danger)"; }
});

let dbListeners = {};
function clearAllListeners() {
    for (let path in dbListeners) { db.ref('tpm_system/' + path).off('value', dbListeners[path]); }
    dbListeners = {};
}

firebase.auth().onAuthStateChanged(async user => {
    clearAllListeners();
    if (user) {
        isDataLoaded = true;
        const dSnap = await db.ref('tpm_system/departments').once('value');
        departments = dSnap.val() || ['إنتاج', 'صيانة'];
        const uSnap = await db.ref('tpm_system/users').once('value');
        usersData = uSnap.val() || {};
        const kSnap = await db.ref('tpm_system/api_keys').once('value');
        globalApiKeys = kSnap.val() || { imgbb: "", gemini: "" };

        const userEmail = user.email ? user.email.toLowerCase() : '';
        const isMasterAdmin = userEmail === 'mfayez@tpm.app';
        const savedName = localStorage.getItem('tpm_user') || userEmail.split('@')[0];
        const finalUsername = isMasterAdmin ? 'mfayez' : (localStorage.getItem('tpm_username') || userEmail.split('@')[0]);

        let role = 'viewer'; let status = 'active';

        if (isMasterAdmin) {
            role = 'admin';
            currentUser = { name: "م. محمد فايز", username: "mfayez", role: "admin", status: "active" };
            localStorage.setItem('tpm_username', 'mfayez'); 
            let hasPending = Object.values(usersData).some(u => typeof u === 'object' && u.status === 'pending');
            let notifyIcon = document.getElementById('adminNotification');
            if(notifyIcon) notifyIcon.style.display = hasPending ? 'block' : 'none';
            renderUserManagement(); 
            dbListeners.users = db.ref('tpm_system/users').on('value', snap => {
                usersData = snap.val() || {};
                let pendingLive = Object.values(usersData).some(u => typeof u === 'object' && u.status === 'pending');
                let notifLive = document.getElementById('adminNotification');
                if(notifLive) notifLive.style.display = pendingLive ? 'block' : 'none';
                renderUserManagement(); 
            });
        } else {
            let uData = usersData[user.uid];
            if (typeof uData === 'string') { role = uData; } 
            else if (uData && typeof uData === 'object') { role = uData.role || 'viewer'; status = uData.status || 'active'; }
            currentUser = { name: savedName, username: finalUsername, role: role, status: status };
        }

        document.querySelectorAll('.btn-role-admin').forEach(el => el.style.display = currentUser.role === 'admin' ? 'block' : 'none');
        document.querySelectorAll('.btn-role-auditor').forEach(el => el.style.display = (currentUser.role === 'admin' || currentUser.role === 'auditor') ? 'block' : 'none');
        
        if (currentUser.status === 'pending') {
            showToast("حسابك قيد المراجعة. يرجى انتظار موافقة الإدارة.");
            firebase.auth().signOut(); return;
        } else { showScreen('homeScreen'); }

        updateDeptDropdown();
        dbListeners.tags = db.ref('tpm_system/tags').orderByChild('id').limitToLast(100).on('value', snap => {
            let data = snap.val() || {};
            tagsData = Object.values(data).filter(x => x && x.id).sort((a,b)=>b.id-a.id);
            renderTags(); if(currentUser.role) updateHomeDashboard();
        });

        dbListeners.tasks = db.ref('tpm_system/tasks').orderByChild('id').limitToLast(100).on('value', snap => {
            let data = snap.val() || {};
            tasksData = Object.values(data).filter(x => x && x.id).sort((a,b)=>a.id-b.id);
            renderTasks();
        });

        dbListeners.history = db.ref('tpm_system/history').orderByChild('id').limitToLast(100).on('value', snap => {
            let data = snap.val() || {};
            historyData = Object.values(data).filter(x => x && x.id).sort((a,b)=>a.id-b.id);
            renderHistory(); renderKaizenFeed(); if(currentUser.role) updateHomeDashboard();
        });
    
        dbListeners.goals = db.ref('tpm_system/dept_goals').on('value', snap => { 
            deptGoalsData = snap.val() || {}; 
            if(currentJHDept && document.getElementById('jhPortalScreen').classList.contains('active')) selectJHDept(currentJHDept); 
        });
      
        dbListeners.losses = db.ref('tpm_system/losses').on('value', snap => {
            registeredLosses = snap.val() ? Object.values(snap.val()) : [];
            if(document.getElementById('kkScreen').classList.contains('active')) renderKKDashboard();
        });
        
        dbListeners.points = db.ref('tpm_system/points').on('value', snap => { userPoints = snap.val() || {}; updateUsersLeaderboard(); });
        
        dbListeners.knowledgeBase = db.ref('tpm_system/knowledgeBase').on('value', snap => { 
            knowledgeBaseData = snap.val() ? Object.values(snap.val()) : []; 
            if(document.getElementById('knowledgeScreen').classList.contains('active')) renderKnowledgeShelves(); 
        });
        
    } else {
        isInitialLoad = true; isDataLoaded = false; 
        showScreen('loginScreen');
    }
});

async function login() {
    const username = sanitizeInput(document.getElementById('loginUsername').value).toLowerCase();
    const password = document.getElementById('loginPassword').value.trim();
    if(!username || !password) return showToast('برجاء كتابة اسم المستخدم وكلمة المرور');
    document.getElementById('cloudStatus').innerHTML = "جاري الدخول...";
    if(document.getElementById('rememberMe') && document.getElementById('rememberMe').checked) localStorage.setItem('tpm_username', username); 
    try { await firebase.auth().signInWithEmailAndPassword(username + "@tpm.app", password); } 
    catch (e) { showToast('بيانات الدخول غير صحيحة'); document.getElementById('cloudStatus').innerHTML = "غير متصل"; }
}

async function signup() {
    const fullName = sanitizeInput(document.getElementById('signupFullName').value);
    const user = sanitizeInput(document.getElementById('signupUsername').value).toLowerCase().trim();
    const pass = document.getElementById('signupPassword').value.trim();
    const requestedRole = document.getElementById('signupRole').value;
    if(!user || !pass || !fullName) return showToast("برجاء إكمال كافة البيانات");
    try {
        showToast("جاري إرسال طلب الانضمام...");
        const res = await firebase.auth().createUserWithEmailAndPassword(user + "@tpm.app", pass);
        const newUserObj = { name: fullName, username: user, requestedRole: requestedRole, role: 'viewer', status: 'pending', permissions: { homeScreen: 'view', tasksScreen: 'none', historyScreen: 'none', kaizenScreen: 'view', tagsScreen: 'none', knowledgeScreen: 'none' } };
        await db.ref('tpm_system/users/' + res.user.uid).set(newUserObj);
        showToast("تم إرسال طلبك بنجاح! يرجى انتظار الموافقة.");
        setTimeout(() => firebase.auth().signOut().then(() => window.location.reload()), 2000);
    } catch (e) { showToast("خطأ: اسم المستخدم محجوز أو البيانات غير صحيحة"); }
}

function logout() { firebase.auth().signOut().then(() => { localStorage.clear(); window.location.reload(); }); }
function biometricLogin() {
    const u = localStorage.getItem('tpm_username');
    if(!u) return showToast('سجل دخولك يدوياً أول مرة لتفعيل الدخول السريع'); 
    document.getElementById('loginUsername').value = u;
    showToast('تم استدعاء بياناتك، أدخل كلمة المرور فقط');
}

function syncRecord(path, data) { if (isOnline && firebase.auth().currentUser) db.ref('tpm_system/' + path).set(data); }
function deleteRecord(path) { if (isOnline && firebase.auth().currentUser) db.ref('tpm_system/' + path).remove(); }

let sessionScannedBarcodes = new Set();
async function scanBarcodeFromImage(event) {
    const file = event.target.files[0]; if (!file) return;
    showToast('جاري قراءة الباركود... 🔍');
    const html5QrCode = new Html5Qrcode("searchResults"); 
    try {
        const decodedText = await html5QrCode.scanFile(file, true);
        if (sessionScannedBarcodes.has(decodedText)) {
            showToast('⚠️ تحذير: تم مسح هذا الباركود مسبقاً!');
            document.getElementById('searchResults').style.display = 'block';
            document.getElementById('searchResults').innerHTML = `<div style="padding:20px; background:rgba(198,40,40,0.1); border:1px solid var(--danger); border-radius:15px; text-align:center;"><div style="font-size:30px; margin-bottom:10px;">🛑</div><b class="danger-text" style="font-size:16px;">باركود مكرر (مرفوض)</b><br><div style="margin-top:10px; font-size:12px; color:var(--text-muted);">البيانات: ${decodedText}</div><div class="row-flex" style="margin-top:15px; justify-content:center;"><button class="btn btn-sm btn-danger flex-1" onclick="document.getElementById('searchResults').style.display='none'">إلغاء</button><button class="btn btn-sm btn-warning flex-1" onclick="forceAcceptBarcode('${decodedText.replace(/'/g, "\\'")}')">تخطي وتسجيل</button></div></div>`;
            return;
        }
        processValidBarcode(decodedText);
    } catch (err) { showToast('تعذرت قراءة الباركود، تأكد من وضوح الصورة.'); }
}

function processValidBarcode(decodedText) {
    sessionScannedBarcodes.add(decodedText);
    showToast('تمت القراءة بنجاح!');
    document.getElementById('searchResults').style.display = 'block';
    document.getElementById('searchResults').innerHTML = `<div style="padding:20px; background:rgba(46,125,50,0.1); border:1px solid var(--success); border-radius:15px; text-align:center;"><div style="font-size:30px; margin-bottom:10px;">✅</div><b class="success-text" style="font-size:16px;">تم تسجيل البيانات:</b><br><div style="margin-top:10px; padding:10px; background:rgba(0,0,0,0.3); border-radius:8px; color:var(--text-main); word-break: break-all; font-family:monospace;">${decodedText}</div><button class="btn btn-sm btn-outline" style="margin-top:15px; width:auto;" onclick="document.getElementById('searchResults').style.display='none'">إغلاق</button></div>`;
}
function forceAcceptBarcode(decodedText) { showToast('تم تخطي الحماية وتأكيد التسجيل يدوياً ⚠️'); processValidBarcode(decodedText); }

async function uploadImageToStorage(fileOrDataUrl) {
    const apiKey = globalApiKeys.imgbb;
    if (!apiKey) { showToast('⚠️ لا يوجد مفتاح ImgBB. يرجى إضافته من الإعدادات.'); return null; }
    try {
        let base64Data = fileOrDataUrl;
        if (typeof fileOrDataUrl !== 'string') {
            const reader = new FileReader();
            base64Data = await new Promise((resolve) => { reader.readAsDataURL(fileOrDataUrl); reader.onload = () => resolve(reader.result); });
        }
        const b64 = base64Data.split(',')[1];
        const formData = new FormData(); formData.append('image', b64);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
        const data = await res.json();
        if(data.success) return data.data.url;
        return null;
    } catch(e) { showToast('⚠️ فشل الرفع على ImgBB'); return null; }
}

function processAndEnhanceImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
            const MAX_WIDTH = 800; let width = img.width; let height = img.height;
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.8));
        }; img.src = e.target.result;
    }; reader.readAsDataURL(file);
}

function toggleSidebar() {
    const sb = document.getElementById('mainSidebar');
    const ov = document.getElementById('sidebarOverlay');
    if(!sb) return;
    if(sb.classList.contains('open')) { sb.classList.remove('open'); ov.style.display = 'none'; } 
    else { sb.classList.add('open'); ov.style.display = 'block'; }
}

function awardPoints(pts, reason) {
    const uid = firebase.auth().currentUser.uid;
    if(!uid) return;
    let currentPts = (userPoints[uid] || 0) + pts;
    syncRecord('points/' + uid, currentPts);
    let achievementId = uniqueNumericId();
    syncRecord('global_achievements/' + achievementId, { user: currentUser.name, uid: uid, reason: reason, points: pts, date: new Date().toLocaleString('ar-EG') });
    showToast(`🎖️ حصلت على ${pts} نقطة إضافية: ${reason}`);
}

function updateUsersLeaderboard() {
    const lc = document.getElementById('usersLeaderboardContainer');
    if(!lc) return;
    let sortable = [];
    for (let uid in userPoints) {
        let uInfo = usersData[uid] || { name: "مستخدم مجهول" };
        sortable.push({ uid: uid, name: uInfo.name, avatar: uInfo.avatar, points: userPoints[uid] });
    }
    sortable.sort((a, b) => b.points - a.points);
    if(sortable.length === 0) { lc.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">المصنع بانتظار أول بطل... 🚀</div>'; return; }

    const topLimit = 20;
    const topUsers = sortable.slice(0, topLimit);
    let html = topUsers.map((item, idx) => generateEliteCardHTML(item, idx)).join('');
    const myUid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    const myRankIndex = sortable.findIndex(u => u.uid === myUid);
    if (myUid && myRankIndex >= topLimit) {
        let myData = sortable[myRankIndex];
        html += `<div style="text-align:center; color:var(--gold); margin: 15px 0 5px; font-size:10px; font-weight:bold;">🔻 مركزك الحالي 🔻</div>`;
        html += generateEliteCardHTML(myData, myRankIndex);
    }
    lc.innerHTML = html;
}

function generateEliteCardHTML(item, idx) {
    let rankClass = (idx === 0) ? 'gold-glow' : (idx === 1 ? 'silver-glow' : (idx === 2 ? 'bronze-glow' : ''));
    let rankIcon = (idx === 0) ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : idx + 1));
    let rankTitle = "مبتدئ تقني"; let rankColor = "var(--text-muted)";
    if(item.points > 1500) { rankTitle = "أسطورة المصنع 🎖️"; rankColor = "var(--gold)"; }
    else if(item.points > 800) { rankTitle = "خبير TPM سينيور 💎"; rankColor = "#00d4ff"; }
    else if(item.points > 300) { rankTitle = "تقني محترف 🔥"; rankColor = "var(--success)"; }

    return `
    <div class="elite-card ${rankClass}" onclick="viewOtherUserProfile('${item.uid}')">
        <div class="elite-rank">${rankIcon}</div>
        <img class="elite-avatar" src="${item.avatar || 'https://ui-avatars.com/api/?name='+item.name+'&background=1b2a47&color=d4af37'}">
        <div class="elite-info">
            <div class="elite-name">${item.name}</div>
            <div class="elite-level" style="color:${rankColor}; font-weight:900;">${rankTitle}</div>
        </div>
        <div class="elite-score"><span class="pts-val">${item.points}</span><small>نقطة</small></div>
    </div>`;
}

async function openMyFullProfile() {
    const uid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    if(!uid || !usersData[uid]) return showToast('خطأ في جلب بيانات المستخدم');
    const u = usersData[uid];
    const activeName = currentUser.name; 
    document.getElementById('myBigAvatar').src = u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=1b2a47&color=d4af37`;
    document.getElementById('myDisplayName').innerText = u.name;
    document.getElementById('editName').value = u.name;
    document.getElementById('editPhone').value = u.phone || '';
    const pts = userPoints[uid] || 0;
    document.getElementById('myDisplayRank').innerText = `الرصيد المعرفي: ${pts} نقطة`;
    let opts = departments.map(d=>`<option value="${d}" ${u.dept===d?'selected':''}>${d}</option>`).join('');
    document.getElementById('editDept').innerHTML = opts;

    const myAudits = historyData.filter(h => h.auditor === activeName && !h.stepsOrder.includes('ManualKaizen'));
    const myTags = tagsData.filter(t => t.auditor === activeName);
    const myKaizens = historyData.filter(h => h.auditor === activeName && h.stepsOrder.includes('ManualKaizen'));

    let allActivity = [
        ...myAudits.map(a => ({ type: 'audit', text: `📝 مراجعة قسم ${a.dept} (${a.totalPct}%)`, date: a.date })),
        ...myTags.map(t => ({ type: 'tag', text: `🚨 أصدرت تاج ${t.color==='red'?'صيانة':'إنتاج'}: ${t.desc}`, date: t.date })),
        ...myKaizens.map(k => ({ type: 'kaizen', text: `💡 شاركت بفكرة كايزن في ${k.dept}`, date: k.date }))
    ].reverse().slice(0, 10); 

    let timelineHtml = allActivity.map(item => `
        <div class="item-row" style="border-right-color: ${item.type === 'tag' ? 'var(--danger)' : (item.type === 'kaizen' ? 'var(--success)' : 'var(--gold)')};">
            <span style="flex:1;">${item.text}</span>
            <small style="color:var(--text-muted); font-size:10px; margin-right:10px;">${item.date}</small>
        </div>`).join('');

    document.getElementById('myActivityTimeline').innerHTML = `
        <div class="dashboard-stats" style="margin-bottom:20px;">
            <div class="card stat-card glass-card" style="border-color:var(--gold);"><div class="stat-value">${myAudits.length}</div><div class="stat-label">مراجعة</div></div>
            <div class="card stat-card glass-card" style="border-color:var(--danger);"><div class="stat-value">${myTags.length}</div><div class="stat-label">تاج</div></div>
            <div class="card stat-card glass-card" style="border-color:var(--success);"><div class="stat-value">${myKaizens.length}</div><div class="stat-label">كايزن</div></div>
        </div>
        <h4 style="color:var(--gold); border-bottom:1px solid rgba(212,175,55,0.2); padding-bottom:5px;">آخر التحركات الميدانية:</h4>
        ${timelineHtml || '<div style="text-align:center; padding:10px; font-size:11px; color:var(--text-muted);">لم يتم رصد أي نشاط ميداني لاسمك الحالي بعد 🚀</div>'}
    `;
    showScreen('profileDetailsScreen');
}

let mainChartInstance = null;
function updateHomeDashboard() {
    let tScore = 0, aCount = 0; let deptLabels = []; let deptScores = [];
    let grid = departments.map(d => {
        let auds = historyData.filter(h => h.dept === d && !h.stepsOrder.includes('ManualKaizen'));
        let sc = auds.length > 0 ? auds[auds.length-1].totalPct : 0;
        if(auds.length > 0) { tScore+=sc; aCount++; }
        let rTags = tagsData.filter(t => t.dept === d && t.status === 'open' && t.color === 'red').length;
        deptLabels.push(d); deptScores.push(sc);
        return `<div class="card glass-card" style="padding:15px; text-align:center; cursor:pointer;" onclick="openDeptDashboard('${d}')"><div style="font-size:14px; font-weight:bold; color:var(--gold); margin-bottom:10px;">${d}</div><div class="stat-value ${sc>=80?'success-text':(sc>=50?'warning-text':'danger-text')}">${sc}%</div><div style="font-size:10px; color:var(--text-muted); margin-top:5px;">تاجات مفتوحة: ${rTags}</div></div>`;
    }).join('');
    
    document.getElementById('homeDeptGrid').innerHTML = grid;
    document.getElementById('homeAvgScore').innerText = aCount > 0 ? Math.round(tScore/aCount) + '%' : '0%';
    document.getElementById('homeOpenTags').innerText = tagsData.filter(t => t.status === 'open').length;
    document.getElementById('homeClosedTags').innerText = tagsData.filter(t => t.status === 'closed').length;
    
    const ctx = document.getElementById('mainDashboardChart');
    if (ctx) {
        if (mainChartInstance) mainChartInstance.destroy();
        mainChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels: deptLabels, datasets: [{ label: 'كفاءة القسم %', data: deptScores, backgroundColor: deptScores.map(s => s >= 80 ? 'rgba(46, 125, 50, 0.7)' : (s >= 50 ? 'rgba(245, 127, 23, 0.7)' : 'rgba(198, 40, 40, 0.7)')), borderColor: deptScores.map(s => s >= 80 ? '#2e7d32' : (s >= 50 ? '#f57f17' : '#c62828')), borderWidth: 1, borderRadius: 5 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#bdae93', font: {family: 'Cairo'} } }, x: { ticks: { color: '#d4af37', font: {family: 'Cairo', weight: 'bold'} } } }, plugins: { legend: { display: false } } }
        });
    }

    let criticalTags = tagsData.filter(t => t.status === 'open' && t.color === 'red').slice(0, 5);
    let cTagsHtml = criticalTags.map(t => `<div style="background:rgba(198,40,40,0.1); border-right:3px solid var(--danger); padding:8px; margin-bottom:8px; border-radius:5px; font-size:11px; cursor:pointer;" onclick="showScreen('tagsScreen'); document.getElementById('filterTagDept').value='${t.dept}'; renderTags();"><b style="color:var(--text-main);">${t.desc}</b><br><span style="color:var(--danger); font-weight:bold;">${t.dept}</span> <span style="color:var(--text-muted);">- ${t.machine||'عام'}</span></div>`).join('');
    const critContainer = document.getElementById('criticalTagsList');
    if(critContainer) critContainer.innerHTML = cTagsHtml || '<div style="text-align:center; color:var(--success); font-size:12px; padding:20px 0;">لا توجد أعطال حرجة 🎉</div>';
    updateUsersLeaderboard();
}

let deptRadarInstance = null, deptTrendInstance = null;
function openDeptDashboard(dept) {
    currentViewedDept = dept;
    document.getElementById('deptViewTitle').innerText = `لوحة قيادة: ${dept}`;
    const deptAudits = historyData.filter(h => h.dept === dept).sort((a,b) => new Date(a.date) - new Date(b.date));
    const deptTags = tagsData.filter(t => t.dept === dept && t.status === 'open');
    const deptTasks = tasksData.filter(t => t.dept === dept && t.status !== 'done');
    
    const lastAudit = deptAudits[deptAudits.length-1];
    document.getElementById('deptAvgScore').innerText = lastAudit ? lastAudit.totalPct + '%' : '0%';
    document.getElementById('deptOpenTags').innerText = deptTags.length;
    document.getElementById('deptTasksCount').innerText = deptTasks.length;

    const steps = ['JH-0', 'JH-1', 'JH-2', 'JH-3', 'JH-4', 'JH-5', 'JH-6'];
    const stepScores = steps.map(s => {
        if (!lastAudit || !lastAudit.results[s] || lastAudit.results[s].skipped) return 0;
        return Math.round((lastAudit.results[s].score / lastAudit.results[s].max) * 100);
    });

    const radarCtx = document.getElementById('deptRadarChart');
    if (deptRadarInstance) deptRadarInstance.destroy();
    deptRadarInstance = new Chart(radarCtx, {
        type: 'radar',
        data: { labels: ['JH0', 'JH1', 'JH2', 'JH3', 'JH4', 'JH5', 'JH6'], datasets: [{ label: 'مستوى التنفيذ %', data: stepScores, backgroundColor: 'rgba(212, 175, 55, 0.2)', borderColor: '#d4af37', pointBackgroundColor: '#b87333', borderWidth: 2 }] },
        options: { scales: { r: { beginAtZero: true, max: 100, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' } } }, plugins: { legend: { display: false } } }
    });

    const trendCtx = document.getElementById('deptTrendChart');
    if (deptTrendInstance) deptTrendInstance.destroy();
    deptTrendInstance = new Chart(trendCtx, {
        type: 'line',
        data: { labels: deptAudits.slice(-5).map(a => a.date.split('/')[0] + '/' + a.date.split('/')[1]), datasets: [{ label: 'الكفاءة %', data: deptAudits.slice(-5).map(a => a.totalPct), borderColor: '#2e7d32', backgroundColor: 'rgba(46, 125, 50, 0.1)', fill: true, tension: 0.4 }] },
        options: { scales: { y: { beginAtZero: true, max: 100 }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
    });

    document.getElementById('deptActionItems').innerHTML = deptTags.slice(0,3).map(t => `<div class="card glass-card" style="padding:12px; border-right:4px solid ${t.color==='red'?'var(--danger)':'var(--primary-light)'}; margin-bottom:10px;"><div style="font-weight:bold; font-size:12px; color:var(--text-main);">${t.desc}</div><div style="font-size:10px; color:var(--text-muted); margin-top:5px;">👤 ${t.auditor} | ⚙️ ${t.machine || 'عام'}</div></div>`).join('') || '<div style="text-align:center; color:var(--success); font-size:12px; padding:20px;">لا توجد أعطال حرجة في هذا القسم 🎉</div>';
    showScreen('deptDashboardScreen');
}

function saveAuditDraft() { if(currentAudit) localStorage.setItem('tpm_audit_draft', JSON.stringify(currentAudit)); }
function loadAuditDraft() { const draft = localStorage.getItem('tpm_audit_draft'); if(draft) { currentAudit = JSON.parse(draft); renderCurrentAuditStep(); } }
function clearAuditDraft() { localStorage.removeItem('tpm_audit_draft'); }

function startNewAuditFlow() { 
    if(currentViewedDept) document.getElementById('selectDept').value = currentViewedDept; 
    const draft = localStorage.getItem('tpm_audit_draft');
    if(draft) {
        let dObj = JSON.parse(draft);
        if(confirm(`يوجد تقييم غير مكتمل لقسم (${dObj.dept}). هل تريد استكماله؟`)) { loadAuditDraft(); return; } 
        else { clearAuditDraft(); }
    }
    showScreen('setupScreen'); 
}

function initAuditSequential() {
    currentAudit = { id: uniqueNumericId().toString(), dept: document.getElementById('selectDept').value, machine: document.getElementById('setupMachine').value||'عام', auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG'), stepsOrder: ['JH-0','JH-1','JH-2','JH-3','JH-4','JH-5','JH-6'], currentStepIndex: 0, results: {} };
    renderCurrentAuditStep();
}

function renderCurrentAuditStep() {
    const k = currentAudit.stepsOrder[currentAudit.currentStepIndex]; 
    const sd = AUDIT_DATA[k];
    
    currentStepSelections = (currentAudit.results[k] && currentAudit.results[k].selections) ? currentAudit.results[k].selections : {};
    currentStepImages = (currentAudit.results[k] && currentAudit.results[k].images) ? currentAudit.results[k].images : {};

    document.getElementById('auditStepTitle').innerText = `${k}: ${sd.name}`;
    document.getElementById('stepCounter').innerText = `خطوة ${currentAudit.currentStepIndex + 1} من 7`;
    document.getElementById('auditProgressBar').style.width = `${((currentAudit.currentStepIndex + 1) / 7) * 100}%`;

    document.getElementById('auditItemsContainer').innerHTML = sd.items.map(item => {
        let hasImage = currentStepImages['img_' + item.id] ? `<div style="margin-top:10px; display:flex; align-items:center; gap:10px;"><img src="${currentStepImages['img_' + item.id].data}" style="height:50px; width:50px; object-fit:cover; border-radius:8px; border:1px solid var(--gold); cursor:pointer;" onclick="window.open('${currentStepImages['img_' + item.id].data}')"><button class="btn btn-outline btn-sm" onclick="runAIVision(${item.id}, '${item.title.replace(/'/g, "\\'")}')">🧠 استشارة AI</button></div>` : '';
        
        return `
        <div class="audit-item">
            <div class="item-header" style="display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; align-items:center; gap:10px; width:100%;">
                    <div class="item-num">${item.id}</div>
                    <div class="item-title" style="flex:1; font-weight:bold; font-size:14px; color:var(--text-main);">${item.title}</div>
                    <span class="item-badge-max">من ${item.maxScore} نقطة</span>
                </div>
                <div class="row-flex" style="justify-content:flex-end;">
                    <button class="btn btn-sm btn-outline" style="border-radius:20px; font-size:10px; padding:2px 10px;" onclick="explainItem('${item.title}')">❓ شرح البند</button>
                    <button class="btn btn-sm btn-outline" style="border-radius:20px; font-size:10px; padding:2px 10px; color:var(--gold);" onclick="openImageSourcePicker(${item.id}, '${item.title.replace(/'/g, "\\'")}')">📷 إرفاق دليل</button>
                </div>
            </div>
            <div id="preview_img_${item.id}">${hasImage}</div>
            <div style="margin-top:15px;">
                ${item.levels.map(lvl => {
                    let isSel = (currentStepSelections['item_'+item.id] && currentStepSelections['item_'+item.id].score === lvl.score) ? 'selected' : '';
                    return `
                    <div class="level-opt ${isSel}" onclick="selectLevel(${item.id}, ${lvl.score}, ${item.maxScore}, this)">
                        <div class="score-tag">${lvl.score} نقطة</div>
                        <div style="flex:1; font-size:11px; line-height:1.4;">${lvl.desc}</div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }).join('');
    
    currentStepImprovements = []; 
    showScreen('auditScreen'); 
    saveAuditDraft();
    updateCumulativeScoreUI();
}

function updateCumulativeScoreUI() {
    let totalScoreSoFar = 0, totalMaxSoFar = 0;
    for (let i = 0; i < currentAudit.currentStepIndex; i++) {
        let stepKey = currentAudit.stepsOrder[i];
        let res = currentAudit.results[stepKey];
        if (res && !res.skipped) { totalScoreSoFar += res.score; totalMaxSoFar += res.max; }
    }
    for (let key in currentStepSelections) { totalScoreSoFar += currentStepSelections[key].score; totalMaxSoFar += currentStepSelections[key].max; }

    const pct = totalMaxSoFar === 0 ? 0 : Math.round((totalScoreSoFar / totalMaxSoFar) * 100);
    const pctEl = document.getElementById('cumulativeScoreText');
    const pointsEl = document.getElementById('cumulativePointsText');
    const barEl = document.getElementById('cumulativeProgressBar');

    if (pctEl) { pctEl.innerText = pct + '%'; pctEl.style.color = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)'); }
    if (pointsEl) pointsEl.innerText = `النقاط: ${totalScoreSoFar} / ${totalMaxSoFar}`;
    if (barEl) { barEl.style.width = pct + '%'; barEl.style.background = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)'); }
}

function selectLevel(id, score, max, el) { 
    currentStepSelections['item_'+id] = {score, max}; 
    el.parentElement.querySelectorAll('.level-opt').forEach(o=>o.classList.remove('selected')); 
    el.classList.add('selected'); 
    saveAuditDraft();
    updateCumulativeScoreUI();
}

function openImageSourcePicker(itemId, itemTitle) { currentUploadItemId = itemId; currentUploadItemTitle = itemTitle; document.getElementById('imageSourceModal').style.display = 'flex'; }
function triggerCamera() { document.getElementById('cameraInput').click(); document.getElementById('imageSourceModal').style.display = 'none'; }
function triggerGallery() { document.getElementById('galleryInput').click(); document.getElementById('imageSourceModal').style.display = 'none'; }

async function handleImageSelection(event) {
    const file = event.target.files[0]; if(!file || !currentUploadItemId) return;
    showToast('جاري رفع وتحليل الصورة...');
    processAndEnhanceImage(file, async function(dataUrl) {
        const url = await uploadImageToStorage(dataUrl);
        if (url) {
            currentStepImages['img_' + currentUploadItemId] = { title: currentUploadItemTitle, data: url };
            saveAuditDraft(); renderCurrentAuditStep(); showToast('تم الرفع');
        } else { showToast('فشل الرفع'); }
    });
}

function finishCurrentStep() {
    const k = currentAudit.stepsOrder[currentAudit.currentStepIndex]; 
    const sd = AUDIT_DATA[k];
    if(Object.keys(currentStepSelections).length < sd.items.length) { showToast('⚠️ يرجى تقييم جميع البنود قبل الحفظ'); return; }
    
    let totalScore = 0, totalMax = 0; 
    currentStepImprovements = [];
    for(let key in currentStepSelections) { 
        let itemData = currentStepSelections[key];
        totalScore += itemData.score; totalMax += itemData.max; 
        if(itemData.score < itemData.max) { 
            let id = key.split('_')[1]; 
            let itm = sd.items.find(i=>i.id == id); 
            if(itm) {
                let maxLvl = itm.levels.find(l => l.score === itm.maxScore);
                let targetAction = maxLvl ? maxLvl.desc : "الوصول للمعايير القياسية";
                currentStepImprovements.push(`[${itm.title}] 🎯 المطلوب: ${targetAction}`); 
            }
        }
    }
    
    currentAudit.results[k] = { skipped: false, score: totalScore, max: totalMax, improvements: currentStepImprovements, selections: currentStepSelections, images: currentStepImages };
    saveAuditDraft();
    
    const pct = Math.round((totalScore/totalMax)*100);
    document.getElementById('summaryPct').innerText = pct + '%';
    document.getElementById('summaryPct').style.color = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)');
    document.getElementById('summaryScoreStr').innerText = `المجموع: ${totalScore} من ${totalMax} نقطة`;
    document.getElementById('opportunitiesContainer').innerHTML = currentStepImprovements.length > 0 ? currentStepImprovements.map(i=>`<div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-bottom:8px; border-right:4px solid var(--warning); font-size:12px; text-align:right; color:var(--text-main);">🔹 ${i}</div>`).join('') : '<div style="color:var(--success); font-weight:bold; text-align:center; padding:20px;">🌟 أداء مثالي، لا توجد ملاحظات</div>';
    showScreen('stepSummaryScreen');
}

function skipCurrentStep() { currentAudit.results[currentAudit.stepsOrder[currentAudit.currentStepIndex]] = {skipped:true, score:0, max:0, improvements:[], selections:{}, images:{}}; saveAuditDraft(); goToNextStep(); }
function goToNextStep() { currentAudit.currentStepIndex++; if(currentAudit.currentStepIndex < 7) renderCurrentAuditStep(); else generateFinalReport(); }

function switchSettingsTab(tabId) {
    document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

async function savePersonalData() {
    const uid = firebase.auth().currentUser.uid;
    const newName = document.getElementById('editName').value.trim();
    const newPhone = document.getElementById('editPhone').value.trim();
    const newDept = document.getElementById('editDept').value;
    if(!newName) return showToast('الاسم مطلوب');
    showToast('جاري تحديث هويتك... ⏳');
    await db.ref(`tpm_system/users/${uid}`).update({ name: newName, phone: newPhone, dept: newDept });
    currentUser.name = newName; localStorage.setItem('tpm_user', newName);
    showToast('تم تحديث بياناتك بنجاح ✅');
    renderProfileAndSettings(); showScreen('settingsScreen');
}

function initSignaturePad() {
    setTimeout(() => {
        sigCanvas = document.getElementById('signatureCanvas'); if(!sigCanvas) return;
        sigCtx = sigCanvas.getContext('2d'); sigCtx.lineWidth = 3; sigCtx.strokeStyle = '#b87333'; sigCtx.lineCap = 'round';
        clearSignature(); 
        const startDrawing = (x, y) => { isDrawing = true; canvasRect = sigCanvas.getBoundingClientRect(); sigCtx.beginPath(); sigCtx.moveTo(x - canvasRect.left, y - canvasRect.top); };
        const draw = (x, y) => { if(isDrawing) { sigCtx.lineTo(x - canvasRect.left, y - canvasRect.top); sigCtx.stroke(); } };
        sigCanvas.onmousedown = (e) => startDrawing(e.clientX, e.clientY);
        sigCanvas.onmousemove = (e) => draw(e.clientX, e.clientY);
        sigCanvas.onmouseup = () => isDrawing = false;
        sigCanvas.onmouseleave = () => isDrawing = false;
        sigCanvas.ontouchstart = (e) => { startDrawing(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); };
        sigCanvas.ontouchmove = (e) => { draw(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); };
        sigCanvas.ontouchend = () => isDrawing=false;
    }, 300); 
}
function clearSignature() { if(sigCtx) { sigCtx.fillStyle = "#ffffff"; sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height); } }

function generateFinalReport() {
    let s=0, m=0; currentAudit.stepsOrder.forEach(k=>{if(!currentAudit.results[k].skipped){s+=currentAudit.results[k].score; m+=currentAudit.results[k].max;}});
    let p=m===0?0:Math.round((s/m)*100); currentAudit.totalPct = p;
    document.getElementById('finalTotalPct').innerText = p+'%'; document.getElementById('finalDeptName').innerText = currentAudit.dept;
    showScreen('finalReportScreen'); initSignaturePad();
}

async function saveFinalAudit() {
    if(!hasRole('auditor', 'admin')) { showToast('غير مصرح بحفظ المراجعات'); return; }
    if(!confirm("هل أنت متأكد من اعتماد وحفظ هذه المراجعة؟ سيتم إنشاء قائمة مهام تلقائية بالتحسينات.")) return;
    showToast('جاري معالجة البيانات وحفظ التقرير... ⏳');
    if(sigCanvas) currentAudit.signature = sigCanvas.toDataURL('image/jpeg', 0.8);
    let allImprovements = [];
    currentAudit.stepsOrder.forEach(step => { if(currentAudit.results[step] && currentAudit.results[step].improvements) { allImprovements.push(...currentAudit.results[step].improvements); } });
    if(allImprovements.length > 0) {
        let fId = uniqueNumericId().toString();
        let folderTask = { id: fId, isFolder: true, dept: currentAudit.dept, date: currentAudit.date, machine: currentAudit.machine || 'عام', task: `تحسينات مراجعة (${currentAudit.date})`, subTasks: allImprovements.map(imp => ({ text: imp, status: 'pending' })), status: 'pending' };
        await db.ref('tpm_system/tasks/' + fId).set(folderTask);
    }
    await db.ref('tpm_system/history/' + currentAudit.id).set(currentAudit);
    awardPoints(50, 'إتمام مراجعة رسمية');
    clearAuditDraft(); showToast('تم حفظ التقرير بنجاح ✅ جاري تحويلك للأرشيف...');
    setTimeout(() => { showScreen('historyScreen'); }, 1500);
}

function renderHistory() {
    let real = historyData.filter(h=>!h.stepsOrder.includes('ManualKaizen')).reverse();
    let html = real.map(a => {
        let controls = (hasRole('admin') || currentUser.name === a.auditor) ? `<div style="margin-top:12px; display:flex; gap:10px; border-top:1px dashed #cbd5e1; padding-top:12px;"><button class="btn btn-sm btn-outline flex-1" style="border-radius:8px; color:var(--primary); border-color:var(--primary);" onclick="event.stopPropagation(); editReport('${a.id}')">✏️ تعديل</button><button class="btn btn-sm btn-outline flex-1" style="border-radius:8px; color:var(--danger); border-color:var(--danger);" onclick="event.stopPropagation(); deleteReport('${a.id}')">🗑️ حذف</button></div>` : '';
        let color = a.totalPct >= 80 ? 'var(--success)' : (a.totalPct >= 50 ? 'var(--warning)' : 'var(--danger)');
        return `<div class="card glass-card" style="cursor:pointer; padding: 20px; border-right: 5px solid ${color}; transition: 0.3s;" onclick="viewDetailedReport('${a.id}')" onmouseover="this.style.transform='translateX(-5px)'" onmouseout="this.style.transform='translateX(0)'"><div style="display:flex; justify-content:space-between; align-items:center;"><div><h3 style="color:var(--text-main); font-weight:900; margin:0 0 5px; font-size:16px;">🏭 ${a.dept}</h3><div style="font-size:11px; color:var(--text-muted); font-weight:bold;"><span style="display:inline-block; margin-left:10px;">👤 ${a.auditor}</span><span style="display:inline-block; margin-left:10px;">📅 ${a.date}</span><span style="display:inline-block;">⚙️ ${a.machine || 'عام'}</span></div></div><div style="font-size:26px; font-weight:900; color:${color}; background:rgba(0,0,0,0.03); padding:5px 15px; border-radius:12px;">${a.totalPct}%</div></div>${controls}</div>`;
    }).join('');
    document.getElementById('historyListContainer').innerHTML = html || '<div style="text-align:center; padding:30px; color:var(--text-muted); font-weight:bold;">لا توجد تقارير في الأرشيف حالياً 📭</div>';
}

function deleteReport(id) { if(confirm('تأكيد الحذف النهائي للتقرير؟')) { deleteRecord('history/' + id); showToast('تم الحذف بنجاح'); } }
function editReport(id) { let rep = historyData.find(h => h.id === id); if(!rep) return; currentAudit = JSON.parse(JSON.stringify(rep)); currentAudit.currentStepIndex = 0; renderCurrentAuditStep(); }

function viewDetailedReport(id) {
    let a = historyData.find(h => h.id === id); if(!a) return;
    document.getElementById('detDept').innerText = a.dept; document.getElementById('detMachine').innerText = a.machine || 'عام'; document.getElementById('detAuditor').innerText = a.auditor; document.getElementById('detDate').innerText = a.date;
    const totalPct = a.totalPct || 0; document.getElementById('detPct').innerText = totalPct + '%';
    let grade = "ضعيف"; if (totalPct >= 90) grade = "ممتاز ⭐"; else if (totalPct >= 80) grade = "جيد جداً"; else if (totalPct >= 70) grade = "جيد"; else if (totalPct >= 50) grade = "مقبول";
    document.getElementById('detGrade').innerText = grade; document.getElementById('detGrade').style.color = totalPct >= 80 ? '#2e7d32' : (totalPct >= 50 ? '#f57f17' : '#c62828');
    let tableHtml = ''; let detailsHtml = '';
    a.stepsOrder.forEach(k => {
        let r = a.results[k]; if (!r) return;
        let p = r.skipped ? 0 : Math.round((r.score / r.max) * 100);
        let statusText = r.skipped ? 'تخطي' : `${r.score} / ${r.max}`;
        let pColor = p >= 80 ? '#059669' : (p >= 50 ? '#D97706' : '#DC2626');
        tableHtml += `<tr><td style="padding: 15px; border: 1px solid #CBD5E1; font-weight: 900; color: #1E3A8A; font-size: 15px;">${k}</td><td style="padding: 15px; border: 1px solid #CBD5E1; text-align: right; color: #111827; font-size: 15px; font-weight: 800; line-height: 1.6;">${AUDIT_DATA[k] ? AUDIT_DATA[k].name : '---'}</td><td style="padding: 15px; border: 1px solid #CBD5E1; font-weight: 900; color: #475569; font-size: 15px; font-family: Arial, sans-serif;">${statusText}</td><td style="padding: 15px; border: 1px solid #CBD5E1; font-weight: 900; color: ${pColor}; font-size: 18px; font-family: Arial, sans-serif;">${p}%</td></tr>`;
        if (!r.skipped) {
            let imps = (r.improvements && r.improvements.length > 0) ? r.improvements.map(i => `<div style="font-size:15px; margin-bottom:8px; color:#111827; padding-right:25px; position:relative; font-weight: 800; line-height: 1.8;"><span style="position:absolute; right:0; color:#D97706; font-size: 14px; top: 4px;">⏺</span>${i}</div>`).join('') : '<div style="color:#059669; font-weight:900; padding: 15px; background: #D1FAE5; border-radius: 8px; text-align: center; font-size: 15px;">🌟 أداء مثالي، لا توجد ملاحظات تحسينية</div>';
            let imgsHtml = ''; if(r.images) { Object.values(r.images).forEach(img => { if (img.data) imgsHtml += `<img src="${img.data}" style="height:120px; width:120px; object-fit:cover; margin:8px; border:2px solid #E2E8F0; border-radius:12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">`; }); }
            detailsHtml += `<div style="margin-bottom: 25px; padding: 25px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 16px; border-right: 5px solid ${pColor}; page-break-inside: avoid; box-shadow: 0 4px 6px rgba(0,0,0,0.02);"><div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px dashed #CBD5E1; margin-bottom:15px; padding-bottom:12px;"><b style="font-size:16px; color:#1E3A8A; font-weight: 900;">${k}: ${AUDIT_DATA[k].name}</b><b style="font-size:20px; color:${pColor}; background: #ffffff; padding: 6px 16px; border-radius: 10px; border: 1px solid #E2E8F0; font-family: Arial, sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">${p}%</b></div><div style="margin-bottom:15px; background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #E2E8F0;"><h4 style="margin:0 0 12px; color:#64748B; font-size:14px; font-weight: 900;">ملاحظات التدقيق وفرص التحسين:</h4>${imps}</div>${imgsHtml ? `<div style="background: #ffffff; padding: 15px; border-radius: 12px; border: 1px solid #E2E8F0; text-align: center;">${imgsHtml}</div>` : ''}</div>`;
        }
    });
    document.getElementById('detStepsTableBody').innerHTML = tableHtml; document.getElementById('detStepsContainer').innerHTML = detailsHtml;
    const sigDiv = document.getElementById('detSignatureImg');
    if (a.signature) { sigDiv.innerHTML = `<img src="${a.signature}" style="height:60px; max-width:150px; border-bottom:1px solid #000;">`; } else { sigDiv.innerHTML = '<div style="height:60px; color:#999; font-size:10px; padding-top:40px;">لا يوجد توقيع رقمي</div>'; }
    showScreen('detailedReportScreen');
}

function downloadProfessionalPDF() { window.scrollTo(0,0); const btns = document.querySelectorAll('#detailedReportScreen .no-print'); btns.forEach(b => b.style.display = 'none'); html2pdf().set({margin:0.2, filename:'تقرير_مراجعة.pdf', image:{type:'jpeg',quality:1}, html2canvas:{scale:2, useCORS:true}, jsPDF:{unit:'in', format:'a4', orientation:'portrait'}}).from(document.getElementById('printableReportArea')).save().then(()=>{ btns.forEach(b => b.style.display = ''); }); }
function shareWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent(window.currentReportText)}`); }

function renderTasks() {
    let htmlFolders = ''; const cols = { pending: '', progress: '', done: '' }; const counts = { pending: 0, progress: 0, done: 0 };
    let currentDeptTasks = tasksData.filter(t => t.dept === currentTaskDept);
    currentDeptTasks.forEach(t => {
        let deleteBtnHTML = hasRole('admin') ? `<button class="btn btn-sm btn-danger" style="padding:2px 8px; width:auto; margin:0;" onclick="deleteTask('${t.id}')">حذف 🗑️</button>` : '';
        if(t.isFolder) {
            let total = t.subTasks ? t.subTasks.length : 0; let done = t.subTasks ? t.subTasks.filter(s=>s.status==='done').length : 0;
            htmlFolders += `<div class="card glass-card" style="border-right: 4px solid var(--gold); margin-bottom:15px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><b style="color:var(--gold); font-size:13px;">مجلد: ${t.task}</b><div style="display:flex; gap:5px; align-items:center;"><span class="badge">${done}/${total}</span>${deleteBtnHTML}</div></div>${t.subTasks ? t.subTasks.map((s,i)=>`<div style="font-size:12px; padding:5px 0; border-bottom:1px dashed rgba(255,255,255,0.05);"><label style="cursor:pointer; display:flex; gap:8px; align-items:flex-start; ${s.status==='done'?'text-decoration:line-through; color:var(--text-muted);':''}"><input type="checkbox" style="margin-top:4px;" ${s.status==='done'?'checked':''} onclick="toggleFolderSubTask('${t.id}', ${i})"> <span style="flex:1; line-height:1.5;">${s.text}</span></label></div>`).join('') : ''}</div>`;
        } else {
            const status = t.status || 'pending'; counts[status]++;
            let actions = '';
            if(status === 'pending') actions = `<button class="btn btn-sm btn-warning flex-1" onclick="changeTaskStatus('${t.id}', 'progress')">بدء التنفيذ</button>`; else if(status === 'progress') actions = `<button class="btn btn-sm btn-success flex-1" onclick="changeTaskStatus('${t.id}', 'done')">إنجاز</button>`; else if(status === 'done') actions = `<button class="btn btn-sm btn-outline flex-1" onclick="changeTaskStatus('${t.id}', 'pending')">إعادة فتح</button>`;
            cols[status] += `<div class="kanban-item"><div style="font-weight:bold; margin-bottom:5px;">${t.task}</div>${t.image ? `<img src="${t.image}" style="width:100%; border-radius:8px; margin-bottom:8px; cursor:pointer; border:1px solid rgba(255,255,255,0.1);" onclick="window.open('${t.image}')">` : ''}<div style="font-size:10px; color:var(--text-muted);">${t.dept}</div><div class="kanban-actions">${actions}${hasRole('admin') ? `<button class="btn btn-sm btn-danger" onclick="deleteTask('${t.id}')">🗑️</button>` : ''}</div></div>`;
        }
    });
    ['pending', 'progress', 'done'].forEach(s => {
        const listEl = document.getElementById('kanban_' + s); const countEl = document.getElementById('count_' + s);
        if(listEl) listEl.innerHTML = cols[s] || '<div style="font-size:11px; color:var(--text-muted); text-align:center; padding:10px;">لا توجد مهام</div>';
        if(countEl) countEl.innerText = counts[s];
    });
    let fC = document.getElementById('auditFoldersContainer'); if(fC) fC.innerHTML = htmlFolders || '<div style="font-size:12px; color:var(--text-muted); text-align:center;">لا توجد مجلدات تحسين</div>';
    updateTasksDeptGrid();
}

function deleteTask(id) { if(confirm('⚠️ هل أنت متأكد من حذف هذه المهمة / المجلد نهائياً؟')) { deleteRecord('tasks/' + id); showToast('تم الحذف بنجاح 🗑️'); } }
function updateTasksDeptGrid() {
    let deptStats = {}; departments.forEach(d => deptStats[d] = { p:0 });
    let pendAll=0, progAll=0, doneAll=0;
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
    if(dG) { dG.innerHTML = departments.map(d => `<div class="card glass-card" style="padding:15px; text-align:center; cursor:pointer; border-right:4px solid ${deptStats[d].p>0?'var(--danger)':'var(--success)'};" onclick="openTasksDept('${d}')"><h4 style="color:var(--gold); margin:0;">${d}</h4><div style="font-size:11px; margin-top:5px; color:var(--text-main);">مهام نشطة: <b style="color:var(--danger);">${deptStats[d].p}</b></div></div>`).join(''); }
}

function openTasksDept(dept) { currentTaskDept = dept; document.getElementById('tasksDeptTitle').innerText = `مهام ${dept}`; document.getElementById('tasksMainView').style.display='none'; document.getElementById('tasksDeptView').style.display='block'; renderTasks(); }
function closeTasksDept() { currentTaskDept = null; document.getElementById('tasksDeptView').style.display='none'; document.getElementById('tasksMainView').style.display='block'; renderTasks(); }
function toggleFolderSubTask(fId, sIdx) { let f = tasksData.find(x=>x.id==fId); if(f) { f.subTasks[sIdx].status = f.subTasks[sIdx].status==='done'?'pending':'done'; syncRecord('tasks/' + fId, f); } }
function changeTaskStatus(id, st) { let t=tasksData.find(x=>x.id==id); if(t) {t.status=st; syncRecord('tasks/' + id, t);} }
function addManualTaskDept() { let v=document.getElementById('newTaskInput').value; if(v){ let id = uniqueNumericId().toString(); syncRecord('tasks/' + id, {id:id, task:v, dept:currentTaskDept, status:'pending'}); document.getElementById('newTaskInput').value=''; showToast('تمت الإضافة'); } }

function handleKaizenImage(e, type) { const f=e.target.files[0]; if(!f) return; showToast('جاري تحضير الصورة...'); processAndEnhanceImage(f, function(dataUrl) { kaizenImgs[type] = dataUrl; document.getElementById(type==='before'?'kaizenBeforePreview':'kaizenAfterPreview').innerHTML=`<span style="color:var(--success); font-size:11px; font-weight:bold;">تم الإرفاق</span>`; }); }
function submitManualKaizen() {
    let t = document.getElementById('newKaizenTitle').value; let d = document.getElementById('newKaizenDept').value;
    if(!t || !kaizenImgs.before || !kaizenImgs.after) { showToast('برجاء كتابة الوصف وإرفاق الصورتين'); return; }
    document.getElementById('submitKaizenBtn').innerText = "جاري الدمج والرفع..."; document.getElementById('submitKaizenBtn').disabled = true;
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const imgBefore = new Image(); const imgAfter = new Image();
    imgBefore.onload = function() {
        imgAfter.onload = async function() {
            canvas.width = 600; canvas.height = 300; ctx.fillStyle = "#111d33"; ctx.fillRect(0,0,600,300); ctx.drawImage(imgBefore, 0, 0, 295, 300); ctx.drawImage(imgAfter, 305, 0, 295, 300);
            ctx.fillStyle = "#d4af37"; ctx.beginPath(); ctx.moveTo(280, 150); ctx.lineTo(320, 130); ctx.lineTo(320, 170); ctx.fill(); ctx.fillStyle = "rgba(198,40,40,0.85)"; ctx.fillRect(10, 10, 50, 25); ctx.fillStyle = "white"; ctx.font = "bold 14px Cairo"; ctx.fillText("قبل", 22, 27); ctx.fillStyle = "rgba(46,125,50,0.85)"; ctx.fillRect(540, 10, 50, 25); ctx.fillStyle = "white"; ctx.font = "bold 14px Cairo"; ctx.fillText("بعد", 552, 27);
            const mergedB64 = canvas.toDataURL('image/jpeg', 0.8); const uploadedUrl = await uploadImageToStorage(mergedB64);
            if (uploadedUrl) {
                let kId = uniqueNumericId().toString(); syncRecord('history/' + kId, { id: kId, dept: d, auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG'), stepsOrder: ['ManualKaizen'], totalPct: 100, results: { 'ManualKaizen': { images: { 'img_1': { title: t, data: uploadedUrl } } } } });
                document.getElementById('newKaizenTitle').value = ''; document.getElementById('kaizenBeforePreview').innerHTML = ''; document.getElementById('kaizenAfterPreview').innerHTML = ''; kaizenImgs = { before: null, after: null }; document.getElementById('kaizenUploadModal').style.display = 'none'; awardPoints(40, 'مشاركة كايزن'); showToast('تم نشر الكايزن بنجاح');
            } else { showToast('فشل الرفع، راجع مفتاح ImgBB'); }
            document.getElementById('submitKaizenBtn').innerText = "دمج واعتماد"; document.getElementById('submitKaizenBtn').disabled = false;
        }; imgAfter.src = kaizenImgs.after;
    }; imgBefore.src = kaizenImgs.before;
}

function renderKaizenFeed() {
    let c = document.getElementById('kaizenFeedContainer'); if(!c) return; let selectedDept = document.getElementById('kaizenDeptSelect').value;
    let html = historyData.filter(h=>h.stepsOrder.includes('ManualKaizen') && (selectedDept === 'الكل' || h.dept === selectedDept)).reverse().map(k=> {
        let lId = k.id; let liked = likesData[lId] && likesData[lId].includes(currentUser.name); let canEdit = hasRole('admin') || currentUser.name === k.auditor; let controls = canEdit ? `<button class="btn btn-sm btn-warning flex-1" onclick="editKaizen('${k.id}')">تعديل</button><button class="btn btn-sm btn-danger flex-1" onclick="deleteKaizen('${k.id}')">حذف</button>` : ''; let comments = kaizenComments[lId] || []; let commentsHtml = comments.map(cm => `<div class="comment-box"><b style="color:var(--gold);">${cm.user}:</b> ${cm.text} <span style="font-size:9px; color:var(--text-muted); float:left;">${cm.date}</span></div>`).join('');
        return `<div class="kaizen-post"><div style="display:flex; justify-content:space-between;"><b>${k.auditor}</b><span style="font-size:11px; color:var(--text-muted);">${k.dept} | ${k.date}</span></div><img src="${k.results.ManualKaizen.images.img_1.data}" class="kaizen-img"><b style="font-size:15px;">${k.results.ManualKaizen.images.img_1.title}</b><div class="row-flex" style="margin-top:10px;"><button class="btn btn-sm ${liked?'btn-success':'btn-outline'} flex-1" onclick="toggleKaizenLike('${lId}')">إعجاب (${likesData[lId]?likesData[lId].length:0})</button>${controls}</div><div style="margin-top: 15px; border-top: 1px dashed var(--copper); padding-top: 10px;"><div style="max-height: 120px; overflow-y: auto; margin-bottom: 10px;">${commentsHtml || '<div style="font-size:11px; text-align:center; color:var(--text-muted);">لا توجد تعليقات</div>'}</div><div class="row-flex"><input type="text" id="comment_input_${lId}" class="form-control flex-2" placeholder="اكتب تعليقاً..." style="margin:0;"><button class="btn btn-primary btn-sm flex-1" style="margin:0;" onclick="addKaizenComment('${lId}')">إرسال</button></div></div></div>`;
    }).join('');
    c.innerHTML = html || '<div style="text-align:center; color:var(--text-muted);">لا توجد مشاركات</div>';
}

function toggleKaizenLike(id) { if(!likesData[id]) likesData[id]=[]; let i=likesData[id].indexOf(currentUser.name); if(i>-1) likesData[id].splice(i,1); else likesData[id].push(currentUser.name); syncRecord('likes/' + id, likesData[id]); }
function deleteKaizen(id) { if(confirm('تأكيد مسح الكايزن؟')) { deleteRecord('history/' + id); showToast('تم الحذف'); } }
function editKaizen(id) { let k=historyData.find(x=>x.id===id); if(!k) return; let v=prompt('تعديل الوصف:', k.results.ManualKaizen.images.img_1.title); if(v) { k.results.ManualKaizen.images.img_1.title=sanitizeInput(v); syncRecord('history/' + id, k); showToast('تم التعديل'); } }
function addKaizenComment(id) { let el=document.getElementById(`comment_input_${id}`); let txt=sanitizeInput(el.value); if(!txt) return; if(!kaizenComments[id]) kaizenComments[id]=[]; kaizenComments[id].push({user:currentUser.name, text:txt, date:new Date().toLocaleTimeString('ar-EG')}); syncRecord('kaizenComments/' + id, kaizenComments[id]); el.value=''; awardPoints(2, 'كتابة تعليق'); }

function handleTagImage(e) { const f=e.target.files[0]; if(!f) return; showToast('جاري تحضير الصورة...'); processAndEnhanceImage(f, function(dataUrl) { currentTagImg=dataUrl; document.getElementById('tagImagePreview').innerHTML=`<span style="color:var(--success); font-size:11px; font-weight:bold;">مُجهزة للرفع</span>`; }); }
async function addNewTag() {
    let d=document.getElementById('newTagDesc').value, c=document.getElementById('newTagColor').value, dp=document.getElementById('newTagDept').value, m=document.getElementById('newTagMachine').value, sp=document.getElementById('newTagSpareParts').value;
    if(!d) { showToast('أدخل وصف المشكلة'); return; }
    let fullDesc = sp ? `${d} [أجزاء: ${sp}]` : d; let uploadedUrl = null;
    if (currentTagImg) { showToast('جاري رفع التاج والصورة... ⏳'); uploadedUrl = await uploadImageToStorage(currentTagImg); if(!uploadedUrl) { showToast('⚠️ فشل رفع الصورة (تأكد من مفتاح ImgBB). سيتم حفظ التاج كنص فقط.'); } }
    let tId = uniqueNumericId().toString(); syncRecord('tags/' + tId, {id:tId, desc:fullDesc, color:c, dept:dp, machine:m, image:uploadedUrl, status:'open', auditor:currentUser.name, date:new Date().toLocaleDateString('ar-EG'), timestamp: Date.now()});
    document.getElementById('newTagDesc').value=''; document.getElementById('newTagMachine').value=''; document.getElementById('newTagSpareParts').value=''; currentTagImg = null; let preview = document.getElementById('tagImagePreview'); if(preview) preview.innerHTML = '';
    awardPoints(10, 'إصدار تاج جديد'); if(uploadedUrl || !currentTagImg) showToast('تم إصدار التاج بنجاح ✅');
    if(c==='red' && document.getElementById('newTagEngineer') && document.getElementById('newTagEngineer').value) window.open(`https://wa.me/${document.getElementById('newTagEngineer').value.replace(/\D/g,'')}?text=${encodeURIComponent(`إشعار عطل (تاج أحمر)\nالقسم: ${dp}\nالماكينة: ${m||'عام'}\nالوصف: ${fullDesc}`)}`);
}

function renderTags() {
    let rc = document.getElementById('redTagsContainer'); let bc = document.getElementById('blueTagsContainer'); if(!rc || !bc) return;
    let fDept = document.getElementById('filterTagDept').value; let fMach = document.getElementById('filterTagMachine').value.trim().toLowerCase(); let fStatus = document.getElementById('filterTagStatus') ? document.getElementById('filterTagStatus').value : 'active';
    let redHtml = '', blueHtml = ''; let currentTime = Date.now(); const THREE_DAYS_MS = 259200000;
    tagsData.forEach(t => {
        if(fDept !== 'الكل' && t.dept !== fDept) return; if(fMach !== '' && (!t.machine || !t.machine.toLowerCase().includes(fMach))) return;
        let isClosed = (t.status === 'closed'); if(fStatus === 'active' && isClosed) return; if(fStatus === 'closed' && !isClosed) return;
        let isAged = false; if(!isClosed && t.timestamp && (currentTime - t.timestamp > THREE_DAYS_MS)) { isAged = true; }
        let canEdit = hasRole('admin', 'auditor') || currentUser.name === t.auditor;
        let controls = canEdit ? `<select class="form-control flex-2" style="font-size:11px; padding:4px; margin:0;" onchange="updateTagState('${t.id}', this.value)"><option value="open" ${t.status==='open'?'selected':''}>مفتوح ⏳</option><option value="progress" ${t.status==='progress'?'selected':''}>جاري 🛠️</option><option value="review" ${t.status==='review'?'selected':''}>مراجعة 👁️</option><option value="closed" ${t.status==='closed'?'selected':''}>مغلق ✅</option></select><button class="btn btn-sm btn-outline flex-1" style="margin:0; padding:4px;" onclick="editTag('${t.id}')">تعديل</button><button class="btn btn-sm btn-danger" style="margin:0; padding:4px; width:auto;" onclick="deleteTag('${t.id}')">🗑️</button>` : `<span style="font-size:11px; font-weight:bold; color:var(--gold); padding:4px; background:rgba(0,0,0,0.2); border-radius:5px;">الحالة: ${t.status}</span>`;
        let ticketClass = t.color === 'red' ? 'ticket-red' : 'ticket-blue'; let warningBadge = isAged ? `<div class="aging-warning">متأخر حرج</div>` : '';
        let cardHtml = `<div class="tag-ticket ${ticketClass}">${warningBadge} <div class="ticket-header"><div class="ticket-title">${t.desc}</div></div><div class="ticket-meta">🏭 ${t.dept} ${t.machine ? ' | ⚙️ ' + t.machine : ''}<br>👤 ${t.auditor} | 📅 ${t.date}</div>${t.image ? `<img src="${t.image}" class="ticket-img" title="اضغط لتكبير الصورة" onclick="window.open('${t.image}', '_blank')">` : ''}<div class="row-flex" style="margin-top:10px; border-top:1px dashed rgba(255,255,255,0.1); padding-top:10px;">${controls}</div></div>`;
        if(t.color === 'red') redHtml += cardHtml; else blueHtml += cardHtml;
    });
    rc.innerHTML = redHtml || '<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:15px;">لا توجد تاجات صيانة مطابقة</div>';
    bc.innerHTML = blueHtml || '<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:15px;">لا توجد تاجات إنتاج مطابقة</div>';
}
function updateTagState(id, st) { let t=tagsData.find(x=>x.id==id); if(t) {t.status=st; syncRecord('tags/' + id, t); if(st==='closed') awardPoints(20, 'إغلاق تاج');} }
function deleteTag(id) { if(confirm('تأكيد حذف التاج نهائياً؟')) { deleteRecord('tags/' + id); showToast('تم الحذف'); } }
function editTag(id) { let t=tagsData.find(x=>x.id==id); if(!t) return; let v=prompt('تعديل وصف المشكلة:', t.desc); if(v) { t.desc=sanitizeInput(v); syncRecord('tags/' + id, t); showToast('تم التعديل'); } }

function saveApiKeys() { globalApiKeys.imgbb = document.getElementById('imgbbKeyInput').value.trim(); globalApiKeys.gemini = document.getElementById('geminiKeyInput').value.trim(); document.getElementById('imgbbKeyInput').disabled = true; document.getElementById('geminiKeyInput').disabled = true; syncRecord('api_keys', globalApiKeys); showToast('تم حفظ وتأمين المفاتيح المركزية'); }
function enableApiKeysEdit() { document.getElementById('imgbbKeyInput').disabled = false; document.getElementById('geminiKeyInput').disabled = false; showToast('الحقول جاهزة للتعديل'); }

// ==========================================
// 🛡️ معالجة الأذونات (استكمال الجزء المحذوف)
// ==========================================
async function saveUserPermissions() {
    if (!editingUserUid) return;
    const pages = ['homeScreen', 'tasksScreen', 'historyScreen', 'kaizenScreen', 'tagsScreen', 'knowledgeScreen'];
    let newPerms = {};
    pages.forEach(p => {
        let sel = document.getElementById('perm_' + p);
        if (sel) newPerms[p] = sel.value;
    });
    await db.ref(`tpm_system/users/${editingUserUid}/permissions`).set(newPerms);
    showToast('تم تحديث الأذونات بنجاح');
    document.getElementById('permissionsModal').style.display = 'none';
}

let currentKbFilter = 'الكل';
function filterCat(cat, btn) {
    currentKbFilter = cat;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderKnowledgeShelves(); 
}
function filterLibrary() { renderKnowledgeShelves(); }

// ==========================================
// 👷‍♂️ محرك بوابة الصيانة الذاتية (JH Portal Engine)
// ==========================================
let currentJHDept = null;
let jhDocumentsData = {};

function showJHPortal() {
    currentJHDept = null;
    document.getElementById('jhToolbox').style.display = 'none';
    let grid = departments.map(d => `
        <div class="card glass-card" style="padding:15px; text-align:center; cursor:pointer; border-right:4px solid var(--success);" onclick="selectJHDept('${d}')">
            <b style="color:var(--gold); font-size:13px;">🏭 ${d}</b>
        </div>
    `).join('');
    document.getElementById('jhDeptGrid').innerHTML = grid;
    showScreen('jhPortalScreen');
}

function selectJHDept(dept) {
    currentJHDept = dept;
    document.getElementById('selectedJHDeptTitle').innerText = `داشبورد قسم: ${dept}`;
    const deptAudits = historyData.filter(h => h.dept === dept && !h.stepsOrder.includes('ManualKaizen'));
    const lastScore = deptAudits.length > 0 ? deptAudits[deptAudits.length - 1].totalPct : 0;
    document.getElementById('deptAuditScore').innerText = lastScore + '%';
    const deptTags = tagsData.filter(t => t.dept === dept);
    const openTags = deptTags.filter(t => t.status !== 'done' && t.status !== 'closed').length;
    document.getElementById('deptOpenTags').innerText = openTags;
    let calculatedOEE = Math.max(0, Math.round((lastScore * 0.95) - (openTags * 1.5)));
    if (deptAudits.length === 0) calculatedOEE = 0;
    const oeeEl = document.getElementById('deptOEE');
    oeeEl.innerText = calculatedOEE + '%';
    const goalEl = document.getElementById('deptGoalDisplay');
    if (deptGoalsData[dept]) {
        goalEl.style.display = 'block';
        goalEl.innerHTML = `🎯 المستهدف الشهري للكفاءة: <b style="font-size:14px;">${deptGoalsData[dept]}%</b>`;
        oeeEl.style.color = calculatedOEE >= deptGoalsData[dept] ? 'var(--success)' : '#00BCD4';
    } else {
        goalEl.style.display = 'none';
        oeeEl.style.color = '#00BCD4';
    }
    const ctx = document.getElementById('jhMiniTrendChart');
    if (ctx) {
        if (jhMiniChartInstance) jhMiniChartInstance.destroy();
        let last5Audits = deptAudits.slice(-5);
        let labels = last5Audits.map(a => a.date.split('/')[0] + '/' + a.date.split('/')[1]);
        let data = last5Audits.map(a => a.totalPct);
        jhMiniChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.length > 0 ? labels : ['-'],
                datasets: [{ label: 'كفاءة JH %', data: data.length > 0 ? data : [0], borderColor: '#d4af37', backgroundColor: 'rgba(212, 175, 55, 0.1)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false, min: 0, max: 100 }, x: { ticks: { color: '#bdae93', font: {size: 8} }, grid: {display: false} } }, plugins: { legend: { display: false } } }
        });
    }
    renderInternalDeptLeaderboard(dept);
    document.getElementById('jhToolbox').style.display = 'block';
    window.scrollTo({ top: document.getElementById('jhToolbox').offsetTop - 20, behavior: 'smooth' });
}

function setDeptGoal() {
    if(!currentJHDept) return;
    let currentGoal = deptGoalsData[currentJHDept] || 85;
    let newGoal = prompt(`أدخل النسبة المئوية للمستهدف (Target OEE) لقسم ${currentJHDept}:\n(مثال: 85)`, currentGoal);
    if (newGoal && !isNaN(newGoal) && newGoal > 0 && newGoal <= 100) {
        syncRecord(`dept_goals/${currentJHDept}`, parseInt(newGoal));
        showToast('تم تحديث المستهدف بنجاح 🎯 وسينعكس فوراً للجميع.');
    } else if (newGoal) { showToast('يرجى إدخال رقم صحيح بين 1 و 100'); }
}

function renderInternalDeptLeaderboard(dept) {
    const container = document.getElementById('deptInternalLeaderboard');
    if(!container) return;
    let deptUsers = [];
    for (let uid in usersData) {
        if(usersData[uid].dept === dept) {
            deptUsers.push({ name: usersData[uid].name, points: userPoints[uid] || 0, avatar: usersData[uid].avatar });
        }
    }
    deptUsers.sort((a,b) => b.points - a.points);
    container.innerHTML = deptUsers.slice(0, 3).map((u, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:5px 10px; border-radius:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-weight:900; color:var(--gold); font-style:italic;">#${idx+1}</span>
                <img src="${u.avatar || 'https://ui-avatars.com/api/?name='+u.name}" style="width:20px; height:20px; border-radius:50%;">
                <span style="font-size:11px;">${u.name}</span>
            </div>
            <span style="font-size:11px; font-weight:bold; color:var(--success);">${u.points} <small>نقطة</small></span>
        </div>
    `).join('') || '<div style="font-size:10px; color:var(--text-muted); text-align:center;">لا يوجد أعضاء مسجلين بهذا القسم بعد</div>';
}

function startNewAuditFlowFromPortal() { currentViewedDept = currentJHDept; startNewAuditFlow(); }

async function openJHDocument(type) {
    const headerMap = { 'SOC': '🧗‍♂️ حصر الأماكن صعبة الوصول (SOC)', 'Safety': '⚠️ حصر الأماكن غير الآمنة (Safety Map)', 'Anatomy': '⚙️ تشريح وشرح أجزاء الماكينة' };
    document.getElementById('jhDocHeader').innerText = headerMap[type];
    renderJHDocForm(type);
    showToast('جاري تحميل السجلات... ⏳');
    const snap = await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}`).once('value');
    let records = snap.val() ? Object.values(snap.val()) : [];
    renderJHDocList(type, records);
    showScreen('jhDocumentScreen');
}

function renderJHDocForm(type) {
    let formHtml = '';
    if(type === 'SOC') {
        formHtml = `<h4 style="margin:0 0 10px; color:var(--gold);">تسجيل مكان صعب جديد</h4><input type="text" id="socLocation" class="form-control" placeholder="المكان (مثال: خلف الطلمبة 1)"><input type="text" id="socReason" class="form-control" placeholder="سبب الصعوبة (ضيق، حرارة..)"><button class="btn btn-warning full-width" onclick="saveJHRecord('SOC')">➕ إضافة للسجل</button>`;
    } else if(type === 'Safety') {
        formHtml = `<h4 style="margin:0 0 10px; color:var(--danger);">تسجيل خطر أمان</h4><input type="text" id="safeHazard" class="form-control" placeholder="وصف الخطر (سلك مكشوف، مسمار بارز)"><select id="safeLevel" class="form-control"><option value="high">خطر حرج 🔴</option><option value="med">خطر متوسط 🟡</option></select><button class="btn btn-danger full-width" onclick="saveJHRecord('Safety')">➕ تسجيل الخطر</button>`;
    } else {
        formHtml = `<h4 style="margin:0 0 10px; color:var(--gold);">إضافة شرح جزء</h4><input type="text" id="partName" class="form-control" placeholder="اسم الجزء"><textarea id="partDesc" class="form-control" placeholder="وظيفة الجزء وكيفية فحصه"></textarea><button class="btn btn-primary full-width" onclick="saveJHRecord('Anatomy')">💾 حفظ البيانات</button>`;
    }
    document.getElementById('jhDocActionArea').innerHTML = formHtml;
}

async function saveJHRecord(type) {
    let data = { id: uniqueNumericId().toString(), date: new Date().toLocaleDateString('ar-EG'), user: currentUser.name };
    if(type === 'SOC') { data.location = document.getElementById('socLocation').value; data.reason = document.getElementById('socReason').value; if(!data.location) return;
    } else if(type === 'Safety') { data.hazard = document.getElementById('safeHazard').value; data.level = document.getElementById('safeLevel').value; if(!data.hazard) return;
    } else { data.name = document.getElementById('partName').value; data.desc = document.getElementById('partDesc').value; if(!data.name) return; }
    await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}/${data.id}`).set(data);
    showToast('تم تحديث السجل الفني بنجاح ✅');
    openJHDocument(type);
}

function renderJHDocList(type, records) {
    let html = records.reverse().map(r => `
        <div class="item-row" style="border-right-color:${type==='Safety'?'var(--danger)':'var(--gold)'};">
            <div style="flex:1;"><b>${r.location || r.hazard || r.name}</b><br><small style="color:var(--text-muted);">${r.reason || r.level || r.desc}</small></div>
            <div style="text-align:left;"><small style="font-size:9px;">${r.date}</small><br>${hasRole('admin') ? `<button class="btn btn-sm btn-danger" style="padding:2px 5px; margin:0;" onclick="deleteJHRecord('${type}','${r.id}')">🗑️</button>` : ''}</div>
        </div>`).join('');
    document.getElementById('jhDocListContainer').innerHTML = html || '<div style="text-align:center; padding:20px; color:var(--text-muted);">لا توجد سجلات مسجلة لهذا القسم</div>';
}

async function deleteJHRecord(type, id) {
    if(confirm('حذف هذا السجل؟')) {
        await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}/${id}`).remove();
        openJHDocument(type);
    }
}

// ==========================================
// 🤖 المستشار الذكي، المكتبة، والذكاء الاصطناعي (الإصدار الذهبي - بدون أخطاء)
// ==========================================

async function fetchAI(prompt) {
    const k = globalApiKeys.gemini || (window.__TPM_CONFIG__ && window.__TPM_CONFIG__.geminiApiKey);
    if (!k) throw new Error("مفتاح Gemini مفقود!");

    let contents = [{ parts: [{ text: prompt }] }];
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${k}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.candidates || !data.candidates[0].content) throw new Error("إجابة فارغة من الذكاء الاصطناعي");

    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
    return text;
}

async function explainItem(t) {
    document.getElementById('aiModal').style.display='flex'; 
    document.getElementById('aiModalText').innerHTML = '<div style="text-align:center; padding:30px;">جاري الشرح... ⏳</div>';
    
    try {
        let prompt = `أنت مهندس صيانة خبير. اشرح هذا البند باختصار وفي خطوات عملية: "${t}". أجب بنص منسق باستخدام <b> و <br> فقط بدون علامات markdown.`;
        let ans = await fetchAI(prompt);
        document.getElementById('aiModalText').innerHTML = `<div style="font-size:14px; line-height:1.8; text-align:right;">${ans}</div>`;
    } catch(e) {
        document.getElementById('aiModalText').innerHTML = `<div style="color:red; text-align:center; padding:20px;">⚠️ خطأ: ${e.message}</div>`;
    }
}

window.askFactoryAI = async function() {
    const q = document.getElementById('kbSearchInput').value.trim();
    if(!q) return showToast('اكتب سؤالك أولاً!');
    
    document.getElementById('aiSearchResponse').style.display = 'block';
    if(document.getElementById('oplBtnContainer')) document.getElementById('oplBtnContainer').style.display = 'none';
    document.getElementById('aiResponseText').innerHTML = '<div style="text-align:center; color:var(--gold); font-weight:bold;">جاري استشارة الذكاء الاصطناعي... ⏳</div>';
    
    try {
        let prompt = `أنت مستشار فني. أجب على هذا السؤال من الفنيين بشكل عملي وواضح: "${q}". أجب بنص منسق باستخدام <b> و <br> فقط بدون علامات markdown.`;
        let answer = await fetchAI(prompt);
        document.getElementById('aiResponseText').innerHTML = `<div style="color:var(--gold); font-weight:bold; margin-bottom:10px;">💡 إجابة الخبير:</div>${answer}`;
        window.lastAIAnswer = answer;
        if(document.getElementById('oplBtnContainer')) document.getElementById('oplBtnContainer').style.display = 'block';
    } catch(e) { 
        document.getElementById('aiResponseText').innerHTML = `<b style="color:var(--danger);">⚠️ ${e.message}</b>`; 
    }
};

window.generateTPMQuiz = async function() {
    const topic = prompt("أدخل موضوع الاختبار الفني:");
    if(!topic) return;
    
    document.getElementById('aiSearchResponse').style.display = 'block';
    if(document.getElementById('oplBtnContainer')) document.getElementById('oplBtnContainer').style.display = 'none';
    document.getElementById('aiResponseText').innerHTML = '<div style="text-align:center; color:var(--gold); font-weight:bold;">جاري تصميم الاختبار... ⏳</div>';
    
    try {
        let prompt = `قم بإعداد اختبار فني من 3 أسئلة حول: ${topic}. أجب بنص منسق باستخدام <b> و <br> فقط بدون علامات markdown.`;
        let answer = await fetchAI(prompt);
        document.getElementById('aiResponseText').innerHTML = `<div style="color:var(--gold); font-weight:bold; margin-bottom:10px;">📝 الاختبار الفني:</div>${answer}`;
    } catch(e) { 
        document.getElementById('aiResponseText').innerHTML = `<b style="color:var(--danger);">⚠️ ${e.message}</b>`; 
    }
};

window.convertAIToOPL = function() {
    if (!window.lastAIAnswer) return showToast("لا توجد إجابة لتحويلها!");
    document.getElementById('oplModal').style.display = 'flex';
    document.getElementById('oplTitle').value = "درس نقطة واحدة: " + (document.getElementById('kbSearchInput') ? document.getElementById('kbSearchInput').value.substring(0, 20) : '');
    document.getElementById('oplDesc').value = window.lastAIAnswer.replace(/<[^>]*>?/gm, '');
};

let tempBase64Pdf = null;
window.handleMaterialUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert("⚠️ أقصى حجم للملف 5 ميجابايت.");
    
    document.getElementById('pdfExtractStatus').innerText = "جاري التجهيز... ⏳";
    const reader = new FileReader();
    reader.onload = function(e) {
        tempBase64Pdf = e.target.result;
        document.getElementById('pdfExtractStatus').innerHTML = `✅ تم التجهيز: <b style="color:var(--primary);">${file.name}</b>`;
    };
    reader.readAsDataURL(file);
};

window.saveNewBook = async function() {
    const title = document.getElementById('kbTitle').value;
    if (!title) return showToast("⚠️ يرجى إدخال عنوان المرجع.");
    
    let bookId = Date.now().toString();
    let catEl = document.getElementById('kbCategory');
    let cat = catEl ? catEl.value : 'TPM';
    let newBook = { id: bookId, title: title, category: cat, hasPdf: !!tempBase64Pdf };
    
    if(tempBase64Pdf) {
        showToast("جاري الرفع لقاعدة البيانات... ⏳");
        try { 
            await db.ref('tpm_system/pdf_files/' + bookId).set({ base64: tempBase64Pdf }); 
        } catch(e) { 
            return alert("⚠️ فشل رفع الملف."); 
        }
    }
    
    let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {});
    kbArray.push(newBook);
    knowledgeBaseData = kbArray;
    syncRecord('knowledgeBase', knowledgeBaseData);
    
    document.getElementById('addBookModal').style.display = 'none';
    document.getElementById('kbTitle').value = '';
    let statusEl = document.getElementById('pdfExtractStatus');
    if (statusEl) statusEl.innerText = "اضغط هنا لرفع الكتالوج 📄";
    tempBase64Pdf = null;
    
    showToast("✅ تم حفظ المرجع بنجاح!");
    window.renderKnowledgeShelves();
};

window.renderKnowledgeShelves = function() {
    const container = document.getElementById('knowledgeListContainer');
    if(!container) return;
    
    let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {});
    
    if(kbArray.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted); font-weight:bold;">لا توجد مراجع حالياً 📚</div>';
        return;
    }
    
    container.innerHTML = kbArray.map(kb => `
        <div class="book-cover">
            <div><div class="book-tag">${kb.category || 'TPM'}</div><div class="book-title-main">${kb.title}</div></div>
            <div style="display:flex; gap:5px; margin-top:15px;">
                <button class="btn btn-sm btn-primary" style="flex:2;" onclick="openBookDetail('${kb.id}')">📖 عرض</button>
                ${(currentUser && currentUser.role === 'admin') ? `<button class="btn btn-sm btn-danger" style="flex:1;" onclick="deleteKnowledgeBook('${kb.id}')">🗑️</button>` : ''}
            </div>
        </div>
    `).join('');
};

window.openBookDetail = async function(id) {
    let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {});
    let kb = kbArray.find(x => x.id == id);
    if(!kb) return;
    
    if(kb.hasPdf) {
        document.getElementById('aiModal').style.display = 'flex';
        document.getElementById('aiModalText').innerHTML = '<div style="padding:20px; text-align:center; color:var(--gold); font-weight:bold;">جاري جلب الملف من السيرفر... ⏳</div>';
        try {
            let snap = await db.ref('tpm_system/pdf_files/' + id).once('value');
            if(snap.val() && snap.val().base64) {
                const b64 = snap.val().base64.split(',')[1] || snap.val().base64;
                const bin = atob(b64);
                const arr = new Uint8Array(bin.length);
                for(let i=0; i<bin.length; i++) arr[i] = bin.charCodeAt(i);
                const blob = new Blob([arr], {type: 'application/pdf'});
                const url = URL.createObjectURL(blob);
                
                window.open(url, '_blank');
                document.getElementById('aiModal').style.display = 'none';
            } else { 
                alert("الملف غير متوفر حالياً على السيرفر."); 
                document.getElementById('aiModal').style.display = 'none'; 
            }
        } catch(e) { 
            alert("خطأ في الاتصال بقاعدة البيانات."); 
            document.getElementById('aiModal').style.display = 'none'; 
        }
    } else {
        alert("هذا المرجع لا يحتوي على ملف PDF.");
    }
};

window.deleteKnowledgeBook = async function(id) {
    if(confirm("⚠️ هل أنت متأكد من الحذف النهائي؟")) {
        let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {});
        knowledgeBaseData = kbArray.filter(b => b.id != id);
        syncRecord('knowledgeBase', knowledgeBaseData);
        try { await db.ref('tpm_system/pdf_files/' + id).remove(); } catch(e){}
        window.renderKnowledgeShelves();
        showToast("تم الحذف بنجاح 🗑️");
    }
};

window.runAIVision = async function(itemId, itemTitle) {
    let imgObj = currentStepImages['img_' + itemId]; if(!imgObj) return showToast('لا توجد صورة');
    document.getElementById('aiModalText').innerHTML = "<div style='text-align:center;'>جاري فحص الصورة... ⏳</div>"; 
    document.getElementById('aiModal').style.display = 'flex';
    try {
        let base64Img = await getBase64FromUrl(imgObj.data);
        const key = globalApiKeys.gemini || (window.__TPM_CONFIG__ && window.__TPM_CONFIG__.geminiApiKey);
        if (!key) throw new Error("مفتاح Gemini مفقود!");
        
        let contents = [{ parts: [{ text: `حلل هذه الصورة لبند: "${itemTitle}". ماذا ترى؟ أجب بنص منسق باستخدام <b> و <br> فقط بدون علامات markdown.` }, { inline_data: { mime_type: "image/jpeg", data: base64Img } }] }];
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        let text = data.candidates[0].content.parts[0].text;
        text = text.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
        document.getElementById('aiModalText').innerHTML = text;
    } catch(e) { document.getElementById('aiModalText').innerHTML = `<div style="color:red; text-align:center;">خطأ: ${e.message}</div>`; }
};

window.predictMachineFailures = async function() {
    const r = document.getElementById('aiPredictionResult'); r.style.display='block'; r.innerText='جاري التحليل... ⏳';
    try {
        let prompt = "بناء على التاجات: " + tagsData.map(t=>t.desc).join(',') + " توقع الماكينات المعرضة للتوقف. أجب بنص منسق باستخدام <b> و <br> فقط بدون علامات markdown.";
        let ans = await fetchAI(prompt);
        r.innerHTML = ans;
    } catch(e) { r.innerHTML = `<span style="color:red;">خطأ: ${e.message}</span>`; }
};
