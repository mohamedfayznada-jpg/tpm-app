// ============================================================================
// 🚀 Factory OS - Core Engine V5.0 (Part 1 - System & Auth)
// ============================================================================

// --- 1. تهيئة قاعدة البيانات (Firebase Init) ---
const envConfig = window.__TPM_CONFIG__ || { geminiApiKey: "", imgbbApiKey: "" };
const firebaseConfig = {
    apiKey: "AIzaSyADr-QEzWt6xeT8oeF7wXfNySvXiKXMEy4",
    authDomain: "tpm-audit-system.firebaseapp.com",
    databaseURL: "https://tpm-audit-system-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "tpm-audit-system",
    storageBucket: "tpm-audit-system.firebasestorage.app",
    messagingSenderId: "1047922099229",
    appId: "1:1047922099229:web:5e3d6fd5fa4c23ab2772f4"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const auth = firebase.auth();

// --- 2. المتغيرات العامة (Global State) ---
let currentUser = { name: '', username: '', role: 'viewer', status: 'active' };
let usersData = {}, departments = [], historyData = [], tasksData = [], tagsData = [];
let maintenanceEngineers = [], knowledgeBaseData = [], userPoints = {}, likesData = {};
let kaizenComments = {}, deptGoalsData = {}, globalApiKeys = { imgbb: "", gemini: "" };
let isOnline = false, currentAudit = null, currentViewedDept = null, currentTaskDept = null;
let currentUploadItemId = null, currentUploadItemTitle = null, currentTagImg = null;
let currentStepSelections = {}, currentStepImages = {}, currentStepImprovements = [];
let kaizenImgs = { before: null, after: null };
let radarChartInstance = null, mainChartInstance = null, deptRadarInstance = null, deptTrendInstance = null, jhMiniChartInstance = null;
let isDrawing = false, sigCanvas = null, sigCtx = null, canvasRect = null;
const appState = { currentScreen: 'loginScreen', history: [] };

// --- 3. كسر عزلة الدوال للواجهة الأمامية (Window Expose) ---
window.db = db; 
window.auth = auth;
window.showToast = (msg) => alert(msg);
window.uniqueNumericId = () => Math.floor(Math.random() * 1000000000);
window.sanitizeInput = (str) => str.replace(/[.#$\[\]]/g, "");

// دوال التنقل والقائمة الجانبية
window.showScreen = function(id, addToHistory = true) {
    const screens = document.querySelectorAll('.screen');
    const target = document.getElementById(id);
    if (!target) return;
    if (addToHistory && appState.currentScreen !== id) appState.history.push(appState.currentScreen);
    screens.forEach(s => s.classList.remove('active'));
    target.classList.add('active');
    appState.currentScreen = id;
    window.scrollTo(0, 0);
};

window.goBack = function() {
    if (appState.history.length > 0) window.showScreen(appState.history.pop(), false);
    else window.showScreen('homeScreen', false);
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
};

window.toggleDarkMode = () => document.body.classList.toggle('light-mode');
window.showJHPortal = () => { window.showScreen('jhPortalScreen'); if(typeof renderJHDepts === 'function') renderJHDepts(); };

// --- 4. محرك الاتصال والمزامنة (Sync Engine) ---
window.syncRecord = (path, data) => { if (isOnline && auth.currentUser) db.ref('tpm_system/' + path).set(data); };
window.deleteRecord = (path) => { if (isOnline && auth.currentUser) db.ref('tpm_system/' + path).remove(); };

document.addEventListener('DOMContentLoaded', () => {
    db.ref('.info/connected').on('value', snap => {
        isOnline = snap.val() === true;
        const statusEl = document.getElementById('cloudStatus');
        if (statusEl) {
            statusEl.innerHTML = isOnline ? "متصل بقاعدة البيانات" : "غير متصل بالسيرفر";
            statusEl.style.color = isOnline ? "var(--success)" : "var(--danger)";
        }
    });
});

// مراقب الدخول - شريان حياة التطبيق
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('cloudStatus').innerHTML = "جاري مزامنة المصنع... ⏳";
        db.ref('tpm_system').on('value', snap => {
            const data = snap.val() || {};
            usersData = data.users || {}; 
            departments = data.departments || [];
            historyData = data.history ? Object.values(data.history) : [];
            tasksData = data.tasks ? Object.values(data.tasks) : [];
            tagsData = data.tags ? Object.values(data.tags) : [];
            maintenanceEngineers = data.maintenanceEngineers || [];
            knowledgeBaseData = data.knowledgeBase ? Object.values(data.knowledgeBase) : [];
            userPoints = data.points || {}; 
            likesData = data.likes || {};
            kaizenComments = data.kaizenComments || {}; 
            deptGoalsData = data.dept_goals || {};
            if (data.api_keys) globalApiKeys = data.api_keys;

            const uData = usersData[user.uid] || { name: 'مستخدم', role: 'viewer', status: 'active' };
            currentUser = { ...uData, uid: user.uid };

            if (currentUser.status === 'pending') { 
                auth.signOut(); 
                alert("حسابك قيد المراجعة من إدارة المصنع."); 
                return; 
            }
            
            document.getElementById('cloudStatus').innerHTML = "متصل 🟢";

            if (appState.currentScreen === 'loginScreen') window.showScreen('homeScreen');
            
            // تحديث الشاشات الحية
            if (typeof updateHomeDashboard === 'function') updateHomeDashboard();
            if (typeof renderProfileAndSettings === 'function') renderProfileAndSettings();
            if (typeof renderTags === 'function') renderTags();
            if (typeof renderSafetyRisks === 'function') renderSafetyRisks();
            if (typeof renderPMDashboard === 'function') renderPMDashboard();
            if (typeof renderKKDashboard === 'function') renderKKDashboard();
        });
    } else {
        window.showScreen('loginScreen');
        document.getElementById('cloudStatus').innerHTML = "غير متصل 🔴";
    }
});

// --- 5. دوال الدخول والتسجيل (Auth Functions) ---
window.login = async function() {
    const u = document.getElementById('loginUsername').value.trim().toLowerCase();
    const p = document.getElementById('loginPassword').value.trim();
    if(!u || !p) return window.showToast('أدخل البيانات');
    if(document.getElementById('rememberMe') && document.getElementById('rememberMe').checked) {
        localStorage.setItem('tpm_user', u);
    }
    try { 
        await auth.signInWithEmailAndPassword(u + "@tpm.app", p); 
    } catch(e) { 
        window.showToast('بيانات الدخول غير صحيحة'); 
    }
};

window.signup = async function() {
    const fn = document.getElementById('signupFullName').value;
    const u = document.getElementById('signupUsername').value.toLowerCase().trim();
    const p = document.getElementById('signupPassword').value.trim();
    const r = document.getElementById('signupRole').value;
    if(!u || !p || !fn) return window.showToast("أكمل البيانات");
    
    try {
        window.showToast("جاري إرسال الطلب...");
        const res = await auth.createUserWithEmailAndPassword(u + "@tpm.app", p);
        const newUserObj = { 
            name: fn, username: u, requestedRole: r, role: 'viewer', status: 'pending', 
            permissions: { homeScreen: 'view', tasksScreen: 'none', historyScreen: 'none', kaizenScreen: 'view', tagsScreen: 'none', knowledgeScreen: 'none' } 
        };
        await db.ref('tpm_system/users/' + res.user.uid).set(newUserObj);
        window.showToast("تم إرسال طلبك! انتظر الموافقة.");
        setTimeout(() => auth.signOut().then(() => window.location.reload()), 2000);
    } catch(e) { 
        window.showToast("اسم المستخدم محجوز أو البيانات خاطئة"); 
    }
};

window.logout = function() { 
    auth.signOut().then(() => { localStorage.clear(); window.location.reload(); }); 
};

window.biometricLogin = function() { 
    const u = localStorage.getItem('tpm_user'); 
    if(u) { 
        document.getElementById('loginUsername').value = u; 
        window.showToast('تم استدعاء الحساب، أدخل الرقم السري'); 
    } else {
        window.showToast('سجل دخولك يدوياً أول مرة');
    }
};

// --- 6. نظام النقاط والمكافآت ---
window.awardPoints = function(pts, reason) {
    if(!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    let currentPts = (userPoints[uid] || 0) + pts;
    window.syncRecord('points/' + uid, currentPts);
    window.syncRecord('global_achievements/' + window.uniqueNumericId(), { 
        user: currentUser.name, uid: uid, reason: reason, points: pts, date: new Date().toLocaleString('ar-EG') 
    });
    window.showToast(`🎖️ حصلت على ${pts} نقطة: ${reason}`);
};
// ============================================================================
// 🚀 Factory OS - Core Engine V5.0 (Part 2 - Modules & Operations)
// ============================================================================

// ------------------------------------------
// 🔍 دالة مسح الباركود الفعالة
// ------------------------------------------
async function scanBarcodeFromImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    window.showToast('جاري قراءة الباركود... 🔍');
    const html5QrCode = new Html5Qrcode("searchResults"); 
    
    try {
        const decodedText = await html5QrCode.scanFile(file, true);
        window.showToast('تمت القراءة بنجاح!');
        
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
        window.showToast('تعذرت قراءة الباركود، تأكد من وضوح الصورة.');
    }
}

// ------------------------------------------
// 🚀 محرك رفع الصور (ImgBB)
// ------------------------------------------
async function uploadImageToStorage(base64Data) {
    const apiKey = globalApiKeys.imgbb;
    if (!apiKey) { window.showToast('مفتاح ImgBB مفقود بالإعدادات!'); return null; }
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
// 🏆 نظام الرتب ولوحة الأبطال
// ------------------------------------------
function updateUsersLeaderboard() {
    const lc = document.getElementById('usersLeaderboardContainer');
    if(!lc) return;

    let sortable = [];
    for (let uid in userPoints) {
        let uInfo = usersData[uid] || { name: "مستخدم مجهول" };
        sortable.push({ uid: uid, name: uInfo.name, avatar: uInfo.avatar, points: userPoints[uid] });
    }
    
    sortable.sort((a, b) => b.points - a.points);

    if(sortable.length === 0) { 
        lc.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">المصنع بانتظار أول بطل... 🚀</div>'; 
        return; 
    }

    const topLimit = 20;
    const topUsers = sortable.slice(0, topLimit);

    let html = topUsers.map((item, idx) => generateEliteCardHTML(item, idx)).join('');

    const myUid = currentUser.uid;
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

// ------------------------------------------
// 👤 مركز القيادة الشخصي (Profile)
// ------------------------------------------
async function openMyFullProfile() {
    const uid = currentUser.uid;
    if(!uid || !usersData[uid]) return window.showToast('خطأ في جلب بيانات المستخدم');
    
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
    ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10); 

    let timelineHtml = allActivity.map(item => `
        <div class="item-row" style="border-right-color: ${item.type === 'tag' ? 'var(--danger)' : (item.type === 'kaizen' ? 'var(--success)' : 'var(--gold)')};">
            <span style="flex:1;">${item.text}</span>
            <small style="color:var(--text-muted); font-size:10px; margin-right:10px;">${item.date}</small>
        </div>
    `).join('');

    document.getElementById('myActivityTimeline').innerHTML = `
        <div class="dashboard-stats" style="margin-bottom:20px;">
            <div class="card stat-card glass-card" style="border-color:var(--gold);"><div class="stat-value">${myAudits.length}</div><div class="stat-label">مراجعة</div></div>
            <div class="card stat-card glass-card" style="border-color:var(--danger);"><div class="stat-value">${myTags.length}</div><div class="stat-label">تاج</div></div>
            <div class="card stat-card glass-card" style="border-color:var(--success);"><div class="stat-value">${myKaizens.length}</div><div class="stat-label">كايزن</div></div>
        </div>
        <h4 style="color:var(--gold); border-bottom:1px solid rgba(212,175,55,0.2); padding-bottom:5px;">آخر التحركات الميدانية:</h4>
        ${timelineHtml || '<div style="text-align:center; padding:10px; font-size:11px; color:var(--text-muted);">لم يتم رصد أي نشاط ميداني لاسمك الحالي بعد 🚀</div>'}
    `;

    window.showScreen('profileDetailsScreen');
}

// ------------------------------------------
// 📈 محرك الشاشة الرئيسية
// ------------------------------------------
function updateHomeDashboard() {
    let tScore = 0, aCount = 0;
    let deptLabels = [];
    let deptScores = [];
    
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
    
    const ctx = document.getElementById('mainDashboardChart');
    if (ctx) {
        if (mainChartInstance) mainChartInstance.destroy(); 
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

    let criticalTags = tagsData.filter(t => t.status === 'open' && t.color === 'red').slice(0, 5);
    let cTagsHtml = criticalTags.map(t => `
        <div style="background:rgba(198,40,40,0.1); border-right:3px solid var(--danger); padding:8px; margin-bottom:8px; border-radius:5px; font-size:11px; cursor:pointer;" onclick="window.showScreen('tagsScreen'); document.getElementById('filterTagDept').value='${t.dept}'; renderTags();">
            <b style="color:var(--text-main);">${t.desc}</b><br>
            <span style="color:var(--danger); font-weight:bold;">${t.dept}</span> <span style="color:var(--text-muted);">- ${t.machine||'عام'}</span>
        </div>
    `).join('');
    
    const critContainer = document.getElementById('criticalTagsList');
    if(critContainer) critContainer.innerHTML = cTagsHtml || '<div style="text-align:center; color:var(--success); font-size:12px; padding:20px 0;">لا توجد أعطال حرجة 🎉</div>';

    updateUsersLeaderboard();
}

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

    document.getElementById('deptActionItems').innerHTML = deptTags.slice(0,3).map(t => `
        <div class="card glass-card" style="padding:12px; border-right:4px solid ${t.color==='red'?'var(--danger)':'var(--primary-light)'}; margin-bottom:10px;">
            <div style="font-weight:bold; font-size:12px; color:var(--text-main);">${t.desc}</div>
            <div style="font-size:10px; color:var(--text-muted); margin-top:5px;">👤 ${t.auditor} | ⚙️ ${t.machine || 'عام'}</div>
        </div>
    `).join('') || '<div style="text-align:center; color:var(--success); font-size:12px; padding:20px;">لا توجد أعطال حرجة في هذا القسم 🎉</div>';

    window.showScreen('deptDashboardScreen');
}

// ------------------------------------------
// 📝 محرك المراجعة الذاتية (Audit Engine)
// ------------------------------------------
function saveAuditDraft() { if(currentAudit) localStorage.setItem('tpm_audit_draft', JSON.stringify(currentAudit)); }
function loadAuditDraft() { const draft = localStorage.getItem('tpm_audit_draft'); if(draft) { currentAudit = JSON.parse(draft); renderCurrentAuditStep(); } }
function clearAuditDraft() { localStorage.removeItem('tpm_audit_draft'); }

window.startNewAuditFlow = function() { 
    if(currentViewedDept) document.getElementById('selectDept').value = currentViewedDept; 
    const draft = localStorage.getItem('tpm_audit_draft');
    if(draft) {
        let dObj = JSON.parse(draft);
        if(confirm(`يوجد تقييم غير مكتمل لقسم (${dObj.dept}). هل تريد استكماله؟`)) { loadAuditDraft(); return; } 
        else { clearAuditDraft(); }
    }
    window.showScreen('setupScreen'); 
};

function initAuditSequential() {
    currentAudit = { id: window.uniqueNumericId().toString(), dept: document.getElementById('selectDept').value, machine: document.getElementById('setupMachine').value||'عام', auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG'), stepsOrder: ['JH-0','JH-1','JH-2','JH-3','JH-4','JH-5','JH-6'], currentStepIndex: 0, results: {} };
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
    window.showScreen('auditScreen'); 
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
    for (let key in currentStepSelections) {
        totalScoreSoFar += currentStepSelections[key].score;
        totalMaxSoFar += currentStepSelections[key].max;
    }

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
    window.showToast('جاري رفع وتحليل الصورة...');
    processAndEnhanceImage(file, async function(dataUrl) {
        const url = await uploadImageToStorage(dataUrl);
        if (url) {
            currentStepImages['img_' + currentUploadItemId] = { title: currentUploadItemTitle, data: url };
            saveAuditDraft(); renderCurrentAuditStep(); window.showToast('تم الرفع');
        } else { window.showToast('فشل الرفع'); }
    });
}

function finishCurrentStep() {
    const k = currentAudit.stepsOrder[currentAudit.currentStepIndex]; 
    const sd = AUDIT_DATA[k];
    
    if(Object.keys(currentStepSelections).length < sd.items.length) { 
        window.showToast('⚠️ يرجى تقييم جميع البنود قبل الحفظ'); return; 
    }
    
    let totalScore = 0, totalMax = 0; currentStepImprovements = [];
    
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
    
    document.getElementById('opportunitiesContainer').innerHTML = currentStepImprovements.length > 0 
        ? currentStepImprovements.map(i=>`<div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-bottom:8px; border-right:4px solid var(--warning); font-size:12px; text-align:right; color:var(--text-main);">🔹 ${i}</div>`).join('') 
        : '<div style="color:var(--success); font-weight:bold; text-align:center; padding:20px;">🌟 أداء مثالي، لا توجد ملاحظات</div>';
    
    window.showScreen('stepSummaryScreen');
}

function skipCurrentStep() { currentAudit.results[currentAudit.stepsOrder[currentAudit.currentStepIndex]] = {skipped:true, score:0, max:0, improvements:[], selections:{}, images:{}}; saveAuditDraft(); goToNextStep(); }
function goToNextStep() { currentAudit.currentStepIndex++; if(currentAudit.currentStepIndex < 7) renderCurrentAuditStep(); else generateFinalReport(); }

// ------------------------------------------
// ✍️ التوقيع الفائق وحفظ التقرير
// ------------------------------------------
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
    window.showScreen('finalReportScreen');
    initSignaturePad();
}

async function saveFinalAudit() {
    if(!canAccess('historyScreen', 'edit')) { window.showToast('غير مصرح بحفظ المراجعات'); return; }
    if(!confirm("هل أنت متأكد من اعتماد وحفظ هذه المراجعة؟ سيتم إنشاء مهام تلقائية بالتحسينات.")) return;

    window.showToast('جاري معالجة البيانات وحفظ التقرير... ⏳');
    if(sigCanvas) currentAudit.signature = sigCanvas.toDataURL('image/jpeg', 0.8);
    
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
            task: `تحسينات مراجعة (${currentAudit.date})`, subTasks: allImprovements.map(imp => ({ text: imp, status: 'pending' })), status: 'pending'
        };
        await db.ref('tpm_system/tasks/' + fId).set(folderTask);
    }

    await db.ref('tpm_system/history/' + currentAudit.id).set(currentAudit);
    window.awardPoints(50, 'إتمام مراجعة رسمية');
    
    clearAuditDraft();
    window.showToast('تم حفظ التقرير بنجاح ✅ جاري تحويلك للأرشيف...');
    setTimeout(() => { window.showScreen('historyScreen'); }, 1500);
}

// ------------------------------------------
// 📊 أرشيف التقارير والتفاصيل
// ------------------------------------------
function renderHistory() {
    let real = historyData.filter(h=>!h.stepsOrder.includes('ManualKaizen')).reverse();
    let html = real.map(a => {
        let controls = (canAccess('historyScreen', 'edit') || currentUser.name === a.auditor) ? `
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

function deleteReport(id) { if(confirm('تأكيد الحذف النهائي للتقرير؟')) { window.deleteRecord('history/' + id); window.showToast('تم الحذف بنجاح'); } }
function editReport(id) { let rep = historyData.find(h => h.id === id); if(!rep) return; currentAudit = JSON.parse(JSON.stringify(rep)); currentAudit.currentStepIndex = 0; renderCurrentAuditStep(); }

function viewDetailedReport(id) {
    let a = historyData.find(h => h.id === id); 
    if(!a) return;

    document.getElementById('detDept').innerText = a.dept;
    document.getElementById('detMachine').innerText = a.machine || 'عام'; 
    document.getElementById('detAuditor').innerText = a.auditor;
    document.getElementById('detDate').innerText = a.date;
    
    const totalPct = a.totalPct || 0;
    document.getElementById('detPct').innerText = totalPct + '%';

    let grade = "ضعيف";
    if (totalPct >= 90) grade = "ممتاز ⭐";
    else if (totalPct >= 80) grade = "جيد جداً";
    else if (totalPct >= 70) grade = "جيد";
    else if (totalPct >= 50) grade = "مقبول";
    document.getElementById('detGrade').innerText = grade;
    document.getElementById('detGrade').style.color = totalPct >= 80 ? '#2e7d32' : (totalPct >= 50 ? '#f57f17' : '#c62828');

    let tableHtml = '', detailsHtml = '';

    a.stepsOrder.forEach(k => {
        let r = a.results[k];
        if (!r) return;

        let p = r.skipped ? 0 : Math.round((r.score / r.max) * 100);
        let statusText = r.skipped ? 'تخطي' : `${r.score}/${r.max}`;
        
        tableHtml += `
            <tr>
                <td><b>${k}</b></td>
                <td>${AUDIT_DATA[k] ? AUDIT_DATA[k].name : '---'}</td>
                <td>${statusText}</td>
                <td style="font-weight:bold; color:${p >= 80 ? '#2e7d32' : '#000'}">${p}%</td>
            </tr>`;

        if (!r.skipped) {
            let imps = (r.improvements && r.improvements.length > 0) 
                ? r.improvements.map(i => `<div style="font-size:11px; margin-bottom:3px; color:#444;">• ${i}</div>`).join('') 
                : '<span style="color:#2e7d32; font-weight:bold;">لا توجد ملاحظات</span>';
            
            let imgsHtml = ''; 
            if(r.images) { Object.values(r.images).forEach(img => { if (img.data) imgsHtml += `<img src="${img.data}" style="height:80px; width:80px; object-fit:cover; margin:5px; border:1px solid #ddd; border-radius:4px;">`; }); }

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

    const sigDiv = document.getElementById('detSignatureImg');
    if (a.signature) { sigDiv.innerHTML = `<img src="${a.signature}" style="height:60px; max-width:150px; border-bottom:1px solid #000;">`; } 
    else { sigDiv.innerHTML = '<div style="height:60px; color:#999; font-size:10px; padding-top:40px;">لا يوجد توقيع رقمي</div>'; }

    window.showScreen('detailedReportScreen');
}

function downloadProfessionalPDF() {
    window.scrollTo(0,0);
    const btns = document.querySelectorAll('#detailedReportScreen .no-print'); btns.forEach(b => b.style.display = 'none');
    html2pdf().set({margin:0.2, filename:'تقرير_مراجعة.pdf', image:{type:'jpeg',quality:1}, html2canvas:{scale:2, useCORS:true}, jsPDF:{unit:'in', format:'a4', orientation:'portrait'}}).from(document.getElementById('printableReportArea')).save().then(()=>{ btns.forEach(b => b.style.display = ''); });
}

// ------------------------------------------
// 📋 إدارة المهام (Tasks Kanban)
// ------------------------------------------
function renderTasks() {
    let htmlFolders = '';
    const cols = { pending: '', progress: '', done: '' };
    const counts = { pending: 0, progress: 0, done: 0 };
    
    let currentDeptTasks = tasksData.filter(t => t.dept === currentTaskDept);

    currentDeptTasks.forEach(t => {
        let deleteBtnHTML = canAccess('tasksScreen', 'edit') ? `<button class="btn btn-sm btn-danger" style="padding:2px 8px; width:auto; margin:0;" onclick="deleteTask('${t.id}')">حذف 🗑️</button>` : '';
        
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
                    ${canAccess('tasksScreen', 'edit') ? `<button class="btn btn-sm btn-danger" onclick="deleteTask('${t.id}')">🗑️</button>` : ''}
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

function deleteTask(id) { if(confirm('⚠️ هل أنت متأكد من حذف المهمة؟')) { window.deleteRecord('tasks/' + id); window.showToast('تم الحذف'); } }
function updateTasksDeptGrid() {
    let deptStats = {}; departments.forEach(d => deptStats[d] = { p:0 });
    let pendAll=0, progAll=0, doneAll=0;
    
    tasksData.forEach(t => {
        let isDone = t.isFolder ? (t.subTasks && t.subTasks.every(s=>s.status==='done') && t.subTasks.length>0) : (t.status==='done');
        let isProg = t.isFolder ? (t.subTasks && t.subTasks.some(s=>s.status==='done') && !isDone) : (t.status==='progress');
        if(isDone) doneAll++; else if(isProg) progAll++; else pendAll++;
        if(!isDone && t.dept && deptStats[t.dept]) deptStats[t.dept].p++;
    });
    
    if(document.getElementById('kpiTasksPendingAll')) document.getElementById('kpiTasksPendingAll').innerText = pendAll;
    if(document.getElementById('kpiTasksProgressAll')) document.getElementById('kpiTasksProgressAll').innerText = progAll;
    if(document.getElementById('kpiTasksDoneAll')) document.getElementById('kpiTasksDoneAll').innerText = doneAll;
    
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
function toggleFolderSubTask(fId, sIdx) { let f = tasksData.find(x=>x.id==fId); if(f) { f.subTasks[sIdx].status = f.subTasks[sIdx].status==='done'?'pending':'done'; window.syncRecord('tasks/' + fId, f); } }
function changeTaskStatus(id, st) { let t=tasksData.find(x=>x.id==id); if(t) {t.status=st; window.syncRecord('tasks/' + id, t);} }
function addManualTaskDept() { let v=document.getElementById('newTaskInput').value; if(v){ let id = window.uniqueNumericId().toString(); window.syncRecord('tasks/' + id, {id:id, task:v, dept:currentTaskDept, status:'pending'}); document.getElementById('newTaskInput').value=''; window.showToast('تمت الإضافة'); } }

// ------------------------------------------
// 💡 مجتمع كايزن (Kaizen & Ideas)
// ------------------------------------------
function handleKaizenImage(e, type) {
    const f=e.target.files[0]; if(!f) return;
    window.showToast('جاري تحضير الصورة...');
    processAndEnhanceImage(f, function(dataUrl) { kaizenImgs[type] = dataUrl; document.getElementById(type==='before'?'kaizenBeforePreview':'kaizenAfterPreview').innerHTML=`<span style="color:var(--success); font-size:11px; font-weight:bold;">تم الإرفاق</span>`; });
}

function submitManualKaizen() {
    let t = document.getElementById('newKaizenTitle').value; let d = document.getElementById('newKaizenDept').value;
    if(!t || !kaizenImgs.before || !kaizenImgs.after) { window.showToast('برجاء كتابة الوصف وإرفاق الصورتين'); return; }
    
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
                let kId = window.uniqueNumericId().toString();
                window.syncRecord('history/' + kId, { id: kId, dept: d, auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG'), stepsOrder: ['ManualKaizen'], totalPct: 100, results: { 'ManualKaizen': { images: { 'img_1': { title: t, data: uploadedUrl } } } } });
                
                document.getElementById('newKaizenTitle').value = '';
                document.getElementById('kaizenBeforePreview').innerHTML = ''; document.getElementById('kaizenAfterPreview').innerHTML = '';
                kaizenImgs = { before: null, after: null };
                document.getElementById('kaizenUploadModal').style.display = 'none';
                
                window.awardPoints(40, 'مشاركة كايزن'); window.showToast('تم نشر الكايزن بنجاح');
            } else { window.showToast('فشل الرفع، راجع مفتاح ImgBB'); }
            
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
        let canEdit = canAccess('kaizenScreen', 'edit') || currentUser.name === k.auditor;
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

function toggleKaizenLike(id) { if(!likesData[id]) likesData[id]=[]; let i=likesData[id].indexOf(currentUser.name); if(i>-1) likesData[id].splice(i,1); else likesData[id].push(currentUser.name); window.syncRecord('likes/' + id, likesData[id]); }
function deleteKaizen(id) { if(confirm('تأكيد مسح الكايزن؟')) { window.deleteRecord('history/' + id); window.showToast('تم الحذف'); } }
function editKaizen(id) { let k=historyData.find(x=>x.id===id); if(!k) return; let v=prompt('تعديل الوصف:', k.results.ManualKaizen.images.img_1.title); if(v) { k.results.ManualKaizen.images.img_1.title=window.sanitizeInput(v); window.syncRecord('history/' + id, k); window.showToast('تم التعديل'); } }
function addKaizenComment(id) { let el=document.getElementById(`comment_input_${id}`); let txt=window.sanitizeInput(el.value); if(!txt) return; if(!kaizenComments[id]) kaizenComments[id]=[]; kaizenComments[id].push({user:currentUser.name, text:txt, date:new Date().toLocaleTimeString('ar-EG')}); window.syncRecord('kaizenComments/' + id, kaizenComments[id]); el.value=''; window.awardPoints(2, 'كتابة تعليق'); }

// ------------------------------------------
// 🏷️ محرك التذاكر والتاجات (Tags & Tickets)
// ------------------------------------------
function handleTagImage(e) {
    const f=e.target.files[0]; if(!f) return;
    window.showToast('جاري تحضير الصورة...');
    processAndEnhanceImage(f, function(dataUrl) { currentTagImg=dataUrl; document.getElementById('tagImagePreview').innerHTML=`<span style="color:var(--success); font-size:11px; font-weight:bold;">مُجهزة للرفع</span>`; });
}

async function addNewTag() {
    let d=document.getElementById('newTagDesc').value, c=document.getElementById('newTagColor').value, dp=document.getElementById('newTagDept').value, m=document.getElementById('newTagMachine').value, sp=document.getElementById('newTagSpareParts').value;
    if(!d) { window.showToast('أدخل وصف المشكلة'); return; }
    
    let fullDesc = sp ? `${d} [أجزاء: ${sp}]` : d;
    let uploadedUrl = null;
    
    if (currentTagImg) {
        window.showToast('جاري رفع التاج والصورة... ⏳');
        uploadedUrl = await uploadImageToStorage(currentTagImg);
        if(!uploadedUrl) window.showToast('⚠️ فشل رفع الصورة. سيتم حفظ التاج كنص فقط.');
    }
    
    let tId = window.uniqueNumericId().toString();
    window.syncRecord('tags/' + tId, {id:tId, desc:fullDesc, color:c, dept:dp, machine:m, image:uploadedUrl, status:'open', auditor:currentUser.name, date:new Date().toLocaleDateString('ar-EG'), timestamp: Date.now()});
    
    document.getElementById('newTagDesc').value=''; document.getElementById('newTagMachine').value=''; document.getElementById('newTagSpareParts').value=''; currentTagImg = null;
    let preview = document.getElementById('tagImagePreview'); if(preview) preview.innerHTML = '';
    
    window.awardPoints(10, 'إصدار تاج جديد'); 
    window.showToast('تم إصدار التاج بنجاح ✅');
}

function renderTags() {
    let rc = document.getElementById('redTagsContainer'); 
    let bc = document.getElementById('blueTagsContainer');
    if(!rc || !bc) return;
    
    let fDept = document.getElementById('filterTagDept').value; 
    let fMach = document.getElementById('filterTagMachine').value.trim().toLowerCase();
    let fStatus = document.getElementById('filterTagStatus') ? document.getElementById('filterTagStatus').value : 'active';
    
    let redHtml = '', blueHtml = '';
    let currentTime = Date.now();
    const THREE_DAYS_MS = 259200000;

    tagsData.forEach(t => {
        if(fDept !== 'الكل' && t.dept !== fDept) return;
        if(fMach !== '' && (!t.machine || !t.machine.toLowerCase().includes(fMach))) return;
        
        let isClosed = (t.status === 'closed');
        if(fStatus === 'active' && isClosed) return;
        if(fStatus === 'closed' && !isClosed) return;

        let isAged = (!isClosed && t.timestamp && (currentTime - t.timestamp > THREE_DAYS_MS));
        let canEdit = canAccess('tagsScreen', 'edit') || currentUser.name === t.auditor;
        
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
            <div class="ticket-header"><div class="ticket-title">${t.desc}</div></div>
            <div class="ticket-meta">🏭 ${t.dept} ${t.machine ? ' | ⚙️ ' + t.machine : ''}<br>👤 ${t.auditor} | 📅 ${t.date}</div>
            ${t.image ? `<img src="${t.image}" class="ticket-img" title="اضغط لتكبير الصورة" onclick="window.open('${t.image}', '_blank')">` : ''}
            <div class="row-flex" style="margin-top:10px; border-top:1px dashed rgba(255,255,255,0.1); padding-top:10px;">${controls}</div>
        </div>`;

        if(t.color === 'red') redHtml += cardHtml; else blueHtml += cardHtml;
    });

    rc.innerHTML = redHtml || '<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:15px;">لا توجد تاجات صيانة</div>';
    bc.innerHTML = blueHtml || '<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:15px;">لا توجد تاجات إنتاج</div>';
}

function updateTagState(id, st) { let t=tagsData.find(x=>x.id==id); if(t) {t.status=st; window.syncRecord('tags/' + id, t); if(st==='closed') window.awardPoints(20, 'إغلاق تاج');} }
function deleteTag(id) { if(confirm('تأكيد حذف التاج نهائياً؟')) { window.deleteRecord('tags/' + id); window.showToast('تم الحذف'); } }
function editTag(id) { let t=tagsData.find(x=>x.id==id); if(!t) return; let v=prompt('تعديل وصف المشكلة:', t.desc); if(v) { t.desc=window.sanitizeInput(v); window.syncRecord('tags/' + id, t); window.showToast('تم التعديل'); } }

// ------------------------------------------
// ⚙️ الإعدادات وحفظ الملف الشخصي (Settings)
// ------------------------------------------
function switchSettingsTab(tabId) {
    document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

async function savePersonalData() {
    const uid = currentUser.uid;
    const newName = document.getElementById('editName').value.trim();
    const newPhone = document.getElementById('editPhone').value.trim();
    const newDept = document.getElementById('editDept').value;

    if(!newName) return window.showToast('الاسم مطلوب');

    window.showToast('جاري تحديث هويتك... ⏳');
    await db.ref(`tpm_system/users/${uid}`).update({ name: newName, phone: newPhone, dept: newDept });

    currentUser.name = newName; 
    window.showToast('تم تحديث بياناتك بنجاح ✅');
    renderProfileAndSettings(); 
    window.showScreen('settingsScreen');
}

function renderProfileAndSettings() {
    if(!currentUser || !currentUser.name) return;

    document.getElementById('profileName').innerText = currentUser.name;
    const roleMap = { admin: 'مدير نظام 👑', auditor: 'مراجع فني 📝', operator: 'مشغل معدة ⚙️', viewer: 'مشاهد 👁️' };
    document.getElementById('profileRoleBadge').innerText = roleMap[currentUser.role] || currentUser.role;
    
    if (currentUser.uid && usersData[currentUser.uid] && usersData[currentUser.uid].avatar) {
        document.getElementById('profileAvatar').src = usersData[currentUser.uid].avatar;
    }

    document.getElementById('myAudits').innerText = historyData.filter(h => h.auditor === currentUser.name && !h.stepsOrder.includes('ManualKaizen')).length;
    document.getElementById('myTags').innerText = tagsData.filter(t => t.auditor === currentUser.name).length;
    document.getElementById('myKaizens').innerText = historyData.filter(h => h.auditor === currentUser.name && h.stepsOrder.includes('ManualKaizen')).length;

    const deptList = document.getElementById('managedDeptsList');
    if(deptList) {
        deptList.innerHTML = departments.map((d, i) => `<div class="item-row"><span class="name">🏭 ${d}</span><button class="btn btn-sm btn-danger" style="margin:0; padding:2px 8px;" onclick="removeDept(${i})">حذف</button></div>`).join('');
    }

    const engList = document.getElementById('managedEngsList');
    if(engList) {
        engList.innerHTML = (maintenanceEngineers || []).map((e, i) => `<div class="item-row" style="border-right-color:var(--warning);"><div><span class="name">🛠️ ${e.name}</span><br><small style="font-size:9px; color:var(--text-muted);">${e.phone}</small></div><button class="btn btn-sm btn-danger" style="margin:0; padding:2px 8px;" onclick="removeEngineer(${i})">حذف</button></div>`).join('') || '<div style="font-size:11px; text-align:center; padding:10px;">لا يوجد مهندسون</div>';
    }

    if (currentUser.role === 'admin') {
        document.getElementById('imgbbKeyInput').value = globalApiKeys.imgbb || '';
        document.getElementById('geminiKeyInput').value = globalApiKeys.gemini || '';
    }
}

function removeDept(idx) { if(confirm(`حذف قسم (${departments[idx]})؟`)) { departments.splice(idx, 1); window.syncRecord('departments', departments); renderProfileAndSettings(); window.showToast('تم الحذف'); } }
function removeEngineer(idx) { if(confirm(`حذف المهندس (${maintenanceEngineers[idx].name})؟`)) { maintenanceEngineers.splice(idx, 1); window.syncRecord('maintenanceEngineers', maintenanceEngineers); renderProfileAndSettings(); window.showToast('تم الحذف'); } }

async function updateProfilePic(event) {
    const file = event.target.files[0]; const uid = currentUser.uid;
    if(!file || !uid) return;
    window.showToast('جاري تحديث الصورة... ⏳');
    processAndEnhanceImage(file, async function(dataUrl) {
        const url = await uploadImageToStorage(dataUrl);
        if (url) {
            await db.ref(`tpm_system/users/${uid}/avatar`).set(url);
            document.getElementById('profileAvatar').src = url;
            window.showToast('تم التحديث 😎');
        } else { window.showToast('⚠️ فشل الرفع.'); }
    });
}

function saveApiKeys() {
    globalApiKeys.imgbb = document.getElementById('imgbbKeyInput').value.trim();
    globalApiKeys.gemini = document.getElementById('geminiKeyInput').value.trim();
    document.getElementById('imgbbKeyInput').disabled = true; document.getElementById('geminiKeyInput').disabled = true;
    window.syncRecord('api_keys', globalApiKeys); window.showToast('تم حفظ وتأمين المفاتيح');
}
function enableApiKeysEdit() { document.getElementById('imgbbKeyInput').disabled = false; document.getElementById('geminiKeyInput').disabled = false; window.showToast('جاهز للتعديل'); }
function addOrUpdateDept() { let v = document.getElementById('newDeptInput').value; if(v){ departments.push(v); window.syncRecord('departments', departments); window.showToast('تم الحفظ'); } }
function addEngineer() { let n=document.getElementById('newEngName').value, p=document.getElementById('newEngPhone').value; if(n&&p) { maintenanceEngineers.push({name:n, phone:p}); window.syncRecord('maintenanceEngineers', maintenanceEngineers); window.showToast('تم الإضافة'); } }

// ------------------------------------------
// 🧠 محرك عقل المصنع والذكاء الاصطناعي (AI & KB)
// ------------------------------------------
function nl2brSafe(str) { return str.replace(/\n/g, '<br>'); }
async function getBase64FromUrl(url) {
    try { const res = await fetch(url); const blob = await res.blob(); return new Promise(resolve => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(blob); }); } 
    catch(e) { return null; }
}

async function runAIVision(itemId, itemTitle) {
    const apiKey = globalApiKeys.gemini; if(!apiKey) return window.showToast('مفتاح Gemini مفقود');
    let imgObj = currentStepImages['img_' + itemId]; if(!imgObj) return window.showToast('لا توجد صورة لفحصها');
    document.getElementById('aiModalText').innerHTML = "جاري فحص الصورة..."; document.getElementById('aiModal').style.display = 'flex';
    try {
        const base64Img = await getBase64FromUrl(imgObj.data);
        let promptParts = [{ text: `أنت مهندس صيانة. حلل الصورة لبند: "${itemTitle}". رد بـ HTML منسق.` }];
        promptParts.push({ inline_data: { mime_type: "image/jpeg", data: base64Img } });
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: promptParts }] }) });
        const result = await response.json(); document.getElementById('aiModalText').innerHTML = nl2brSafe(result.candidates[0].content.parts[0].text); window.awardPoints(5, 'استشارة AI');
    } catch(e) { document.getElementById('aiModalText').innerHTML = "خطأ في الاتصال بالذكاء الاصطناعي."; }
}

async function predictMachineFailures() {
    const k = globalApiKeys.gemini; if(!k) return window.showToast('مفتاح Gemini غير مفعل');
    const r = document.getElementById('aiPredictionResult'); r.style.display='block'; r.innerText='جاري تحليل البيانات...';
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: "توقع الأعطال بناءً على التاجات المفتوحة: " + tagsData.map(t=>t.desc).join(',') }] }] }) });
        const j = await res.json(); r.innerHTML = nl2brSafe(j.candidates[0].content.parts[0].text);
    } catch(e) { r.innerText='فشل الاتصال'; }
}

async function explainItem(t) {
    const k = globalApiKeys.gemini; if(!k) return window.showToast('مفتاح Gemini مفقود');
    document.getElementById('aiModal').style.display='flex'; 
    document.getElementById('aiModalText').innerHTML = '<div style="text-align:center;">جاري تحليل البند... 🧠🔍</div>';
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `اشرح البند التالي للمراجع الميداني: "${t}".` }] }] }) });
        const j = await res.json(); document.getElementById('aiModalText').innerHTML = nl2brSafe(j.candidates[0].content.parts[0].text);
    } catch(e) { document.getElementById('aiModalText').innerText='خطأ في استحضار الذاكرة المعرفية'; }
}

// ------------------------------------------
// 📚 إدارة المكتبة (Knowledge Base)
// ------------------------------------------
let currentUploadedPdfBase64 = null;
if (typeof pdfjsLib !== 'undefined') pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

async function handlePDFUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    const statusEl = document.getElementById('pdfExtractStatus');
    statusEl.innerText = "جاري رفع الكتالوج... ⏳"; statusEl.style.color = "var(--warning)";
    try {
        const reader = new FileReader();
        reader.onload = async function(e) {
            currentUploadedPdfBase64 = e.target.result.split(',')[1];
            if(typeof pdfjsLib !== 'undefined') {
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
            }
            statusEl.innerText = "تم تجهيز الكتالوج بالكامل ✅"; statusEl.style.color = "var(--success)";
        };
        reader.readAsDataURL(file);
    } catch (error) { statusEl.innerText = "❌ فشل الرفع."; statusEl.style.color = "var(--danger)"; }
}

function addKnowledgeBaseArticle() {
    let title = document.getElementById('kbTitle').value.trim();
    let cat = document.getElementById('kbCategory').value;
    let content = document.getElementById('kbContent').value.trim();
    if(!title || (!content && !currentUploadedPdfBase64)) { window.showToast('أدخل العنوان والمحتوى'); return; }
    
    let id = window.uniqueNumericId().toString();
    let article = { id: id, title: title, category: cat, content: content, date: new Date().toLocaleDateString('ar-EG'), author: currentUser.name, hasPdf: !!currentUploadedPdfBase64 };
    window.syncRecord('knowledgeBase/' + id, article);
    
    if (currentUploadedPdfBase64) db.ref('tpm_system/pdf_files/' + id).set({ base64: currentUploadedPdfBase64 });
    
    document.getElementById('addBookModal').style.display = 'none'; currentUploadedPdfBase64 = null;
    window.showToast('تمت إضافة المرجع 📚');
}

// ------------------------------------------
// ✨ بيئة العمل 5S (الكاميرا الذكية)
// ------------------------------------------
function load5SImage(event, type) {
    const file = event.target.files[0]; if(!file) return;
    window.showToast('جاري معالجة الصورة... ⏳');
    processAndEnhanceImage(file, function(dataUrl) {
        images5S[type] = dataUrl;
        if(type === 'standard') document.getElementById('imgStandard').src = dataUrl;
        if(type === 'current') {
            let imgC = document.getElementById('imgCurrent');
            imgC.src = dataUrl; imgC.style.width = document.getElementById('sliderWrapper').offsetWidth + 'px';
        }
        if(images5S.standard && images5S.current) {
            document.getElementById('fiveSSliderContainer').style.display = 'block';
            window.showToast('اسحب الشريط للمطابقة ↔️');
            init5SSlider();
        }
    });
}

function init5SSlider() {
    const container = document.getElementById('sliderWrapper');
    const overlay = document.getElementById('sliderOverlay');
    const handle = document.getElementById('sliderHandle');
    let isSliding = false;
    document.getElementById('imgCurrent').style.width = container.offsetWidth + 'px';
    function slide(e) {
        if (!isSliding) return;
        let rect = container.getBoundingClientRect();
        let x = (e.pageX || (e.touches && e.touches[0].pageX)) - rect.left;
        if (x < 0) x = 0; if (x > rect.width) x = rect.width;
        overlay.style.width = (((rect.width - x) / rect.width) * 100) + '%';
        handle.style.left = x + 'px';
    }
    handle.onmousedown = () => isSliding = true; document.onmouseup = () => isSliding = false; container.onmousemove = slide;
    handle.ontouchstart = (e) => { isSliding = true; e.preventDefault(); }; document.ontouchend = () => isSliding = false; container.ontouchmove = slide;
}

async function generate5STask() {
    let taskDesc = prompt("صف المخالفة (مثال: أدوات خارج مكانها):"); if(!taskDesc) return;
    let dp = departments[0];
    let imageUrl = images5S.current ? await uploadImageToStorage(images5S.current) : "";
    let tId = window.uniqueNumericId().toString();
    window.syncRecord('tasks/' + tId, { id: tId, task: `[مخالفة 5S] - ${taskDesc}`, dept: dp, status: 'pending', image: imageUrl });
    window.awardPoints(5, 'رصد مخالفة 5S');
    window.showToast('تم تسجيل المهمة وتوجيهها 🚨');
    document.getElementById('fiveSSliderContainer').style.display = 'none';
}

// ------------------------------------------
// 🔧 محرك الصيانة المخططة (PM Engine)
// ------------------------------------------
function renderPMDashboard() {
    let pmContainer = document.getElementById('pmWorkOrdersContainer');
    if(!pmContainer) return;
    let redTags = tagsData.filter(t => t.color === 'red');
    let pending = redTags.filter(t => t.status === 'open');
    let progress = redTags.filter(t => t.status === 'progress' || t.status === 'review');
    
    document.getElementById('pmPendingCount').innerText = pending.length;
    document.getElementById('pmProgressCount').innerText = progress.length;
    document.getElementById('pmClosedCount').innerText = redTags.filter(t => t.status === 'closed').length;

    let activeOrders = [...pending, ...progress];
    if(activeOrders.length === 0) { pmContainer.innerHTML = '<div style="text-align:center; color:var(--success); padding:30px;">لا توجد أوامر شغل معلقة.</div>'; return; }

    pmContainer.innerHTML = activeOrders.map(t => {
        let statusColor = t.status === 'open' ? 'var(--danger)' : 'var(--warning)';
        let engOptions = maintenanceEngineers.map(e => `<option value="${e.name}" ${t.assignedEng===e.name?'selected':''}>${e.name}</option>`).join('');
        return `
        <div class="card glass-card" style="border-right:5px solid ${statusColor}; margin-bottom:15px;">
            <h4>${t.desc}</h4>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">🏭 القسم: ${t.dept} | ⚙️ الماكينة: ${t.machine||'عام'}</div>
            ${t.image ? `<img src="${t.image}" style="width:100%; border-radius:8px; margin-bottom:10px; cursor:pointer;" onclick="window.open('${t.image}')">` : ''}
            <div class="row-flex" style="margin-bottom:10px;">
                <input type="text" id="pm_spare_${t.id}" class="form-control flex-2" placeholder="قطع الغيار" value="${t.spareParts||''}" style="margin:0; font-size:11px;">
                <select id="pm_eng_${t.id}" class="form-control flex-1" style="margin:0; font-size:11px;"><option value="">تعيين مهندس</option>${engOptions}</select>
            </div>
            <div class="row-flex">
                <button class="btn btn-sm btn-outline flex-1" onclick="updatePMOrder('${t.id}', 'progress')">بدء التنفيذ</button>
                <button class="btn btn-sm btn-success flex-1" onclick="updatePMOrder('${t.id}', 'closed')">✅ إنهاء</button>
            </div>
        </div>`;
    }).join('');
}

function updatePMOrder(id, newStatus) {
    let t = tagsData.find(x => x.id == id); if(!t) return;
    t.status = newStatus; t.spareParts = document.getElementById(`pm_spare_${id}`).value; t.assignedEng = document.getElementById(`pm_eng_${id}`).value;
    window.syncRecord('tags/' + id, t);
    if(newStatus === 'closed') window.awardPoints(25, 'إنجاز أمر شغل');
    window.showToast('تم تحديث أمر الشغل'); renderPMDashboard();
}

// ------------------------------------------
// 📉 شجرة الفواقد المستمر (KK Loss Tree)
// ------------------------------------------
const tpmLosses = [
    { id: 'L1', name: 'أعطال الماكينات', type: 'availability', icon: '🔧' },
    { id: 'L2', name: 'الإعداد والضبط', type: 'availability', icon: '⚙️' },
    { id: 'L3', name: 'التوقفات الصغيرة', type: 'performance', icon: '⏱️' },
    { id: 'L4', name: 'العيوب والجودة', type: 'quality', icon: '❌' }
];
let registeredLosses = []; const COST_PER_MINUTE = 50;

function renderKKDashboard() {
    let container = document.getElementById('kkLossTreeContainer'); if(!container) return;
    container.innerHTML = tpmLosses.map(loss => {
        let mins = registeredLosses.filter(l => l.lossId === loss.id).reduce((sum, curr) => sum + curr.minutes, 0);
        return `
        <div class="card glass-card" style="text-align:center; padding:15px; cursor:pointer;" onclick="openLossRegistration('${loss.id}', '${loss.name}')">
            <div style="font-size:24px;">${loss.icon}</div>
            <div style="font-size:11px; font-weight:bold; margin-bottom:10px;">${loss.name}</div>
            <div style="font-size:11px; color:var(--danger);">${mins} دقيقة (${mins*COST_PER_MINUTE} ج)</div>
        </div>`;
    }).join('');
}

function openLossRegistration(id, name) {
    let m = prompt(`تسجيل وقت توقف لـ [ ${name} ] بالدقائق:`);
    if(m && !isNaN(m) && parseInt(m) > 0) {
        let lossObj = { id: window.uniqueNumericId().toString(), lossId: id, minutes: parseInt(m), date: new Date().toLocaleDateString('ar-EG'), user: currentUser.name };
        window.syncRecord('losses/' + lossObj.id, lossObj); 
        window.awardPoints(5, 'تسجيل توقف'); window.showToast(`تم التسجيل بنجاح 📉`);
    }
}

// ------------------------------------------
// 🛡️ إدارة الصلاحيات والأمان (User Management)
// ------------------------------------------
function canAccess(screenId, action = 'view') {
    if (currentUser.username === 'mfayez' || currentUser.role === 'admin') return true; 
    const perms = currentUser.permissions || {};
    if (!perms[screenId]) return false;
    if (action === 'edit') return perms[screenId] === 'edit';
    return perms[screenId] === 'view' || perms[screenId] === 'edit';
}

function approveUser(uid) {
    const u = usersData[uid];
    db.ref(`tpm_system/users/${uid}`).update({ status: 'active', role: u.requestedRole });
    window.showToast(`تم تفعيل الحساب`);
}

function deleteUser(uid) { if(confirm('حذف المستخدم نهائياً؟')) { db.ref('tpm_system/users/' + uid).remove(); window.showToast('تم الحذف'); } }

// ------------------------------------------
// 📊 بيانات المراجعة الذاتية (Audit Blueprint)
// ------------------------------------------
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
function openAddRiskModal() { document.getElementById('addRiskModal').style.display = 'flex'; }
function closeRiskModal() { document.getElementById('addRiskModal').style.display = 'none'; }
function saveNewRisk() {
    let a = document.getElementById('riskArea').value, d = document.getElementById('riskDesc').value, p = document.getElementById('riskPlan').value;
    if(!a || !d) return window.showToast('أكمل البيانات');
    db.ref('tpm_system/safety_risks').push({ area: a, description: d, plan: p, status: 'open', date: new Date().toLocaleDateString('ar-EG') });
    closeRiskModal(); window.showToast('تم تسجيل المخاطرة');
}
function renderSafetyRisks() {
    db.ref('tpm_system/safety_risks').on('value', snap => {
        let risks = snap.val() || {}; let html = '';
        Object.keys(risks).forEach(key => {
            let r = risks[key];
            html += `<div class="card glass-card" style="border-right:5px solid ${r.status==='open'?'var(--danger)':'var(--success)'}; margin-bottom:15px;"><h4>${r.area}</h4><p>${r.description}</p>${r.status==='open'?`<button class="btn btn-sm btn-success" onclick="updateRiskStatus('${key}', 'closed')">تأمين المخاطرة ✔️</button>`:''}</div>`;
        });
        document.getElementById('safetyRisksContainer').innerHTML = html;
    });
}
function updateRiskStatus(key, newStatus) { db.ref(`tpm_system/safety_risks/${key}/status`).set(newStatus); window.showToast('تم تحديث الموقف 🛡️'); }
// ============================================================================
// 🛠️ الترقيع السحري (V5.1 Patch) - يضاف في نهاية الملف
// ============================================================================

// 1. حماية النظام من الانهيار (Firebase Array to Object Bug)
window.safeArray = function(data) {
    if (!data) return [];
    return Array.isArray(data) ? data : Object.values(data);
};

// الكتابة فوق دالة الداشبورد القديمة بنسخة محمية
window.updateHomeDashboard = function() {
    let safeDepts = safeArray(departments);
    let tScore = 0, aCount = 0;
    let deptLabels = [], deptScores = [];
    
    let grid = safeDepts.map(d => {
        let auds = historyData.filter(h => h.dept === d && !h.stepsOrder.includes('ManualKaizen'));
        let sc = auds.length > 0 ? auds[auds.length-1].totalPct : 0;
        if(auds.length > 0) { tScore+=sc; aCount++; }
        let rTags = tagsData.filter(t => t.dept === d && t.status === 'open' && t.color === 'red').length;
        
        deptLabels.push(d); deptScores.push(sc);
        return `<div class="card glass-card" style="padding:15px; text-align:center; cursor:pointer;" onclick="openDeptDashboard('${d}')"><div style="font-size:14px; font-weight:bold; color:var(--gold); margin-bottom:10px;">${d}</div><div class="stat-value ${sc>=80?'success-text':(sc>=50?'warning-text':'danger-text')}">${sc}%</div><div style="font-size:10px; color:var(--text-muted); margin-top:5px;">تاجات مفتوحة: ${rTags}</div></div>`;
    }).join('');
    
    document.getElementById('homeDeptGrid').innerHTML = grid || '<div style="text-align:center; padding:10px; color:var(--text-muted);">لا توجد أقسام مسجلة</div>';
    document.getElementById('homeAvgScore').innerText = aCount > 0 ? Math.round(tScore/aCount) + '%' : '0%';
    document.getElementById('homeOpenTags').innerText = tagsData.filter(t => t.status === 'open').length;
    document.getElementById('homeClosedTags').innerText = tagsData.filter(t => t.status === 'closed').length;
    
    if (typeof updateUsersLeaderboard === 'function') updateUsersLeaderboard();
};

window.renderProfileAndSettings = function() {
    if(!currentUser || !currentUser.name) return;
    document.getElementById('profileName').innerText = currentUser.name;
    
    let safeDepts = safeArray(departments);
    let safeEngs = safeArray(maintenanceEngineers);

    const deptList = document.getElementById('managedDeptsList');
    if(deptList) deptList.innerHTML = safeDepts.map((d, i) => `<div class="item-row"><span class="name">🏭 ${d}</span><button class="btn btn-sm btn-danger" style="margin:0; padding:2px 8px;" onclick="removeDept(${i})">حذف</button></div>`).join('');

    const engList = document.getElementById('managedEngsList');
    if(engList) engList.innerHTML = safeEngs.map((e, i) => `<div class="item-row" style="border-right-color:var(--warning);"><div><span class="name">🛠️ ${e.name}</span><br><small style="font-size:9px; color:var(--text-muted);">${e.phone}</small></div><button class="btn btn-sm btn-danger" style="margin:0; padding:2px 8px;" onclick="removeEngineer(${i})">حذف</button></div>`).join('') || '<div style="font-size:11px; text-align:center; padding:10px;">لا يوجد مهندسون</div>';
};

// 2. إعادة إحياء بوابة الصيانة الذاتية (JH Portal) المفقودة
window.renderJHDepts = function() {
    let safeDepts = safeArray(departments);
    const container = document.getElementById('jhDeptGrid');
    if(!container) return;
    
    container.innerHTML = safeDepts.map(d => `
        <div class="card glass-card text-center" style="padding:15px; cursor:pointer; border-right:4px solid var(--success);" onclick="openJHToolbox('${d}')">
            <h3 style="color:var(--gold); margin:0;">${d}</h3>
            <div style="font-size:11px; color:var(--text-muted); margin-top:5px;">اضغط للدخول ⚙️</div>
        </div>
    `).join('') || '<div style="text-align:center; color:var(--text-muted);">قم بإضافة أقسام من الإعدادات أولاً</div>';
};

window.openJHToolbox = function(dept) {
    currentViewedDept = dept;
    document.getElementById('selectedJHDeptTitle').innerText = dept;
    document.getElementById('jhToolbox').style.display = 'block';
    document.getElementById('jhDeptGrid').style.display = 'none';

    const deptAudits = historyData.filter(h => h.dept === dept && !h.stepsOrder.includes('ManualKaizen'));
    const lastAudit = deptAudits.length > 0 ? deptAudits[deptAudits.length - 1].totalPct : 0;
    document.getElementById('deptAuditScore').innerText = lastAudit + '%';
    document.getElementById('deptOpenTags').innerText = tagsData.filter(t => t.dept === dept && t.status === 'open').length;
    
    let kaizenStat = document.getElementById('deptKaizens');
    if(kaizenStat) kaizenStat.innerText = historyData.filter(h => h.dept === dept && h.stepsOrder.includes('ManualKaizen')).length;
};

window.startNewAuditFlowFromPortal = function() {
    window.showScreen('setupScreen');
    document.getElementById('selectDept').value = currentViewedDept;
};

// ============================================================================
// نهاية ملف النظام بنجاح 🚀 
// ============================================================================