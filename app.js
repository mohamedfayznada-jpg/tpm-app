// ==========================================
// 🚀 FACTORY OS - V5.0 (INDUSTRIAL GRADE)
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
    // 1. حماية الصلاحيات أولاً
    if (screenId !== 'loginScreen' && screenId !== 'signupScreen' && !canAccess(screenId)) {
        return showToast("عذراً، لا تملك صلاحية الدخول لهذه الصفحة.");
    }
    
    // 2. تسجيل مسار التصفح عشان زرار "الرجوع" يشتغل صح
    if (screenHistory[screenHistory.length - 1] !== screenId) {
        screenHistory.push(screenId);
    }
    
    // 3. عرض الشاشة
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    let target = document.getElementById(screenId);
    if(target) target.classList.add('active');
    window.scrollTo(0,0);
}

function goBack() {
    if (screenHistory.length > 1) {
        screenHistory.pop(); // مسح الشاشة الحالية
        let lastScreen = screenHistory[screenHistory.length - 1];
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        let target = document.getElementById(lastScreen);
        if(target) target.classList.add('active');
        window.scrollTo(0,0);
    } else {
        showScreen('homeScreen'); // لو مفيش تاريخ، نرجع للرئيسية
    }
}
// ------------------------------------------
// 🛡️ أدوات النظام والتنبيهات (Utilities)
// ------------------------------------------
function hasRole(...allowed) { return currentUser && currentUser.role && allowed.includes(currentUser.role); }
// 🛡️ دالة التعقيم المحسنة (لمنع الاختراق)
function sanitizeInput(val) { 
    if (!val) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(val));
    return div.innerHTML.trim(); 
}
function uniqueNumericId() { return (Date.now() * 1000) + Math.floor(Math.random() * 1000); }
function safeUrl(url) { const val = String(url || '').trim(); return (val.startsWith('https://') || val.startsWith('http://') || val.startsWith('data:image/')) ? val : ''; }
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
// ------------------------------------------
// 🔄 محرك المزامنة الذكي والصاروخي
// ------------------------------------------
let dbListeners = {};
function clearAllListeners() {
    for (let path in dbListeners) { db.ref('tpm_system/' + path).off('value', dbListeners[path]); }
    dbListeners = {};
}

function renderProductionDashboard() {} function renderMasterData() {} function renderUsersPanel() {}

firebase.auth().onAuthStateChanged(async user => {
    clearAllListeners();
    
    if (user) {
        isDataLoaded = true;

        // 🚀 السحب الذكي: هنسحب الأساسيات بس عشان الشاشة تفتح في ثانية
        const dSnap = await db.ref('tpm_system/departments').once('value');
        departments = dSnap.val() || ['إنتاج', 'صيانة'];

        const uSnap = await db.ref('tpm_system/users').once('value');
        usersData = uSnap.val() || {};

        const kSnap = await db.ref('tpm_system/api_keys').once('value');
        globalApiKeys = kSnap.val() || { imgbb: "", gemini: "" };

        // تحديد الهوية
        const userEmail = user.email ? user.email.toLowerCase() : '';
        const isMasterAdmin = userEmail.includes('mfayez');
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
            
            // مراقبة المستخدمين الجدد
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

        // 📡 تشغيل قنوات المراقبة الحية (البيانات ستظهر فوراً)
        dbListeners.tags = db.ref('tpm_system/tags').on('value', snap => {
            tagsData = snap.val() ? Object.values(snap.val()).filter(x => x && x.id).sort((a,b)=>b.id-a.id) : [];
            renderTags(); if(currentUser.role) updateHomeDashboard();
        });
        dbListeners.tasks = db.ref('tpm_system/tasks').on('value', snap => {
            tasksData = snap.val() ? Object.values(snap.val()).filter(x => x && x.id).sort((a,b)=>a.id-b.id) : [];
            renderTasks();
        });
dbListeners.goals = db.ref('tpm_system/dept_goals').on('value', snap => { 
            deptGoalsData = snap.val() || {}; 
            if(currentJHDept && document.getElementById('jhPortalScreen').classList.contains('active')) selectJHDept(currentJHDept); 
        });
        dbListeners.history = db.ref('tpm_system/history').on('value', snap => {
            historyData = snap.val() ? Object.values(snap.val()).filter(x => x && x.id).sort((a,b)=>a.id-b.id) : [];
            renderHistory(); renderKaizenFeed(); if(currentUser.role) updateHomeDashboard();
        });
dbListeners.losses = db.ref('tpm_system/losses').on('value', snap => {
            registeredLosses = snap.val() ? Object.values(snap.val()) : [];
            if(document.getElementById('kkScreen').classList.contains('active')) renderKKDashboard();
        });
       dbListeners.points = db.ref('tpm_system/points').on('value', snap => { userPoints = snap.val() || {}; updateUsersLeaderboard(); });
        
        dbListeners.knowledgeBase = db.ref('tpm_system/knowledgeBase').on('value', snap => { 
            knowledgeBaseData = snap.val() ? Object.values(snap.val()) : []; 
            if(document.getElementById('knowledgeScreen').classList.contains('active')) renderKnowledgeBase(); 
        });
        
 } else {
        isInitialLoad = true; isDataLoaded = false; 
        showScreen('loginScreen');
    }
});
// 🔐 تسجيل الدخول (للمسجلين)
async function login() {
    const username = sanitizeInput(document.getElementById('loginUsername').value).toLowerCase();
    const password = document.getElementById('loginPassword').value.trim();
    if(!username || !password) return showToast('برجاء كتابة اسم المستخدم وكلمة المرور');
    document.getElementById('cloudStatus').innerHTML = "جاري الدخول...";
    
    if(document.getElementById('rememberMe') && document.getElementById('rememberMe').checked) { 
        localStorage.setItem('tpm_username', username); 
    }
    
    try { 
        await firebase.auth().signInWithEmailAndPassword(username + "@tpm.app", password); 
    } catch (e) { 
        showToast('بيانات الدخول غير صحيحة'); 
        document.getElementById('cloudStatus').innerHTML = "غير متصل";
    }
}

// 📝 إنشاء حساب جديد (بوضع الانتظار Pending)
async function signup() {
    const fullName = sanitizeInput(document.getElementById('signupFullName').value);
    const user = sanitizeInput(document.getElementById('signupUsername').value).toLowerCase().trim();
    const pass = document.getElementById('signupPassword').value.trim();
    const requestedRole = document.getElementById('signupRole').value;

    if(!user || !pass || !fullName) return showToast("برجاء إكمال كافة البيانات");

    try {
        showToast("جاري إرسال طلب الانضمام...");
        const res = await firebase.auth().createUserWithEmailAndPassword(user + "@tpm.app", pass);
        
        // هيكل بيانات المستخدم الجديد (حالة معلقة + أذونات افتراضية)
        const newUserObj = {
            name: fullName,
            username: user,
            requestedRole: requestedRole,
            role: 'viewer', // صلاحية مشاهد فقط لحين القبول
            status: 'pending', // حالة الانتظار
            // مصفوفة الأذونات لكل صفحة (view = رؤية فقط، edit = تعديل، none = مخفية)
            permissions: {
                homeScreen: 'view',
                tasksScreen: 'none',
                historyScreen: 'none',
                kaizenScreen: 'view',
                tagsScreen: 'none',
                knowledgeScreen: 'none'
            }
        };

        await db.ref('tpm_system/users/' + res.user.uid).set(newUserObj);
        
        showToast("تم إرسال طلبك للمدير mfayez بنجاح! يرجى انتظار الموافقة.");
        setTimeout(() => firebase.auth().signOut().then(() => window.location.reload()), 2000);
    } catch (e) {
        showToast("خطأ: اسم المستخدم محجوز أو البيانات غير صحيحة");
    }
}

// 🚪 تسجيل الخروج والدخول السريع
function logout() { firebase.auth().signOut().then(() => { localStorage.clear(); window.location.reload(); }); }

function biometricLogin() {
    const u = localStorage.getItem('tpm_username');
    if(!u) return showToast('سجل دخولك يدوياً أول مرة لتفعيل الدخول السريع'); 
    document.getElementById('loginUsername').value = u;
    showToast('تم استدعاء بياناتك، أدخل كلمة المرور فقط');
}
// ------------------------------------------
// 🔄 محرك المزامنة الذري (Atomic Sync Engine)
// ------------------------------------------
// تم إلغاء المسح الشامل، كل دالة تحفظ مسارها فقط لحماية البيانات من الـ Race Conditions
function syncRecord(path, data) { if (isOnline && firebase.auth().currentUser) db.ref('tpm_system/' + path).set(data); }
function deleteRecord(path) { if (isOnline && firebase.auth().currentUser) db.ref('tpm_system/' + path).remove(); }

function logAction(act) { 
    if(!currentUser.name) return;
    let logObj = {id: uniqueNumericId().toString(), user:currentUser.name, action:act, time:new Date().toLocaleTimeString('ar-EG')};
    syncRecord('logs/' + logObj.id, logObj);
}


// ------------------------------------------
// 🔍 دالة مسح الباركود الفعالة (النسخة الحديثة)
// ------------------------------------------
async function scanBarcodeFromImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showToast('جاري قراءة الباركود... 🔍');
    const html5QrCode = new Html5Qrcode("searchResults"); 
    
    try {
        const decodedText = await html5QrCode.scanFile(file, true);
        showToast('تمت القراءة بنجاح!');
        
        document.getElementById('searchResults').style.display = 'block';
        document.getElementById('searchResults').innerHTML = `
            <div style="padding:20px; background:rgba(46,125,50,0.1); border:1px solid var(--success); border-radius:15px; text-align:center;">
                <div style="font-size:30px; margin-bottom:10px;">✅</div>
                <b class="success-text" style="font-size:16px;">تم التعرف على البيانات:</b><br>
                <div style="margin-top:10px; padding:10px; background:rgba(0,0,0,0.3); border-radius:8px; color:var(--text-main); word-break: break-all; font-family:monospace;">
                    ${decodedText}
                </div>
                <button class="btn btn-sm btn-outline" style="margin-top:15px; width:auto;" onclick="document.getElementById('searchResults').style.display='none'">إغلاق</button>
            </div>
        `;
    } catch (err) {
        showToast('تعذرت قراءة الباركود، تأكد من وضوح الصورة.');
    }
}

// ------------------------------------------
// 🚀 محرك رفع الصور (ImgBB - No Base64 in DB)
// ------------------------------------------
async function uploadImageToStorage(base64Data) {
    const apiKey = globalApiKeys.imgbb;
    if (!apiKey) { showToast('مفتاح ImgBB مفقود باللإعدادات!'); return null; }
    try {
        const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        const formData = new FormData(); formData.append('image', cleanBase64);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
        const result = await response.json();
        return result.success ? result.data.url : null;
    } catch (e) { return null; }
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

// ------------------------------------------
// 📱 التحكم بالشاشات والقائمة الجانبية
// ------------------------------------------
function toggleSidebar() {
    const sb = document.getElementById('mainSidebar');
    const ov = document.getElementById('sidebarOverlay');
    if(!sb) return;
    if(sb.classList.contains('open')) {
        sb.classList.remove('open'); ov.style.display = 'none';
    } else {
        sb.classList.add('open'); ov.style.display = 'block';
    }
}


// 🏆 نظام النقاط والرتب المطور (Enterprise Elite)
function awardPoints(pts, reason) {
    const uid = firebase.auth().currentUser.uid;
    if(!uid) return;
    
    // حفظ النقاط بالـ UID لضمان عدم ضياعها عند تغيير الاسم
    let currentPts = (userPoints[uid] || 0) + pts;
    syncRecord('points/' + uid, currentPts);
    
    // تسجيل الإنجاز في سجل النشاط العام (للمدير)
    let achievementId = uniqueNumericId();
    syncRecord('global_achievements/' + achievementId, {
        user: currentUser.name,
        uid: uid,
        reason: reason,
        points: pts,
        date: new Date().toLocaleString('ar-EG')
    });

    showToast(`🎖️ حصلت على ${pts} نقطة إضافية: ${reason}`);
}

function updateUsersLeaderboard() {
    const lc = document.getElementById('usersLeaderboardContainer');
    if(!lc) return;

    // 1. تجميع البيانات
    let sortable = [];
    for (let uid in userPoints) {
        let uInfo = usersData[uid] || { name: "مستخدم مجهول" };
        sortable.push({ uid: uid, name: uInfo.name, avatar: uInfo.avatar, points: userPoints[uid] });
    }
    
    // 2. الترتيب التنازلي السريع
    sortable.sort((a, b) => b.points - a.points);

    if(sortable.length === 0) { 
        lc.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">المصنع بانتظار أول بطل... 🚀</div>'; 
        return; 
    }

    // 🚀 التحسين المعماري: أخذ أول 20 مستخدم فقط للرسم لتخفيف الـ DOM
    const topLimit = 20;
    const topUsers = sortable.slice(0, topLimit);

    // 3. رسم كروت الأوائل
    let html = topUsers.map((item, idx) => generateEliteCardHTML(item, idx)).join('');

    // 🚀 التحسين الذكي: إيجاد المستخدم الحالي وإظهار ترتيبه إذا كان خارج التوب 20
    const myUid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    const myRankIndex = sortable.findIndex(u => u.uid === myUid);

    if (myUid && myRankIndex >= topLimit) {
        let myData = sortable[myRankIndex];
        html += `
            <div style="text-align:center; color:var(--gold); margin: 15px 0 5px; font-size:10px; font-weight:bold;">
                🔻 مركزك الحالي 🔻
            </div>
        `;
        html += generateEliteCardHTML(myData, myRankIndex); // رسم كارت المستخدم بترتيبه الحقيقي
    }

    lc.innerHTML = html;
}

// دالة مساعدة لتوليد كود الـ HTML لمنع التكرار (Clean Code)
function generateEliteCardHTML(item, idx) {
    let rankClass = (idx === 0) ? 'gold-glow' : (idx === 1 ? 'silver-glow' : (idx === 2 ? 'bronze-glow' : ''));
    let rankIcon = (idx === 0) ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : idx + 1));
    
    let rankTitle = "مبتدئ تقني";
    let rankColor = "var(--text-muted)";
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
        <div class="elite-score">
            <span class="pts-val">${item.points}</span>
            <small>نقطة</small>
        </div>
    </div>`;
}

// 👤 محرك مركز القيادة الشخصي (النسخة النهائية الذكية)
async function openMyFullProfile() {
    const uid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    if(!uid || !usersData[uid]) return showToast('خطأ في جلب بيانات المستخدم');
    
    const u = usersData[uid];
    
    // 🚀 السر هنا: الاعتماد على الاسم الفعلي اللي السيستم حفظ بيه التاجات والمراجعات
    const activeName = currentUser.name; 

    // 1. تعبئة البيانات الأساسية
    document.getElementById('myBigAvatar').src = u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=1b2a47&color=d4af37`;
    document.getElementById('myDisplayName').innerText = u.name;
    document.getElementById('editName').value = u.name;
    document.getElementById('editPhone').value = u.phone || '';
    
    const pts = userPoints[uid] || 0;
    document.getElementById('myDisplayRank').innerText = `الرصيد المعرفي: ${pts} نقطة`;
    
    // تحديث قائمة الأقسام
    let opts = departments.map(d=>`<option value="${d}" ${u.dept===d?'selected':''}>${d}</option>`).join('');
    document.getElementById('editDept').innerHTML = opts;

    // 2. تجميع الإنجازات (Timeline) بالاعتماد على activeName
    const myAudits = historyData.filter(h => h.auditor === activeName && !h.stepsOrder.includes('ManualKaizen'));
    const myTags = tagsData.filter(t => t.auditor === activeName);
    const myKaizens = historyData.filter(h => h.auditor === activeName && h.stepsOrder.includes('ManualKaizen'));

    // دمج كل التحركات في شريط واحد مرتب زمنياً
    let allActivity = [
        ...myAudits.map(a => ({ type: 'audit', text: `📝 مراجعة قسم ${a.dept} (${a.totalPct}%)`, date: a.date })),
        ...myTags.map(t => ({ type: 'tag', text: `🚨 أصدرت تاج ${t.color==='red'?'صيانة':'إنتاج'}: ${t.desc}`, date: t.date })),
        ...myKaizens.map(k => ({ type: 'kaizen', text: `💡 شاركت بفكرة كايزن في ${k.dept}`, date: k.date }))
    ].reverse().slice(0, 10); 

    let timelineHtml = allActivity.map(item => `
        <div class="item-row" style="border-right-color: ${item.type === 'tag' ? 'var(--danger)' : (item.type === 'kaizen' ? 'var(--success)' : 'var(--gold)')};">
            <span style="flex:1;">${item.text}</span>
            <small style="color:var(--text-muted); font-size:10px; margin-right:10px;">${item.date}</small>
        </div>
    `).join('');

    // 3. تحديث شاشة العرض
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
let mainChartInstance = null; // متغير عام لحفظ الرسم البياني

// 📈 محرك الشاشة الرئيسية (Executive Dashboard)
function updateHomeDashboard() {
    let tScore = 0, aCount = 0;
    let deptLabels = [];
    let deptScores = [];
    
    // 1. تحديث كروت الأقسام وتجهيز بيانات الرسم البياني
    let grid = departments.map(d => {
        let auds = historyData.filter(h => h.dept === d && !h.stepsOrder.includes('ManualKaizen'));
        let sc = auds.length > 0 ? auds[auds.length-1].totalPct : 0;
        if(auds.length > 0) { tScore+=sc; aCount++; }
        let rTags = tagsData.filter(t => t.dept === d && t.status === 'open' && t.color === 'red').length;
        
        deptLabels.push(d);
        deptScores.push(sc);

        return `<div class="card glass-card" style="padding:15px; text-align:center; cursor:pointer;" onclick="openDeptDashboard('${d}')"><div style="font-size:14px; font-weight:bold; color:var(--gold); margin-bottom:10px;">${d}</div><div class="stat-value ${sc>=80?'success-text':(sc>=50?'warning-text':'danger-text')}">${sc}%</div><div style="font-size:10px; color:var(--text-muted); margin-top:5px;">تاجات مفتوحة: ${rTags}</div></div>`;
    }).join('');
    
    document.getElementById('homeDeptGrid').innerHTML = grid;
    document.getElementById('homeAvgScore').innerText = aCount > 0 ? Math.round(tScore/aCount) + '%' : '0%';
    document.getElementById('homeOpenTags').innerText = tagsData.filter(t => t.status === 'open').length;
    document.getElementById('homeClosedTags').innerText = tagsData.filter(t => t.status === 'closed').length;
    
    // 2. رسم المخطط البياني (Live Chart)
    const ctx = document.getElementById('mainDashboardChart');
    if (ctx) {
        if (mainChartInstance) mainChartInstance.destroy(); // تدمير القديم لمنع التداخل
        mainChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: deptLabels,
                datasets: [{
                    label: 'كفاءة القسم %',
                    data: deptScores,
                    backgroundColor: deptScores.map(s => s >= 80 ? 'rgba(46, 125, 50, 0.7)' : (s >= 50 ? 'rgba(245, 127, 23, 0.7)' : 'rgba(198, 40, 40, 0.7)')),
                    borderColor: deptScores.map(s => s >= 80 ? '#2e7d32' : (s >= 50 ? '#f57f17' : '#c62828')),
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { 
                    y: { beginAtZero: true, max: 100, ticks: { color: '#bdae93', font: {family: 'Cairo'} } }, 
                    x: { ticks: { color: '#d4af37', font: {family: 'Cairo', weight: 'bold'} } } 
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // 3. تحديث رادار الأعطال الحرجة (أول 5 تاجات حمراء مفتوحة)
    let criticalTags = tagsData.filter(t => t.status === 'open' && t.color === 'red').slice(0, 5);
    let cTagsHtml = criticalTags.map(t => `
        <div style="background:rgba(198,40,40,0.1); border-right:3px solid var(--danger); padding:8px; margin-bottom:8px; border-radius:5px; font-size:11px; cursor:pointer;" onclick="showScreen('tagsScreen'); document.getElementById('filterTagDept').value='${t.dept}'; renderTags();">
            <b style="color:var(--text-main);">${t.desc}</b><br>
            <span style="color:var(--danger); font-weight:bold;">${t.dept}</span> <span style="color:var(--text-muted);">- ${t.machine||'عام'}</span>
        </div>
    `).join('');
    
    const critContainer = document.getElementById('criticalTagsList');
    if(critContainer) critContainer.innerHTML = cTagsHtml || '<div style="text-align:center; color:var(--success); font-size:12px; padding:20px 0;">لا توجد أعطال حرجة 🎉</div>';

    updateUsersLeaderboard();
}
let deptRadarInstance = null;
let deptTrendInstance = null;

function openDeptDashboard(dept) {
    currentViewedDept = dept;
    document.getElementById('deptViewTitle').innerText = `لوحة قيادة: ${dept}`;
    
    // فلترة البيانات الخاصة بالقسم
    const deptAudits = historyData.filter(h => h.dept === dept).sort((a,b) => new Date(a.date) - new Date(b.date));
    const deptTags = tagsData.filter(t => t.dept === dept && t.status === 'open');
    const deptTasks = tasksData.filter(t => t.dept === dept && t.status !== 'done');
    
    // 1. تحديث الأرقام
    const lastAudit = deptAudits[deptAudits.length-1];
    document.getElementById('deptAvgScore').innerText = lastAudit ? lastAudit.totalPct + '%' : '0%';
    document.getElementById('deptOpenTags').innerText = deptTags.length;
    document.getElementById('deptTasksCount').innerText = deptTasks.length;

   // 2. رسم رادار JH (JH Steps Radar) - تم تصحيح المسميات هنا
    const steps = ['JH-0', 'JH-1', 'JH-2', 'JH-3', 'JH-4', 'JH-5', 'JH-6']; // إضافة الشرطة (-)
    const stepScores = steps.map(s => {
        if (!lastAudit || !lastAudit.results[s] || lastAudit.results[s].skipped) return 0;
        return Math.round((lastAudit.results[s].score / lastAudit.results[s].max) * 100);
    });

    const radarCtx = document.getElementById('deptRadarChart');
    if (deptRadarInstance) deptRadarInstance.destroy();
    deptRadarInstance = new Chart(radarCtx, {
        type: 'radar',
        data: {
            labels: ['JH0', 'JH1', 'JH2', 'JH3', 'JH4', 'JH5', 'JH6'],
            datasets: [{
                label: 'مستوى التنفيذ %',
                data: stepScores,
                backgroundColor: 'rgba(212, 175, 55, 0.2)',
                borderColor: '#d4af37',
                pointBackgroundColor: '#b87333',
                borderWidth: 2
            }]
        },
        options: {
            scales: { r: { beginAtZero: true, max: 100, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' } } },
            plugins: { legend: { display: false } }
        }
    });

    // 3. رسم منحنى التطور (Performance Trend)
    const trendCtx = document.getElementById('deptTrendChart');
    if (deptTrendInstance) deptTrendInstance.destroy();
    deptTrendInstance = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: deptAudits.slice(-5).map(a => a.date.split('/')[0] + '/' + a.date.split('/')[1]),
            datasets: [{
                label: 'الكفاءة %',
                data: deptAudits.slice(-5).map(a => a.totalPct),
                borderColor: '#2e7d32',
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            scales: { y: { beginAtZero: true, max: 100 }, x: { grid: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });

    // 4. عرض أهم 3 تاجات مفتوحة في القسم
    document.getElementById('deptActionItems').innerHTML = deptTags.slice(0,3).map(t => `
        <div class="card glass-card" style="padding:12px; border-right:4px solid ${t.color==='red'?'var(--danger)':'var(--primary-light)'}; margin-bottom:10px;">
            <div style="font-weight:bold; font-size:12px; color:var(--text-main);">${t.desc}</div>
            <div style="font-size:10px; color:var(--text-muted); margin-top:5px;">👤 ${t.auditor} | ⚙️ ${t.machine || 'عام'}</div>
        </div>
    `).join('') || '<div style="text-align:center; color:var(--success); font-size:12px; padding:20px;">لا توجد أعطال حرجة في هذا القسم 🎉</div>';

    showScreen('deptDashboardScreen');
}
function updateDeptDashboard() {
    if(!currentViewedDept) return;
    let machineFilter = document.getElementById('dashMachineFilter').value.trim().toLowerCase();
    let dTags = tagsData.filter(t => t.dept === currentViewedDept && t.status !== 'closed' && (machineFilter === '' || (t.machine && t.machine.toLowerCase().includes(machineFilter))));
    let dTasks = tasksData.filter(t => t.dept === currentViewedDept && (machineFilter === '' || (t.machine && t.machine.toLowerCase().includes(machineFilter))));
    
    document.getElementById('deptKpiOpenTags').innerText = dTags.length;
    document.getElementById('deptKpiTasks').innerText = dTasks.filter(t=>t.status==='pending').length;
    document.getElementById('deptKpiComp').innerText = dTasks.length===0?0:Math.round((dTasks.filter(t=>t.status==='done').length/dTasks.length)*100)+'%';
    
    let auds = historyData.filter(h => h.dept === currentViewedDept && !h.stepsOrder.includes('ManualKaizen') && (machineFilter === '' || (h.machine && h.machine.toLowerCase().includes(machineFilter))));
    let scArr = [0,0,0,0,0,0,0];
    if(auds.length > 0) {
        const last = auds[auds.length - 1];
        ['JH-0','JH-1','JH-2','JH-3','JH-4','JH-5','JH-6'].forEach((k,i) => { if(last.results[k] && !last.results[k].skipped) scArr[i] = Math.round((last.results[k].score/last.results[k].max)*100); });
    }
    if(radarChartInstance) radarChartInstance.destroy();
    if(document.getElementById('radarChart')) radarChartInstance = new Chart(document.getElementById('radarChart'), { type:'radar', data:{labels:['التحضيرية','الاولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة'], datasets:[{label:'الأداء', data:scArr, borderColor:'#b87333', backgroundColor:'rgba(184, 115, 51, 0.2)'}]} });
}

// ------------------------------------------
// 📝 المسودات والمراجعات (Audit Engine & Drafts)
// ------------------------------------------
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

// ------------------------------------------
// 📝 محرك المراجعة المطور (Scoring & Points)
// ------------------------------------------
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
    let totalScoreSoFar = 0;
    let totalMaxSoFar = 0;

    // 1. جمع نقاط المراحل السابقة التي تم حفظها بالفعل
    for (let i = 0; i < currentAudit.currentStepIndex; i++) {
        let stepKey = currentAudit.stepsOrder[i];
        let res = currentAudit.results[stepKey];
        if (res && !res.skipped) {
            totalScoreSoFar += res.score;
            totalMaxSoFar += res.max;
        }
    }

    // 2. جمع نقاط الاختيارات التي يضغط عليها المستخدم "الآن" في الخطوة الحالية
    for (let key in currentStepSelections) {
        totalScoreSoFar += currentStepSelections[key].score;
        totalMaxSoFar += currentStepSelections[key].max;
    }

    // 3. الحساب وتحديث الواجهة
    const pct = totalMaxSoFar === 0 ? 0 : Math.round((totalScoreSoFar / totalMaxSoFar) * 100);
    const pctEl = document.getElementById('cumulativeScoreText');
    const pointsEl = document.getElementById('cumulativePointsText');
    const barEl = document.getElementById('cumulativeProgressBar');

    if (pctEl) {
        pctEl.innerText = pct + '%';
        // إبداع بصري: تغيير لون النص بناءً على الكفاءة
        pctEl.style.color = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)');
    }
    if (pointsEl) pointsEl.innerText = `النقاط: ${totalScoreSoFar} / ${totalMaxSoFar}`;
    if (barEl) {
        barEl.style.width = pct + '%';
        // تغيير لون الشريط ديناميكياً
        barEl.style.background = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)');
    }
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
    
    // التحقق من أن كل البنود تم تقييمها
    if(Object.keys(currentStepSelections).length < sd.items.length) { 
        showToast('⚠️ يرجى تقييم جميع البنود قبل الحفظ'); 
        return; 
    }
    
    let totalScore = 0, totalMax = 0; 
    currentStepImprovements = [];
    
    for(let key in currentStepSelections) { 
        let itemData = currentStepSelections[key];
        totalScore += itemData.score; 
        totalMax += itemData.max; 
        
// إذا كانت الدرجة أقل من النهاية العظمى، نكتب الإجراء المطلوب للوصول للدرجة النهائية!
        if(itemData.score < itemData.max) { 
            let id = key.split('_')[1]; 
            let itm = sd.items.find(i=>i.id == id); 
            if(itm) {
                // البحث عن الوصف الخاص بالدرجة النهائية
                let maxLvl = itm.levels.find(l => l.score === itm.maxScore);
                let targetAction = maxLvl ? maxLvl.desc : "الوصول للمعايير القياسية";
                currentStepImprovements.push(`[${itm.title}] 🎯 المطلوب: ${targetAction}`); 
            }
        }
    }
    
    currentAudit.results[k] = { 
        skipped: false, 
        score: totalScore, 
        max: totalMax, 
        improvements: currentStepImprovements, 
        selections: currentStepSelections, 
        images: currentStepImages 
    };
    
    saveAuditDraft();
    
    // عرض الملخص المرحلي
    const pct = Math.round((totalScore/totalMax)*100);
    document.getElementById('summaryPct').innerText = pct + '%';
    document.getElementById('summaryPct').style.color = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)');
    document.getElementById('summaryScoreStr').innerText = `المجموع: ${totalScore} من ${totalMax} نقطة`;
    
    document.getElementById('opportunitiesContainer').innerHTML = currentStepImprovements.length > 0 
        ? currentStepImprovements.map(i=>`<div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-bottom:8px; border-right:4px solid var(--warning); font-size:12px; text-align:right; color:var(--text-main);">🔹 ${i}</div>`).join('') 
        : '<div style="color:var(--success); font-weight:bold; text-align:center; padding:20px;">🌟 أداء مثالي، لا توجد ملاحظات</div>';
    
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
    await db.ref(`tpm_system/users/${uid}`).update({
        name: newName,
        phone: newPhone,
        dept: newDept
    });

    currentUser.name = newName; // تحديث الجلسة الحالية
    localStorage.setItem('tpm_user', newName);
    
    showToast('تم تحديث بياناتك بنجاح ✅');
    renderProfileAndSettings(); // تحديث شاشة الإعدادات
    showScreen('settingsScreen');
}
// ------------------------------------------
// ✍️ التوقيع الفائق السرعة (Hardware Accelerated)
// ------------------------------------------
function initSignaturePad() {
    setTimeout(() => {
        sigCanvas = document.getElementById('signatureCanvas'); if(!sigCanvas) return;
        sigCtx = sigCanvas.getContext('2d'); sigCtx.lineWidth = 3; sigCtx.strokeStyle = '#b87333'; sigCtx.lineCap = 'round';
        clearSignature(); 
        
        // Caching Client Rect to prevent Layout Thrashing
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
    showScreen('finalReportScreen');
    initSignaturePad();
}

// ✅ دالة الحفظ النهائي مع التأكيد والانتقال التلقائي
async function saveFinalAudit() {
    if(!hasRole('auditor', 'admin')) { showToast('غير مصرح بحفظ المراجعات'); return; }
    
    // 1. طلب تأكيد من المستخدم قبل الحفظ
    if(!confirm("هل أنت متأكد من اعتماد وحفظ هذه المراجعة؟ سيتم إنشاء قائمة مهام تلقائية بالتحسينات.")) return;

    showToast('جاري معالجة البيانات وحفظ التقرير... ⏳');

    // 2. تسجيل التوقيع الرقمي
    if(sigCanvas) currentAudit.signature = sigCanvas.toDataURL('image/jpeg', 0.8);
    
    // 3. جمع فرص التحسين لإنشاء "مجلد مهام"
    let allImprovements = [];
    currentAudit.stepsOrder.forEach(step => {
        if(currentAudit.results[step] && currentAudit.results[step].improvements) { 
            allImprovements.push(...currentAudit.results[step].improvements); 
        }
    });
    
    if(allImprovements.length > 0) {
        let fId = uniqueNumericId().toString();
        let folderTask = {
            id: fId, isFolder: true, dept: currentAudit.dept, date: currentAudit.date, machine: currentAudit.machine || 'عام',
            task: `تحسينات مراجعة (${currentAudit.date})`, subTasks: allImprovements.map(imp => ({ text: imp, status: 'pending' })), status: 'pending'
        };
        await db.ref('tpm_system/tasks/' + fId).set(folderTask);
    }

    // 4. الحفظ النهائي في الأرشيف ونظام النقاط
    await db.ref('tpm_system/history/' + currentAudit.id).set(currentAudit);
    awardPoints(50, 'إتمام مراجعة رسمية');
    
    // 5. تنظيف المسودة وإظهار رسالة النجاح
    clearAuditDraft();
    showToast('تم حفظ التقرير بنجاح ✅ جاري تحويلك للأرشيف...');

    // 6. الانتقال التلقائي بعد ثانية واحدة (لإعطاء فرصة لقراءة الرسالة)
    setTimeout(() => {
        showScreen('historyScreen'); 
    }, 1500);
}
// ------------------------------------------
// 📊 أرشيف التقارير (History)
// ------------------------------------------
function renderHistory() {
    let real = historyData.filter(h=>!h.stepsOrder.includes('ManualKaizen')).reverse();
    let html = real.map(a => {
        let controls = (hasRole('admin') || currentUser.name === a.auditor) ? `
            <div style="margin-top:10px; display:flex; gap:5px; border-top:1px dashed var(--copper); padding-top:10px;">
                <button class="btn btn-sm btn-warning flex-1" onclick="event.stopPropagation(); editReport('${a.id}')">تعديل</button>
                <button class="btn btn-sm btn-danger flex-1" onclick="event.stopPropagation(); deleteReport('${a.id}')">حذف</button>
            </div>
        ` : '';
        return `<div class="card" style="cursor:pointer;" onclick="viewDetailedReport('${a.id}')">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div><h3 style="color:var(--gold); margin:0;">${a.dept}</h3><span style="font-size:11px; color:var(--text-muted);">${a.date} | الماكينة: ${a.machine}</span></div>
                <div style="font-size:22px; font-weight:bold; color:var(--success);">${a.totalPct}%</div>
            </div>
            ${controls}
        </div>`;
    }).join('');
    document.getElementById('historyListContainer').innerHTML = html || '<div style="text-align:center; color:var(--text-muted);">لا توجد تقارير حالياً</div>';
}

function deleteReport(id) { if(confirm('تأكيد الحذف النهائي للتقرير؟')) { deleteRecord('history/' + id); showToast('تم الحذف بنجاح'); } }
function editReport(id) { let rep = historyData.find(h => h.id === id); if(!rep) return; currentAudit = JSON.parse(JSON.stringify(rep)); currentAudit.currentStepIndex = 0; renderCurrentAuditStep(); }
// ------------------------------------------
// 📄 محرك استخراج التقارير التفصيلية المطور
// ------------------------------------------
function viewDetailedReport(id) {
    let a = historyData.find(h => h.id === id); 
    if(!a) return;

    // 1. ملء البيانات الأساسية
    document.getElementById('detDept').innerText = a.dept;
    document.getElementById('detMachine').innerText = a.machine || 'عام'; 
    document.getElementById('detAuditor').innerText = a.auditor;
    document.getElementById('detDate').innerText = a.date;
    
    const totalPct = a.totalPct || 0;
    document.getElementById('detPct').innerText = totalPct + '%';

    // 2. التقييم الوصفي
    let grade = "ضعيف";
    if (totalPct >= 90) grade = "ممتاز ⭐";
    else if (totalPct >= 80) grade = "جيد جداً";
    else if (totalPct >= 70) grade = "جيد";
    else if (totalPct >= 50) grade = "مقبول";
    document.getElementById('detGrade').innerText = grade;
    document.getElementById('detGrade').style.color = totalPct >= 80 ? '#2e7d32' : (totalPct >= 50 ? '#f57f17' : '#c62828');

    // 3. ملء جدول توزيع الدرجات (Breakdown)
    let tableHtml = '';
    let detailsHtml = '';

    a.stepsOrder.forEach(k => {
        let r = a.results[k];
        if (!r) return;

        let p = r.skipped ? 0 : Math.round((r.score / r.max) * 100);
        let statusText = r.skipped ? 'تخطي' : `${r.score}/${r.max}`;
        
        // إضافة للصف في الجدول السريع
        tableHtml += `
            <tr>
                <td><b>${k}</b></td>
                <td>${AUDIT_DATA[k] ? AUDIT_DATA[k].name : '---'}</td>
                <td>${statusText}</td>
                <td style="font-weight:bold; color:${p >= 80 ? '#2e7d32' : '#000'}">${p}%</td>
            </tr>`;

        // إضافة للتفاصيل (الملاحظات والصور)
        if (!r.skipped) {
            let imps = (r.improvements && r.improvements.length > 0) 
                ? r.improvements.map(i => `<div style="font-size:11px; margin-bottom:3px; color:#444;">• ${i}</div>`).join('') 
                : '<span style="color:#2e7d32; font-weight:bold;">لا توجد ملاحظات</span>';
            
            let imgsHtml = ''; 
            if(r.images) { 
                Object.values(r.images).forEach(img => { 
                    if (img.data) imgsHtml += `<img src="${img.data}" style="height:80px; width:80px; object-fit:cover; margin:5px; border:1px solid #ddd; border-radius:4px;">`; 
                }); 
            }

            detailsHtml += `
                <div style="margin-bottom:15px; padding:10px; border:1px solid #eee; border-radius:8px;">
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f0f0f0; margin-bottom:8px; padding-bottom:5px;">
                        <b style="font-size:12px;">${k}: ${AUDIT_DATA[k].name}</b>
                        <b style="color:#b87333;">${p}%</b>
                    </div>
                    <div style="margin-bottom:10px;">${imps}</div>
                    <div>${imgsHtml}</div>
                </div>`;
        }
    });

    document.getElementById('detStepsTableBody').innerHTML = tableHtml;
    document.getElementById('detStepsContainer').innerHTML = detailsHtml;

    // 4. معالجة التوقيع
    const sigDiv = document.getElementById('detSignatureImg');
    if (a.signature) {
        sigDiv.innerHTML = `<img src="${a.signature}" style="height:60px; max-width:150px; border-bottom:1px solid #000;">`;
    } else {
        sigDiv.innerHTML = '<div style="height:60px; color:#999; font-size:10px; padding-top:40px;">لا يوجد توقيع رقمي</div>';
    }

    showScreen('detailedReportScreen');
}

function downloadProfessionalPDF() {
    window.scrollTo(0,0);
    const btns = document.querySelectorAll('#detailedReportScreen .no-print'); btns.forEach(b => b.style.display = 'none');
    html2pdf().set({margin:0.2, filename:'تقرير_مراجعة.pdf', image:{type:'jpeg',quality:1}, html2canvas:{scale:2, useCORS:true}, jsPDF:{unit:'in', format:'a4', orientation:'portrait'}}).from(document.getElementById('printableReportArea')).save().then(()=>{ btns.forEach(b => b.style.display = ''); });
}
function shareWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent(window.currentReportText)}`); }

function renderTasks() {
    let htmlFolders = '';
    const cols = { pending: '', progress: '', done: '' };
    const counts = { pending: 0, progress: 0, done: 0 };
    
    let currentDeptTasks = tasksData.filter(t => t.dept === currentTaskDept);

    currentDeptTasks.forEach(t => {
        // زر الحذف يظهر للمدير فقط (سواء للمجلدات أو المهام الفردية)
        let deleteBtnHTML = hasRole('admin') ? `<button class="btn btn-sm btn-danger" style="padding:2px 8px; width:auto; margin:0;" onclick="deleteTask('${t.id}')">حذف 🗑️</button>` : '';
        
        if(t.isFolder) {
            let total = t.subTasks ? t.subTasks.length : 0; 
            let done = t.subTasks ? t.subTasks.filter(s=>s.status==='done').length : 0;
            htmlFolders += `
                <div class="card glass-card" style="border-right: 4px solid var(--gold); margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <b style="color:var(--gold); font-size:13px;">مجلد: ${t.task}</b>
                        <div style="display:flex; gap:5px; align-items:center;">
                            <span class="badge">${done}/${total}</span>
                            ${deleteBtnHTML}
                        </div>
                    </div>
                    ${t.subTasks ? t.subTasks.map((s,i)=>`
                        <div style="font-size:12px; padding:5px 0; border-bottom:1px dashed rgba(255,255,255,0.05);">
                            <label style="cursor:pointer; display:flex; gap:8px; align-items:flex-start; ${s.status==='done'?'text-decoration:line-through; color:var(--text-muted);':''}">
                                <input type="checkbox" style="margin-top:4px;" ${s.status==='done'?'checked':''} onclick="toggleFolderSubTask('${t.id}', ${i})"> 
                                <span style="flex:1; line-height:1.5;">${s.text}</span>
                            </label>
                        </div>`).join('') : ''}
                </div>`;
        } else {
            const status = t.status || 'pending';
            counts[status]++;
            
            let actions = '';
            if(status === 'pending') actions = `<button class="btn btn-sm btn-warning flex-1" onclick="changeTaskStatus('${t.id}', 'progress')">بدء التنفيذ</button>`;
            else if(status === 'progress') actions = `<button class="btn btn-sm btn-success flex-1" onclick="changeTaskStatus('${t.id}', 'done')">إنجاز</button>`;
            else if(status === 'done') actions = `<button class="btn btn-sm btn-outline flex-1" onclick="changeTaskStatus('${t.id}', 'pending')">إعادة فتح</button>`;

            cols[status] += `
            <div class="kanban-item">
                <div style="font-weight:bold; margin-bottom:5px;">${t.task}</div>
                
                ${t.image ? `<img src="${t.image}" style="width:100%; border-radius:8px; margin-bottom:8px; cursor:pointer; border:1px solid rgba(255,255,255,0.1);" onclick="window.open('${t.image}')">` : ''}
                
                <div style="font-size:10px; color:var(--text-muted);">${t.dept}</div>
                <div class="kanban-actions">
                    ${actions}
                    ${hasRole('admin') ? `<button class="btn btn-sm btn-danger" onclick="deleteTask('${t.id}')">🗑️</button>` : ''}
                </div>
            </div>`;
        }
    });

    ['pending', 'progress', 'done'].forEach(s => {
        const listEl = document.getElementById('kanban_' + s);
        const countEl = document.getElementById('count_' + s);
        if(listEl) listEl.innerHTML = cols[s] || '<div style="font-size:11px; color:var(--text-muted); text-align:center; padding:10px;">لا توجد مهام</div>';
        if(countEl) countEl.innerText = counts[s];
    });

    let fC = document.getElementById('auditFoldersContainer'); 
    if(fC) fC.innerHTML = htmlFolders || '<div style="font-size:12px; color:var(--text-muted); text-align:center;">لا توجد مجلدات تحسين</div>';
    
    updateTasksDeptGrid();
}

function deleteTask(id) {
    if(confirm('⚠️ هل أنت متأكد من حذف هذه المهمة / المجلد نهائياً؟')) {
        deleteRecord('tasks/' + id);
        showToast('تم الحذف بنجاح 🗑️');
    }
}

function updateTasksDeptGrid() {
    let deptStats = {}; 
    departments.forEach(d => deptStats[d] = { p:0 });
    
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
    if(dG) {
        dG.innerHTML = departments.map(d => `
            <div class="card glass-card" style="padding:15px; text-align:center; cursor:pointer; border-right:4px solid ${deptStats[d].p>0?'var(--danger)':'var(--success)'};" onclick="openTasksDept('${d}')">
                <h4 style="color:var(--gold); margin:0;">${d}</h4>
                <div style="font-size:11px; margin-top:5px; color:var(--text-main);">مهام نشطة: <b style="color:var(--danger);">${deptStats[d].p}</b></div>
            </div>`).join('');
    }
}

function openTasksDept(dept) { currentTaskDept = dept; document.getElementById('tasksDeptTitle').innerText = `مهام ${dept}`; document.getElementById('tasksMainView').style.display='none'; document.getElementById('tasksDeptView').style.display='block'; renderTasks(); }
function closeTasksDept() { currentTaskDept = null; document.getElementById('tasksDeptView').style.display='none'; document.getElementById('tasksMainView').style.display='block'; renderTasks(); }
function toggleFolderSubTask(fId, sIdx) { let f = tasksData.find(x=>x.id==fId); if(f) { f.subTasks[sIdx].status = f.subTasks[sIdx].status==='done'?'pending':'done'; syncRecord('tasks/' + fId, f); } }
function changeTaskStatus(id, st) { let t=tasksData.find(x=>x.id==id); if(t) {t.status=st; syncRecord('tasks/' + id, t);} }
function addManualTaskDept() { let v=document.getElementById('newTaskInput').value; if(v){ let id = uniqueNumericId().toString(); syncRecord('tasks/' + id, {id:id, task:v, dept:currentTaskDept, status:'pending'}); document.getElementById('newTaskInput').value=''; showToast('تمت الإضافة'); } }
// ------------------------------------------
// 🌐 مجتمع كايزن (الدمج الاحترافي)
// ------------------------------------------
function handleKaizenImage(e, type) {
    const f=e.target.files[0]; if(!f) return;
    showToast('جاري تحضير الصورة...');
    processAndEnhanceImage(f, function(dataUrl) { kaizenImgs[type] = dataUrl; document.getElementById(type==='before'?'kaizenBeforePreview':'kaizenAfterPreview').innerHTML=`<span style="color:var(--success); font-size:11px; font-weight:bold;">تم الإرفاق</span>`; });
}

function submitManualKaizen() {
    let t = document.getElementById('newKaizenTitle').value; let d = document.getElementById('newKaizenDept').value;
    if(!t || !kaizenImgs.before || !kaizenImgs.after) { showToast('برجاء كتابة الوصف وإرفاق الصورتين'); return; }
    
    document.getElementById('submitKaizenBtn').innerText = "جاري الدمج والرفع...";
    document.getElementById('submitKaizenBtn').disabled = true;
    
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
    const imgBefore = new Image(); const imgAfter = new Image();
    
    imgBefore.onload = function() {
        imgAfter.onload = async function() {
            canvas.width = 600; canvas.height = 300;
            ctx.fillStyle = "#111d33"; ctx.fillRect(0,0,600,300);
            ctx.drawImage(imgBefore, 0, 0, 295, 300);
            ctx.drawImage(imgAfter, 305, 0, 295, 300);
            
            ctx.fillStyle = "#d4af37"; ctx.beginPath(); ctx.moveTo(280, 150); ctx.lineTo(320, 130); ctx.lineTo(320, 170); ctx.fill();
            ctx.fillStyle = "rgba(198,40,40,0.85)"; ctx.fillRect(10, 10, 50, 25);
            ctx.fillStyle = "white"; ctx.font = "bold 14px Cairo"; ctx.fillText("قبل", 22, 27);
            ctx.fillStyle = "rgba(46,125,50,0.85)"; ctx.fillRect(540, 10, 50, 25);
            ctx.fillStyle = "white"; ctx.font = "bold 14px Cairo"; ctx.fillText("بعد", 552, 27);
            
            const mergedB64 = canvas.toDataURL('image/jpeg', 0.8);
            const uploadedUrl = await uploadImageToStorage(mergedB64);
            if (uploadedUrl) {
                let kId = uniqueNumericId().toString();
                syncRecord('history/' + kId, { id: kId, dept: d, auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG'), stepsOrder: ['ManualKaizen'], totalPct: 100, results: { 'ManualKaizen': { images: { 'img_1': { title: t, data: uploadedUrl } } } } });
                
                document.getElementById('newKaizenTitle').value = '';
                document.getElementById('kaizenBeforePreview').innerHTML = ''; document.getElementById('kaizenAfterPreview').innerHTML = '';
                kaizenImgs = { before: null, after: null };
                document.getElementById('kaizenUploadModal').style.display = 'none';
                
                awardPoints(40, 'مشاركة كايزن'); showToast('تم نشر الكايزن بنجاح');
            } else { showToast('فشل الرفع، راجع مفتاح ImgBB'); }
            
            document.getElementById('submitKaizenBtn').innerText = "دمج واعتماد";
            document.getElementById('submitKaizenBtn').disabled = false;
        }; imgAfter.src = kaizenImgs.after;
    }; imgBefore.src = kaizenImgs.before;
}

function renderKaizenFeed() {
    let c = document.getElementById('kaizenFeedContainer'); if(!c) return;
    let selectedDept = document.getElementById('kaizenDeptSelect').value;
    
    let html = historyData.filter(h=>h.stepsOrder.includes('ManualKaizen') && (selectedDept === 'الكل' || h.dept === selectedDept)).reverse().map(k=> {
        let lId = k.id;
        let liked = likesData[lId] && likesData[lId].includes(currentUser.name);
        let canEdit = hasRole('admin') || currentUser.name === k.auditor;
        let controls = canEdit ? `<button class="btn btn-sm btn-warning flex-1" onclick="editKaizen('${k.id}')">تعديل</button><button class="btn btn-sm btn-danger flex-1" onclick="deleteKaizen('${k.id}')">حذف</button>` : '';
        let comments = kaizenComments[lId] || [];
        let commentsHtml = comments.map(cm => `<div class="comment-box"><b style="color:var(--gold);">${cm.user}:</b> ${cm.text} <span style="font-size:9px; color:var(--text-muted); float:left;">${cm.date}</span></div>`).join('');

        return `<div class="kaizen-post">
            <div style="display:flex; justify-content:space-between;"><b>${k.auditor}</b><span style="font-size:11px; color:var(--text-muted);">${k.dept} | ${k.date}</span></div>
            <img src="${k.results.ManualKaizen.images.img_1.data}" class="kaizen-img">
            <b style="font-size:15px;">${k.results.ManualKaizen.images.img_1.title}</b>
            <div class="row-flex" style="margin-top:10px;">
                <button class="btn btn-sm ${liked?'btn-success':'btn-outline'} flex-1" onclick="toggleKaizenLike('${lId}')">إعجاب (${likesData[lId]?likesData[lId].length:0})</button>
                ${controls}
            </div>
            <div style="margin-top: 15px; border-top: 1px dashed var(--copper); padding-top: 10px;">
                <div style="max-height: 120px; overflow-y: auto; margin-bottom: 10px;">${commentsHtml || '<div style="font-size:11px; text-align:center; color:var(--text-muted);">لا توجد تعليقات</div>'}</div>
                <div class="row-flex"><input type="text" id="comment_input_${lId}" class="form-control flex-2" placeholder="اكتب تعليقاً..." style="margin:0;"><button class="btn btn-primary btn-sm flex-1" style="margin:0;" onclick="addKaizenComment('${lId}')">إرسال</button></div>
            </div>
        </div>`;
    }).join('');
    c.innerHTML = html || '<div style="text-align:center; color:var(--text-muted);">لا توجد مشاركات</div>';
}

function toggleKaizenLike(id) { if(!likesData[id]) likesData[id]=[]; let i=likesData[id].indexOf(currentUser.name); if(i>-1) likesData[id].splice(i,1); else likesData[id].push(currentUser.name); syncRecord('likes/' + id, likesData[id]); }
function deleteKaizen(id) { if(confirm('تأكيد مسح الكايزن؟')) { deleteRecord('history/' + id); showToast('تم الحذف'); } }
function editKaizen(id) { let k=historyData.find(x=>x.id===id); if(!k) return; let v=prompt('تعديل الوصف:', k.results.ManualKaizen.images.img_1.title); if(v) { k.results.ManualKaizen.images.img_1.title=sanitizeInput(v); syncRecord('history/' + id, k); showToast('تم التعديل'); } }
function addKaizenComment(id) { let el=document.getElementById(`comment_input_${id}`); let txt=sanitizeInput(el.value); if(!txt) return; if(!kaizenComments[id]) kaizenComments[id]=[]; kaizenComments[id].push({user:currentUser.name, text:txt, date:new Date().toLocaleTimeString('ar-EG')}); syncRecord('kaizenComments/' + id, kaizenComments[id]); el.value=''; awardPoints(2, 'كتابة تعليق'); }

// ------------------------------------------
// 🏷️ التاجات والمشكلات (Tags Engine)
// ------------------------------------------
function handleTagImage(e) {
    const f=e.target.files[0]; if(!f) return;
    showToast('جاري تحضير الصورة...');
    processAndEnhanceImage(f, function(dataUrl) { currentTagImg=dataUrl; document.getElementById('tagImagePreview').innerHTML=`<span style="color:var(--success); font-size:11px; font-weight:bold;">مُجهزة للرفع</span>`; });
}

// ------------------------------------------
// 🏷️ دالة إصدار التاج (محدثة ومضادة للأعطال)
// ------------------------------------------
async function addNewTag() {
    let d=document.getElementById('newTagDesc').value, c=document.getElementById('newTagColor').value, dp=document.getElementById('newTagDept').value, m=document.getElementById('newTagMachine').value, sp=document.getElementById('newTagSpareParts').value;
    if(!d) { showToast('أدخل وصف المشكلة'); return; }
    
    let fullDesc = sp ? `${d} [أجزاء: ${sp}]` : d;
    let uploadedUrl = null;
    
    if (currentTagImg) {
        showToast('جاري رفع التاج والصورة... ⏳');
        uploadedUrl = await uploadImageToStorage(currentTagImg);
        if(!uploadedUrl) {
            // بدلاً من إيقاف الكود، سنحفظ التاج بدون صورة مع إعطاء تنبيه
            showToast('⚠️ فشل رفع الصورة (تأكد من مفتاح ImgBB). سيتم حفظ التاج كنص فقط.');
        }
    }
    
    let tId = uniqueNumericId().toString();
    syncRecord('tags/' + tId, {id:tId, desc:fullDesc, color:c, dept:dp, machine:m, image:uploadedUrl, status:'open', auditor:currentUser.name, date:new Date().toLocaleDateString('ar-EG'), timestamp: Date.now()});
    
    document.getElementById('newTagDesc').value=''; document.getElementById('newTagMachine').value=''; document.getElementById('newTagSpareParts').value=''; currentTagImg = null;
    let preview = document.getElementById('tagImagePreview'); if(preview) preview.innerHTML = '';
    
    awardPoints(10, 'إصدار تاج جديد'); 
    if(uploadedUrl || !currentTagImg) showToast('تم إصدار التاج بنجاح ✅');
    
    if(c==='red' && document.getElementById('newTagEngineer') && document.getElementById('newTagEngineer').value) window.open(`https://wa.me/${document.getElementById('newTagEngineer').value.replace(/\D/g,'')}?text=${encodeURIComponent(`إشعار عطل (تاج أحمر)\nالقسم: ${dp}\nالماكينة: ${m||'عام'}\nالوصف: ${fullDesc}`)}`);
}
// ------------------------------------------
// 🏷️ التاجات والمشكلات (Ticket System)
// ------------------------------------------
function renderTags() {
    let rc = document.getElementById('redTagsContainer'); 
    let bc = document.getElementById('blueTagsContainer');
    if(!rc || !bc) return;
    
    let fDept = document.getElementById('filterTagDept').value; 
    let fMach = document.getElementById('filterTagMachine').value.trim().toLowerCase();
    let fStatus = document.getElementById('filterTagStatus') ? document.getElementById('filterTagStatus').value : 'active';
    
    let redHtml = '', blueHtml = '';
    let currentTime = Date.now();
    const THREE_DAYS_MS = 259200000; // 3 أيام بالملي ثانية

    tagsData.forEach(t => {
        // تطبيق الفلاتر
        if(fDept !== 'الكل' && t.dept !== fDept) return;
        if(fMach !== '' && (!t.machine || !t.machine.toLowerCase().includes(fMach))) return;
        
        let isClosed = (t.status === 'closed');
        if(fStatus === 'active' && isClosed) return;
        if(fStatus === 'closed' && !isClosed) return;

        // حساب التقادم للتاجات غير المغلقة (إذا عدى 3 أيام)
        let isAged = false;
        if(!isClosed && t.timestamp && (currentTime - t.timestamp > THREE_DAYS_MS)) {
            isAged = true;
        }

        let canEdit = hasRole('admin', 'auditor') || currentUser.name === t.auditor;
        let controls = canEdit ? `
            <select class="form-control flex-2" style="font-size:11px; padding:4px; margin:0;" onchange="updateTagState('${t.id}', this.value)">
                <option value="open" ${t.status==='open'?'selected':''}>مفتوح ⏳</option>
                <option value="progress" ${t.status==='progress'?'selected':''}>جاري 🛠️</option>
                <option value="review" ${t.status==='review'?'selected':''}>مراجعة 👁️</option>
                <option value="closed" ${t.status==='closed'?'selected':''}>مغلق ✅</option>
            </select>
            <button class="btn btn-sm btn-outline flex-1" style="margin:0; padding:4px;" onclick="editTag('${t.id}')">تعديل</button>
            <button class="btn btn-sm btn-danger" style="margin:0; padding:4px; width:auto;" onclick="deleteTag('${t.id}')">🗑️</button>
        ` : `<span style="font-size:11px; font-weight:bold; color:var(--gold); padding:4px; background:rgba(0,0,0,0.2); border-radius:5px;">الحالة: ${t.status}</span>`;
        
        let ticketClass = t.color === 'red' ? 'ticket-red' : 'ticket-blue';
        let warningBadge = isAged ? `<div class="aging-warning">متأخر حرج</div>` : '';

        let cardHtml = `
        <div class="tag-ticket ${ticketClass}">
            ${warningBadge}
            <div class="ticket-header">
                <div class="ticket-title">${t.desc}</div>
            </div>
            <div class="ticket-meta">
                🏭 ${t.dept} ${t.machine ? ' | ⚙️ ' + t.machine : ''}<br>
                👤 ${t.auditor} | 📅 ${t.date}
            </div>
            ${t.image ? `<img src="${t.image}" class="ticket-img" title="اضغط لتكبير الصورة" onclick="window.open('${t.image}', '_blank')">` : ''}
            <div class="row-flex" style="margin-top:10px; border-top:1px dashed rgba(255,255,255,0.1); padding-top:10px;">
                ${controls}
            </div>
        </div>`;

        if(t.color === 'red') redHtml += cardHtml; else blueHtml += cardHtml;
    });

    rc.innerHTML = redHtml || '<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:15px;">لا توجد تاجات صيانة مطابقة</div>';
    bc.innerHTML = blueHtml || '<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:15px;">لا توجد تاجات إنتاج مطابقة</div>';
}

function updateTagState(id, st) { let t=tagsData.find(x=>x.id==id); if(t) {t.status=st; syncRecord('tags/' + id, t); if(st==='closed') awardPoints(20, 'إغلاق تاج');} }
function deleteTag(id) { if(confirm('تأكيد حذف التاج نهائياً؟')) { deleteRecord('tags/' + id); showToast('تم الحذف'); } }
function editTag(id) { let t=tagsData.find(x=>x.id==id); if(!t) return; let v=prompt('تعديل وصف المشكلة:', t.desc); if(v) { t.desc=sanitizeInput(v); syncRecord('tags/' + id, t); showToast('تم التعديل'); } }

// ------------------------------------------
// ⚙️ إعدادات الـ API
// ------------------------------------------
function saveApiKeys() {
    globalApiKeys.imgbb = document.getElementById('imgbbKeyInput').value.trim();
    globalApiKeys.gemini = document.getElementById('geminiKeyInput').value.trim();
    document.getElementById('imgbbKeyInput').disabled = true; document.getElementById('geminiKeyInput').disabled = true;
    syncRecord('api_keys', globalApiKeys); showToast('تم حفظ وتأمين المفاتيح المركزية');
}
function enableApiKeysEdit() { document.getElementById('imgbbKeyInput').disabled = false; document.getElementById('geminiKeyInput').disabled = false; showToast('الحقول جاهزة للتعديل'); }

// ------------------------------------------
// 🤖 المستشار الذكي وعقل المصنع (AI)
// ------------------------------------------
async function getBase64FromUrl(url) {
    try { const res = await fetch(url); const blob = await res.blob(); return new Promise(resolve => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(blob); });
    } catch(e) { return new Promise((resolve, reject) => { let img = new Image(); img.crossOrigin = 'Anonymous'; img.onload = () => { let canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height; canvas.getContext('2d').drawImage(img, 0, 0); resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]); }; img.onerror = reject; img.src = url; }); }
}

async function runAIVision(itemId, itemTitle) {
    const apiKey = globalApiKeys.gemini; if(!apiKey) return showToast('مفتاح Gemini مفقود');
    let imgObj = currentStepImages['img_' + itemId]; if(!imgObj) return showToast('لا توجد صورة لفحصها');
    document.getElementById('aiModalText').innerHTML = "جاري فحص الصورة..."; document.getElementById('aiModal').style.display = 'flex';
    try {
        const base64Img = await getBase64FromUrl(imgObj.data);
        let promptParts = [{ text: `أنت مهندس صيانة. حلل هذه الصورة بناءً على بند: "${itemTitle}". رد بـ HTML منسق.` }];
        if(knowledgeBaseData && knowledgeBaseData.length > 0) {
            let kbPromises = []; knowledgeBaseData.forEach(kb => { if(kb.content) promptParts.unshift({ text: `مرجع (${kb.title}): ${kb.content}` }); if(kb.images) { kb.images.forEach(imgUrl => { kbPromises.push(getBase64FromUrl(imgUrl).then(b64 => { promptParts.unshift({ inline_data: { mime_type: "image/jpeg", data: b64 } }); }).catch(e=>e)); }); } });
            await Promise.all(kbPromises); promptParts.unshift({ text: "كتالوجات وجداول المصنع المعتمدة:" });
        }
        promptParts.push({ inline_data: { mime_type: "image/jpeg", data: base64Img } });
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: promptParts }] }) });
        const result = await response.json(); document.getElementById('aiModalText').innerHTML = nl2brSafe(result.candidates[0].content.parts[0].text); awardPoints(5, 'فحص بالذكاء الاصطناعي');
    } catch(e) { document.getElementById('aiModalText').innerHTML = "خطأ في الاتصال"; }
}

async function predictMachineFailures() {
    const k = globalApiKeys.gemini; if(!k) return showToast('مفتاح Gemini غير مفعل');
    const r = document.getElementById('aiPredictionResult'); r.style.display='block'; r.innerText='جاري تحليل البيانات...';
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: "بناءً على التاجات التالية، توقع الماكينات المعرضة للتوقف وقدم نصيحة: " + tagsData.map(t=>t.desc).join(',') }] }] }) });
        const j = await res.json(); r.innerHTML = nl2brSafe(j.candidates[0].content.parts[0].text);
    } catch(e) { r.innerText='فشل الاتصال'; }
}

async function explainItem(t) {
    const k = globalApiKeys.gemini; if(!k) return showToast('مفتاح Gemini مفقود');
    document.getElementById('aiModal').style.display='flex'; 
    document.getElementById('aiModalText').innerHTML = '<div style="text-align:center;">جاري مراجعة عقل المصنع وتحليل البند... 🧠🔍</div>';
    
    try {
        // 🚀 سحب السياق من كل الكتب المخزنة في المكتبة
        let factoryContext = knowledgeBaseData.map(kb => `[مرجع: ${kb.title} - تصنيف: ${kb.category}]: ${kb.content}`).join('\n\n');
        
        let prompt = `أنت الخبير التقني لـ Factory OS. بناءً على المراجع والكتالوجات المرفقة أدناه الخاصة بمصنعنا فقط، اشرح البند التالي للمراجع الميداني: "${t}". 
        تحدث بصيغة تعليمية، أخبره ماذا يفحص بالظبط وكيف يتأكد من مطابقة المعايير بناءً على ما تعلمته من المراجع.
        إذا لم تجد معلومة محددة في المراجع، استخدم خبرتك العامة في الـ TPM لتقديم نصيحة عملية. 
        رد بتنسيق HTML أنيق.
        
        سياق المصنع المعتمد:
        ${factoryContext}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
        });
        const j = await res.json(); 
        document.getElementById('aiModalText').innerHTML = nl2brSafe(j.candidates[0].content.parts[0].text);
    } catch(e) { document.getElementById('aiModalText').innerText='خطأ في استحضار الذاكرة المعرفية'; }
}
// ------------------------------------------
// إعدادات أخرى
// ------------------------------------------
function toggleDarkMode() { document.body.style.filter = document.body.style.filter === 'invert(1) hue-rotate(180deg)' ? 'none' : 'invert(1) hue-rotate(180deg)'; }
function updateDeptDropdown() { let opts = departments.map(d=>`<option value="${d}">${d}</option>`).join(''); document.querySelectorAll('select').forEach(s => {if(s.id.includes('Dept')) s.innerHTML=opts;}); }
function updateDeptListUI() { }
function addOrUpdateDept() { let v = document.getElementById('newDeptInput').value; if(v){ departments.push(v); syncRecord('departments', departments); updateDeptDropdown(); showToast('تم الحفظ'); } }
function addEngineer() { let n=document.getElementById('newEngName').value, p=document.getElementById('newEngPhone').value; if(n&&p) { maintenanceEngineers.push({name:n, phone:p}); syncRecord('maintenanceEngineers', maintenanceEngineers); document.getElementById('newTagEngineer').innerHTML+=`<option value="${p}">${n}</option>`; showToast('تم الإضافة'); } }

// بنود المراجعة مدمجة بشكل دقيق وبدون تكرار:
const AUDIT_DATA = {
    "JH-0": { name: "الخطوة التحضيرية", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوه التحضيرية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي وجود خطة عمل لتنفيذ انشطة الخطوه التحضيرية لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه التحضيرية لكل قسم ، ولكن توجد أدلة ضعيفة علي إستخدامها في الواقع"},{level:3,score:2,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه التحضيرية لكل قسم ، وتوجد بعض الأدلة علي إستخدامها ، كما أن الخطة غير مثبتة علي لوحة أنشطة الـ TPM لكل قسم"},{level:4,score:3,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه التحضيرية لكل قسم وتغطي كثير من أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وكثير من مشغلي الماكينات على دراية بها"},{level:5,score:4,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه التحضيرية لكل قسم وتغطي معظم أنشطة الخطوة، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم ومعظم مشغلي الماكينات بالقسم علي دراية كاملة بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه التحضيرية للقسم وتغطي كافة أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وجميع مشغلي الماكينات بالقسم علي دراية بتفاصيلها"}] },
        { id: 2, title: "وجود ماده علمية متكامله لشرح خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي وجود ماده علمية لشرح خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:2,score:1,desc:"توجد ماده علمية بسيطة تغطي قليل من أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:3,score:2,desc:"توجد ماده علمية تغطي بعض أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:4,score:3,desc:"توجد ماده علمية تغطي كثير من أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:5,score:4,desc:"توجد ماده علمية تغطي معظم أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:6,score:5,desc:"توجد ماده علمية متكامله لشرح خطوات الصيانة الذاتية تغطي كافة أنشطتها تفصيليا ، وموضح بها أهداف الصيانة الذاتية والغرض من تطبيقها"}] },
        { id: 3, title: "قياس مدى فهم مشغلي الماكينات لأنشطة خطوات الصيانه الذاتيه", maxScore: 15, levels: [{level:1,score:0,desc:"مشغلي الماكينات ليس لديهم وعي بأنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:2,score:3,desc:"مشغلي الماكينات لديهم معرفة بسيطه بأنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:3,score:6,desc:"مشغلي الماكينات لديهم معرفة ببعض أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:4,score:9,desc:"مشغلي الماكينات لديهم معرفة بكثير من أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:5,score:12,desc:"مشغلي الماكينات لديهم وعي بمعظم أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:6,score:15,desc:"جميع مشغلي الماكينات بالقسم لديهم وعي كامل بكافة أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"}] },
        { id: 4, title: "إعداد وإصدار قائمة بجميع أماكن الخطر بالماكينات وبيئة العمل المحيطة بها", maxScore: 10, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي إعداد قائمة بمخاطر الماكينات وبيئة العمل المحيطة بها"},{level:2,score:2,desc:"تم إعداد وإصدار قائمة لعدد بسيط من أماكن الخطر بالماكينات وبيئة العمل المحيطة بها ، ولم يتم شرحها لجميع العاملين بالقسم أو وضع جدول زمني للقضاء عليها"},{level:3,score:4,desc:"تم إعداد وإصدار قائمة معتمده لبعض أماكن الخطر بالماكينات وبيئة العمل المحيطة بها ، وتم شرحها لبعض العاملين بالقسم، وتم وضع جدول زمني للقضاء عليها"},{level:4,score:6,desc:"تم إعداد وإصدار قائمة معتمده لكثير من أماكن الخطر بالماكينات وبيئة العمل المحيطة بها ، وتم شرحها لمعظم العاملين بالقسم، وتم وضع جدول زمني للقضاء عليها"},{level:5,score:8,desc:"تم إعداد وإصدار قائمة معتمده لمعظم أماكن الخطر بالماكينات وبيئة العمل المحيطة بها ، ومثبتة على لوحة الإعلان بالقسم ، وتم شرحها لجميع العاملين بالقسم ووضع خطة عمل للقضاء عليها"},{level:6,score:10,desc:"تم إعداد وإصدار قائمة بجميع أماكن الخطر بالماكينات وبيئة العمل المحيطة بها ، ومثبتة على لوحة الإعلان بالقسم ، وتم شرحها لجميع العاملين بالقسم ووضع خطة عمل للقضاء عليها"}] },
        { id: 5, title: "تدريب عملي لمشغلي الماكينات (OJT) يتضمن شرح للظواهر السبع الغير طبيعية", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد أي دلائل علي إعداد برنامج تدريبي لشرح الظواهر السبع الغير طبيعية"},{level:2,score:4,desc:"تم إعداد برنامج تدريبي مبسط لشرح الظواهر السبع الغير طبيعية بالماكينات ، لا يتضمن التدريب أمثلة عملية علي الماكينة لكل ظاهرة من الظواهر السبع ، وعدد قليل من مشغلي الماكينات لديهم معرفة أو فهم كامل لتلك الظواهر"},{level:3,score:8,desc:"تم إعداد برنامج تدريبي متكامل لشرح الظواهر السبع الغير طبيعية بالماكينات ، يتضمن التدريب أمثلة عملية علي الماكينة لكل ظاهرة من الظواهر السبع ، و بعض مشغلي الماكينات لديهم معرفة أو فهم كامل لتلك الظواهر"},{level:4,score:12,desc:"تم إعداد برنامج تدريبي متكامل لشرح الظواهر السبع الغير طبيعية بالماكينات ، يتضمن التدريب أمثلة عملية على الماكينة لكل ظاهرة من الظواهر السبع ، وكثير من مشغلي الماكينات لديهم معرفة أو فهم كامل لتلك الظواهر"},{level:5,score:16,desc:"تم إعداد برنامج تدريبي متكامل لشرح الظواهر السبع الغير طبيعية بالماكينات ، يتضمن التدريب أمثلة عملية علي الماكينة لكل ظاهرة من الظواهر السبع ، و معظم مشغلي الماكينات لديهم معرفة أو فهم كامل لتلك الظواهر"},{level:6,score:20,desc:"تم إعداد برنامج تدريبي متكامل يغطي شرح الظواهر السبع الغير طبيعية بالماكينات ، يتضمن التدريب أمثلة عملية متعددة علي الماكينة لكل ظاهرة من الظواهر السبع ، وجميع مشغلي الماكينات لديهم معرفة وفهم كامل لتلك الظواهر"}] },
        { id: 6, title: "تدريب عملي لشرح الـ Structure Diagram لأجزاء الماكينات", maxScore: 25, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي إعداد برنامج تدريبي لشرح الـ Structure Diagram لأجزاء الماكينات"},{level:2,score:5,desc:"تم إعداد برنامج تدريبي مبسط لشرح الـ Structure Diagram لأجزاء الماكينات ، لا يتضمن التدريب أمثلة عملية علي أجزاء الماكينات ، وعدد قليل من العاملين لديهم معرفة أو فهم كامل لعناصر البرنامج التدريبي"},{level:3,score:10,desc:"تم إعداد برنامج تدريبي متكامل لشرح الـ Structure Diagram لأجزاء الماكينات ، يتضمن التدريب أمثلة عملية على أجزاء الماكينات ، وبعض العاملين لديهم معرفة أو فهم كامل لعناصر البرنامج التدريبي"},{level:4,score:15,desc:"تم إعداد برنامج تدريبي متكامل لشرح الـ Structure Diagram لأجزاء الماكينات ، يتضمن التدريب أمثلة عملية على أجزاء الماكينات ، وكثير من العاملين لديهم معرفة أو فهم كامل لعناصر البرنامج التدريبي"},{level:5,score:20,desc:"تم إعداد برنامج تدريبي متكامل لشرح الـ Structure diagram الأجزاء الماكينات ، يتضمن التدريب أمثلة عملية على أجزاء الماكينات، ومعظم العاملين لديهم معرفة أو فهم كامل العناصر البرنامج التدريبي"},{level:6,score:25,desc:"تم إعداد برنامج تدريبي عملي متكامل يغطي شرح الـ Structure Diagram لجميع أجزاء الماكينات، وجميع العاملين لديهم معرفة وفهم كامل لها"}] },
        { id: 7, title: "إعداد نماذج الـ OPL الخاصة بأنشطة الصيانة الذاتية", maxScore: 15, levels: [{level:1,score:0,desc:"لا توجد دلائل واضحة علي إعداد وتنفيذ مخطط نماذج الـ OPL الخاصه بانشطة الصيانة الذاتيه"},{level:2,score:3,desc:"تم إعداد وتنفيذ عدد قليل نماذج الـ OPL الخاصه بانشطة الصيانة الذاتيه ، وعدد قليل من مشغلي الماكينات علي وعي وفهم بمحتواها"},{level:3,score:6,desc:"تم إعداد وتنفيذ بعض نماذج الـ OPL الخاصه بانشطة الصيانة الذاتيه ، وبعض مشغلي الماكينات علي وعي وفهم بمحتواها"},{level:4,score:9,desc:"تم إعداد وتنفيذ كثير من النماذج المخططة للـ OPL الخاصه بانشطة الصيانة الذاتيه ، وكثير من مشغلي الماكينات علي وعي وفهم بمحتواها"},{level:5,score:12,desc:"تم إعداد وتنفيذ معظم النماذج المخططة للـ OPL الخاصه بانشطة الصيانة الذاتيه ، ومعظم مشغلي الماكينات علي وعي وفهم بمحتواها"},{level:6,score:15,desc:"توجد دلائل واضحة علي إعداد وتنفيذ مخطط نماذج الـ OPL الخاصه بجميع انشطة الصيانة الذاتيه ، وجميع مشغلي الماكينات علي وعي وفهم كامل بمحتوي هذه النماذج"}] },
        { id: 8, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل على تنفيذ المراجعة الذاتية علي أنشطة الخطوة التحضيريه"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة التحضيريه"},{level:3,score:2,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة التحضيريه ، ولا يتم نشر النتائج ونقاط القوة وفرص التحسين بالقسم"},{level:4,score:3,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة التحضيريه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لكثير من العاملين بالقسم"},{level:5,score:4,desc:"يتم تنفيذ المراجعة الداخلية الدورية على أنشطة الخطوة التحضيريه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين المعظم العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"},{level:6,score:5,desc:"يتم تنفيذ المراجعة الداخلية الدورية على أنشطة الخطوة التحضيريه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لجميع العاملين بالقسم ، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"}] }
    ]},
    "JH-1": { name: "الخطوة الأولى - التنظيف المبدئي والفحص", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوه الأولى", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي وجود خطة عمل لتنفيذ انشطة الخطوه الأولى لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الأولى لكل قسم ، ولكن توجد أدلة ضعيفة علي إستخدامها في الواقع"},{level:3,score:2,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الأولى لكل قسم ، وتوجد بعض الأدلة على إستخدامها ، كما أن الخطة غير مثبتة على لوحة أنشطة الـ TPM لكل قسم"},{level:4,score:3,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الأولى لكل قسم وتغطي كثير من أنشطة الخطوة ، والخطة متاحة ومعتمدة و مثبتة علي لوحة أنشطة الـ TPM لكل قسم وكثير من مشغلي الماكينات علي دراية بها"},{level:5,score:4,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الأولى لكل قسم وتغطي معظم أنشطة الخطوة، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم ومعظم مشغلي الماكينات بالقسم علي دراية كاملة بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل لتنفيذ انشطة الخطوة الأولى للقسم وتغطي كافة أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وجميع مشغلي الماكينات بالقسم علي دراية بتفاصيلها"}] },
        { id: 2, title: "إعداد وإصدار خرائط الصيانة الذاتية (CLIT MAP)", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد أي دلائل علي إعداد خرائط الصيانة الذاتية لماكينات القسم"},{level:2,score:4,desc:"تم إعداد وإصدار خرائط تغطى قليل من انشطة الصيانة الذاتية لبعض ماكينات القسم موضح عليها رقم وتاريخ الإصدار ، ولكنها تغطي عدد قليل من أجزاء ماكينات القسم"},{level:3,score:8,desc:"تم إعداد وإصدار خرائط بعض انشطة الصيانة الذاتية لبعض من ماكينات القسم موضح عليها رقم وتاريخ الإصدار ، ولكنها تغطي بعض أجزاء ماكينات القسم"},{level:4,score:12,desc:"تم إعداد وإصدار خرائط تغطى كثير من انشطة الصيانة الذاتية لكثير من ماكينات القسم موضح عليها رقم وتاريخ الإصدار ، والخرائط تغطي كثير من أجزاء ماكينات القسم"},{level:5,score:16,desc:"تم إعداد وإصدار خرائط تغطى معظم انشطة الصيانة الذاتية لمعظم ماكينات القسم موضح عليها رقم وتاريخ الإصدار، والخرائط تغطي معظم أجزاء ماكينات القسم"},{level:6,score:20,desc:"تم إعداد وإصدار خرائط تغطى جميع انشطة الصيانة الذاتية المفصلة لماكينات القسم ، وأزمنة ودورية تنفيذها، وموضح عليها رقم وتاريخ الإصدار ، والخرائط تغطي جميع أجزاء ماكينات القسم"}] },
        { id: 3, title: "استخدام التاجات لرصد الظواهر السبع ومصفوفة التاجات", maxScore: 10, levels: [{level:1,score:0,desc:"لا توجد دلائل علي استخدام التاجات بشكل دوري، ولا يتم تسجيل أعدادها في نموذج مصفوفة التاجات"},{level:2,score:2,desc:"توجد أدلة ضعيفة علي استخدام التاجات لرصد الظواهر السبع الغير طبيعية ولم يتم تسجيلها بإنتظام في مصفوفة التاجات"},{level:3,score:4,desc:"توجد عدد قليل من الأدلة علي استخدام تاجات الظواهر السبع الغير طبيعية ولم يتم تسجيلها بانتظام في مصفوفة التاجات"},{level:4,score:6,desc:"توجد كثير من الأدلة علي استخدام تاجات الظواهر السبع الغير طبيعية وأعدادها بإنتظام في مصفوفة التاجات"},{level:5,score:8,desc:"توجد دلائل واضحة على حصر وتصنيف معظم تاجات الظواهر السبع الغير طبيعية بشكل دوري، وتسجيل أعدادها في نموذج مصفوفة التاجات بدقة والمصفوفة تتضمن قوائم مفصلة بالظواهر الغير طبيعية المكتشفة"},{level:6,score:10,desc:"يتم حصر وتصنيف تاجات الظواهر السبع الغير طبيعية بشكل دوري، وتسجيل أعدادها في نموذج مصفوفة التاجات بدقة والمصفوفة تتضمن قوائم مفصلة بالظواهر الغير طبيعية المكتشفة وأهمها الأماكن الصعبة ومصادر التلوث والنفايات والتسريبات"}] },
        { id: 4, title: "رصد الأماكن التي يصعب الوصول إليها", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي إعداد قائمة مفصلة بجميع الأماكن التي يصعب الوصول إليها لتنفيذ أنشطة الصيانة الذاتية"},{level:2,score:1,desc:"تم رصد عدد قليل من الأماكن التي يصعب الوصول إليها لتنفيذ أنشطة الصيانة الذاتية . ولم يتم فتح تاجات لهذه الأماكن"},{level:3,score:2,desc:"تم رصد بعض الأماكن التي يصعب الوصول إليها لتنفيذ أنشطة الصيانة الذاتية وتم فتح تاجات لهذه الأماكن"},{level:4,score:3,desc:"تم رصد كثير من الأماكن التي يصعب الوصول إليها لتنفيذ أنشطة الصيانة الذاتية وتم فتح تاجات لهذه الأماكن"},{level:5,score:4,desc:"تم رصد معظم الأماكن التي يصعب الوصول إليها لتنفيذ أنشطة الصيانة الذاتية . وتم فتح تاجات لهذة الأماكن"},{level:6,score:5,desc:"تم إعداد قائمة مفصلة لرصد جميع الأماكن التي يصعب الوصول إليها لتنفيذ أنشطة الصيانة الذاتية . وتم فتح تاجات لهذه الأماكن ، وإدارة الصيانة قامت بوضع خطة عمل للتعامل معها موضح بها الاجراء الذى تم والتاكد من فاعليه هذة الاجراء وتوثيقه"}] },
        { id: 5, title: "تفعيل إستخدام نماذج ( إعرف - لماذا ) لشرح أسباب المشكلات", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي إستخدام نماذج ( إعرف - لماذا ( الشرح أسباب حدوث المشكلات والظواهر الغير طبيعية التي يتم إكتشافها بماكينات القسم"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي إستخدام نماذج ( إعرف - لماذا ) لشرح أسباب حدوث المشكلات والظواهر الغير طبيعية التي يتم إكتشافها بماكينات القسم"},{level:3,score:2,desc:"يوجد عدد قليل من نماذج ( إعرف - لماذا ) لشرح بعض أسباب حدوث المشكلات والظواهر الغير طبيعية التي يتم إكتشافها بماكينات القسم"},{level:4,score:3,desc:"توجد كثير من الأدلة علي استخدام نماذج ( إعرف - لماذا ) بشكل دوري لشرح كثير من أسباب حدوث المشكلات والظواهر الغير طبيعية التي يتم إكتشافها بماكينات القسم والتعرف علي إجراءات تصحيحها و تم عرض أمثلة النماذج المحدثة بشكل دوري، وتم شرحها لكثير مشغلي الماكينات بالقسم"},{level:5,score:4,desc:"توجد أدلة واضحة وقوية علي إستخدام نماذج ( إعرف - لماذا ) بشكل دوري لشرح معظم أسباب حدوث المشكلات والظواهر الغير طبيعية التي يتم إكتشافها بماكينات القسم والتعرف علي إجراءات تصحيحها و تم عرض أمثلة لمعظم النماذج المحدثة بشكل دوري ، وتم شرحها لمعظم مشغلي الماكينات"},{level:6,score:5,desc:"توجد أدلة واضحة وقوية علي إستخدام نماذج ( إعرف - لماذا ) بشكل دوري لشرح جميع أسباب حدوث المشكلات والظواهر الغير طبيعية التي يتم إكتشافها بماكينات القسم والتعرف علي إجراءات تصحيحها. و تم عرض أمثلة لجميع النماذج المحدثة بشكل دوري، وتم شرحها لجميع مشغلي الماكينات بالقسم"}] },
        { id: 6, title: "خطة عمل لتصحيح المشكلات المسجلة في التاجات ( الإجراءات التصحيحية )", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أي دلائل على وجود خطة عمل مفصلة لتصحيح المشكلات المسجلة في التاجات لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل مبدئية لتصحيح عدد قليل من المشكلات المسجلة في التاجات لكل قسم ، والخطة غير مثبتة علي لوحة أنشطة الـ TPM لكل قسم ، ومشغلي الماكينات بالقسم ليس لديهم وعي بكافة بتفاصيلها"},{level:3,score:2,desc:"توجد خطة عمل مبدئية لتصحيح بعض المشكلات المسجلة في التاجات لكل قسم ، والخطة غير مثبتة علي لوحة أنشطة الـ TPM لكل قسم ، ومشغلي الماكينات بالقسم ليس لديهم وعي بكافة بتفاصيلها"},{level:4,score:3,desc:"توجد خطة عمل مفصلة لتصحيح كثير من المشكلات المسجلة في التاجات لكل قسم ، والخطة مثبتة علي لوحة أنشطة الـ TPM لكل قسم ، وكثير من مشغلي الماكينات بالقسم لديهم وعي بكافة تفاصيلها"},{level:5,score:4,desc:"توجد خطة عمل مفصلة لتصحيح معظم المشكلات المسجلة في التاجات لكل قسم، والخطة مثبتة علي لوحة أنشطة الـ TPM لكل قسم ، ومعظم مشغلي الماكينات بالقسم لديهم وعي بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل مفصلة لتصحيح جميع المشكلات المسجلة في التاجات لكل قسم ، والخطة مثبتة علي لوحة أنشطة الـ TPM لكل قسم ، وجميع مشغلي الماكينات بالقسم لديهم وعي بكافة تفاصيلها"}] },
        { id: 7, title: "التحقق من فعالية التحسين المرتبطة بالقضاء على الظواهر السبع المرصودة بالتاجات", maxScore: 25, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تحليل أسباب الظواهر الغير طبيعية المرصودة بالتاجات وصولا للأسباب الجذرية لها"},{level:2,score:5,desc:"تم تحليل عدد قليل من اسباب الظواهر الغير طبيعية المرصودة بالتاجات وصولا للأسباب الجذرية لها"},{level:3,score:10,desc:"تم تحليل بعض أسباب الظواهر الغير طبيعية المرصودة بالتاجات وصولاً للأسباب الجذرية لها ، وتم تنفيذ بعض التحسينات للقضاء عليها"},{level:4,score:15,desc:"تم تحليل كثير من أسباب الظواهر الغير طبيعية المرصودة بالتاجات وصولا للأسباب الجذرية لها ، وتم تنفيذ بعض التحسينات الملموسة للقضاء عليها ، ويتضح تأثيرها بشكل واضح علي إنخفاض نسب الفواقد ، وتم عرض نماذج الكايزن الموثقة"},{level:5,score:20,desc:"تم تحليل أسباب معظم الظواهر الغير طبيعية المرصودة بالتاجات وصولا للأسباب الجذرية لها ، وتم تنفيذ كثير من التحسينات المطلوبة للقضاء عليها ، والتي يتضح تأثيرها بشكل واضح علي إنخفاض نسب الفواقد ، وتم عرض نماذج الكايزن الموثقة"},{level:6,score:25,desc:"تم تحليل أسباب جميع الظواهر الغير طبيعية المرصودة بالتاجات وصولا للأسباب الجذرية لها ، تم تنفيذ جميع التحسينات المطلوبة للقضاء عليها ويتضح ذلك من تأثيرها علي إنخفاض نسب الفواقد وتم التحقق من إغلاق التاجات وتثبيتها على شجرة التاجات"}] },
        { id: 8, title: "التحقق من فعالية التحسين المرتبطة بتقليل أزمنة الصيانة الذاتية", maxScore: 25, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تحليل أسباب زيادة أزمنة الصيانة الذاتية"},{level:2,score:5,desc:"توجد دلائل ضعيفه على تحليل أسباب زيادة أزمنة الصيانة الذاتية"},{level:3,score:10,desc:"تم تحليل بعض أسباب زيادة أزمنة أنشطة الصيانة الذاتية وتوجد بعض الدلائل علي تنفيذ التحسينات المطلوبة لتقليلها ولكن لم يتضح تأثيرها بشكل واضح"},{level:4,score:15,desc:"تم تحليل كثير من أسباب زيادة أزمنة أنشطة الصيانة الذاتية وتم تنفيذ عدد من التحسينات الملموسة لتقليلها ، ويتضح تأثيرها بشكل واضح علي إنخفاض تلك الأزمنة ، وتم عرض نماذج الكايزن الموثقة لتلك التحسينات"},{level:5,score:20,desc:"تم تحليل معظم أسباب زيادة أزمنة أنشطة الصيانة الذاتية وتم تنفيذ عدد من التحسينات الملموسة لتقليلها ، ويتضح تأثيرها بشكل واضح علي إنخفاض تلك الأزمنة ، وتم عرض نماذج الكايزن الموثقة لتلك التحسينات"},{level:6,score:25,desc:"تم تحليل جميع أسباب زيادة أزمنة أنشطة الصيانة الذاتية وتم تنفيذ جميع التحسينات المخططة والملموسة لتقليلها وتعميمها في الأماكن المشابهة، وهناك أدلة متعددة توضح تأثيرها الكبير على إنخفاض تلك الأزمنة ، وتم عرض نماذج الكايزن الموثقة"} ] },
        { id: 9, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الأولى"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الأولى"},{level:3,score:2,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الأولى ، ولا يتم نشر النتائج ونقاط القوة وفرص التحسين بالقسم"},{level:4,score:3,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الأولى ، ويتم نشر النتائج ونقاط القوة وفرص التحسين كثير العاملين بالقسم"},{level:5,score:4,desc:"يتم تنفيذ المراجعة الداخلية الدورية على أنشطة الخطوة الأولى ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لمعظم العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"},{level:6,score:5,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الأولى ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لجميع العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"}] }
    ]},
    "JH-2": { name: "الخطوة الثانية - القضاء على مصادر التلوث", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوه الثانية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أي دلائل علي وجود خطة عمل لتنفيذ انشطة الخطوه الثانيه لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثانيه لكل قسم ، ولكن توجد أدلة ضعيفة علي إستخدامها في الواقع"},{level:3,score:2,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثانيه لكل قسم ، وتوجد بعض الأدلة على إستخدامها ، كما أن الخطة غير مثبتة على لوحة أنشطة الـ TPM لكل قسم"},{level:4,score:3,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثانيه لكل قسم وتغطي كثير من أنشطة الخطوة ، والخطة متاحة ومعتمدة و مثبتة علي لوحة أنشطة الـ TPM لكل قسم وكثير من مشغلي الماكينات علي دراية بها"},{level:5,score:4,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثانيه لكل قسم وتغطي معظم أنشطة الخطوة، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم ومعظم مشغلي الماكينات بالقسم علي دراية كاملة بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثانيه للقسم وتغطي كافة أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وجميع مشغلي الماكينات بالقسم علي دراية بتفاصيلها"}] },
        { id: 2, title: "الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى", maxScore: 10, levels: [{level:1,score:0,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها أقل من 20%"},{level:2,score:2,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها أقل من 40%"},{level:3,score:4,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها اقل من 60%"},{level:4,score:6,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها اكثر من 70%"},{level:5,score:8,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها اكثر من 80%"},{level:6,score:10,desc:"يتم الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها بنسبة 100%"}] },
        { id: 3, title: "وعي العاملين بمصادر التلوث والتسريبات والنفايات", maxScore: 20, levels: [{level:1,score:0,desc:"مشغلي الماكينات ليس لديهم وعي بأى من مصادر التلوث والتسريبات والنفايات"},{level:2,score:4,desc:"مشغلي الماكينات لديهم معرفة بسيطه بمصادر التلوث والتسريبات والنفايات"},{level:3,score:8,desc:"مشغلي الماكينات لديهم معرفة ببعض مصادر التلوث والتسريبات والنفايات والغرض من القضاء عليها"},{level:4,score:12,desc:"مشغلي الماكينات لديهم معرفة بكثير من مصادر التلوث والتسريبات والنفايات والغرض من القضاء عليها"},{level:5,score:16,desc:"مشغلى الماكينات لديهم وعى بمعظم مصادر التلوث والتسريبات ( هواء / غاز / مياه / شحوم / زيوت ) والنفايات والغرض من القضاء عليها"},{level:6,score:20,desc:"جميع مشغلي الماكينات بالقسم لديهم وعي كامل بكافة مصادر والتلوث والتسريبات ( هواء / غاز / مياه / شحوم / زيوت ) والنفايات والغرض من القضاء عليها"}] },
        { id: 4, title: "رصد مصادر التلوث والتسريبات والنفايات", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي رصد مصادر التلوث"},{level:2,score:4,desc:"توجد ادلة ضعيفة على رصد مصادر التلوث"},{level:3,score:8,desc:"توجد نماذج لرصد بعض مصادر التلوث"},{level:4,score:12,desc:"توجد خرائط لرصد كثير من المصادر المولدة ومسجلة بنماذج موضح بها المكان والكمية وتم ربطها بتاجات مصادر التلوث ، والنماذج مثبتة على لوحة أنشطة الصيانة الذاتية ، ومشغلي الماكينات ليس لديهم وعي بها"},{level:5,score:16,desc:"توجد خرائط مفصلة لرصد معظم المصادر المولدة ومسجلة بنماذج موضح بها المكان والكمية وتم ربطها بتاجات مصادر التلوث، والنماذج مثبتة على لوحة أنشطة الصيانة الذاتية .. ومعظم مشغلى الماكينات لديهم وعى بها"},{level:6,score:20,desc:"توجد خرائط مفصلة لرصد جميع المصادر المولدة ومسجلة بنماذج موضح بها المكان والكمية وتم ربطها بتاجات مصادر التلوث ، والنماذج مثبتة علي لوحة أنشطة الصيانة الذاتية ، وجميع مشغلي الماكينات لديهم وعي بها"}] },
        { id: 5, title: "رصد الأماكن التي يصعب الوصول إليها", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أي دلائل علي رصد الأماكن التي يصعب الوصول إليها"},{level:2,score:1,desc:"توجد ادلة ضعيفة على رصد الأماكن التي يصعب الوصول إليها"},{level:3,score:2,desc:"توجد نماذج لرصد بعض الأماكن التي يصعب الوصول إليها"},{level:4,score:3,desc:"توجد خرائط لرصد كثير من الأماكن صعبة الوصول ومسجلة بنماذج موضح بها الأماكن وتصنيفها وربطها بتاجات الاماكن الصعبة الوصول"},{level:5,score:4,desc:"توجد خرائط مفصلة لرصد معظم الأماكن صعبة الوصول ومسجلة بنماذج موضح بها المكان وتصنيفها وتم ربطها بتاجات الأماكن الصعبة الوصول، والنماذج مثبتة علي لوحة انشطة الصيانة الذاتية ، ومعظم مشغلي الماكينات لديهم وعى بها"},{level:6,score:5,desc:"توجد خرائط مفصلة لرصد جميع الأماكن الصعبة الوصول ومسجلة بنماذج موضح بها المكان وتصنيفها وتم ربطها بتاجات الأماكن الصعبة الوصول، والنماذج مثبتة علي لوحة أنشطة الصيانة الذاتية ، وجميع مشغلي الماكينات لديهم وعى بها"}] },
        { id: 6, title: "تنفيذ الإجراءات التصحيحية والمانعة للقضاء علي مصادر التلوث", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد دلائل توضح اتخاذ أي اجراءات تصحيحية للقضاء على المصادر المولدة"},{level:2,score:4,desc:"توجد أدلة ضعيفة على اتخاذ اجراءات تصحيحية للقضاء على المصادر المولدة"},{level:3,score:8,desc:"توجد بعض الأدلة على اتخاذ اجراءات تصحيحية للقضاء على المصادر المولدة"},{level:4,score:12,desc:"تم تنفيذ كثير من الإجراءات التصحيحية والمانعة للقضاء علي المصادر المولدة ، وتم توثيق تلك الاجراءات بنماذج الكايزن"},{level:5,score:16,desc:"تم تنفيذ معظم الإجراءات التصحيحية والمانعة للقضاء علي المصادر المولدة ، وتم توثيق تلك الاجراءات بنماذج الكايزن وعرض أثر النتائج الاجمالية للتحسينات المنفذة على تخفيض المصادر المولدة، ونشرها على معظم مشغلي الماكينات"},{level:6,score:20,desc:"توجد دلائل قوية على تنفيذ الإجراءات التصحيحية والمانعة للقضاء علي المصادر المولدة ، وجميع الاجراءات تم توثيقها بنماذج الكايزن وعرض أثر النتائج الاجمالية للتحسينات المنفذة على تخفيض المصادر المولدة ونشرها على جميع مشغلى الماكينات"}] },
        { id: 7, title: "تنفيذ الإجراءات التصحيحية والمانعة للقضاء علي الأماكن الصعبة", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد دلائل توضح اتخاذ أي اجراءات تصحيحية للقضاء علي الأماكن التي يصعب الوصول إليها"},{level:2,score:4,desc:"توجد أدلة ضعيفة صفة على اتخاذ إجراءات تصحيحية للقضاء علي الأماكن التي يصعب الوصول إليها"},{level:3,score:8,desc:"توجد بعض الأدلة على ى اتخاذ اجراءات التصحيحية والمانعة للقضاء علي الأماكن التي يصعب الوصول إليها"},{level:4,score:12,desc:"تم تنفيذ كثير من الإجراءات التصحيحية والمانعة للقضاء علي الأماكن التي يصعب الوصول إليها ، وتم توثيق تلك الاجراءات بنماذج الكايزن"},{level:5,score:16,desc:"تم تنفيذ معظم الإجراءات التصحيحية والمانعة للقضاء علي الأماكن صعبة الوصول ، وتم توثيق تلك الاجراءات بنماذج الكايزن وعرض أثر النتائج الاجمالية للتحسينات المنفذة على تخفيض معظم أزمنة الصيانة الذاتية ونشرها لمعظم مشغلى الماكينات"},{level:6,score:20,desc:"تم تنفيذ جميع الإجراءات التصحيحية والمانعة للقضاء علي الأماكن صعبة الوصول والأسلاك والمواسير التي تمثل عقبة في التنظيف، وجميع الاجراءات تم توثيقها بنماذج الكايزن وعرض أثر النتائج الاجمالية للتحسينات لى تخفيض أزمنة الصيانة الذاتية، ونشرها لجميع مشغلى الماكينات"}] },
        { id: 8, title: "تقسيم موضوعات التحسين المطلوبة (PDCA)", maxScore: 10, levels: [{level:1,score:0,desc:"لم يتم تقسيم موضوعات التحسين المطلوبة للقضاء على الظواهر السبع الغير طبيعية"},{level:2,score:2,desc:"تم تقسيم عدد قليل من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية"},{level:3,score:4,desc:"تم تقسيم بعض موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية ، ولا يتم إستخدام أى من منهجيات التحسين المختلفة"},{level:4,score:6,desc:"تم تقسيم كثير من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية ، ويتم إستخدام منهجيات التحسين المختلفة مثل نموذج الـ ( PDCA )"},{level:5,score:8,desc:"تم تقسيم معظم موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية ، ويتم استخدام منهجيات التحسين المختلفة مثل نموذج الـ (PDCA ) مدعم بمنحنى بياني يوضح فعالية منهجيات التحسين"},{level:6,score:10,desc:"تم تقسيم جميع موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية ، ويتم إستخدام منهجيات التحسين المختلفة مثل نموذج الـ (DCA) مدعم بمنحنى بياني يوضح فعالية منهجيات التحسين"}] },
        { id: 9, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الثانيه"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الثانيه"},{level:3,score:2,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثانيه ، ولا يتم نشر النتائج ونقاط القوة وفرص التحسين بالقسم"},{level:4,score:3,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثانيه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين كثير العاملين بالقسم"},{level:5,score:4,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثانيه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لمعظم العاملين بالقسم ، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"},{level:6,score:5,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثانيه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لجميع العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"}] }
    ]},
    "JH-3": { name: "الخطوة الثالثة - معايير التنظيف والتزييت", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوه الثالثة", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي وجود خطة عمل لتنفيذ انشطة الخطوه الثالثه لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثالثه لكل قسم ، ولكن توجد أدلة ضعيفة علي إستخدامها في الواقع"},{level:3,score:2,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثالثه لكل قسم ، وتوجد بعض الأدلة على إستخدامها ، كما أن الخطة غير مثبتة على لوحة أنشطة الـ TPM لكل قسم"},{level:4,score:3,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثالثه لكل قسم وتغطى كثير من أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وكثير من مشغلي الماكينات علي دراية بها"},{level:5,score:4,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثالثه لكل قسم وتغطي معظم أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم ومعظم مشغلي الماكينات بالقسم علي دراية كاملة بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثالثه للقسم وتغطي كافة أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وجميع مشغلي الماكينات بالقسم على دراية بتفاصيلها"}] },
        { id: 2, title: "مدى تحسن الشروط بعد اتمام خطوة التنظيف المبدئى", maxScore: 5, levels: [{level:1,score:0,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها أقل من 20 %"},{level:2,score:1,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها أقل من 40 %"},{level:3,score:2,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها اقل من 60%"},{level:4,score:3,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها اكثر من 70%"},{level:5,score:4,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها اكثر من 80 %"},{level:6,score:5,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها بنسبة 100 %"}] },
        { id: 3, title: "الحفاظ على مستوى الخطوة الثانية", maxScore: 5, levels: [{level:1,score:0,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الثانيه وشروط اجتيازها أقل من 20 %"},{level:2,score:1,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الثانيه وشروط اجتيازها أقل من 40 %"},{level:3,score:2,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الثانيه وشروط اجتيازها اقل من 60%"},{level:4,score:3,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الثانيه وشروط اجتيازها اكثر من 70%"},{level:5,score:4,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الثانيه وشروط اجتيازها اكثر من 80 %"},{level:6,score:5,desc:"يتم الحفاظ على مستوى تطبيق أنشطة الخطوة الثانيه وشروط اجتيازها بنسبة 100 %"}] },
        { id: 4, title: "معايير التنظيف في خرائط الصيانة الذاتية", maxScore: 15, levels: [{level:1,score:0,desc:"لم يتم تحديد معايير التنظيف في خرائط الصيانة الذاتية"},{level:2,score:3,desc:"تم تحديد عدد قليل من معايير التنظيف ، ولم يتم عمل Foot Map ، ولم يتم استخدام علامات الإدارة المرئية، وأدوات ومواد التنظيف غير متوفرة"},{level:3,score:6,desc:"تم تحديد بعض من معايير التنظيف ، ولم يتم عمل Foot Map ويتم استخدام بعض علامات الإدارة المرئية، وأدوات ومواد التنظيف غير متوفرة"},{level:4,score:9,desc:"تم تحديد كثير من معايير التنظيف ، ولم يتم عمل Foot Map ويتم استخدام بعض علامات الإدارة المرئية، وأدوات ومواد التنظيف متوفرة"},{level:5,score:12,desc:"تم تحديد معظم معايير التنظيف ، وتم عمل Foot Map ويتم استخدام معظم علامات الإدارة المرئية، وأدوات ومواد التنظيف متوفرة بالقرب من موقع العمل"},{level:6,score:15,desc:"تم تحديد جميع معايير التنظيف ، وتم عمل Foot Map ويتم استخدام جميع علامات الإدارة المرئية، وأدوات ومواد التنظيف متوفرة بالقرب من موقع العمل"}] },
        { id: 5, title: "معايير التزييت والتشحيم فى خرائط الصيانة الذاتية", maxScore: 15, levels: [{level:1,score:0,desc:"لم يتم تحديد معايير التزييت والتشحيم فى خرائط الصيانة الذاتية"},{level:2,score:3,desc:"تم تحديد عدد قليل من معايير التزييت والتشحيم ، ولم يتم عمل Foot Map ، ولم يتم استخدام علامات الإدارة المرئية، وأدوات التزييت والتشحيم غير متوفرة"},{level:3,score:6,desc:"تم تحديد بعض من معايير التزييت والتشحيم ، ولم يتم عمل Foot Map ، ويتم استخدام بعض علامات الإدارة المرئية، وأدوات التزييت والتشحيم متوفرة"},{level:4,score:9,desc:"تم تحديد كثير من معايير التزيت والتشحيم ، وتم عمل Foot Map ، ويتم استخدام كثير من علامات الإدارة المرئية، وأدوات ومواد التشحيم والتزيت متوفرة ، وتم التأكد من سلامة ونظافة معدات التزييت والتشحيم ، ولكن لا يوجد وسائل حماية مبتكرة لمنع تلوثها"},{level:5,score:12,desc:"تم تحديد معظم معايير التزيت والتشحيم ، وتم عمل Foot Map ويتم استخدام معظم علامات الإدارة المرئية، وأدوات ومواد التشحيم والتزييت متوفرة بالقرب من موقع العمل، ويتم التأكد من سلامة ونظافة معدات التزييت والتشحيم ، ويوجد وسائل حماية مبتكرة لمنع تلوثها"},{level:6,score:15,desc:"تم تحديد جميع معايير التزيت والتشحيم ، وتم عمل Foot Map ، ويتم استخدام جميع علامات الإدارة المرئية، وأدوات ومواد التشحيم والتزييت متوفرة بالقرب من موقع العمل ، ويتم التأكد من سلامة ونظافة معدات التزييت والتشحيم ، ويوجد وسائل حماية مبتكرة لمنع تلوثها ، ويتم التأكد من وضوح مبينات الزيت والحد الأدنى والأقصى لمستويات الزيوت"}] },
        { id: 6, title: "معايير الفحص في خرائط الصيانة الذاتية", maxScore: 15, levels: [{level:1,score:0,desc:"لم يتم تحديد معايير الفحص في خرائط الصيانة الذاتية"},{level:2,score:3,desc:"تم تحديد عدد قليل من معايير الفحص ، ولم يتم عمل Foot Map ، ولم يتم استخدام علامات الإدارة المرئية، وأدوات الفحص غير متوفرة"},{level:3,score:6,desc:"تم تحديد بعض من معايير الفحص ، ولم يتم عمل Foot Map ويتم استخدام بعض علامات الإدارة المرئية، وأدوات الفحص غير متوفرة"},{level:4,score:9,desc:"تم تحديد كثير من معايير الفحص ، ولم يتم عمل Foot Map ويتم استخدام بعض علامات الإدارة المرئية، وأدوات الفحص متوفرة"},{level:5,score:12,desc:"تم تحديد معظم معايير الفحص ، وتم عمل Foot Map ، ويتم استخدام معظم علامات الإدارة المرئية، وأدوات الفحص متوفرة بالقرب من موقع العمل"},{level:6,score:15,desc:"تم تحديد جميع معايير الفحص ، وتم عمل Foot Map ويتم استخدام جميع علامات الإدارة المرئية، وأدوات الفحص متوفرة بالقرب من موقع العمل"}] },
        { id: 7, title: "معايير التربيط فى خرائط الصيانة الذاتية", maxScore: 15, levels: [{level:1,score:0,desc:"لم يتم تحديد معايير التربيط فى خرائط الصيانة الذاتية"},{level:2,score:3,desc:"تم تحديد عدد قليل من معايير التربيط ، ولم يتم عمل Foot Map ، ولم يتم استخدام علامات الإدارة المرئية، وأدوات التربيط غير متوفرة"},{level:3,score:6,desc:"تم تحديد بعض من معايير التربيط ، ولم يتم عمل Foot Map ، ويتم استخدام بعض علامات الإدارة المرئية، وأدوات التربيط غير متوفرة"},{level:4,score:9,desc:"تم تحديد كثير من معايير التربيط ، ولم يتم عمل Foot Map ، ويتم استخدام بعض علامات الإدارة المرئية، وأدوات التربيط متوفرة"},{level:5,score:12,desc:"تم تحديد معظم معايير التربيط ، وتم عمل Foot Map ، ويتم استخدام معظم علامات الإدارة المرئية، وأدوات التربيط متوفرة بالقرب من موقع العمل"},{level:6,score:15,desc:"تم تحديد جميع معايير التربيط ، وتم عمل Foot Map ، ويتم استخدام جميع علامات الإدارة المرئية، وأدوات التربيط متوفرة بالقرب من موقع العمل"}] },
        { id: 8, title: "تفعيل إستخدام نماذج الفحص الدوري", maxScore: 25, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي قيام مشغلي الماكينات باستخدام نماذج الفحص الدورية"},{level:2,score:5,desc:"توجد أدلة ضعيفة علي قيام مشغلي الماكينات باستخدام نماذج الفحص الدورية لقليل من انشطة الصيانه الذاتيه"},{level:3,score:10,desc:"يقوم بعض المشغلين بالقسم باستخدام نماذج الفحص الدورية بإنتظام وفاعلية وتعكس الحاله الفعليه للماكينه ولا يتم تسجيل الوقت الفعلى للبنود"},{level:4,score:15,desc:"يقوم كثير من المشغلين بالقسم بإستخدام نماذج الفحص الدورية بإنتظام وفاعلية وتعكس الحاله الفعليه للماكينه ويتم تسجيل الوقت الفعلى للبنود"},{level:5,score:20,desc:"يقوم معظم المشغلين بالقسم باستخدام نماذج الفحص الدورية بإنتظام وفاعلية وتعكس الحاله الفعليه للماكينه ويتم تسجيل الوقت الفعلى للبنود ، ويوجد اعتماد المشرف الانتاج والصيانه ومهندس الصيانه على النماذج"},{level:6,score:25,desc:"يقوم جميع المشغلين بالقسم باستخدام نماذج الفحص الدورية بإنتظام وفاعلية وتعكس الحاله الفعليه للماكينه ويتم تسجيل الوقت الفعلى للبنود ، ويوجد اعتماد المشرف الانتاج والصيانه ومهندس الصيانه على النماذج"}] },
        { id: 9, title: "رصد فواقد التسريبات وتحديث الخرائط", maxScore: 10, levels: [{level:1,score:0,desc:"لم يتم تقسيم موضوعات التحسين المطلوبة"},{level:2,score:2,desc:"تم تقسيم عدد قليل من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية"},{level:3,score:4,desc:"تم تقسيم بعض موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية"},{level:4,score:6,desc:"تم تقسيم كثير من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( رصد كثير من فواقد التسريبات واستهلاكات الزيوت والشحوم - موقف تحديث كثير من اصدارات الخرائط )"},{level:5,score:8,desc:"تم تقسيم معظم موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج رصد معظم فواقد التسريبات واستهلاكات الزيوت والشحوم - موقف تحديث معظم اصدارات الخرائط"},{level:6,score:10,desc:"تم تقسيم جميع موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( رصد جميع فواقد التسريبات واستهلاكات الزيوت والشحوم - وموقف تحديث جميع اصدارات الخرائط ) . مع وجود منحنيات توضح الموقف قبل وبعد التطبيق"}] },
        { id: 10, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الثالثة"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الثالثه"},{level:3,score:2,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثالثه ، ولا يتم نشر النتائج ونقاط القوة وفرص التحسين بالقسم"},{level:4,score:3,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثالثه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين كثير العاملين بالقسم"},{level:5,score:4,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثالثه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لمعظم العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"},{level:6,score:5,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثالثه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لجميع العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"}] }
    ]},
    "JH-4": { name: "الخطوة الرابعة - الفحص العام", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوة الرابعة", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي وجود خطة عمل لتنفيذ انشطة الخطوه الرابعه لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الرابعه لكل قسم ، ولكن توجد أدلة ضعيفة علي إستخدامها في الواقع"},{level:3,score:2,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الرابعه لكل قسم ، وتوجد بعض الأدلة على إستخدامها ، كما أن الخطة غير مثبتة على لوحة أنشطة الـ TPM لكل قسم"},{level:4,score:3,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الرابعه لكل قسم وتغطي كثير من أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وكثير من مشغلي الماكينات على دراية بها"},{level:5,score:4,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الرابعه لكل قسم وتغطي معظم أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم ومعظم مشغلي الماكينات بالقسم علي دراية كاملة بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الرابعه للقسم وتغطي كافة أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وجميع مشغلي الماكينات بالقسم علي دراية بتفاصيلها"}] },
        { id: 2, title: "الحفاظ على مستوى الخطوات السابقة", maxScore: 5, levels: [{level:1,score:0,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-3 وشروط اجتيازهم أقل من 20 %"},{level:2,score:1,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-3 وشروط اجتيازهم أقل من 40 %"},{level:3,score:2,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-3 وشروط اجتيازهم اقل من 60%"},{level:4,score:3,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-3 وشروط اجتيازهم اكثر من 70%"},{level:5,score:4,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-3 وشروط اجتيازهم اكثر من 80 %"},{level:6,score:5,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-3 وشروط اجتيازهم بنسبة 100 %"}] },
        { id: 3, title: "اعداد مصفوفة المهارات (Skill Matrix)", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد أدلة على انه تم ربط المواد العلمية ب SKILL MATRIX"},{level:2,score:4,desc:"توجد أدلة ضعيفه على ربط المواد العلميه لبعض المهارات الخاصه بفنى و مشرف الصيانة بمشغلى الماكينة"},{level:3,score:8,desc:"يتم الاطلاع علي مصفوفة بعض مهارات فني ومشرف الصيانة و إعداد المهارات المطلوبه لمشغلي الماكينات ، و يتم تنفيذ البرامج التدريبية تدريجيا"},{level:4,score:12,desc:"يتم الإطلاع علي مصفوفة كثير من مهارات فني ومشرف الصيانة و إعداد المهارات المطلوبه لمشغلي الماكينات ، و يتم تنفيذ البرامج التدريبية تدريجيا، ويتم تقسيم زمن البرامج التدريبية بحيث يكون 25% من الزمن تدريب أكاديمي و 75% من الزمن تدريب في موقع العمل بغرفة التدريب"},{level:5,score:16,desc:"يتم الاطلاع على مصفوفة معظم مهارات فني ومشرف الصيانة و إعداد المهارات المطلوبه لمشغلي الماكينات ، و يتم تنفيذ البرامج التدريبية تدريجيا، ويتم تقسيم زمن البرامج التدريبية بحيث يكون 25% من الزمن تدريب أكاديمي و 75% من الزمن تدريب في موقع العمل بغرفة التدريب"},{level:6,score:20,desc:"يتم الاطلاع علي مصفوفة جميع مهارات فني ومشرف الصيانة و إعداد المهارات المطلوبه لمشغلي الماكينات ، و يتم تنفيذ البرامج التدريبية تدريجيا، ويتم تقسيم زمن البرامج التدريبية بحيث يكون 25% من الزمن تدريب أكاديمي و 75% من الزمن تدريب في موقع العمل بغرفة التدريب"}] },
        { id: 4, title: "تعلم مهارات الفحص العام للتزييت والتشحيم", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد اى دلائل على اعداد المواد العلميه للتزييت والتشحيم"},{level:2,score:1,desc:"توجد دلائل ضعيفة على اعداد القليل من المواد العلميه للتزييت والتشحيم"},{level:3,score:2,desc:"تم الانتهاء من اعداد بعض من المواد العلميه للتزييت والتشحيم و بعض من العاملين اتقنوا هذة المهاره"},{level:4,score:3,desc:"تم الانتهاء من اعداد كثير من المواد العلميه للتزييت والتشحيم وكثير من العاملين اتقنوا هذة المهارة وكثير من المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:5,score:4,desc:"تم الانتهاء من اعداد معظم المواد العلميه للتزييت والتشحيم و معظم العاملين اتقنوا هذة المهاره معظم المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:6,score:5,desc:"تم الانتهاء من اعداد جميع المواد العلميه للتزييت والتشحيم و جميع العاملين اتقنوا هذة المهاره وجميع المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"}] },
        { id: 5, title: "تقييم الموقع ( التزييت والتشحيم )", maxScore: 10, levels: [{level:1,score:0,desc:"تم تقييم الموقع ولا توجد دلائل في الواقع على تطبيق المهارات المكتسبة من دورة التزييت والتشحيم على الماكينات و الادوات"},{level:2,score:2,desc:"تم تقييم الموقع وتوجد أدلة ضعيفة على تطبيق المهارات المكتسبة من دورة التزييت والتشحيم على الماكينات و الادوات"},{level:3,score:4,desc:"تم تقييم الموقع وتوجد بعض الأدلة على تطبيق المهارات المكتسبة من دورة التزييت والتشحيم على الماكينات و الادوات"},{level:4,score:6,desc:"تم تقييم الموقع وتوجد الكثير من الأدلة على تطبيق المهارات المكتسبة من دورة التزييت والتشحيم على الماكينات والادوات"},{level:5,score:8,desc:"تم تقييم الموقع وتم التأكد من تطبيق معظم المهارات المكتسبة من دورة التزييت والتشحيم على الماكينات و الادوات"},{level:6,score:10,desc:"اتضح من تقييم الموقع لأنشطة الفحص العام للتزييت والتشحيم انه يتم تطبيق الخرائط ويوجد أعادة تدوير للزيوت ويتم تنميط انواع الزيوت ويتم المحافظه عليها من التلوث ويلتزم المكان الذي يصرف منه الزيت بالنوع ولا توجد اتربة ملتصقة على عبوات الزيوت"}] },
        { id: 6, title: "تعلم مهارات الفحص العام وسائل نقل الحركة", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد اى دلائل على اعداد المواد العلميه لوسائل نقل الحركه"},{level:2,score:1,desc:"توجد دلائل ضعيفة على اعداد القليل من المواد العلميه لوسائل نقل الحركه"},{level:3,score:2,desc:"تم الانتهاء من اعداد بعض من المواد العلميه لوسائل نقل الحركه و بعض من العاملين اتقنوا هذة المهاره"},{level:4,score:3,desc:"تم الانتهاء من اعداد كثير من المواد العلمية لوسائل نقل الحركه وكثير من العاملين اتقنوا هذه المهارة وكثير من المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة لحل المشكلة"},{level:5,score:4,desc:"تم الانتهاء من اعداد معظم المواد العلميه لوسائل نقل الحركه و معظم العاملين اتقنوا هذة المهاره معظم المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:6,score:5,desc:"تم الانتهاء من اعداد جميع المواد العلميه لوسائل نقل الحركه و جميع العاملين اتقنوا هذة المهاره وجميع المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"}] },
        { id: 7, title: "تقييم الموقع ( وسائل نقل الحركة Drives )", maxScore: 10, levels: [{level:1,score:0,desc:"تم تقييم الموقع ولا توجد دلائل في الواقع على تطبيق المهارات المكتسبة من دورة وسائل نقل الحركة على الماكينات و الادوات"},{level:2,score:2,desc:"تم تقييم الموقع وتوجد أدلة ضعيفة على تطبيق المهارات المكتسبة من دورة وسائل نقل الحركة على الماكينات و الادوات"},{level:3,score:4,desc:"تم تقييم الموقع وتوجد بعض الأدلة على تطبيق المهارات المكتسبة من دورة وسائل نقل الحركة على الماكينات و الادوات"},{level:4,score:6,desc:"تم تقييم الموقع وتوجد الكثير من الأدلة على تطبيق المهارات المكتسبة من دورة وسائل نقل الحركة على الماكينات والادوات"},{level:5,score:8,desc:"تم تقييم الموقع وتم التأكد من تطبيق معظم المهارات المكتسبة من دورة وسائل نقل الحركة على الماكينات و الادوات"},{level:6,score:10,desc:"اتضح من تقييم الموقع لأنشطة الفحص العام لوسائل نقل الحركة انه يتم تطبيق الخرائط وفحص جميع وسائل نقل الحركه وفحص كل من ( الاستقامه والاستطاله والحاله ودرجة الحراره الاهتزاز والضوضاء وسهوله الفحص بصريا )"}] },
        { id: 8, title: "تعلم مهارات الفحص العام هيدروليك و نيوماتيك", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد اى دلائل على اعداد المواد العلميه للهيدروليك والنيوماتيك"},{level:2,score:1,desc:"توجد دلائل ضعيفة على اعداد القليل من المواد العلميه للهيدروليك والنيوماتيك"},{level:3,score:2,desc:"تم الانتهاء من اعداد بعض من المواد العلميه للهيدروليك والنيوماتيك و بعض من العاملين اتقنوا هذه المهاره"},{level:4,score:3,desc:"تم الانتهاء من اعداد كثير من المواد العلميه للهيدروليك والنيوماتيك وكثير من العاملين اتقنوا هذة المهارة وكثير من المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:5,score:4,desc:"تم الانتهاء من اعداد معظم المواد العلميه للهيدروليك والنيوماتيك و معظم العاملين اتقنوا هذة المهاره معظم المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:6,score:5,desc:"تم الانتهاء من اعداد جميع المواد العلميه للهيدروليك والنيوماتيك و جميع العاملين اتقنوا هذة المهاره وجميع المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"}] },
        { id: 9, title: "تقييم الموقع ( هيدروليك ونيوماتيك )", maxScore: 10, levels: [{level:1,score:0,desc:"تم تقييم الموقع ولا توجد دلائل في الواقع على تطبيق المهارات المكتسبة من دورة الهيدروليك والنيوماتيك على الماكينات و الادوات"},{level:2,score:2,desc:"تم تقييم الموقع وتوجد أدلة ضعيفة على تطبيق المهارات المكتسبة من دورة الهيدروليك والنيوماتيك على الماكينات و الادوات"},{level:3,score:4,desc:"تم تقييم الموقع وتوجد بعض الأدلة على تطبيق المهارات المكتسبة من دورة الهيدروليك والنيوماتيك على الماكينات و الادوات"},{level:4,score:6,desc:"تم تقييم الموقع وتوجد الكثير من الأدلة على تطبيق المهارات المكتسبة من دورة الهيدروليك والنيوماتيك على الماكينات والادوات"},{level:5,score:8,desc:"تم تقييم الموقع وتم التأكد من تطبيق معظم المهارات المكتسبة من دورة الهيدروليك والنيوماتيك على الماكينات و الادوات"},{level:6,score:10,desc:"اتضح من تقييم الموقع لأنشطة الفحص العام للهيدروليك والنيوماتيك انه يتم تطبيق الخرائط وفحص جميع معدات الهيدروليك والنيوماتيك كل من ( التسريبات - الضوضاء - الاهتزازات - الحاله - الروائح - الفلاتر - سهوله الفحص وقراءة الضغوط )"}] },
        { id: 10, title: "تعلم المهارات الفحص العام أساسيات الكهرباء", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد اى دلائل على اعداد المواد العلمية الخاصه بالكهرباء"},{level:2,score:1,desc:"توجد دلائل ضعيفة على اعداد القليل من المواد العلميه الخاصه بالكهرباء"},{level:3,score:2,desc:"تم الانتهاء من اعداد بعض من المواد العلميه الخاصه بالكهرباء و بعض من العاملين اتقنوا هذه المهاره"},{level:4,score:3,desc:"تم الانتهاء من اعداد كثير من المواد العلمية الخاصه بالكهرباء وكثير من العاملين اتقنوا هذه المهارة وكثير من المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:5,score:4,desc:"تم الانتهاء من اعداد معظم المواد العلميه الخاصه بالكهرباء ومعظم العاملين اتقنوا هذة المهاره معظم المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:6,score:5,desc:"تم الانتهاء من اعداد جميع المواد العلميه الخاصه بالكهرباء و جميع العاملين اتقنوا هذة المهاره وجميع المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"}] },
        { id: 11, title: "تقييم الموقع ( كهرباء )", maxScore: 10, levels: [{level:1,score:0,desc:"تم تقييم الموقع ولا توجد دلائل في الواقع على تطبيق المهارات المكتسبة من دورة أساسيات الكهرباء على الماكينات و الادوات"},{level:2,score:2,desc:"تم تقييم الموقع وتوجد أدلة ضعيفة على تطبيق المهارات المكتسبة من دورة أساسيات الكهرباء على الماكينات و الادوات"},{level:3,score:4,desc:"تم تقييم الموقع وتوجد بعض الأدلة على تطبيق المهارات المكتسبة من دورة أساسيات الكهرباء على الماكينات و الادوات"},{level:4,score:6,desc:"تم تقييم الموقع وتوجد الكثير من الأدلة على تطبيق المهارات المكتسبة من دورة أساسيات الكهرباء على الماكينات والادوات"},{level:5,score:8,desc:"تم تقييم الموقع وتم التأكد من تطبيق معظم المهارات المكتسبة من دورة أساسيات الكهرباء على الماكينات و الادوات"},{level:6,score:10,desc:"اتضح من تقييم الموقع الفحص العام الأساسيات الكهرباء انه يتم تطبيق الخرائط التنظيف وفحص جميع المعدات الكهربائيه ( التوزيع الكهربي و التحكم - درجات الحرارة - حاله الحساسات وحامل الاسلاك )"}] },
        { id: 12, title: "تعلم المهارات الفحص العام المسامير والصواميل", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد اى دلائل على اعداد المواد العلميه للمسامير والصواميل"},{level:2,score:1,desc:"توجد دلائل ضعيفة على اعداد القليل من المواد العلميه للمسامير والصواميل"},{level:3,score:2,desc:"تم الانتهاء من اعداد بعض من المواد العلميه للمسامير والصواميل و بعض من العاملين اتقنوا هذه المهاره"},{level:4,score:3,desc:"تم الانتهاء من أعداد كثير من المواد العلميه للمسامير والصواميل وكثير من العاملين اتقنوا هذه المهارة وكثير من المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة لحل المشكلة"},{level:5,score:4,desc:"تم الانتهاء من اعداد معظم المواد العلميه للمسامير والصواميل و معظم العاملين اتقنوا هذة المهاره معظم المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:6,score:5,desc:"تم الانتهاء من اعداد جميع المواد العلميه الخاصه بالمسامير والصواميل و جميع العاملين اتقنوا هذة المهاره وجميع المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"}] },
        { id: 13, title: "تقييم الموقع ( المسامير والصواميل )", maxScore: 10, levels: [{level:1,score:0,desc:"تم تقييم الموقع ولا توجد دلائل في الواقع على تطبيق المهارات المكتسبة من دورة المسامير والصواميل على الماكينات و الادوات"},{level:2,score:2,desc:"تم تقييم الموقع وتوجد أدلة ضعيفة على تطبيق المهارات المكتسبة من دورة المسامير والصواميل على الماكينات و الادوات"},{level:3,score:4,desc:"تم تقييم الموقع وتوجد بعض الأدلة على تطبيق المهارات المكتسبة من دورة المسامير والصواميل على الماكينات و الادوات"},{level:4,score:6,desc:"تم تقييم الموقع وتوجد الكثير من الأدلة على تطبيق المهارات المكتسبة من دورة المسامير والصواميل على الماكينات والادوات"},{level:5,score:8,desc:"تم تقييم الموقع وتم التأكد من تطبيق معظم المهارات المكتسبة من دورة المسامير والصواميل على الماكينات و الادوات"},{level:6,score:10,desc:"اتضح من تقييم الموقع الفحص العام للمسامير والصواميل انه يتم تطبيق خرائط التربيط والفحص ( والتحقق من أن أطوال المسامير المستخدمة - مناسب الحاله - سهوله الفحص والاهتزاز )"}] },
        { id: 14, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الرابعه"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الرابعه"},{level:3,score:2,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الرابعه ، ولا يتم نشر النتائج ونقاط القوة وفرص التحسين بالقسم"},{level:4,score:3,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الرابعه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين كثير العاملين بالقسم"},{level:5,score:4,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الرابعه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لمعظم العاملين بالقسم ، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"},{level:6,score:5,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الرابعه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لجميع العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"}] }
    ]},
    "JH-5": { name: "الخطوة الخامسة - الفحص الذاتي", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوة الخامسة", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أي دلائل علي وجود خطة عمل لتنفيذ انشطة الخطوه الخامسه لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الخامسه لكل قسم ، ولكن توجد أدلة ضعيفة علي استخدامها في الواقع"},{level:3,score:2,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الخامسه لكل قسم ، وتوجد بعض الأدلة على إستخدامها ، كما أن الخطة غير مثبتة على لوحة أنشطة الـ TPM لكل قسم"},{level:4,score:3,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الخامسه لكل قسم وتغطي كثير من أنشطة الخطوة ، والخطة متاحة ومعتمدة و مثبتة علي لوحة أنشطة الـ TPM لكل قسم وكثير من مشغلي الماكينات على دراية بها"},{level:5,score:4,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الخامسة لكل قسم وتغطي معظم أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم ومعظم مشغلي الماكينات بالقسم علي دراية كاملة بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الخامسه للقسم وتغطي كافة أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وجميع مشغلي الماكينات بالقسم علي دراية بتفاصيلها"}] },
        { id: 2, title: "الحفاظ على مستوى الخطوات من 1-4 والإجراءات", maxScore: 10, levels: [{level:1,score:0,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-4 وشروط اجتيازهم أقل من 20 %"},{level:2,score:2,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-4 وشروط اجتيازهم أقل من 40 %"},{level:3,score:4,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-4 وشروط اجتيازهم اقل من 60%"},{level:4,score:6,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-4 وشروط اجتيازهم اكثر من 70%"},{level:5,score:8,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-4 وشروط اجتيازهم اكثر من 80 %"},{level:6,score:10,desc:"يتم الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-4 وشروط اجتيازهم بنسبة 100 % ، وتم تطبيق الإجراءات المانعة لتوليد المصادر وتحسنت مستويات الفحص"}] },
        { id: 3, title: "عدم اغفال بنود الفحص الضرورية التي ينتج عنها اعطال", maxScore: 25, levels: [{level:1,score:0,desc:"لا توجد دلائل على تحديد معايير الفحص وتحديث الخرائط لتفادي اغفال البنود"},{level:2,score:5,desc:"تم تحديد عدد قليل من معايير الفحص ، كما أنه تم تحديث القليل من الخرائط"},{level:3,score:10,desc:"تم تحديد بعض معايير الفحص كما أنه تم تحديث بعض الخرائط ، وإعادة إصدارها بحيث لا يتم اغفال اى من بنود الفحص الضروريه ، مشاركة الصيانه ويتم استخدام بعض علامات الإدارة المرئية"},{level:4,score:15,desc:"تم تحديد كثير من معايير الفحص ، كما أنه تم تحديث كثير من الخرائط ، وإعادة إصدارها بحيث لا يتم اغفال اى من بنود الفحص الضروريه ، بمشاركة الصيانه ، ويتم استخدام كثير من علامات الإدارة المرئية"},{level:5,score:20,desc:"تم تحديد معظم معايير الفحص ، كما أنه تم تحديث معظم الخرائط ، وإعادة إصدارها بحيث لا يتم اغفال اى من بنود الفحص الضروريه ، بمشاركة الصيانه، ويتم استخدام معظم علامات الإدارة المرئية، وأدوات الفحص متوفرة بالقرب من موقع العمل"},{level:6,score:25,desc:"تم تحديد جميع معايير الفحص ، كما أنه تم تحديث جميع الخرائط ، وإعادة إصدارها بحيث لا يتم اغفال اى من بنود الفحص الضروريه ، بمشاركة الصيانه ويتم استخدام جميع علامات الإدارة المرئية، وأدوات الفحص متوفرة بالقرب من موقع العمل"}] },
        { id: 4, title: "سهولة الفحص وتقسيم البنود", maxScore: 20, levels: [{level:1,score:0,desc:"لم يتم تحديث Foot Map ، ولم يتم تقسيم البنود لتسهيل الفحص"},{level:2,score:4,desc:"تم تحديث Foot Map وتقسيم قليل من البنود لجعل التنفيذ سهل ، ويتم استخدام قليل من علامات الإدارة المرئية لسهوله الفحص"},{level:3,score:8,desc:"تم تحديث Foot Map وتقسيم بعض من البنود لجعل التنفيذ سهل ، ويتم استخدام بعض علامات الإدارة المرئية لسهوله الفحص ، وأدوات الفحص متوفرة بالقرب من موقع العمل"},{level:4,score:12,desc:"تم تحديث Foot Map وتقسيم كثير من البنود لجعل التنفيذ سهل ، ويقوم كثير من المشغلين بالوصول الى الوقت المعياري المحدد في الخرائط ويتم تمييز كثير من البنود الجديده والبنود التي تم نقلها من الصيانه واظهارها فى نموذج رصد المشكلات"},{level:5,score:16,desc:"تم تحديث Foot Map وتقسيم معظم البنود لجعل التنفيذ سهل ، ويقوم معظم المشغلين بالوصول الى الوقت المعياري المحدد في الخرائط ويتم تمييز معظم البنود الجديده والبنود التي تم نقلها من الصيانه واظهارها فى نموذج رصد المشكلات"},{level:6,score:20,desc:"تم تحديث Foot Map وتقسيم جميع البنود لجعل التنفيذ سهل ، ويقوم جميع المشغلين بالوصول الى الوقت المعياري المحدد في الخرائط ويتم تمييز جميع البنود الجديده والبنود التى تم نقلها من الصيانه واظهارها فى نموذج رصد المشكلات"}] },
        { id: 5, title: "الفحص الذاتي عناصر متعلقة بالجودة", maxScore: 20, levels: [{level:1,score:0,desc:"لا يوجد دليل على انه تم ادراج الفحص مع الجودة ولا يتم متابعة ومراجعة معدات الوزن والقياس والكشف والوقاية من سوء التشغيل"},{level:2,score:4,desc:"توجد أدلة ضعيفة على انه تم ادراج الفحص مع الجودة ويتم متابعة ومراجعة بعض من معدات التحقق من العمليات"},{level:3,score:8,desc:"تم ادراج الفحص مع الجودة ويتم متابعة ومراجعة معدات الوزن والقياس والكشف والوقاية من سوء التشغيل ويتم تنفيذ فحص لدقة بعض من المعدات والادوات المستخدمة في العمليات وتم مقارنة بعض من نتائج الفحص بالمعايير"},{level:4,score:12,desc:"تم ادراج الفحص مع الجودة ويتم متابعة ومراجعة معدات الوزن والقياس والكشف والوقاية من سوء التشغيل ويتم تنفيذ فحص لدقة كثير من المعدات والادوات المستخدمة في مقارنة كثير من نتائج الفحص بالمعايير الخاصة بالمعدات وتم توثيق نتائج الفحص"},{level:5,score:16,desc:"تم ادراج الفحص مع الجودة ويتم متابعة ومراجعة معدات الوزن والقياس والكشف والوقاية من سوء التشغيل ويتم تنفيذ فحص لدقة معظم المعدات والادوات المستخدمة في مقارنة معظم نتائج الفحص بالمعايير الخاصة بالمعدات وتم توثيق نتائج الفحص"},{level:6,score:20,desc:"تم ادراج الفحص مع الجودة ويتم متابعة ومراجعة معدات الوزن والقياس والكشف والوقاية من سوء التشغيل ويتم تنفيذ فحص لدقة جميع المعدات والادوات المستخدمة في مقارنة جميع نتائج الفحص بالمعايير الخاصة بالمعدات وتم توثيق نتائج الفحص"}] },
        { id: 6, title: "رفع مستوى مهارات الفحص", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد أي دلائل علي وجود خطة عمل للتدريب والتعليم لرفع مهارات الفحص لدى المشغلين"},{level:2,score:4,desc:"توجد دلائل ضعيفة علي وجود خطة عمل للتدريب والتعليم لرفع مهارات الفحص لدى المشغلين"},{level:3,score:8,desc:"توجد خطة عمل للتدريب والتعليم لرفع مهارات الفحص لدى بعض من المشغلين تغطي بعض من أنشطة الفحص الذاتي"},{level:4,score:12,desc:"توجد خطة عمل للتدريب والتعليم لرفع مهارات الفحص لدى كثير من المشغلين تغطي كثير من أنشطة الفحص الذاتي"},{level:5,score:16,desc:"توجد خطة عمل للتدريب والتعليم لرفع مهارات الفحص لدى معظم المشغلين تغطي معظم أنشطة الفحص الذاتي"},{level:6,score:20,desc:"توجد خطة عمل للتدريب والتعليم لرفع مهارات الفحص لدى جميع المشغلين تغطي جميع أنشطة الفحص الذاتي"}] },
        { id: 7, title: "موضوعات التحسين وتحديث الفواقد", maxScore: 10, levels: [{level:1,score:0,desc:"لم يتم تقسيم موضوعات التحسين المطلوبة"},{level:2,score:2,desc:"تم تقسيم عدد قليل من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية"},{level:3,score:4,desc:"تم تقسيم بعض موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية"},{level:4,score:6,desc:"تم تقسيم كثير من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( رصد كثير من فواقد التسريبات واستهلاكات الزيوت والشحوم - موقف تحديث كثير من اصدارات الخرائط )"},{level:5,score:8,desc:"تم تقسيم معظم موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( رصد معظم فواقد التسريبات واستهلاكات الزيوت والشحوم - موقف تحديث معظم اصدارات الخرائط )"},{level:6,score:10,desc:"تم تقسيم جميع موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( رصد جميع فواقد التسريبات واستهلاكات الزيوت والشحوم - وموقف تحديث جميع اصدارات الخرائط ) . مع وجود منحنيات توضح الموقف قبل وبعد التطبيق"}] },
        { id: 8, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الخامسه"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الخامسه"},{level:3,score:2,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الخامسه ، ولا يتم نشر النتائج ونقاط القوة وفرص التحسين بالقسم"},{level:4,score:3,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الخامسه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين كثير العاملين بالقسم"},{level:5,score:4,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الخامسه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لمعظم العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"},{level:6,score:5,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الخامسه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لجميع العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"}] }
    ]},
    "JH-6": { name: "الخطوة السادسة - التنظيم والترتيب (Standardization)", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوه السادسة", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أي دلائل علي وجود خطة عمل لتنفيذ انشطة الخطوه السادسة لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه السادسة لكل قسم ، ولكن توجد أدلة ضعيفة علي إستخدامها في الواقع"},{level:3,score:2,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه السادسة لكل قسم ، وتوجد بعض الأدلة علي إستخدامها ، كما أن الخطة غير مثبتة علي لوحة أنشطة الـ TPM لكل قسم"},{level:4,score:3,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه السادسة لكل قسم وتغطي كثير من أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وكثير من مشغلي الماكينات علي دراية بها"},{level:5,score:4,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه السادسة لكل قسم وتغطي معظم أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم ومعظم مشغلي الماكينات بالقسم علي دراية كاملة بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه السادسة للقسم وتغطي كافة أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وجميع مشغلي الماكينات بالقسم علي دراية بتفاصيلها"}] },
        { id: 2, title: "الحفاظ على مستوى الخطوات السابقة (1-5)", maxScore: 10, levels: [{level:1,score:0,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-5 وشروط اجتيازهم أقل من 20 %"},{level:2,score:2,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-5 وشروط اجتيازهم أقل من 40 %"},{level:3,score:4,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-5 وشروط اجتيازهم اقل من 60%"},{level:4,score:6,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-5 وشروط اجتيازهم اكثر من 70%"},{level:5,score:8,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-5 وشروط اجتيازهم اكثر من 80 %"},{level:6,score:10,desc:"يتم الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-5 وشروط اجتيازهم بنسبة 100 % و اتخاذ تحسينات وإجراءات على البنود المذكورة سلفاً"}] },
        { id: 3, title: "استخدام نماذج الفحص بشكل ثابت ودمج الجودة", maxScore: 40, levels: [{level:1,score:0,desc:"لا توجد دلائل على استخدام نماذج الفحص ، ولم يتم دمج عناصر مراقبة الجودة في بنود الفحص"},{level:2,score:8,desc:"توجد أدلة ضعيفة على استخدام نماذج الفحص ، ولم تتم أعمال الفحص بشكل ثابت"},{level:3,score:16,desc:"توجد بعض الأدلة على استخدام نماذج الفحص ، و تجري أعمال الفحص بشكل ثابت ولم يتم دمج عناصر مراقبة الجودة في بنود الفحص، ولم يؤدي ذلك إلى تقليل العيوب"},{level:4,score:24,desc:"يتم استخدام كثير من نماذج الفحص بشكل ثابت وكثير من عناصر مراقبة الجودة مدمجة في بنود الفحص مما أدي إلى تقليل العيوب وتتم معالجة مشاكل المعدات بسرعة وبشكل موثوق و تم تنفيذ الإدارة المرئية بدقة"},{level:5,score:32,desc:"يتم استخدام معظم نماذج الفحص بشكل ثابت و معظم عناصر مراقبة الجودة مدمجة في بنود الفحص مما أدي إلى تقليل العيوب وتتم معالجة مشاكل المعدات بسرعة وبشكل موثوق و تم تنفيذ الإدارة المرئية بدقة ، ومعظم المشغلين يمكنهم إكتشاف ما إذا كانت هناك مشكلة ما و يتم تقليل عدد بنود الفحص"},{level:6,score:40,desc:"يتم استخدام جميع نماذج الفحص بشكل ثابت و جميع عناصر مراقبة الجودة مدمجة في بنود الفحص مما أدي إلى تقليل العيوب وتتم معالجة مشاكل المعدات بسرعة وبشكل موثوق و تم تنفيذ الإدارة المرئية بدقة ، وجميع المشغلين يمكنهم إكتشاف ما إذا كانت هناك مشكلة ما و يتم تقليل عدد بنود الفحص ، ويوجد تقدم ملموس نتيجة ادخال الصيانة التنبؤية وتم وضع معايير للفحص الروتيني"}] },
        { id: 4, title: "ترتيب وتنظيم مواقع التخزين بدقة", maxScore: 25, levels: [{level:1,score:0,desc:"لم يتم تحديد البنود التفصيلية لأنشطة ترتيب وتنظيم الأشياء في مكان العمل"},{level:2,score:5,desc:"تم تحديد عدد قليل من البنود التفصيلية لأنشطة ترتيب و تنظيم الأشياء في مكان العمل"},{level:3,score:10,desc:"تم تحديد بعض من البنود التفصيلية لأنشطة ترتيب و تنظيم الأشياء في مكان العمل"},{level:4,score:15,desc:"تم تحديد كثير من البنود التفصيلية لأنشطة ترتيب و تنظيم الأشياء في مكان العمل"},{level:5,score:20,desc:"تم تحديد معظم البنود التفصيلية لأنشطة ترتيب و تنظيم الأشياء في مكان العمل"},{level:6,score:25,desc:"تم تحديد جميع البنود التفصيلية لأنشطة ترتيب و تنظيم الأشياء في مكان العمل (توضيح مواقع التخزين وكميات المواد الخام والمنتجات والأدوات)"}] },
        { id: 5, title: "تقييم المعايير وإجراءات العمل", maxScore: 20, levels: [{level:1,score:0,desc:"لا يوجد دليل على أنه يتم اعادة تقييم المعايير وترتيبها بشكل صحيح ولم يتم تحديد اجراءات ومتطلبات العمل بشكل صحيح"},{level:2,score:4,desc:"توجد أدلة ضعيفة على أنه يتم اعادة تقييم المعايير وترتيبها بشكل صحيح ولم يتم تحديد اجراءات ومتطلبات العمل بشكل صحيح"},{level:3,score:8,desc:"يتم إعادة تقييم بعض من المعايير وترتيبها بشكل صحيح ويتم انشاء بعض من إجراءات ومتطلبات العمل بشكل سليم"},{level:4,score:12,desc:"يتم إعادة تقييم كثير من المعايير وترتيبها بشكل صحيح ويتم انشاء كثير من إجراءات ومتطلبات العمل بشكل سليم و يتم إجراء التعليم والتدريب للبنود ذات الأولوية المتعلقة بإجراءات التشغيل وجودته وتقييم المهارات"},{level:5,score:16,desc:"يتم إعادة تقييم معظم المعايير وترتيبها بشكل صحيح ويتم انشاء معظم إجراءات ومتطلبات العمل بشكل سليم ويتم إجراء التعليم والتدريب للبنود ذات الأولوية المتعلقة بإجراءات التشغيل وجودته وتقييم المهارات وتوجد منهجية واضحة للتعامل مع المشاكل"},{level:6,score:20,desc:"يتم إعادة تقييم جميع المعايير وترتيبها بشكل صحيح ويتم انشاء جميع إجراءات ومتطلبات العمل بشكل سليم و يتم إجراء التعليم والتدريب للبنود ذات الأولوية المتعلقة بإجراءات التشغيل وجودته وتقييم المهارات وتوجد منهجية واضحة للتعامل مع المشاكل"}] },
        { id: 6, title: "أنشطة المجموعة وتطبيق 5S", maxScore: 10, levels: [{level:1,score:0,desc:"لم يتم تقسيم موضوعات التحسين المطلوبة لتنفيذ 5S وأنشطة المجموعة"},{level:2,score:2,desc:"تم تقسيم عدد قليل من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية والـ 5S"},{level:3,score:4,desc:"تم تقسيم بعض موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية والـ 5S"},{level:4,score:6,desc:"تم تقسيم كثير من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( تقليل المشكلات، تنفيذ جميع المعايير وتطبيق ال 5S )"},{level:5,score:8,desc:"تم تقسيم معظم موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( تقليل المشكلات, تنفيذ جميع المعايير وتطبيق ال 5S )"},{level:6,score:10,desc:"تم تقسيم جميع موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( تقليل المشكلات تنفيذ جميع المعايير وتطبيق ال 5S . مع وجود منحنيات توضح الموقف قبل وبعد التطبيق"}] },
        { id: 7, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة السادسة"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة السادسة"},{level:3,score:2,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة السادسة ، ولا يتم نشر النتائج ونقاط القوة وفرص التحسين بالقسم"},{level:4,score:3,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة السادسة ، ويتم نشر النتائج ونقاط القوة وفرص التحسين كثير العاملين بالقسم"},{level:5,score:4,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة السادسة ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لمعظم العاملين بالقسم ، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"},{level:6,score:5,desc:"يتم تنفيذ المراجعة الداخلية الدورية على أنشطة الخطوة السادسة ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لجميع العاملين بالقسم ، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"}] }
    ]}
};
// 👑 دالة عرض لوحة التحكم في المستخدمين (للمدير الكبير فقط)
function renderUserManagement() {
    if (currentUser.username !== 'mfayez') return;
    
    const container = document.getElementById('usersListContainer');
    let html = '<h4 style="color:var(--gold); margin:10px 0;">إدارة المستخدمين والصلاحيات</h4>';
    
    // تحويل الكائن إلى مصفوفة للفحص
    Object.keys(usersData).forEach(uid => {
        const u = usersData[uid];
        if (typeof u !== 'object') return; // لتجنب البيانات القديمة

        const isPending = u.status === 'pending';
        html += `
        <div class="card modern-card" style="margin-bottom:10px; border-right:4px solid ${isPending?'var(--danger)':'var(--success)'}">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="text-align:right;">
                    <b style="color:var(--gold);">${u.name}</b> <small>(${u.username})</small><br>
                    <span style="font-size:10px;">المطلوب: ${u.requestedRole} | الحالية: ${u.role}</span>
                </div>
                <div>
                    ${isPending ? `<button class="btn btn-sm btn-success" onclick="approveUser('${uid}')">موافقة</button>` : ''}
                    <button class="btn btn-sm btn-outline" onclick="openPermissionsModal('${uid}')">الأذونات</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${uid}')">حذف</button>
                </div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// 🛡️ دالة التحكم في الدخول لكل صفحة (محصنة)
// 🛡️ دالة التحكم في الدخول لكل صفحة (التحكم الصارم)
function canAccess(screenId, action = 'view') {
    // 👑 أنت فقط (mfayez) من يملك الصلاحية المطلقة لتجاوز القواعد
    if (currentUser.username === 'mfayez') return true; 
    
    const uid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    if (!uid) return false;

    const uData = usersData[uid];
    if (!uData || typeof uData === 'string') {
        return screenId === 'homeScreen' || screenId === 'tasksScreen' || screenId === 'tagsScreen';
    }

    // الاعتماد الكلي على مصفوفة الأذونات (حتى لو كان المسمى الوظيفي admin)
    const userPerms = uData.permissions;
    if (!userPerms || !userPerms[screenId]) return false;
    
    if (action === 'edit') return userPerms[screenId] === 'edit';
    return userPerms[screenId] === 'view' || userPerms[screenId] === 'edit';
}


// ✅ الموافقة على المستخدم مع الحفاظ على الأذونات المخصصة
async function approveUser(uid) {
    const u = usersData[uid];
    
    // إذا قمت أنت بتعديل الأذونات مسبقاً، النظام سيحتفظ بها، ولن يفرض أذونات افتراضية
    let finalPerms = u.permissions;
    
    await db.ref(`tpm_system/users/${uid}`).update({
        status: 'active',
        role: u.requestedRole,
        permissions: finalPerms
    });
    showToast(`تم تفعيل حساب ${u.name} بالصلاحيات المحددة`);
}
// 🗑️ دالة حذف المستخدم (رفض الطلب)
function deleteUser(uid) {
    if(confirm('هل أنت متأكد من حذف هذا المستخدم/الطلب نهائياً؟')) {
        db.ref('tpm_system/users/' + uid).remove();
        showToast('تم حذف المستخدم بنجاح');
    }
}

// 🔐 دوال التحكم في نافذة الأذونات المتقدمة
let editingUserUid = null;

function openPermissionsModal(uid) {
    const u = usersData[uid];
    if (!u || !u.permissions) return showToast('لا توجد أذونات قابلة للتعديل لهذا المستخدم (قديم)');
    
    editingUserUid = uid;
    const perms = u.permissions;
    const container = document.getElementById('permissionsContainer');
    
    const pages = {
        homeScreen: 'الرئيسية (Dashboard)', tasksScreen: 'المهام', historyScreen: 'التقارير (History)',
        kaizenScreen: 'كايزن', tagsScreen: 'التاجات', knowledgeScreen: 'عقل المصنع'
    };

    let html = `<div style="margin-bottom:10px; color:var(--gold); font-weight:bold;">المستخدم: ${u.name}</div>`;
    
    for (let screen in pages) {
        let currentPerm = perms[screen] || 'none';
        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:5px; border-bottom:1px solid rgba(255,255,255,0.1);">
            <span style="font-size:12px;">${pages[screen]}</span>
            <select id="perm_${screen}" class="form-control" style="width:auto; padding:2px 5px; margin:0; height:auto; font-size:12px;">
                <option value="none" ${currentPerm==='none'?'selected':''}>مخفية 🚫</option>
                <option value="view" ${currentPerm==='view'?'selected':''}>مشاهدة فقط 👁️</option>
                <option value="edit" ${currentPerm==='edit'?'selected':''}>مشاهدة وتعديل ✍️</option>
            </select>
        </div>`;
    }
    
    container.innerHTML = html;
    document.getElementById('permissionsModal').style.display = 'flex';
}


// ------------------------------------------
// 📉 محرك التحسين المستمر وشجرة الفواقد (KK Engine)
// ------------------------------------------

// تصنيفات فواقد الـ TPM العالمية (اخترنا أهم 8 فواقد للمصنع)
const tpmLosses = [
    { id: 'L1', name: 'أعطال الماكينات (Breakdowns)', type: 'availability', icon: '🔧' },
    { id: 'L2', name: 'الإعداد والضبط (Setup & Adj)', type: 'availability', icon: '⚙️' },
    { id: 'L3', name: 'تغيير أدوات ومقاسات', type: 'availability', icon: '🪚' },
    { id: 'L4', name: 'بدء التشغيل والتسخين', type: 'availability', icon: '🚀' },
    { id: 'L5', name: 'التوقفات الصغيرة العابرة', type: 'performance', icon: '⏱️' },
    { id: 'L6', name: 'انخفاض سرعة الماكينة', type: 'performance', icon: '🐢' },
    { id: 'L7', name: 'العيوب وإعادة التشغيل', type: 'quality', icon: '❌' },
    { id: 'L8', name: 'فواقد نقص الخامات', type: 'availability', icon: '📦' }
];

// مصفوفة مؤقتة لتخزين الفواقد (في التطوير القادم سنربطها بـ Firebase)
let registeredLosses = []; 
const COST_PER_MINUTE = 50; // افتراض: دقيقة توقف المصنع تكلف 50 جنيه

function renderKKDashboard() {
    let container = document.getElementById('kkLossTreeContainer');
    if(!container) return;

    let html = tpmLosses.map(loss => {
        // تجميع كل الدقائق المسجلة لهذا الفقد بالذات
        let currentLossMins = registeredLosses.filter(l => l.lossId === loss.id).reduce((sum, curr) => sum + curr.minutes, 0);
        let currentLossCost = currentLossMins * COST_PER_MINUTE; 
        
        // تغيير لون الكارت بناءً على حجم الخسارة
        let borderColor = currentLossMins > 60 ? 'var(--danger)' : (currentLossMins > 0 ? 'var(--warning)' : 'rgba(255,255,255,0.1)');
        let shadowEffect = currentLossMins > 60 ? 'box-shadow: 0 0 15px rgba(198,40,40,0.5);' : '';
        
        return `
        <div class="card glass-card" style="border-top:4px solid ${borderColor}; ${shadowEffect} text-align:center; padding:15px; cursor:pointer;" onclick="openLossRegistration('${loss.id}', '${loss.name}')">
            <div style="font-size:24px; margin-bottom:5px; filter:drop-shadow(0 2px 2px rgba(0,0,0,0.5));">${loss.icon}</div>
            <div style="font-size:11px; font-weight:bold; color:var(--text-main); margin-bottom:10px; height:30px;">${loss.name}</div>
            <div style="background:rgba(0,0,0,0.3); padding:5px; border-radius:5px;">
                <div style="font-size:11px; color:var(--text-muted);">⏱️ ${currentLossMins} دقيقة</div>
                <div style="font-size:12px; font-weight:900; color:${currentLossCost > 0 ? 'var(--danger)' : 'var(--success)'}; margin-top:2px;">${currentLossCost.toLocaleString()} ج.م</div>
            </div>
        </div>`;
    }).join('');
    
    container.innerHTML = html;

    // تحديث العدادات العلوية الإجمالية
    let totalMins = registeredLosses.reduce((sum, l) => sum + l.minutes, 0);
    document.getElementById('kkTotalLossHours').innerText = (totalMins / 60).toFixed(1);
    document.getElementById('kkTotalLossCost').innerText = (totalMins * COST_PER_MINUTE).toLocaleString() + ' ج';
}

function openLossRegistration(lossId, lossName) {
    let mins = prompt(`تسجيل فقد جديد في:\n[ ${lossName} ]\n\nأدخل مدة التوقف (بالدقائق):`);
    
    if(mins && !isNaN(mins) && parseInt(mins) > 0) {
        let parsedMins = parseInt(mins);
        let lossObj = {
            id: uniqueNumericId().toString(),
            lossId: lossId,
            minutes: parsedMins,
            date: new Date().toLocaleDateString('ar-EG'),
            user: currentUser.name
        };
        
        // 🚀 إرسال الفقد فوراً لقاعدة البيانات ليراه الجميع
        syncRecord('losses/' + lossObj.id, lossObj); 
        
        awardPoints(5, 'تسجيل وتحليل فقد توقف');
        showToast(`تم تسجيل ${parsedMins} دقيقة توقف.. وجاري حساب النزيف المالي! 📉`);
    } else if (mins) {
        showToast('يرجى إدخال رقم صحيح للدقائق ⚠️');
    }
}
// ------------------------------------------
// 🧠 عقل المصنع (قراءة الكتالوجات الكاملة والاختبارات)
// ------------------------------------------
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let currentUploadedPdfBase64 = null; // متغير لحفظ المستند كاملاً

async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const statusEl = document.getElementById('pdfExtractStatus');
    statusEl.innerText = "جاري رفع الكتالوج ومعالجته (نصوص وصور)... ⏳";
    statusEl.style.color = "var(--warning)";
    
    try {
        // 1. تحويل المستند كاملاً إلى Base64 ليرأه الذكاء الاصطناعي بصوره
        const reader = new FileReader();
        reader.onload = async function(e) {
            currentUploadedPdfBase64 = e.target.result.split(',')[1];
            
            // 2. استخراج جزء من النص كفهرس للبحث السريع فقط
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
            let fullText = "";
            const maxPages = Math.min(pdf.numPages, 5);
            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + " ";
            }
            
            document.getElementById('kbContent').value = fullText.substring(0, 2000);
            statusEl.innerText = "تم تجهيز الكتالوج بالكامل (بصوره ورسوماته) ✅";
            statusEl.style.color = "var(--success)";
        };
        reader.readAsDataURL(file);
    } catch (error) {
        statusEl.innerText = "❌ فشل معالجة الملف.";
        statusEl.style.color = "var(--danger)";
    }
}

function addKnowledgeBaseArticle() {
    let title = document.getElementById('kbTitle').value.trim();
    let cat = document.getElementById('kbCategory').value;
    let content = document.getElementById('kbContent').value.trim();
    
    if(!title || (!content && !currentUploadedPdfBase64)) { showToast('أدخل العنوان وارفع ملف PDF'); return; }
    
    let id = uniqueNumericId().toString();
    // حفظ البيانات الأساسية في الذاكرة السريعة
    let article = { id: id, title: title, category: cat, content: content, date: new Date().toLocaleDateString('ar-EG'), author: currentUser.name, hasPdf: !!currentUploadedPdfBase64 };
    syncRecord('knowledgeBase/' + id, article);
    
    // 🚀 الخدعة الهندسية: حفظ الملف الضخم في مسار منفصل تماماً حتى لا يبطئ التطبيق
    if (currentUploadedPdfBase64) {
        db.ref('tpm_system/pdf_files/' + id).set({ base64: currentUploadedPdfBase64 });
    }
    
    document.getElementById('kbTitle').value = ''; document.getElementById('kbContent').value = '';
    document.getElementById('addBookModal').style.display = 'none';
    currentUploadedPdfBase64 = null;
    document.getElementById('pdfExtractStatus').innerText = 'اضغط لرفع ملف PDF (كتالوج أو مرجع) 📄';
    showToast('تمت إضافة المرجع إلى رفوف المكتبة 📚');
}

function renderKnowledgeBase() {
    let container = document.getElementById('knowledgeListContainer');
    if(!container) return;
    
    if(!knowledgeBaseData || knowledgeBaseData.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">لا توجد كتالوجات أو مراجع مسجلة حتى الآن</div>';
        return;
    }
    
    let html = knowledgeBaseData.map(kb => {
        let controls = hasRole('admin') ? `<button class="btn btn-sm btn-danger" style="margin-top:10px; width:auto;" onclick="deleteRecord('knowledgeBase/${kb.id}')">🗑️ حذف المرجع</button>` : '';
        return `
        <div class="card glass-card" style="border-right: 4px solid var(--gold); margin-bottom:15px; padding:15px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h4 style="color:var(--gold); margin:0;">${kb.title}</h4>
                <span style="font-size:10px; color:var(--text-muted); background:rgba(0,0,0,0.3); padding:3px 8px; border-radius:5px;">${kb.date}</span>
            </div>
            <div style="font-size:12px; color:var(--text-main); margin-top:10px; max-height:80px; overflow-y:auto; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
                ${nl2brSafe(kb.content)}
            </div>
            <div style="font-size:10px; color:var(--text-muted); margin-top:10px;">إضافة: ${kb.author}</div>
            ${controls}
        </div>`;
    }).join('');
    
    container.innerHTML = html;
}

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
    renderKnowledgeBase();
}

function filterLibrary() { renderKnowledgeBase(); }


// ------------------------------------------
// 👷‍♂️ محرك بوابة الصيانة الذاتية (JH Portal Engine)
// ------------------------------------------
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
    
    // 1. حساب آخر مراجعة (الجودة والأداء)
    const deptAudits = historyData.filter(h => h.dept === dept && !h.stepsOrder.includes('ManualKaizen'));
    const lastScore = deptAudits.length > 0 ? deptAudits[deptAudits.length - 1].totalPct : 0;
    document.getElementById('deptAuditScore').innerText = lastScore + '%';
    
    // 2. حساب التاجات المفتوحة (تأثير على المتاحية)
    const deptTags = tagsData.filter(t => t.dept === dept);
    const openTags = deptTags.filter(t => t.status !== 'done' && t.status !== 'closed').length;
    document.getElementById('deptOpenTags').innerText = openTags;
    
    // ⚙️ 3. محرك حساب الـ OEE (معادلة ذكية تدمج المراجعات مع الأعطال)
    let calculatedOEE = Math.max(0, Math.round((lastScore * 0.95) - (openTags * 1.5)));
    if (deptAudits.length === 0) calculatedOEE = 0;
    
    const oeeEl = document.getElementById('deptOEE');
    oeeEl.innerText = calculatedOEE + '%';

    // 🎯 4. نظام المستهدفات (Goals)
    const goalEl = document.getElementById('deptGoalDisplay');
    if (deptGoalsData[dept]) {
        goalEl.style.display = 'block';
        goalEl.innerHTML = `🎯 المستهدف الشهري للكفاءة: <b style="font-size:14px;">${deptGoalsData[dept]}%</b>`;
        // تغيير لون الـ OEE لو حقق التارجت
        oeeEl.style.color = calculatedOEE >= deptGoalsData[dept] ? 'var(--success)' : '#00BCD4';
    } else {
        goalEl.style.display = 'none';
        oeeEl.style.color = '#00BCD4';
    }

    // 📈 5. رسم المخطط البياني المصغر (Mini Trend Chart)
    const ctx = document.getElementById('jhMiniTrendChart');
    if (ctx) {
        if (jhMiniChartInstance) jhMiniChartInstance.destroy();
        
        let last5Audits = deptAudits.slice(-5);
        let labels = last5Audits.map(a => a.date.split('/')[0] + '/' + a.date.split('/')[1]);
        let data = last5Audits.map(a => a.totalPct);
        
      // داخل دالة selectJHDept - في جزء الـ Chart
jhMiniChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
        labels: labels,
        datasets: [{
            data: data,
            borderColor: '#d4af37',
            backgroundColor: 'rgba(212, 175, 55, 0.05)',
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#fff'
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { 
                beginAtZero: true, 
                max: 100,
                ticks: { color: '#bdae93', font: { size: 10 } },
                grid: { color: 'rgba(255,255,255,0.05)' }
            },
            x: { 
                ticks: { color: '#bdae93', font: { size: 10 } },
                grid: { display: false }
            }
        }
    }
});

    // 🏆 6. تحديث ترتيب الأبطال الداخلي
    renderInternalDeptLeaderboard(dept);

    document.getElementById('jhToolbox').style.display = 'block';
    window.scrollTo({ top: document.getElementById('jhToolbox').offsetTop - 20, behavior: 'smooth' });
}

// 🎯 دالة ضبط وتحديث المستهدف (للمديرين)
function setDeptGoal() {
    if(!currentJHDept) return;
    let currentGoal = deptGoalsData[currentJHDept] || 85;
    let newGoal = prompt(`أدخل النسبة المئوية للمستهدف (Target OEE) لقسم ${currentJHDept}:\n(مثال: 85)`, currentGoal);
    
    if (newGoal && !isNaN(newGoal) && newGoal > 0 && newGoal <= 100) {
        syncRecord(`dept_goals/${currentJHDept}`, parseInt(newGoal));
        showToast('تم تحديث المستهدف بنجاح 🎯 وسينعكس فوراً للجميع.');
    } else if (newGoal) {
        showToast('يرجى إدخال رقم صحيح بين 1 و 100');
    }
}
function renderInternalDeptLeaderboard(dept) {
    const container = document.getElementById('deptInternalLeaderboard');
    if(!container) return;

    // تجميع نقاط مستخدمي هذا القسم فقط
    let deptUsers = [];
    for (let uid in usersData) {
        if(usersData[uid].dept === dept) {
            deptUsers.push({
                name: usersData[uid].name,
                points: userPoints[uid] || 0,
                avatar: usersData[uid].avatar
            });
        }
    }
    
    // ترتيب تنازلي
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
function startNewAuditFlowFromPortal() {
    currentViewedDept = currentJHDept;
    startNewAuditFlow();
}

async function openJHDocument(type) {
    const headerMap = { 
        'SOC': '🧗‍♂️ حصر الأماكن صعبة الوصول (SOC)', 
        'Safety': '⚠️ حصر الأماكن غير الآمنة (Safety Map)', 
        'Anatomy': '⚙️ تشريح وشرح أجزاء الماكينة' 
    };
    
    document.getElementById('jhDocHeader').innerText = headerMap[type];
    renderJHDocForm(type);
    
    // سحب البيانات من السيرفر لهذا القسم وهذا النوع
    showToast('جاري تحميل السجلات... ⏳');
    const snap = await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}`).once('value');
    let records = snap.val() ? Object.values(snap.val()) : [];
    
    renderJHDocList(type, records);
    showScreen('jhDocumentScreen');
}

function renderJHDocForm(type) {
    let formHtml = '';
    if(type === 'SOC') {
        formHtml = `
            <h4 style="margin:0 0 10px; color:var(--gold);">تسجيل مكان صعب جديد</h4>
            <input type="text" id="socLocation" class="form-control" placeholder="المكان (مثال: خلف الطلمبة 1)">
            <input type="text" id="socReason" class="form-control" placeholder="سبب الصعوبة (ضيق، حرارة..)">
            <button class="btn btn-warning full-width" onclick="saveJHRecord('SOC')">➕ إضافة للسجل</button>
        `;
    } else if(type === 'Safety') {
        formHtml = `
            <h4 style="margin:0 0 10px; color:var(--danger);">تسجيل خطر أمان</h4>
            <input type="text" id="safeHazard" class="form-control" placeholder="وصف الخطر (سلك مكشوف، مسمار بارز)">
            <select id="safeLevel" class="form-control">
                <option value="high">خطر حرج 🔴</option>
                <option value="med">خطر متوسط 🟡</option>
            </select>
            <button class="btn btn-danger full-width" onclick="saveJHRecord('Safety')">➕ تسجيل الخطر</button>
        `;
    } else {
        formHtml = `
            <h4 style="margin:0 0 10px; color:var(--gold);">إضافة شرح جزء</h4>
            <input type="text" id="partName" class="form-control" placeholder="اسم الجزء">
            <textarea id="partDesc" class="form-control" placeholder="وظيفة الجزء وكيفية فحصه"></textarea>
            <button class="btn btn-primary full-width" onclick="saveJHRecord('Anatomy')">💾 حفظ البيانات</button>
        `;
    }
    document.getElementById('jhDocActionArea').innerHTML = formHtml;
}

async function saveJHRecord(type) {
    let data = { id: uniqueNumericId().toString(), date: new Date().toLocaleDateString('ar-EG'), user: currentUser.name };
    
    if(type === 'SOC') {
        data.location = document.getElementById('socLocation').value;
        data.reason = document.getElementById('socReason').value;
        if(!data.location) return;
    } else if(type === 'Safety') {
        data.hazard = document.getElementById('safeHazard').value;
        data.level = document.getElementById('safeLevel').value;
        if(!data.hazard) return;
    } else {
        data.name = document.getElementById('partName').value;
        data.desc = document.getElementById('partDesc').value;
        if(!data.name) return;
    }

    await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}/${data.id}`).set(data);
    showToast('تم تحديث السجل الفني بنجاح ✅');
    openJHDocument(type); // تحديث القائمة
}

function renderJHDocList(type, records) {
    let html = records.reverse().map(r => `
        <div class="item-row" style="border-right-color:${type==='Safety'?'var(--danger)':'var(--gold)'};">
            <div style="flex:1;">
                <b>${r.location || r.hazard || r.name}</b><br>
                <small style="color:var(--text-muted);">${r.reason || r.level || r.desc}</small>
            </div>
            <div style="text-align:left;">
                <small style="font-size:9px;">${r.date}</small><br>
                ${hasRole('admin') ? `<button class="btn btn-sm btn-danger" style="padding:2px 5px; margin:0;" onclick="deleteJHRecord('${type}','${r.id}')">🗑️</button>` : ''}
            </div>
        </div>
    `).join('');
    
    document.getElementById('jhDocListContainer').innerHTML = html || '<div style="text-align:center; padding:20px; color:var(--text-muted);">لا توجد سجلات مسجلة لهذا القسم</div>';
}

async function deleteJHRecord(type, id) {
    if(confirm('حذف هذا السجل؟')) {
        await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}/${id}`).remove();
        openJHDocument(type);
    }
}


// ------------------------------------------
// 🧠 محرك المعرفة الذكي 2.0 (NotebookLM Experience)
// ------------------------------------------

function renderKnowledgeBase() {
    const container = document.getElementById('knowledgeListContainer');
    if(!container) return;
    
    if(!knowledgeBaseData || knowledgeBaseData.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:40px;">لا توجد كتب في المكتبة حالياً</div>';
        return;
    }
    
    container.innerHTML = knowledgeBaseData.map(kb => `
        <div class="book-cover" onclick="openBookDetail('${kb.id}')">
            <div>
                <div class="book-tag">${kb.category || 'عام'}</div>
                <div class="book-title-main">${kb.title}</div>
            </div>
            <div style="font-size:8px; color:var(--text-muted);">
                📅 ${kb.date}<br>
                ✍️ ${kb.author}
                ${kb.hasPdf ? '<div style="color:var(--success); margin-top:5px;">📄 كتالوج كامل متوفر</div>' : ''}
            </div>
            ${hasRole('admin') ? `<button class="btn btn-sm btn-danger" style="position:absolute; bottom:5px; left:5px; padding:2px;" onclick="event.stopPropagation(); deleteRecord('knowledgeBase/${kb.id}')">🗑️</button>` : ''}
        </div>
    `).join('');
}

async function openBookDetail(id) {
    let kb = knowledgeBaseData.find(x => x.id === id);
    if(!kb) return;
    
    document.getElementById('aiModal').style.display = 'flex';
    document.getElementById('aiModalText').innerHTML = `<div style="text-align:center; padding:40px;"><div class="status-dot" style="display:inline-block; background:var(--gold); animation: pulse 1s infinite;"></div><h3 style="color:var(--gold);">جاري تلخيص الكتاب وبناء الاختبار الفني... 🧠</h3></div>`;
    
    const k = globalApiKeys.gemini;
    if(!k) return showToast('مفتاح Gemini مفقود');

    try {
        // 🚀 توليد "ملخص فني" واختبار ذكي فور فتح الكتاب
        let prompt = `أنت الخبير الفني لـ Factory OS. بناءً على هذا المرجع المعنون بـ "${kb.title}":
        1. قم بكتابة ملخص تنفيذي (Executive Summary) في 3 نقاط "رؤوس أقلام" بلغة فنية مبسطة جداً للفنيين.
        2. وضح أهم تعليمات الأمان المذكورة في هذا الملف.
        3. هل يتوفر كتالوج كامل؟ (ملاحظة: المرجع يحتوي على: ${kb.content.substring(0,500)}...)
        رد بتنسيق HTML أنيق جداً.`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const j = await res.json();
        const summaryHtml = j.candidates[0].content.parts[0].text;

        document.getElementById('aiModalText').innerHTML = `
            <div style="background:linear-gradient(135deg, var(--primary), var(--bg-color)); padding:20px; border-radius:15px; border-bottom: 2px solid var(--gold); margin-bottom:20px;">
                <h2 style="color:var(--gold); margin:0;">${kb.title}</h2>
                <p style="font-size:11px; color:var(--text-muted); margin:5px 0;">تاريخ الإضافة: ${kb.date} | تصنيف: ${kb.category}</p>
            </div>
            
            <div class="summary-section" style="background:rgba(212,175,55,0.05); padding:15px; border-radius:12px; border-right:4px solid var(--gold); margin-bottom:20px;">
                <h4 style="color:var(--gold); margin-bottom:10px;">🌟 الملخص الذكي للفنيين:</h4>
                <div style="font-size:13px; line-height:1.7;">${summaryHtml}</div>
            </div>

            <h4 style="color:var(--text-muted); font-size:12px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">النص الكامل المستخرج:</h4>
            <div style="max-height:200px; overflow-y:auto; font-size:12px; color:var(--text-muted); background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-bottom:20px;">
                ${nl2brSafe(kb.content)}
            </div>

            <button class="btn btn-warning full-width shadow-btn" style="padding:15px; border-radius:12px; font-weight:bold;" onclick="generateAutoQuiz('${id}')">🎓 بدء الاختبار الفني والترجمة الكاملة</button>
        `;
    } catch(e) {
        document.getElementById('aiModalText').innerHTML = "فشل في التواصل مع عقل المصنع. تأكد من الإنترنت.";
    }
}

// 🧠 وظيفة البحث الذكي (NotebookLM Experience)
async function askFactoryAI() {
    const q = document.getElementById('kbSearchInput').value.trim();
    if(!q) return showToast('اكتب سؤالك أولاً يا هندسة');
    
    const responseBox = document.getElementById('aiSearchResponse');
    responseBox.style.display = 'block';
    responseBox.innerHTML = 'جاري البحث في رفوف المكتبة وتحليل سؤالك... ⏳';
    
    const k = globalApiKeys.gemini;
    if(!k) return showToast('مفتاح Gemini مفقود');

    try {
        // سحب كل نصوص المكتبة لتكون سياقاً (RAG)
        let context = knowledgeBaseData.map(kb => `[الكتاب: ${kb.title}]: ${kb.content}`).join('\n\n');
        
        let prompt = `أنت مهندس خبير بمصنعنا. بناءً على كل المراجع المخزنة في مكتبتنا أدناه، أجب على سؤال المستخدم: "${q}".
        إذا كانت الإجابة موجودة في أحد الكتب، اذكر اسم الكتاب. 
        إذا لم تجد الإجابة، استنتجها من خبرتك في الـ TPM ولكن وضح أنها نصيحة عامة.
        تحدث باللغة العربية البسيطة.
        
        محتوى المكتبة:
        ${context}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const j = await res.json();
        const answer = j.candidates[0].content.parts[0].text;
        
        responseBox.innerHTML = `
            <div style="color:var(--gold); font-weight:bold; margin-bottom:5px;">💡 إجابة عقل المصنع:</div>
            ${nl2brSafe(answer)}
            <button class="btn btn-sm btn-outline" style="margin-top:10px; width:auto; border-radius:100px;" onclick="document.getElementById('aiSearchResponse').style.display='none'">إخفاء</button>
        `;
    } catch(e) {
        responseBox.innerHTML = 'عذراً، حدث خطأ في استحضار المعلومة.';
    }
}

// 🎓 المولد الآلي للاختبارات الفنية والترجمة (Auto-Quiz & Translator)
async function generateAutoQuiz(kbId) {
    const k = globalApiKeys.gemini; if(!k) return showToast('مفتاح Gemini مفقود');
    
    let kb = knowledgeBaseData.find(x => x.id === kbId);
    
    document.getElementById('aiModalText').innerHTML = `<div style="text-align:center; padding:30px;"><div class="status-dot" style="display:inline-block; background:var(--gold); animation: pulse 1s infinite;"></div><h3 style="color:var(--gold); margin-top:15px;">جاري قراءة الكتالوج بالكامل (نصوص وصور ومخططات)... ⏳</h3><p style="color:var(--text-muted); font-size:12px; margin-top:10px;">يقوم الذكاء الاصطناعي الآن بالترجمة للغة الفنيين وتصميم اختبار فني، قد يستغرق هذا بعض الوقت 🧠</p></div>`;

    try {
        // سحب الملف الضخم من المسار الخفي
        let snap = await db.ref('tpm_system/pdf_files/' + kbId).once('value');
        let pdfData = snap.val();

        if(!pdfData || !pdfData.base64) {
            document.getElementById('aiModalText').innerHTML = '<div style="color:var(--danger); text-align:center;">عذراً، لم يتم العثور على ملف PDF لهذا المرجع.</div>';
            return;
        }

        // هندسة الأوامر (Prompt Engineering) العبقرية
        let prompt = `أنت مهندس صيانة خبير ومدرب فني في مصنع صناعي في مصر. المرفق هو كتالوج أو مرجع فني بصيغة PDF (يحتوي على نصوص، رسومات، وجداول).
        المطلوب منك:
        1. اقرأ الكتالوج المرفق بالكامل وافهم محتواه.
        2. قسم (الخلاصة الفنية): قم بكتابة "ملخص فني مبسط" لأهم النقاط، مترجماً إلى لغة عربية "بلدي" واضحة جداً للفنيين وعمال المصنع (تجنب الترجمة الحرفية المعقدة، اشرحها كأنك تقف أمام الماكينة).
        3. قسم (الاختبار): قم بتصميم "اختبار فني (Quiz)" من 5 أسئلة اختيار من متعدد بناءً على محتوى الكتالوج لتقييم فهم الفنيين.
        4. ضع الإجابات الصحيحة في نهاية الاختبار بشكل مقلوب أو منفصل.
        
        مهم جداً: أرجع الناتج بتنسيق HTML جذاب وجاهز للعرض داخل التطبيق (استخدم ألوان #d4af37 للذهب، #b87333 للنحاس، وخلفيات داكنة، لا تستخدم علامات markdown مثل \`\`\`html ، فقط الكود).`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: "application/pdf", data: pdfData.base64 } } // إرسال الـ PDF للذكاء الاصطناعي
                    ]
                }]
            })
        });

        const j = await res.json();
        if(j.error) throw new Error(j.error.message);

        let aiHTML = j.candidates[0].content.parts[0].text;
        aiHTML = aiHTML.replace(/```html/g, '').replace(/```/g, ''); // تنظيف الكود

        // عرض النتيجة مع زر اعتماد النتيجة للفني
        document.getElementById('aiModalText').innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid var(--copper); padding-bottom:10px;">
                <h3 style="color:var(--success); margin:0;">ترجمة واختبار: ${kb.title}</h3>
                <button class="btn btn-sm btn-success shadow-btn" onclick="awardPoints(30, 'اجتياز اختبار فني: ${kb.title}'); showToast('تم تسجيل نقاط الاختبار وإضافتها لرصيدك! 🏆'); document.getElementById('aiModal').style.display='none';">✅ إنهاء الاختبار</button>
            </div>
            <div style="background:var(--bg-color); padding:15px; border-radius:10px; font-size:14px; line-height:1.8;">
                ${aiHTML}
            </div>
        `;

    } catch(e) {
        console.error(e);
        document.getElementById('aiModalText').innerHTML = `<div style="color:var(--danger); text-align:center; padding:20px;">حدث خطأ أثناء معالجة الكتالوج. قد يكون حجم الملف كبيراً جداً، حاول استخدام ملف أصغر.</div>`;
    }
}


// ------------------------------------------
// ✨ محرك الـ 5S (كاميرا المطابقة الذكية)
// ------------------------------------------
let images5S = { standard: null, current: null };

function load5SImage(event, type) {
    const file = event.target.files[0];
    if(!file) return;
    
    showToast('جاري معالجة الصورة... ⏳');
    
    processAndEnhanceImage(file, function(dataUrl) {
        images5S[type] = dataUrl;
        
        if(type === 'standard') document.getElementById('imgStandard').src = dataUrl;
        if(type === 'current') {
            let imgC = document.getElementById('imgCurrent');
            imgC.src = dataUrl;
            // يجب أن نعطي الصورة الحالية نفس عرض الحاوية لكي تتطابق بدقة
            imgC.style.width = document.getElementById('sliderWrapper').offsetWidth + 'px';
        }
        
        if(images5S.standard && images5S.current) {
            document.getElementById('fiveSSliderContainer').style.display = 'block';
            showToast('الصور جاهزة! اسحب الشريط للمطابقة ↔️');
            init5SSlider();
        } else {
            showToast('تم الإرفاق بنجاح ✅ برجاء إرفاق الصورة الأخرى.');
        }
    });
}

function init5SSlider() {
    const container = document.getElementById('sliderWrapper');
    const overlay = document.getElementById('sliderOverlay');
    const handle = document.getElementById('sliderHandle');
    let isSliding = false;

    // تحديث عرض الصورة الداخلية عند كل حركة لضمان التطابق
    document.getElementById('imgCurrent').style.width = container.offsetWidth + 'px';

    function slide(e) {
        if (!isSliding) return;
        let rect = container.getBoundingClientRect();
        // الحسابات متوافقة مع الـ RTL (اليمين لليسار)
        let x = (e.pageX || (e.touches && e.touches[0].pageX)) - rect.left;
        if (x < 0) x = 0;
        if (x > rect.width) x = rect.width;
        
        // في الـ RTL، العرض يكون من اليمين
        let widthPercentage = ((rect.width - x) / rect.width) * 100;
        overlay.style.width = widthPercentage + '%';
        handle.style.left = x + 'px';
    }

    handle.onmousedown = () => isSliding = true;
    document.onmouseup = () => isSliding = false;
    container.onmousemove = slide;

    handle.ontouchstart = (e) => { isSliding = true; e.preventDefault(); };
    document.ontouchend = () => isSliding = false;
    container.ontouchmove = slide;
}

async function generate5STask() {
    let taskDesc = prompt("صف المخالفة التي اكتشفتها (مثال: أدوات خارج مكانها، بقعة زيت):");
    if(!taskDesc) return;

    let deptList = departments.map((d, i) => `${i+1}- ${d}`).join('\n');
    let deptChoice = prompt(`أدخل رقم القسم المرتبط بالمخالفة:\n${deptList}`, "1");
    let dp = departments[parseInt(deptChoice) - 1] || departments[0];

    showToast('جاري حفظ المهمة ورفع الصورة للمعاينة... ⏳');

    // 🚀 السحر هنا: رفع صورة الوضع الحالي لسيرفر الصور
    let imageUrl = "";
    if (images5S.current) {
        imageUrl = await uploadImageToStorage(images5S.current);
    }

    let tId = uniqueNumericId().toString();
    
    syncRecord('tasks/' + tId, {
        id: tId, 
        task: `[عدم مطابقة 5S] - ${taskDesc}`, 
        dept: dp, 
        status: 'pending',
        image: imageUrl // ربط رابط الصورة بالمهمة
    });
    
    awardPoints(5, 'رصد مخالفة 5S');
    showToast('تم تسجيل المهمة بنجاح 🚨 وتوجيهها للوحة المهام.');
    
    // تنظيف الصور من الذاكرة استعداداً للمراجعة القادمة
    images5S = { standard: null, current: null };
    document.getElementById('fiveSSliderContainer').style.display = 'none';
}
// ------------------------------------------
// 🔧 محرك الصيانة المخططة (PM Engine - Work Orders)
// ------------------------------------------
function renderPMDashboard() {
    let pmContainer = document.getElementById('pmWorkOrdersContainer');
    if(!pmContainer) return;

    // استدعاء التاجات الحمراء فقط (التي تخص الصيانة)
    let redTags = tagsData.filter(t => t.color === 'red');
    let pending = redTags.filter(t => t.status === 'open');
    let progress = redTags.filter(t => t.status === 'progress' || t.status === 'review');
    let closed = redTags.filter(t => t.status === 'closed');

    document.getElementById('pmPendingCount').innerText = pending.length;
    document.getElementById('pmProgressCount').innerText = progress.length;
    document.getElementById('pmClosedCount').innerText = closed.length;

    let activeOrders = [...pending, ...progress];

    if(activeOrders.length === 0) {
        pmContainer.innerHTML = '<div style="text-align:center; padding:30px; background:rgba(46,125,50,0.1); border-radius:15px; border:1px dashed var(--success);"><div style="font-size:30px;">🎊</div><b style="color:var(--success);">لا توجد أوامر شغل معلقة. ماكينات المصنع بحالة ممتازة!</b></div>';
        return;
    }

    pmContainer.innerHTML = activeOrders.map(t => {
        let statusColor = t.status === 'open' ? 'var(--danger)' : 'var(--warning)';
        let statusText = t.status === 'open' ? 'معلق ⏳' : 'جاري التنفيذ 🛠️';
        let engOptions = maintenanceEngineers.length > 0 
            ? maintenanceEngineers.map(e => `<option value="${e.name}" ${t.assignedEng===e.name?'selected':''}>${e.name}</option>`).join('')
            : '<option value="">(قم بإضافة مهندسين من الإعدادات)</option>';

        return `
        <div class="card glass-card" style="border-right:5px solid ${statusColor}; margin-bottom:15px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <h4 style="margin:0; color:var(--text-main); font-size:14px; flex:1;">${t.desc}</h4>
                <span style="font-size:10px; background:${statusColor}; color:#fff; padding:3px 8px; border-radius:10px; font-weight:bold; margin-right:10px;">${statusText}</span>
            </div>
            
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px; background:rgba(0,0,0,0.2); padding:8px; border-radius:5px;">
                🏭 القسم: <b style="color:var(--gold);">${t.dept}</b> | ⚙️ الماكينة: ${t.machine || 'عام'}<br>
                📅 تاريخ البلاغ: ${t.date} | 👤 المشغل المُبلغ: ${t.auditor}
            </div>

            ${t.image ? `<img src="${t.image}" style="width:100%; max-height:100px; object-fit:cover; border-radius:8px; margin-bottom:10px; border:1px solid rgba(255,255,255,0.1); cursor:pointer;" onclick="window.open('${t.image}')">` : ''}

            <div class="row-flex" style="border-top:1px dashed var(--copper); padding-top:10px; margin-bottom:10px;">
                <input type="text" id="pm_spare_${t.id}" class="form-control flex-2" placeholder="قطع الغيار المستخدمة (إن وجدت)" value="${t.spareParts || ''}" style="margin:0; font-size:11px;">
                <select id="pm_eng_${t.id}" class="form-control flex-1" style="margin:0; font-size:11px; border-color:var(--gold);">
                    <option value="">تعيين مهندس</option>
                    ${engOptions}
                </select>
            </div>

            <div class="row-flex">
                <button class="btn btn-sm btn-outline flex-1" onclick="updatePMOrder('${t.id}', 'progress')">بدء التنفيذ</button>
                <button class="btn btn-sm btn-success flex-1" onclick="updatePMOrder('${t.id}', 'closed')">✅ إنهاء واعتماد</button>
            </div>
        </div>`;
    }).join('');
}

function updatePMOrder(id, newStatus) {
    let t = tagsData.find(x => x.id == id);
    if(!t) return;

    let spareParts = document.getElementById(`pm_spare_${id}`).value.trim();
    let assignedEng = document.getElementById(`pm_eng_${id}`).value;

    t.status = newStatus;
    if(spareParts) t.spareParts = spareParts;
    if(assignedEng) t.assignedEng = assignedEng;

    syncRecord('tags/' + id, t);

    if(newStatus === 'closed') {
        awardPoints(25, 'إنجاز أمر شغل صيانة (PM)');
        showToast('تم إغلاق البلاغ بنجاح وأرشفته ✅');
    } else {
        showToast('تم تحديث حالة أمر الشغل');
    }
    renderPMDashboard(); // تحديث الشاشة فوراً
}
function renderProfileAndSettings() {
    if(!currentUser || !currentUser.name) return;

    // 1. البيانات الأساسية
    document.getElementById('profileName').innerText = currentUser.name;
    const roleMap = { admin: 'مدير نظام 👑', auditor: 'مراجع فني 📝', operator: 'مشغل معدة ⚙️', viewer: 'مشاهد 👁️' };
    document.getElementById('profileRoleBadge').innerText = roleMap[currentUser.role] || currentUser.role;
    
    const uid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    if (uid && usersData[uid] && typeof usersData[uid] === 'object' && usersData[uid].avatar) {
        document.getElementById('profileAvatar').src = usersData[uid].avatar;
    }

    // 2. إحصائيات النشاط
    document.getElementById('myAudits').innerText = historyData.filter(h => h.auditor === currentUser.name && !h.stepsOrder.includes('ManualKaizen')).length;
    document.getElementById('myTags').innerText = tagsData.filter(t => t.auditor === currentUser.name).length;
    document.getElementById('myKaizens').innerText = historyData.filter(h => h.auditor === currentUser.name && h.stepsOrder.includes('ManualKaizen')).length;

    // 🚀 3. عرض قائمة الأقسام القابلة للحذف
    const deptList = document.getElementById('managedDeptsList');
    if(deptList) {
        deptList.innerHTML = departments.map((d, i) => `
            <div class="item-row">
                <span class="name">🏭 ${d}</span>
                <button class="btn btn-sm btn-danger" style="margin:0; padding:2px 8px;" onclick="removeDept(${i})">حذف</button>
            </div>`).join('');
    }

    // 🚀 4. عرض قائمة المهندسين القابلة للحذف
    const engList = document.getElementById('managedEngsList');
    if(engList) {
        engList.innerHTML = (maintenanceEngineers || []).map((e, i) => `
            <div class="item-row" style="border-right-color:var(--warning);">
                <div>
                    <span class="name">🛠️ ${e.name}</span><br>
                    <small style="font-size:9px; color:var(--text-muted);">${e.phone}</small>
                </div>
                <button class="btn btn-sm btn-danger" style="margin:0; padding:2px 8px;" onclick="removeEngineer(${i})">حذف</button>
            </div>`).join('') || '<div style="font-size:11px; text-align:center; padding:10px;">لا يوجد مهندسون مسجلون</div>';
    }

    // 5. إدارة الصلاحيات و API
    if (currentUser.role === 'admin') {
        document.getElementById('imgbbKeyInput').value = globalApiKeys.imgbb || '';
        document.getElementById('geminiKeyInput').value = globalApiKeys.gemini || '';
    }
}

// دوال الحذف الجديدة
function removeDept(idx) {
    if(confirm(`⚠️ هل تريد حذف قسم (${departments[idx]})؟ سيختفي من الخيارات ولكنه سيبقى في التقارير القديمة.`)) {
        departments.splice(idx, 1);
        syncRecord('departments', departments);
        renderProfileAndSettings();
        showToast('تم حذف القسم');
    }
}

function removeEngineer(idx) {
    if(confirm(`⚠️ حذف المهندس (${maintenanceEngineers[idx].name}) من النظام؟`)) {
        maintenanceEngineers.splice(idx, 1);
        syncRecord('maintenanceEngineers', maintenanceEngineers);
        renderProfileAndSettings();
        showToast('تم الحذف');
    }
}

// 📸 دالة رفع وتحديث الصورة الشخصية
async function updateProfilePic(event) {
    const file = event.target.files[0]; 
    const uid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    if(!file || !uid) return;
    
    showToast('جاري تحديث الصورة الشخصية... ⏳');
    
    processAndEnhanceImage(file, async function(dataUrl) {
        const url = await uploadImageToStorage(dataUrl);
        if (url) {
            // حفظ الصورة في ملف المستخدم بقاعدة البيانات
            await db.ref(`tpm_system/users/${uid}/avatar`).set(url);
            document.getElementById('profileAvatar').src = url;
            showToast('تم تحديث صورتك بنجاح 😎');
        } else { 
            showToast('⚠️ فشل الرفع. تأكد من إعدادات مفتاح ImgBB الخاص بالصور.'); 
        }
    });
}