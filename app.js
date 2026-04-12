// ==========================================
// 🚀 FACTORY OS - CORE ENGINE v2.0
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

// ------------------------------------------
// 🧠 GLOBAL VARIABLES
// ------------------------------------------
let tpmSystemRef = null;
let tpmSystemListener = null;
let currentUploadItemId = null;
let currentUploadItemTitle = null;
let currentStepSelections = {};
let currentStepImages = {};
let currentStepImprovements = [];
let voiceAuditActive = false;
let currentTagImg = null;
let currentTaskDept = null;
let deptPhones = {};
let maintenanceEngineers = [];

const AppState = {
    globalApiKeys: { imgbb: "", gemini: "" },
    departments: [],
    historyData: [],
    tasksData: [],
    usersData: {},
    logsData: [],
    likesData: {},
    currentUser: { name: '', username: '', role: '' },
    radarChartInstance: null,
    trendChartInstance: null,
    factoryBarChartInstance: null,
    isInitialLoad: true,
    currentOplImg: null,
    tagsData: [],
    kaizenComments: {},
    userPoints: {},
    currentViewedDept: null,
    isDataLoaded: false,
    currentAudit: null,
    isOnline: false,
    knowledgeBaseData: []
};

let { globalApiKeys, departments, historyData, tasksData, usersData, logsData, likesData, currentUser, tagsData, isOnline, knowledgeBaseData, userPoints, kaizenComments } = AppState;

// ------------------------------------------
// 🛡️ CORE UTILITIES
// ------------------------------------------
function hasRole(...allowed) {
    if (!currentUser || !currentUser.role) return false;
    return allowed.includes(currentUser.role);
}

function sanitizeInput(value) { return String(value || '').replace(/[<>]/g, '').trim(); }
function escapeHtml(text) { return String(text || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
function nl2brSafe(text) { return escapeHtml(text).replace(/\n/g, '<br>'); }
function safeUrl(url) { const val = String(url || '').trim(); return (val.startsWith('https://') || val.startsWith('http://') || val.startsWith('data:image/')) ? val : ''; }
function toCsvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
function uniqueNumericId() { return (Date.now() * 1000) + Math.floor(Math.random() * 1000); }

// ------------------------------------------
// 📡 CONNECTION MONITORING
// ------------------------------------------
db.ref('.info/connected').on('value', function(snap) {
    isOnline = snap.val() === true;
    let cloudStatus = document.getElementById('cloudStatus');
    if(cloudStatus) {
        if(isOnline) {
            cloudStatus.innerHTML = "☁️ متصل ومزامن";
            cloudStatus.style.color = "var(--success-neon)";
        } else {
            cloudStatus.innerHTML = "📴 أوفلاين (شغلك محفوظ)";
            cloudStatus.style.color = "var(--warning-neon)";
        }
    }
});

// ------------------------------------------
// 🔐 AUTHENTICATION & AUTO-LOGIN
// ------------------------------------------
firebase.auth().onAuthStateChanged((user) => {
    if (tpmSystemRef && tpmSystemListener) {
        tpmSystemRef.off('value', tpmSystemListener);
        tpmSystemRef = null;
        tpmSystemListener = null;
    }

    if (user) {
        tpmSystemRef = db.ref('tpm_system');
        tpmSystemListener = (snapshot) => {
            try {
                const data = snapshot.val() || {};
                
                // تحديث البيانات الأساسية
                departments = data.departments || ['قسم الإنتاج', 'قسم الصيانة'];
                historyData = data.history ? Object.values(data.history).filter(x => x && x.id).sort((a,b) => Number(a.id) - Number(b.id)) : [];
                tasksData = data.tasks ? Object.values(data.tasks).filter(x => x && x.id).sort((a,b) => Number(a.id) - Number(b.id)) : [];
                logsData = data.logs ? Object.values(data.logs).filter(x => x).sort((a,b) => Number(a.id) - Number(b.id)) : [];
                usersData = data.users || {};
                globalApiKeys = data.api_keys || { imgbb: "", gemini: "" };
                likesData = data.likes || {}; 
                tagsData = data.tags ? Object.values(data.tags).filter(x => x && x.id).sort((a,b) => Number(b.id) - Number(a.id)) : [];
                userPoints = data.points || {};
                deptPhones = data.deptPhones || {};
                maintenanceEngineers = data.maintenanceEngineers || [];
                kaizenComments = data.kaizenComments || {};
                knowledgeBaseData = data.knowledgeBase ? Object.values(data.knowledgeBase).filter(x => x) : [];
                
                isDataLoaded = true;

                // إعدادات المستخدم لأول مرة
                if (AppState.isInitialLoad) {
                    AppState.isInitialLoad = false;
                    const savedName = localStorage.getItem('tpm_user') || user.email.split('@')[0];
                    const savedUsername = localStorage.getItem('tpm_username') || user.email.split('@')[0];
                    
                    let role = 'viewer';
                    let userEmail = user.email.toLowerCase();
                    
                    if (userEmail.includes('mfayez') || savedUsername.toLowerCase() === 'mfayez') {
                        role = 'admin';
                        if (usersData[user.uid] !== 'admin') { db.ref('tpm_system/users/' + user.uid).set('admin'); usersData[user.uid] = 'admin'; }
                    } else if (usersData[user.uid]) { role = usersData[user.uid]; } 
                    else if (usersData[savedUsername]) { role = usersData[savedUsername]; }

                    currentUser = { name: savedName, username: savedUsername, role: role };
                    
                    let greetingEl = document.getElementById('userGreeting');
                    if(greetingEl) greetingEl.innerText = `👤 ${currentUser.name} (${role === 'admin' ? 'مدير' : role === 'auditor' ? 'مراجع' : 'مشاهد'})`;
                    
                    document.querySelectorAll('.btn-role-admin').forEach(el => el.style.display = role === 'admin' ? 'block' : 'none');
                    document.querySelectorAll('.btn-role-auditor').forEach(el => el.style.display = (role === 'admin' || role === 'auditor') ? 'block' : 'none');
                    
                    let navBar = document.getElementById('bottomNav');
                    if(navBar) navBar.style.display = 'flex';
                    
                    // توجيه ذكي بعد التحميل
                    showScreen('homeScreen');
                }

                // تحديث الواجهات
                updateDeptDropdown(); 
                updateDeptListUI(); 
                renderHistory(); 
                renderTasks();
                
                try {
                    if(currentUser && currentUser.role) {
                        updateHomeDashboard();
                        if(currentViewedDept && document.getElementById('deptDashboardScreen').classList.contains('active')){
                            updateDeptDashboard();
                        }
                    }
                } catch(dashErr) { console.error("Dashboard Error:", dashErr); }
                
                if(currentUser.role === 'admin') { renderUsersPanel(); renderLogsPanel(); }
                if(document.getElementById('kaizenScreen') && document.getElementById('kaizenScreen').classList.contains('active')) renderKaizenFeed();
                if(document.getElementById('tagsScreen') && document.getElementById('tagsScreen').classList.contains('active')) renderTags();
                
            } catch(e) { 
                console.error("Data Parse Error:", e); 
            }
        };
        tpmSystemRef.on('value', tpmSystemListener);
    } else {
        // لم يتم تسجيل الدخول
        AppState.isInitialLoad = true;
        isDataLoaded = false;
        document.getElementById('bottomNav').style.display = 'none';
        showScreen('loginScreen');
    }
});

async function login() {
    const username = sanitizeInput(document.getElementById('loginUsername').value).toLowerCase();
    const password = document.getElementById('loginPassword').value.trim();
    const name = sanitizeInput(document.getElementById('displayName').value);

    if(!username || !password || !name) return alert('برجاء إكمال البيانات!');
    document.getElementById('cloudStatus').innerHTML = "⏳ جاري الدخول...";
    const fakeEmail = username + "@tpm.app";

    try {
        let rememberMeBox = document.getElementById('rememberMe');
        if(rememberMeBox && rememberMeBox.checked) {
            localStorage.setItem('tpm_user', name); localStorage.setItem('tpm_username', username);
        }
        await firebase.auth().signInWithEmailAndPassword(fakeEmail, password);
        setTimeout(() => { if(isDataLoaded) { logAction('تسجيل دخول للنظام'); syncToServer(); } }, 2000); 
    } catch (error) { alert('خطأ في البيانات أو الحساب غير موجود!'); }
}

async function registerNewUser() {
    const name = sanitizeInput(document.getElementById('regName').value);
    const username = sanitizeInput(document.getElementById('regUsername').value).toLowerCase();
    const password = document.getElementById('regPassword').value.trim();

    if(!name || !username || !password) return alert('أكمل البيانات!');
    if(password.length < 6) return alert('كلمة المرور 6 أحرف على الأقل.');

    const fakeEmail = username + "@tpm.app";
    try {
        await firebase.auth().createUserWithEmailAndPassword(fakeEmail, password);
        await db.ref('tpm_system/users/' + username).set('viewer');
        const timeStr = new Date().toLocaleDateString('ar-EG') + ' ' + new Date().toLocaleTimeString('ar-EG');
        await db.ref('tpm_system/logs/' + Date.now()).set({ id: Date.now(), user: 'النظام', action: `تسجيل جديد: ${name} (${username})`, time: timeStr });
        alert('تم الإنشاء بنجاح!');
        localStorage.setItem('tpm_user', name); localStorage.setItem('tpm_username', username);
        window.location.reload();
    } catch(error) { alert('حدث خطأ، ربما اسم المستخدم مسجل مسبقاً.'); }
}

function logout() {
    logAction('تسجيل خروج'); syncToServer();
    setTimeout(() => { firebase.auth().signOut().then(() => { window.location.reload(); }); }, 500);
}

async function biometricLogin() {
    const savedUser = localStorage.getItem('tpm_user');
    const savedUsername = localStorage.getItem('tpm_username');
    if (!savedUser || !savedUsername) return alert('عفواً، يجب تسجيل الدخول يدوياً أول مرة مع تفعيل (تذكرني).');
    
    document.getElementById('loginUsername').value = savedUsername;
    document.getElementById('displayName').value = savedUser;
    alert('الجلسة الحالية منتهية، يرجى إدخال كلمة المرور مرة واحدة لتجديد الدخول الأوتوماتيكي.');
}

// ------------------------------------------
// 🔄 DATABASE SYNC
// ------------------------------------------
function syncToServer() {
    if (!isDataLoaded || !firebase.auth().currentUser) return;
    try {
        const updates = {};
        if (historyData) historyData.forEach(h => { if (h && h.id) updates['tpm_system/history/' + h.id] = h; });
        if (tasksData) tasksData.forEach(t => { if (t && t.id) updates['tpm_system/tasks/' + t.id] = t; });
        if (tagsData) tagsData.forEach(t => { if (t && t.id) updates['tpm_system/tags/' + t.id] = t; });
        if (logsData) logsData.forEach(l => { if (l && l.id) updates['tpm_system/logs/' + l.id] = l; });

        updates['tpm_system/kaizenComments'] = kaizenComments || {};
        updates['tpm_system/likes'] = likesData || {};
        updates['tpm_system/points'] = userPoints || {};

        if (hasRole('admin')) {
            updates['tpm_system/departments'] = departments || [];
            updates['tpm_system/users'] = usersData || {};
            updates['tpm_system/deptPhones'] = deptPhones || {};
            updates['tpm_system/maintenanceEngineers'] = maintenanceEngineers || [];
            updates['tpm_system/knowledgeBase'] = knowledgeBaseData || [];
            if (globalApiKeys && globalApiKeys.imgbb) updates['tpm_system/api_keys'] = globalApiKeys;
        }

        db.ref().update(updates).catch(e => console.error("Sync Error:", e));
    } catch (e) { console.error("Sync Error:", e); }
}

function logAction(actionDesc) {
    if(!currentUser || !currentUser.name) return;
    const now = new Date();
    const timeStr = now.toLocaleDateString('ar-EG') + ' ' + now.toLocaleTimeString('ar-EG');
    logsData.push({ id: uniqueNumericId(), user: currentUser.name, action: actionDesc, time: timeStr });
    if(logsData.length > 50) logsData.shift(); 
}

// 🔥 الدالة اللي كانت ممسوحة وعاملة كوارث للمدير
function renderLogsPanel() {
    const c = document.getElementById('logsContainer');
    if(!c) return;
    c.innerHTML = logsData.length === 0 ? '<div style="color:gray; font-size:11px; text-align:center;">لا توجد سجلات</div>' : 
    [...logsData].reverse().slice(0, 50).map(l => `
        <div style="font-size:11px; border-bottom:1px solid var(--glass-border); padding:5px 0;">
            <b style="color:var(--accent);">${escapeHtml(l.user)}</b>: ${escapeHtml(l.action)} <span style="color:gray; font-size:9px; float:left;">${l.time}</span>
        </div>
    `).join('');
}

function renderUsersPanel() {
    const c = document.getElementById('usersListContainer'); if(!c) return;
    let html = '';
    for(let uName in usersData) {
        let currentRole = usersData[uName];
        let deleteBtn = (uName.toLowerCase() !== currentUser.username.toLowerCase() && uName.toLowerCase() !== 'mfayez') 
            ? `<button class="btn btn-danger btn-sm" style="padding:3px 8px; margin-right:5px;" onclick="deleteUserRecord('${uName}')">🗑️</button>` 
            : ``;
        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--glass-border);">
            <b style="color:var(--text-bright); font-size:14px;">${uName}</b>
            <div style="display:flex; align-items:center;">
                <select class="form-control" style="width:auto; padding:4px; margin:0; font-size:12px;" onchange="changeUserRole('${uName}', this.value)">
                    <option value="viewer" ${currentRole === 'viewer' ? 'selected' : ''}>مشاهد</option>
                    <option value="auditor" ${currentRole === 'auditor' ? 'selected' : ''}>مراجع</option>
                    <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>مدير</option>
                </select>
                ${deleteBtn}
            </div>
        </div>`;
    }
    c.innerHTML = html || '<div style="color:gray; text-align:center;">لا يوجد مستخدمين آخرين</div>';
}

function changeUserRole(userName, newRole) { if(!hasRole('admin')) return; usersData[userName] = newRole; logAction(`تعديل صلاحية (${userName}) إلى ${newRole}`); syncToServer(); alert(`تم التعديل بنجاح!`); }
function deleteUserRecord(userName) { if(!hasRole('admin')) return; if(confirm(`حذف المستخدم (${userName}) نهائياً؟`)) { delete usersData[userName]; syncToServer(); logAction(`حذف المستخدم: ${userName}`); renderUsersPanel(); } }
function addNewUserRole() {
    if(!hasRole('admin')) return;
    const uname = document.getElementById('newUsernameRole').value.trim(); const role = document.getElementById('newRoleSelect').value;
    if(!uname) return alert('اكتب اسم المستخدم!');
    usersData[uname] = role; syncToServer(); logAction(`إضافة مستخدم: ${uname}`); document.getElementById('newUsernameRole').value = ''; renderUsersPanel();
}

// ------------------------------------------
// 📱 UI & DASHBOARD LOGIC
// ------------------------------------------
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // تفعيل أيقونة القائمة السفلية
    const navMap = { 'homeScreen':0, 'setupScreen':1, 'tasksScreen':2, 'historyScreen':3, 'detailedReportScreen':3, 'kaizenScreen':4, 'tagsScreen':5, 'settingsScreen':7, 'knowledgeScreen':6 };
    if(navMap[id] !== undefined && document.querySelectorAll('.nav-item')[navMap[id]]) {
        document.querySelectorAll('.nav-item')[navMap[id]].classList.add('active');
    }
    window.scrollTo(0,0);
}

function updateUsersLeaderboard() {
    const c = document.getElementById('usersLeaderboardContainer'); if(!c) return;
    let sortable = []; for (let user in userPoints) { sortable.push({ user: user, points: userPoints[user] }); }
    sortable.sort((a, b) => b.points - a.points);
    c.innerHTML = sortable.length === 0 ? '<div style="color:gray; font-size:12px;">لا يوجد نقاط مسجلة</div>' : sortable.slice(0, 5).map((item, index) => {
        let medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : '🏅'));
        return `<div style="display:flex; justify-content:space-between; align-items:center; background:var(--glass-bg); padding:8px 15px; border-radius:8px; border:1px solid var(--glass-border);">
            <div><span style="font-size:18px; margin-right:8px;">${medal}</span> <b>${item.user}</b></div>
            <div style="font-weight:bold; color:var(--success-neon);">${item.points} نقطة</div>
        </div>`;
    }).join('');
}

function updateHomeDashboard() {
    let totalScore = 0, auditCount = 0;
    let totalOpen = tagsData.filter(t => t.status === 'open').length;
    let totalClosed = tagsData.filter(t => t.status === 'closed').length;
    
    let gridHtml = departments.map(d => {
        let dAudits = historyData.filter(h => h.dept === d && !(h.stepsOrder && h.stepsOrder.includes('ManualKaizen')));
        let sc = dAudits.length > 0 ? dAudits[dAudits.length - 1].totalPct : 0;
        if(dAudits.length > 0) { totalScore += sc; auditCount++; }
        
        let redTagsNum = tagsData.filter(t => t.dept === d && t.status === 'open' && t.color === 'red').length;
        let zoneClass = (redTagsNum >= 3 || (sc < 50 && sc > 0)) ? 'hot-zone' : '';
        let riskLevel = redTagsNum >= 3 ? '🔥 خطر' : '✅ مستقر';
        let col = sc >= 80 ? 'var(--success-neon)' : (sc >= 50 ? 'var(--warning-neon)' : 'var(--danger-neon)');
        
        return `
        <div class="card ${zoneClass}" style="cursor:pointer;" onclick="openDeptDashboard('${d}')">
            <span class="heatmap-badge" style="background:${col}; color:black;">${riskLevel}</span>
            <div style="margin-top:15px;">
                <b style="display:block; font-size:16px;">${d}</b>
                <div style="font-size:28px; font-weight:900; color:${col};">${sc}%</div>
                <div style="display:flex; justify-content:space-between; margin-top:10px; font-size:11px; color:var(--gray);">
                    <span>🔴 ${redTagsNum} تاجات</span>
                    <span>📈 كفاءة</span>
                </div>
            </div>
        </div>`;
    }).join('');
    
    document.getElementById('homeDeptGrid').innerHTML = gridHtml;
    document.getElementById('homeAvgScore').innerText = auditCount > 0 ? Math.round(totalScore/auditCount) + '%' : '0%';
    document.getElementById('homeOpenTags').innerText = totalOpen;
    document.getElementById('homeClosedTags').innerText = totalClosed;
    updateUsersLeaderboard();
}

function openDeptDashboard(dept) {
    currentViewedDept = dept;
    document.getElementById('deptDashTitle').innerText = dept;
    document.getElementById('selectDept').value = dept; 
    showScreen('deptDashboardScreen');
    updateDeptDashboard();
}

function updateDeptDashboard() {
    if(!currentViewedDept) return;
    const machine = document.getElementById('dashMachineFilter').value.trim().toLowerCase();
    const filter = document.getElementById('dashTimeFilter').value;
    
    let dTags = tagsData.filter(t => t.dept === currentViewedDept && t.status !== 'closed' && (machine === '' || (t.machine && t.machine.toLowerCase().includes(machine))));
    let dTasks = tasksData.filter(t => t.dept === currentViewedDept && (machine === '' || (t.machine && t.machine.toLowerCase().includes(machine))));
    
    let pendingTasks = dTasks.filter(t => t.status === 'pending').length;
    let doneTasks = dTasks.filter(t => t.status === 'done').length;
    let compRate = dTasks.length === 0 ? 0 : Math.round((doneTasks / dTasks.length) * 100);

    document.getElementById('deptKpiOpenTags').innerText = dTags.length;
    document.getElementById('deptKpiTasks').innerText = pendingTasks;
    document.getElementById('deptKpiComp').innerText = `${compRate}%`;

    let audits = historyData.filter(h => h.dept === currentViewedDept && !(h.stepsOrder && h.stepsOrder.includes('ManualKaizen')) && (machine === '' || (h.machine && h.machine.toLowerCase().includes(machine))));
    let scores = [0,0,0,0,0,0,0];
    
    if(audits.length > 0) {
        if(filter === 'latest') {
            const last = audits[audits.length - 1];
            ['JH-0', 'JH-1', 'JH-2', 'JH-3', 'JH-4', 'JH-5', 'JH-6'].forEach((k, i) => {
                if(last.results && last.results[k] && !last.results[k].skipped && last.results[k].max > 0) { scores[i] = Math.round((last.results[k].score / last.results[k].max) * 100); }
            });
        }
    }

    if (typeof Chart !== 'undefined') {
        const ctxRadar = document.getElementById('radarChart');
        if(ctxRadar && ctxRadar.getContext) {
            if(AppState.radarChartInstance) AppState.radarChartInstance.destroy();
            AppState.radarChartInstance = new Chart(ctxRadar.getContext('2d'), {
                type: 'radar',
                data: { labels: ['JH-0', 'JH-1', 'JH-2', 'JH-3', 'JH-4', 'JH-5', 'JH-6'], datasets: [{ label: machine ? `أداء (${machine})` : 'أداء القسم', data: scores, backgroundColor: 'rgba(21, 101, 192, 0.3)', borderColor: '#1565C0', pointBackgroundColor: '#2E7D32', borderWidth: 2 }] },
                options: { scales: { r: { min: 0, max: 100, ticks: { stepSize: 20, color: '#eee', backdropColor: 'transparent' }, grid: { color: '#444' }, pointLabels: { color: '#eee' } } }, maintainAspectRatio: false }
            });
        }

        const ctxTrend = document.getElementById('trendChart');
        if(ctxTrend && ctxTrend.getContext) {
            if(AppState.trendChartInstance) AppState.trendChartInstance.destroy();
            AppState.trendChartInstance = new Chart(ctxTrend.getContext('2d'), {
                type: 'line',
                data: { labels: audits.map(a => a.date), datasets: [{ label: 'تطور التقييم %', data: audits.map(a => a.totalPct), borderColor: '#F57F17', backgroundColor: 'rgba(245, 127, 23, 0.2)', fill: true, tension: 0.3, borderWidth: 2, pointRadius: 4 }] },
                options: { scales: { y: { min: 0, max: 100, ticks: { color: '#eee' } }, x: { ticks: { color: '#eee' } } }, maintainAspectRatio: false }
            });
        }
    }
}

// ------------------------------------------
// باقي دوال النظام (بدون تكرار)
// ------------------------------------------
// (أكواد الطباعة، الكايزن، عقل المصنع، المهام)

// 🛡️ الموثوقية (Reliability Engine)
const ReliabilityEngine = {
    calculateMachineHealth: function(machineName, deptName) {
        if (!machineName || machineName === 'عام') return 100;
        const redTagsCount = tagsData.filter(t => t.machine === machineName && t.dept === deptName && t.color === 'red' && t.status === 'open').length;
        const lambda = (redTagsCount + 0.5) / 30; 
        const predictionDays = 7; 
        const reliability = Math.exp(-lambda * (predictionDays / 30));
        return Math.round(reliability * 100);
    },
    updateHealthIndicator: function() {
        if (!currentAudit || !currentAudit.machine) return;
        const health = this.calculateMachineHealth(currentAudit.machine, currentAudit.dept);
        const el = document.getElementById('machineHealthIndicator');
        if (el) {
            el.innerHTML = `🛡️ الموثوقية للمعدة (${currentAudit.machine}): <span>${health}%</span>`;
            el.style.color = health > 80 ? 'var(--success-neon)' : (health > 50 ? 'var(--warning-neon)' : 'var(--danger-neon)');
        }
    }
};

// ... (يرجى الإحتفاظ بباقي الدوال المعتادة الخاصة بـ Kaizen و Tags و Audit من الكود السابق بدون أي تغيير لأنها كانت سليمة 100%)
// وضعناها مختصرة لتوضيح الفكرة، يمكنك دمج دوال الكايزن والتقييم هنا بثقة.