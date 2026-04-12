// ==========================================
// 🚀 FACTORY OS - CORE ENGINE v3.0 (STABLE)
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
// 🧠 GLOBAL VARIABLES (SAFE STATE)
// ------------------------------------------
let tpmSystemRef = null;
let tpmSystemListener = null;

let globalApiKeys = { imgbb: "", gemini: "" };
let departments = [];
let historyData = [];
let tasksData = [];
let usersData = {};
let logsData = [];
let likesData = {};
let tagsData = [];
let kaizenComments = {};
let userPoints = {};
let knowledgeBaseData = [];
let deptPhones = {};
let maintenanceEngineers = [];

let currentUser = { name: '', username: '', role: '' };
let currentAudit = null;
let isOnline = false;
let isDataLoaded = false;
let isInitialLoad = true;

let radarChartInstance = null;
let trendChartInstance = null;
let currentViewedDept = null;
let currentUploadItemId = null;
let currentUploadItemTitle = null;
let currentStepSelections = {};
let currentStepImages = {};
let currentStepImprovements = [];
let voiceAuditActive = false;
let currentTagImg = null;
let currentTaskDept = null;
let currentOplImg = null;

// ------------------------------------------
// 🛡️ CORE UTILITIES & PROTECTIONS
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

// تحويل الداتا المعطوبة من Firebase إلى Array سليم لمنع الانهيار
function safeArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Object.values(data);
}

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
// 🔐 AUTHENTICATION & DATA FETCHING
// ------------------------------------------
firebase.auth().onAuthStateChanged((user) => {
    if (tpmSystemRef && tpmSystemListener) {
        tpmSystemRef.off('value', tpmSystemListener);
    }

    if (user) {
        tpmSystemRef = db.ref('tpm_system');
        tpmSystemListener = (snapshot) => {
            try {
                const data = snapshot.val() || {};
                
                // استخدام SafeArray لحماية التطبيق من أخطاء الـ Map Crash
                departments = safeArray(data.departments);
                if(departments.length === 0) departments = ['قسم الإنتاج', 'قسم الصيانة'];
                
                maintenanceEngineers = safeArray(data.maintenanceEngineers);
                
                historyData = data.history ? Object.values(data.history).filter(x => x && x.id).sort((a,b) => Number(a.id) - Number(b.id)) : [];
                tasksData = data.tasks ? Object.values(data.tasks).filter(x => x && x.id).sort((a,b) => Number(a.id) - Number(b.id)) : [];
                logsData = data.logs ? Object.values(data.logs).filter(x => x).sort((a,b) => Number(a.id) - Number(b.id)) : [];
                usersData = data.users || {};
                globalApiKeys = data.api_keys || { imgbb: "", gemini: "" };
                likesData = data.likes || {}; 
                tagsData = data.tags ? Object.values(data.tags).filter(x => x && x.id).sort((a,b) => Number(b.id) - Number(a.id)) : [];
                userPoints = data.points || {};
                deptPhones = data.deptPhones || {};
                kaizenComments = data.kaizenComments || {};
                knowledgeBaseData = data.knowledgeBase ? Object.values(data.knowledgeBase).filter(x => x) : [];
                
                isDataLoaded = true;

                // إعدادات المستخدم لأول مرة بعد الدخول
                if (isInitialLoad) {
                    isInitialLoad = false;
                    const savedName = localStorage.getItem('tpm_user') || user.email.split('@')[0];
                    const savedUsername = localStorage.getItem('tpm_username') || user.email.split('@')[0];
                    
                    let role = 'viewer';
                    let userEmail = (user && user.email) ? user.email.toLowerCase() : '';
                    
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
                    
                    showScreen('homeScreen');
                }

                // تحديث الواجهات بدون أي Crash
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
                } catch(dashErr) { console.error("Dashboard Render Error:", dashErr); }
                
                if(currentUser.role === 'admin') { renderUsersPanel(); renderLogsPanel(); }
                if(document.getElementById('kaizenScreen') && document.getElementById('kaizenScreen').classList.contains('active')) renderKaizenFeed();
                if(document.getElementById('tagsScreen') && document.getElementById('tagsScreen').classList.contains('active')) renderTags();
                
            } catch(e) { 
                console.error("Data Parse Error:", e); 
            }
        };
        tpmSystemRef.on('value', tpmSystemListener);
    } else {
        isInitialLoad = true;
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
    
    let cloudStatus = document.getElementById('cloudStatus');
    if(cloudStatus) { cloudStatus.innerHTML = "⏳ جاري الدخول..."; cloudStatus.style.color = "var(--text-bright)"; }
    
    const fakeEmail = username + "@tpm.app";

    try {
        let rememberMeBox = document.getElementById('rememberMe');
        if(rememberMeBox && rememberMeBox.checked) {
            localStorage.setItem('tpm_user', name); localStorage.setItem('tpm_username', username);
        }
        await firebase.auth().signInWithEmailAndPassword(fakeEmail, password);
        setTimeout(() => { if(isDataLoaded) logAction('تسجيل دخول للنظام'); }, 1500); 
    } catch (error) { 
        alert('خطأ في البيانات أو الحساب غير موجود!'); 
        if(cloudStatus) cloudStatus.innerHTML = "❌ خطأ بالاتصال";
    }
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
    logAction('تسجيل خروج');
    setTimeout(() => { 
        firebase.auth().signOut().then(() => { 
            localStorage.removeItem('tpm_user'); localStorage.removeItem('tpm_username');
            window.location.reload(); 
        }); 
    }, 500);
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
// 🔄 DATABASE SYNC (SAFE & OPTIMIZED)
// ------------------------------------------
function syncToServer() {
    if (!isDataLoaded || !firebase.auth().currentUser) return;
    try {
        const updates = {};
        if (historyData) historyData.forEach(h => { if (h && h.id) updates['tpm_system/history/' + h.id] = h; });
        if (tasksData) tasksData.forEach(t => { if (t && t.id) updates['tpm_system/tasks/' + t.id] = t; });
        if (tagsData) tagsData.forEach(t => { if (t && t.id) updates['tpm_system/tags/' + t.id] = t; });
        
        updates['tpm_system/kaizenComments'] = kaizenComments || {};
        updates['tpm_system/likes'] = likesData || {};
        updates['tpm_system/points'] = userPoints || {};

        if (hasRole('admin')) {
            updates['tpm_system/departments'] = departments || [];
            updates['tpm_system/users'] = usersData || {};
            updates['tpm_system/deptPhones'] = deptPhones || {};
            updates['tpm_system/maintenanceEngineers'] = maintenanceEngineers || [];
            updates['tpm_system/knowledgeBase'] = knowledgeBaseData || [];
        }

        db.ref().update(updates).catch(e => console.error("Sync Error:", e));
    } catch (e) { console.error("Sync Error:", e); }
}

function logAction(actionDesc) {
    if(!currentUser || !currentUser.name) return;
    const now = new Date();
    const timeStr = now.toLocaleDateString('ar-EG') + ' ' + now.toLocaleTimeString('ar-EG');
    const logObj = { id: uniqueNumericId(), user: currentUser.name, action: actionDesc, time: timeStr };
    logsData.push(logObj);
    if(logsData.length > 50) logsData.shift(); 
    // الدفع المباشر للسجلات بدون المساس بباقي البيانات (تجنب مسح الداتا)
    if(isOnline && db) db.ref('tpm_system/logs/' + logObj.id).set(logObj);
}

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
    
    const navMap = { 'homeScreen':0, 'tasksScreen':1, 'historyScreen':2, 'detailedReportScreen':2, 'kaizenScreen':3, 'tagsScreen':4, 'knowledgeScreen':5, 'settingsScreen':6 };
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
    
    let bestDept = "لا يوجد";
    let bestScore = -1;

    let gridHtml = departments.map(d => {
        let dAudits = historyData.filter(h => h.dept === d && !(h.stepsOrder && h.stepsOrder.includes('ManualKaizen')));
        let sc = dAudits.length > 0 ? dAudits[dAudits.length - 1].totalPct : 0;
        
        if(dAudits.length > 0) { 
            totalScore += sc; auditCount++; 
            if (sc > bestScore) { bestScore = sc; bestDept = d; }
        }
        
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
                <div style="display:flex; justify-content:space-between; margin-top:10px; font-size:11px; color:var(--text-dim);">
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
    
    let bestDeptEl = document.getElementById('homeBestDept');
    if(bestDeptEl) {
        bestDeptEl.innerText = bestScore >= 0 ? bestDept : "جاري العمل...";
        document.getElementById('homeBestReason').innerText = bestScore >= 0 ? `بنسبة نجاح ${bestScore}% في آخر مراجعة` : "لا توجد تقارير كافية";
    }

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
        } else if(filter === 'avg3') {
            let last3 = audits.slice(-3);
            ['JH-0', 'JH-1', 'JH-2', 'JH-3', 'JH-4', 'JH-5', 'JH-6'].forEach((k, i) => {
                let tS = 0, tM = 0;
                last3.forEach(a => { if(a.results && a.results[k] && !a.results[k].skipped) { tS += a.results[k].score; tM += a.results[k].max; } });
                scores[i] = tM > 0 ? Math.round((tS / tM) * 100) : 0;
            });
        }
    }

    if (typeof Chart !== 'undefined') {
        const ctxRadar = document.getElementById('radarChart');
        if(ctxRadar && ctxRadar.getContext) {
            if(radarChartInstance) radarChartInstance.destroy();
            radarChartInstance = new Chart(ctxRadar.getContext('2d'), {
                type: 'radar',
                data: { labels: ['JH-0', 'JH-1', 'JH-2', 'JH-3', 'JH-4', 'JH-5', 'JH-6'], datasets: [{ label: machine ? `أداء (${machine})` : 'أداء القسم', data: scores, backgroundColor: 'rgba(21, 101, 192, 0.3)', borderColor: '#1565C0', pointBackgroundColor: '#2E7D32', borderWidth: 2 }] },
                options: { scales: { r: { min: 0, max: 100, ticks: { stepSize: 20, color: '#eee', backdropColor: 'transparent' }, grid: { color: '#444' }, pointLabels: { color: '#eee' } } }, maintainAspectRatio: false }
            });
        }

        const ctxTrend = document.getElementById('trendChart');
        if(ctxTrend && ctxTrend.getContext) {
            if(trendChartInstance) trendChartInstance.destroy();
            trendChartInstance = new Chart(ctxTrend.getContext('2d'), {
                type: 'line',
                data: { labels: audits.map(a => a.date), datasets: [{ label: 'تطور التقييم %', data: audits.map(a => a.totalPct), borderColor: '#F57F17', backgroundColor: 'rgba(245, 127, 23, 0.2)', fill: true, tension: 0.3, borderWidth: 2, pointRadius: 4 }] },
                options: { scales: { y: { min: 0, max: 100, ticks: { color: '#eee' } }, x: { ticks: { color: '#eee' } } }, maintainAspectRatio: false }
            });
        }
    }
}

function updateDeptDropdown() {
    const opts = departments.map(d => `<option value="${d}">${d}</option>`).join('');
    if(document.getElementById('selectDept')) document.getElementById('selectDept').innerHTML = opts;
    if(document.getElementById('dashDeptSelect')) document.getElementById('dashDeptSelect').innerHTML = opts;
    if(document.getElementById('newTaskDept')) document.getElementById('newTaskDept').innerHTML = opts;
    if(document.getElementById('newTagDept')) document.getElementById('newTagDept').innerHTML = opts; 
    
    const strictOpts = departments.map(d => `<option value="${d}">${d}</option>`).join('');
    if(document.getElementById('newKaizenDept')) document.getElementById('newKaizenDept').innerHTML = strictOpts;
    if(document.getElementById('qrDeptSelect')) document.getElementById('qrDeptSelect').innerHTML = strictOpts;
}

function updateDeptListUI() {
    if(!document.getElementById('deptListContainer')) return;
    document.getElementById('deptListContainer').innerHTML = departments.map((d, i) => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid var(--border); background:var(--glass-bg); border-radius:6px; margin-bottom:5px;">
            <div style="cursor:pointer; flex:1;" onclick="editDeptUI(${i}, '${d}')" title="اضغط لتعديل القسم أو الرقم">
                <b style="color:var(--primary-light);">${d} ✏️</b><br>
                <span style="font-size:11px; color:var(--danger-neon); font-weight:bold;">📱 ${typeof deptPhones !== 'undefined' && deptPhones[d] ? deptPhones[d] : 'اضغط لإضافة رقم'}</span>
            </div>
            <button class="btn btn-danger btn-sm" style="height:fit-content; width:auto;" onclick="delDept(${i}, '${d}')">حذف</button>
        </div>`).join('');
        
    const engContainer = document.getElementById('engListContainer');
    if(engContainer && typeof maintenanceEngineers !== 'undefined') {
        engContainer.innerHTML = maintenanceEngineers.map((eng, i) => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid var(--glass-border);">
            <div><b style="color:white;">${eng.name}</b><br><span style="font-size:11px; color:var(--gray);">📱 ${eng.phone}</span></div>
            <button class="btn btn-danger btn-sm" style="height:fit-content; width:auto;" onclick="delEngineer(${i})">حذف</button>
        </div>`).join('');
    }
        
    const engSelect = document.getElementById('newTagEngineer');
    if(engSelect && typeof maintenanceEngineers !== 'undefined') {
        engSelect.innerHTML = `<option value="">اختيار مهندس الصيانة للتبليغ...</option>` + maintenanceEngineers.map(e => `<option value="${e.phone}">${e.name}</option>`).join('');
    }
}

function editDeptUI(idx, deptName) {
    document.getElementById('newDeptInput').value = deptName;
    document.getElementById('newDeptPhone').value = (typeof deptPhones !== 'undefined' && deptPhones[deptName]) ? deptPhones[deptName] : '';
    editingDeptIndex = idx;
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function addOrUpdateDept() {
    if(!hasRole('admin')) return alert('عفواً، هذه الصلاحية للمدير فقط.');
    const val = sanitizeInput(document.getElementById('newDeptInput').value);
    const phone = document.getElementById('newDeptPhone') ? sanitizeInput(document.getElementById('newDeptPhone').value) : '';
    if(!val) return alert('برجاء كتابة اسم القسم!');
    
    if(typeof deptPhones === 'undefined') deptPhones = {};

    if (editingDeptIndex > -1) {
        let oldName = departments[editingDeptIndex];
        if (oldName !== val) {
            departments[editingDeptIndex] = val;
            historyData.forEach(h => { if(h.dept === oldName) h.dept = val; });
            tasksData.forEach(t => { if(t.dept === oldName) t.dept = val; });
            tagsData.forEach(t => { if(t.dept === oldName) t.dept = val; });
            if(deptPhones[oldName]) { deptPhones[val] = phone || deptPhones[oldName]; delete deptPhones[oldName]; }
            else if(phone) deptPhones[val] = phone;
            logAction(`تعديل اسم قسم من ${oldName} إلى ${val}`);
        } else {
            if(phone) deptPhones[val] = phone; else delete deptPhones[val];
            logAction(`تحديث رقم قسم: ${val}`);
        }
        editingDeptIndex = -1;
    } else {
        if(!departments.includes(val)) { departments.push(val); logAction(`إضافة قسم جديد: ${val}`); }
        if(phone) deptPhones[val] = phone;
    }
    
    updateDeptDropdown(); updateDeptListUI(); syncToServer(); 
    document.getElementById('newDeptInput').value = ''; 
    if(document.getElementById('newDeptPhone')) document.getElementById('newDeptPhone').value = '';
    alert('تم الحفظ بنجاح!');
}

function delDept(i, deptName) {
    if(!hasRole('admin')) return alert('عفواً، هذه الصلاحية للمدير فقط.');
    deptName = deptName || departments[i];
    if(departments.length > 1 && confirm(`متأكد من حذف قسم (${deptName})؟`)) { 
        logAction(`حذف قسم: ${deptName}`); departments.splice(i, 1); 
        if(typeof deptPhones !== 'undefined' && deptPhones[deptName]) delete deptPhones[deptName];
        updateDeptDropdown(); updateDeptListUI(); syncToServer(); 
    }
}

function addEngineer() {
    if(!hasRole('admin')) return alert('عفواً، هذه الصلاحية للمدير فقط.');
    const name = sanitizeInput(document.getElementById('newEngName').value);
    const phone = sanitizeInput(document.getElementById('newEngPhone').value);
    if(name && phone) {
        if(typeof maintenanceEngineers === 'undefined') maintenanceEngineers = [];
        maintenanceEngineers.push({name, phone}); updateDeptListUI(); syncToServer(); logAction(`إضافة مهندس: ${name}`);
        document.getElementById('newEngName').value = ''; document.getElementById('newEngPhone').value = '';
    }
}
function delEngineer(i) { if(!hasRole('admin')) return alert('عفواً، للمدير فقط.'); if(confirm('حذف المهندس؟')) { maintenanceEngineers.splice(i, 1); updateDeptListUI(); syncToServer(); } }

function printDeptDashboard() {
    window.scrollTo(0, 0);
    const btns = document.querySelectorAll('#deptDashboardScreen .no-print'); btns.forEach(b => b.style.display = 'none');
    
    const element = document.getElementById('deptDashboardScreen');
    const opt = { 
        margin: 0.3, 
        filename: `لوحة_قيادة_${currentViewedDept}_${new Date().toLocaleDateString('ar-EG').replace(/\//g,'-')}.pdf`, 
        image: { type: 'jpeg', quality: 1 }, 
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 }, 
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } 
    };
    
    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save().then(() => { 
            btns.forEach(b => b.style.display = 'flex');
            document.querySelectorAll('#deptDashboardScreen .btn').forEach(b => b.style.display = 'block');
        });
    }
}

// ------------------------------------------
// 🚀 FLOW AUDIT & EVALUATION
// ------------------------------------------
function startNewAuditFlow() { 
    if(currentViewedDept) {
        let selectDeptEl = document.getElementById('selectDept');
        if (selectDeptEl) selectDeptEl.value = currentViewedDept;
    }
    
    const draft = localStorage.getItem('tpm_audit_draft');
    if(draft) {
        const draftObj = JSON.parse(draft);
        if(confirm(`يوجد تقييم غير مكتمل لقسم (${draftObj.dept}). هل تريد استكماله؟\n\n- اضغط OK للاستكمال.\n- اضغط Cancel لبدء تقييم جديد (سيتم مسح القديم).`)) {
            loadAuditDraft(); return; 
        } else { clearAuditDraft(); }
    }
    showScreen('setupScreen'); 
}

function initAuditSequential() {
    let machineName = document.getElementById('setupMachine').value.trim() || 'عام';
    currentAudit = {
        id: uniqueNumericId().toString(), dept: document.getElementById('selectDept').value, machine: machineName,
        auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG'),
        stepsOrder: ['JH-0', 'JH-1', 'JH-2', 'JH-3', 'JH-4', 'JH-5', 'JH-6'],
        currentStepIndex: 0, results: {}
    };
    renderCurrentAuditStep();
}

function renderCurrentAuditStep() {
    const stepKey = currentAudit.stepsOrder[currentAudit.currentStepIndex];
    const stepData = AUDIT_DATA[stepKey];
    
    currentStepSelections = (currentAudit.results[stepKey] && currentAudit.results[stepKey].selections) ? JSON.parse(JSON.stringify(currentAudit.results[stepKey].selections)) : {};
    currentStepImages = (currentAudit.results[stepKey] && currentAudit.results[stepKey].images) ? JSON.parse(JSON.stringify(currentAudit.results[stepKey].images)) : {};

    document.getElementById('auditStepTitle').innerText = `${stepKey}: ${stepData.name}`;
    document.getElementById('auditProgressBar').style.width = `${((currentAudit.currentStepIndex) / 7) * 100}%`;

    let html = '';
    stepData.items.forEach(item => {
        let hasImage = '';
        if (currentStepImages['img_' + item.id]) {
            hasImage = `
            <div id="img_preview_elem_${item.id}" style="position:relative; display:inline-block;">
                <img src="${currentStepImages['img_' + item.id].data}" style="height:40px; border-radius:4px; margin-right:10px; border:1px solid var(--glass-border); vertical-align:middle;">
            </div>
            <button class="btn btn-outline btn-sm" style="display:inline-block; vertical-align:middle; padding:4px 8px; margin-right:5px; width:auto;" onclick="runAIVision(${item.id}, '${item.title.replace(/'/g, "\\'")}')">👁️ AI</button>
            <button class="btn btn-danger btn-sm" style="display:inline-block; vertical-align:middle; padding:4px 8px; width:auto;" onclick="removeAuditImage(${item.id})">🗑️ مسح</button>
            `;
        }
        
        html += `<div class="audit-item"><div class="item-header"><div class="item-num">${item.id}</div>
        <div class="item-title">${item.title} <span style="font-size:12px; color:var(--primary-light); font-weight:normal;">(${item.maxScore} درجة)</span>
            <div style="margin-top: 5px; display:flex; align-items:center;">
                <span class="icon-btn" onclick="explainItem('${item.title}')" title="شرح">💡</span>
                <span class="icon-btn" title="إضافة صورة" onclick="openImageSourcePicker(${item.id}, '${item.title.replace(/'/g, "\\'")}')">📸</span>
                <div id="preview_img_${item.id}">${hasImage}</div>
            </div>
        </div></div><div>`;
        
        item.levels.forEach(lvl => {
            let isSel = (currentStepSelections['item_' + item.id] && currentStepSelections['item_' + item.id].score === lvl.score) ? 'selected' : '';
            html += `<div class="level-opt ${isSel}" onclick="selectLevel(${item.id}, ${lvl.score}, ${item.maxScore}, this)"><div class="level-num">${lvl.level}</div><div class="level-text" style="flex:1;">${lvl.desc}</div><div style="font-size:11px; color:var(--success-neon); font-weight:bold; white-space:nowrap;">(+${lvl.score} درجة)</div></div>`;
        });
        html += `</div></div>`;
    });
    document.getElementById('auditItemsContainer').innerHTML = html;
    window.scrollTo(0,0);
    showScreen('auditScreen');
    ReliabilityEngine.updateHealthIndicator();
}

function selectLevel(id, score, max, el) {
    currentStepSelections['item_' + id] = { score, max };
    if(el) {
        el.parentElement.querySelectorAll('.level-opt').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
    }
}

function finishCurrentStep() {
    const stepKey = currentAudit.stepsOrder[currentAudit.currentStepIndex];
    const stepData = AUDIT_DATA[stepKey];

    if(Object.keys(currentStepSelections).length < stepData.items.length) return alert('يجب الإجابة على جميع البنود للخطوة!');

    let tScore = 0, tMax = 0; currentStepImprovements = [];
    for(let safeKey in currentStepSelections) {
        let sc = currentStepSelections[safeKey].score, mx = currentStepSelections[safeKey].max;
        tScore += sc; tMax += mx;
        if(sc < mx) {
            let actualId = safeKey.replace('item_', '');
            let item = stepData.items.find(i => i.id == actualId);
            if(item) currentStepImprovements.push({ title: item.title });
        }
    }

    currentAudit.results[stepKey] = { 
        skipped: false, score: tScore, max: tMax, 
        improvements: currentStepImprovements.map(i => i.title || i),
        selections: JSON.parse(JSON.stringify(currentStepSelections)),
        images: JSON.parse(JSON.stringify(currentStepImages))
    };
    
    const aiBtn = document.getElementById('aiCapaBtn');
    if(aiBtn) aiBtn.style.display = currentStepImprovements.length > 0 ? 'inline-block' : 'none';
    
    saveAuditDraft(); 
    renderStepSummary(stepKey, tScore, tMax);
}

function skipCurrentStep() {
    if(confirm('تخطي هذه الخطوة؟')) {
        currentAudit.results[currentAudit.stepsOrder[currentAudit.currentStepIndex]] = { skipped: true, score: 0, max: 0, improvements: [], selections: {}, images: {} };
        goToNextStep();
    }
}

function renderStepSummary(stepKey, score, max) {
    document.getElementById('summaryStepTitle').innerText = `نتيجة ${stepKey}`;
    let pct = Math.round((score / max) * 100);
    document.getElementById('summaryPct').innerText = `${pct}%`;
    document.getElementById('summaryScoreStr').innerText = `${score} / ${max}`;
    document.querySelector('#stepSummaryScreen .score-circle').style.borderColor = pct >= 80 ? 'var(--success-neon)' : (pct >= 50 ? 'var(--warning-neon)' : 'var(--danger-neon)');

    if(pct >= 90 && typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    let impHtml = currentStepImprovements.length === 0 ? '<div style="color:var(--success-neon); font-weight:bold;">🎉 أداء ممتاز!</div>' : currentStepImprovements.map(i => `
        <div class="improvement-box" style="margin-bottom: 10px; padding: 10px; border: 1px solid var(--glass-border); border-radius: 8px; background: rgba(255,255,255,0.05);">
            <b>${i.title}</b>
            <div style="margin-top:10px; display:flex; gap:5px;"><button class="btn btn-primary btn-sm" onclick="sendToTask('${i.title.replace(/'/g,"")}')" style="width:auto; margin:0;">➕ تحويل لمهمة</button></div>
        </div>`).join('');
    document.getElementById('opportunitiesContainer').innerHTML = impHtml;
    window.scrollTo(0,0);
    showScreen('stepSummaryScreen');
}

function goToNextStep() {
    currentAudit.currentStepIndex++;
    if(currentAudit.currentStepIndex < 7) renderCurrentAuditStep(); else generateFinalReport();
}

function generateFinalReport() {
    let tS = 0, tM = 0;
    currentAudit.stepsOrder.forEach(k => {
        if(!currentAudit.results[k].skipped) { tS += currentAudit.results[k].score; tM += currentAudit.results[k].max; }
    });
    let finalPct = tM === 0 ? 0 : Math.round((tS / tM) * 100);
    document.getElementById('finalDeptName').innerText = currentAudit.dept;
    document.getElementById('finalTotalPct').innerText = `${finalPct}%`;
    currentAudit.totalScore = tS; currentAudit.totalMax = tM; currentAudit.totalPct = finalPct;
    
    if(finalPct >= 90 && typeof confetti !== 'undefined') {
        let duration = 3 * 1000; let animationEnd = Date.now() + duration;
        let interval = setInterval(function() {
            let timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            let particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } }));
        }, 250);
    }
    showScreen('finalReportScreen');
    setTimeout(initSignaturePad, 200); 
}

function saveFinalAudit() {
    if(!hasRole('admin', 'auditor')) return alert('عفواً، لا تملك صلاحية حفظ تقرير مراجعة.');
    if(sigCanvas) { currentAudit.signature = sigCanvas.toDataURL('image/png'); } 
    const existingIndex = historyData.findIndex(h => h.id === currentAudit.id);
    if(existingIndex >= 0) { historyData[existingIndex] = currentAudit; logAction(`تعديل تقرير ${currentAudit.dept}`); } 
    else { historyData.push(currentAudit); logAction(`إنشاء تقرير ${currentAudit.dept}`); }
    
    let allImprovements = [];
    Object.keys(currentAudit.results).forEach(step => {
        if(currentAudit.results[step].improvements && currentAudit.results[step].improvements.length > 0) {
            allImprovements.push(...currentAudit.results[step].improvements);
        }
    });
    if(allImprovements.length > 0) {
        tasksData.push({
            id: uniqueNumericId(),
            isFolder: true, dept: currentAudit.dept, date: currentAudit.date, machine: currentAudit.machine || 'عام',
            task: `مجلد تحسينات مراجعة (${currentAudit.date})`,
            subTasks: allImprovements.map(imp => ({ text: imp, status: 'pending' })),
            status: 'pending'
        });
    }

    if(typeof deptPhones !== 'undefined' && deptPhones[currentAudit.dept]) {
        let cleanPhone = deptPhones[currentAudit.dept].replace(/[^0-9+]/g, '');
        let msg = `*تقرير مراجعة TPM 🏭*\nتم الانتهاء من مراجعة قسم: ${currentAudit.dept}\nالنتيجة: ${currentAudit.totalPct}%\n\nتم إدراج فرص التحسين أوتوماتيكياً في مجلد خطة العمل بالتطبيق.\nعاش جداً! 🚀`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    }

    renderHistory(); updateHomeDashboard(); syncToServer(); clearAuditDraft();
    awardPoints(50, 'إتمام مراجعة'); alert('تم الحفظ وتم إنشاء فولدر خطة العمل أوتوماتيكياً!'); showScreen('homeScreen'); 
}

// ==========================================
// 🛡️ الموثوقية (Reliability Engine)
// ==========================================
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

// ==========================================
// CENTRAL API KEYS MANAGEMENT (للمدير فقط)
// ==========================================
function saveApiKeys() {
    if(!hasRole('admin')) return alert('صلاحية المدير فقط.');
    const imgbb = document.getElementById('imgbbKeyInput').value.trim();
    const gemini = document.getElementById('geminiKeyInput').value.trim();
    
    document.getElementById('cloudStatus').innerHTML = "⏳ جاري حفظ المفاتيح...";
    
    db.ref('tpm_system/api_keys').set({ imgbb: imgbb, gemini: gemini })
    .then(() => {
        alert('✅ تم حفظ المفاتيح المركزية! ستعمل الآن عند جميع العمال تلقائياً.');
        document.getElementById('cloudStatus').innerHTML = "☁️ متصل ومزامن";
    })
    .catch(e => alert('❌ خطأ: ' + e.message));
}

// ==========================================
// TASKS, CAPA FOLDERS & REPORTS
// ==========================================
function renderTasks() {
    let pendAll = 0, progAll = 0, doneAll = 0;
    let deptStats = {};
    departments.forEach(d => deptStats[d] = { pending: 0, done: 0, total: 0 });

    tasksData.forEach(t => {
        let isDone = false;
        if(t.isFolder) {
            let safeSubTasks = t.subTasks || [];
            let doneSub = safeSubTasks.filter(s => s.status === 'done').length;
            isDone = (doneSub === safeSubTasks.length && safeSubTasks.length > 0);
            if(isDone) doneAll++; else if(doneSub > 0) progAll++; else pendAll++;
        } else {
            isDone = (t.status === 'done');
            if(t.status === 'pending') pendAll++; else if(t.status === 'progress') progAll++; else doneAll++;
        }
        if(t.dept && deptStats[t.dept]) { 
            deptStats[t.dept].total++; 
            if(isDone) deptStats[t.dept].done++; else deptStats[t.dept].pending++; 
        }
    });

    let mainPendingEl = document.getElementById('kpiTasksPendingAll');
    if(mainPendingEl) {
        mainPendingEl.innerText = pendAll; document.getElementById('kpiTasksProgressAll').innerText = progAll; document.getElementById('kpiTasksDoneAll').innerText = doneAll;
        let gridHtml = departments.map(d => {
            let s = deptStats[d]; let col = s.pending > 0 ? 'var(--danger-neon)' : (s.total > 0 ? 'var(--success-neon)' : 'var(--gray)');
            return `<div style="background:var(--glass-bg); border:1px solid var(--glass-border); border-right:4px solid ${col}; padding:15px; border-radius:8px; cursor:pointer;" onclick="openTasksDept('${d}')">
                <b style="font-size:14px; color:var(--text-bright);">${d}</b><div style="font-size:11px; margin-top:5px; color:var(--text-dim);">مهام معلقة: <b style="color:var(--danger-neon);">${s.pending}</b> | مكتملة: <b style="color:var(--success-neon);">${s.done}</b></div>
            </div>`;
        }).join('');
        document.getElementById('tasksDeptGrid').innerHTML = gridHtml;
    }

    if(currentTaskDept) {
        let pendingDept = deptStats[currentTaskDept] ? deptStats[currentTaskDept].pending : 0;
        let doneDept = deptStats[currentTaskDept] ? deptStats[currentTaskDept].done : 0;
        document.getElementById('kpiTasksPendingDept').innerText = pendingDept;
        document.getElementById('kpiTasksDoneDept').innerText = doneDept;

        let listHtml = ''; let folderHtml = '';
        let deptTasks = [...tasksData].reverse().filter(t => t.dept === currentTaskDept);

        deptTasks.forEach(t => {
            if(t.isFolder) {
                let safeSubTasks = t.subTasks || [];
                let totalSub = safeSubTasks.length; let doneSub = safeSubTasks.filter(s => s.status === 'done').length;
                let fStatus = doneSub === totalSub && totalSub > 0 ? '🟢 مكتمل' : (doneSub === 0 ? '🔴 معلق' : `🟡 جاري (${doneSub}/${totalSub})`);
                let subsHtml = safeSubTasks.map((st, idx) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px dashed var(--glass-border);">
                        <label style="font-size:12px; cursor:pointer; color:${st.status==='done'?'gray':'white'}; text-decoration:${st.status==='done'?'line-through':'none'};"><input type="checkbox" ${st.status==='done'?'checked':''} onclick="toggleFolderSubTask(${t.id}, ${idx})"> ${st.text}</label>
                    </div>`).join('');
                folderHtml += `<div class="card" style="border:1px solid var(--primary); border-top:4px solid var(--primary);"><div style="display:flex; justify-content:space-between; margin-bottom:10px;"><div><b style="color:var(--primary-light);">📁 ${t.task}</b><br><span style="font-size:11px; color:var(--text-dim);">⚙️ ${t.machine || 'عام'}</span></div><span style="font-size:11px; font-weight:bold;">${fStatus}</span></div><div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px;">${subsHtml || '<div style="font-size:11px;color:gray;">لا توجد تفاصيل</div>'}</div></div>`;
            } else {
                let selectStatus = `<select class="form-control" style="width:auto; padding:2px; font-size:11px; margin:0;" onchange="changeTaskStatus(${t.id}, this.value)"><option value="pending" ${t.status==='pending'?'selected':''}>⏳ انتظار</option><option value="progress" ${t.status==='progress'?'selected':''}>🛠️ تنفيذ</option><option value="done" ${t.status==='done'?'selected':''}>✔️ مكتملة</option></select>`;
                let col = t.status === 'done' ? 'var(--success-neon)' : (t.status === 'progress' ? 'var(--warning-neon)' : 'var(--danger-neon)');
                listHtml += `<div class="task-card" style="border-right-color:${col}; opacity:${t.status==='done'?'0.7':'1'};"><div style="display:flex; justify-content:space-between; align-items:center;"><div><span style="font-size:11px; color:var(--text-dim);">(${t.date})</span><p style="margin-top:5px; font-size:13px; font-weight:bold; color:var(--text-bright);">${t.task}</p></div><div>${selectStatus}</div></div></div>`;
            }
        });
        let listC = document.getElementById('tasksListContainer'); if(listC) listC.innerHTML = listHtml || '<div style="color:gray; text-align:center; font-size:12px;">لا توجد مهام فردية</div>';
        let folderC = document.getElementById('auditFoldersContainer'); if(folderC) folderC.innerHTML = folderHtml || '<div style="color:gray; text-align:center; font-size:12px;">لا توجد مجلدات مراجعات</div>';
    }
}
function openTasksDept(dept) {
    currentTaskDept = dept;
    document.getElementById('tasksDeptTitle').innerText = 'مهام قسم: ' + dept;
    document.getElementById('btnDeptName').innerText = dept;
    document.getElementById('tasksMainView').style.display = 'none';
    document.getElementById('tasksDeptView').style.display = 'block';
    renderTasks();
}

function closeTasksDept() {
    currentTaskDept = null;
    document.getElementById('tasksDeptView').style.display = 'none';
    document.getElementById('tasksMainView').style.display = 'block';
    renderTasks();
}

function toggleFolderSubTask(folderId, subTaskIndex) { let folder = tasksData.find(x => x.id === folderId); if(folder) { let st = folder.subTasks[subTaskIndex]; st.status = st.status === 'done' ? 'pending' : 'done'; renderTasks(); syncToServer(); } }
function changeTaskStatus(taskId, newStatus) { let t = tasksData.find(x => x.id === taskId); if(t) { t.status = newStatus; renderTasks(); syncToServer(); } }
function exportTasksToCSV() {
    if(currentUser.role !== 'admin') return alert('عفواً، للمدير فقط');
    if(!tasksData || tasksData.length === 0) return alert('لا توجد مهام للتصدير.');

    let csvContent = "data:text/csv;charset=utf-8,%EF%BB%BF";
    csvContent += "ID,القسم,المهمة,النوع,الوقت,الحالة,التاريخ,الماكينة,الهاتف\n";

    tasksData.forEach((task) => {
        if (task.isFolder) {
            const subTasks = Array.isArray(task.subTasks) ? task.subTasks : [];
            subTasks.forEach((subTask, index) => {
                const row = [ `${task.id}-${index + 1}`, task.dept || '', subTask.text || '', 'Folder SubTask', '', subTask.status || 'pending', task.date || '', task.machine || '', task.phone || '' ].map(toCsvCell);
                csvContent += row.join(",") + "\n";
            });
        } else {
            const row = [ task.id || '', task.dept || '', task.task || '', task.type || '', task.time || '', task.status || 'pending', task.date || '', task.machine || '', task.phone || '' ].map(toCsvCell);
            csvContent += row.join(",") + "\n";
        }
    });

    const link = document.createElement("a"); link.href = encodeURI(csvContent); link.download = `TPM_CAPA_${new Date().toLocaleDateString('ar-EG').replace(/\//g,'-')}.csv`; link.click();
    logAction('استخراج المهام إلى Excel'); syncToServer();
}

function addManualTaskDept() {
    if(!hasRole('admin', 'auditor')) return alert('عفواً، لا تملك صلاحية إضافة مهام.');
    const taskVal = sanitizeInput(document.getElementById('newTaskInput').value);
    if(!taskVal) return alert('اكتب المهمة!');
    tasksData.push({ id: uniqueNumericId(), dept: currentTaskDept, task: taskVal, status: 'pending', date: new Date().toLocaleDateString('ar-EG') });
    renderTasks(); syncToServer(); document.getElementById('newTaskInput').value = '';
}

function renderHistory() {
    let realAudits = historyData.filter(a => !(a.stepsOrder && a.stepsOrder.includes('ManualKaizen')));
    document.getElementById('historyListContainer').innerHTML = realAudits.length === 0 ? '<div style="color:gray;">لا توجد تقارير</div>' : 
    [...realAudits].reverse().map(a => {
        let col = a.totalPct >= 80 ? 'success-neon' : (a.totalPct >= 50 ? 'warning-neon' : 'danger-neon');
        let adminBtns = currentUser.role === 'admin' ? `<div style="margin-top: 15px; display: flex; gap: 5px; justify-content: flex-end;" onclick="event.stopPropagation();"><button class="btn btn-warning btn-sm" style="width:auto; margin:0;" onclick="editReport('${a.id}')">✏️</button><button class="btn btn-danger btn-sm" style="width:auto; margin:0;" onclick="deleteReport('${a.id}')">🗑️</button></div>` : '';
        return `<div class="card" style="border-right: 4px solid var(--${col}) !important; cursor:pointer;" onclick="viewDetailedReport('${a.id}')"><div style="display:flex; justify-content:space-between;"><div><b style="color:white;">${escapeHtml(a.dept)}</b><br><span style="font-size:11px; color:var(--text-dim);">${escapeHtml(a.date)}</span></div><b style="color:var(--${col}); font-size:18px;">${a.totalPct}%</b></div>${adminBtns}</div>`;
    }).join('');
}

function editReport(id) { 
    const rep = historyData.find(h => h.id === id); 
    if(rep) {
        if(rep.stepsOrder && rep.stepsOrder.includes('ManualKaizen')) return alert('⚠️ لا يمكن تعديل تقرير الكايزن من هنا، استخدم مجتمع كايزن للحذف أو التعديل.');
        if(confirm('تعديل التقرير؟')) { currentAudit = JSON.parse(JSON.stringify(rep)); currentAudit.currentStepIndex = 0; renderCurrentAuditStep(); } 
    }
}

function deleteReport(id) { if(confirm('حذف نهائي؟')) { historyData = historyData.filter(h => h.id !== id); renderHistory(); updateHomeDashboard(); syncToServer(); } }

function viewDetailedReport(id) {
    const a = historyData.find(h => h.id === id); if(!a) return;
    
    document.getElementById('detDept').innerText = a.dept;
    document.getElementById('detMachine').innerText = a.machine || 'عام';
    document.getElementById('detAuditor').innerText = a.auditor;
    document.getElementById('detDate').innerText = a.date;
    document.getElementById('detPct').innerText = `${a.totalPct}%`;
    document.getElementById('detPct').style.color = a.totalPct >= 80 ? '#2E7D32' : (a.totalPct >= 50 ? '#F57F17' : '#C62828');

    document.getElementById('detStepsContainer').innerHTML = a.stepsOrder.map(k => {
        let r = a.results[k];
        if(!r || r.skipped) return `<div class="print-section" style="page-break-inside: avoid; color: gray;"><b>${k}</b>: تم تخطي هذه الخطوة</div>`;
        let p = Math.round((r.score/r.max)*100);
        let col = p >= 80 ? '#2E7D32' : (p >= 50 ? '#F57F17' : '#C62828');
        
        let imps = (r.improvements || []).length > 0 ? r.improvements.map(i => {
            let taskBtn = (currentUser.role === 'admin' || currentUser.role === 'auditor') ? `<button class="btn btn-primary btn-sm no-print" style="padding: 2px 8px; font-size: 11px; margin-right:10px; display:inline-block; width:auto;" onclick="sendToTask('${i.replace(/'/g,"")}', '${a.dept}')">➕ تحويل لمهمة</button>` : '';
            return `<li style="margin-bottom: 8px; display:flex; justify-content:space-between; align-items:flex-start;"><span style="flex:1; color:#444;">- ${escapeHtml(i)}</span>${taskBtn}</li>`;
        }).join('') : '<span style="color:#2E7D32; font-weight:bold;">لا يوجد تعليقات - أداء ممتاز</span>';
        
        let imgsHtml = '';
        if(r.images) { Object.values(r.images).forEach(img => { const url = safeUrl(img.data); if (url) imgsHtml += `<img src="${url}" style="height:80px; width:auto; border-radius:4px; margin:5px; border:1px solid #ccc; display:inline-block;">`; }); }
        let galleryBlock = imgsHtml ? `<div style="margin-top:10px; background:#fafafa; padding:5px; border-radius:4px;"><b>📸 الأدلة المصورة:</b><br>${imgsHtml}</div>` : '';

        return `<div class="print-section" style="margin-bottom:15px; border:1px solid #ddd; padding:15px; border-radius:8px; page-break-inside: avoid; background:#fff;">
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f0f4f8; padding:10px; border-radius: 6px; border-right:4px solid ${col}; margin-bottom:10px;">
                <b style="color:#333; font-size:15px;">${k} : ${AUDIT_DATA[k].name}</b> 
                <b style="color:${col}; font-size:18px; background:#fff; padding:2px 10px; border-radius:4px; border:1px solid #ddd;">${p}%</b>
            </div>
            <div style="font-size:13px; margin-bottom:10px; color:#333;"><b>💡 فرص التحسين المكتشفة:</b><ul style="margin-right:20px; margin-top:5px; list-style:none; padding:0;">${imps}</ul></div>
            ${galleryBlock}
        </div>`;
    }).join('');
    
    let relatedTags = tagsData.filter(t => t.dept === a.dept && t.status === 'open' && (a.machine === 'عام' || t.machine === a.machine));
    let tagsHtml = '';
    if(relatedTags.length > 0) {
        tagsHtml = `<h3 style="color: #C62828; margin-bottom:10px; border-bottom:2px solid #eee; padding-bottom:5px;">🏷️ تاجات مفتوحة تتطلب تدخل (للمعدة: ${escapeHtml(a.machine)}):</h3>`;
        tagsHtml += relatedTags.map(t => {
            let colorCode = t.color === 'red' ? '#D32F2F' : '#1976D2';
            let typeName = t.color === 'red' ? 'صيانة (أحمر)' : 'إنتاج (أزرق)';
            return `<div style="border-right: 5px solid ${colorCode}; background: #fff; border: 1px solid #ddd; border-right-width: 5px; padding: 10px; margin-bottom: 8px; border-radius: 6px; font-size:13px; page-break-inside: avoid; color:#333;">
                <b style="color:${colorCode};">تاج ${typeName}</b> | ${escapeHtml(t.desc)} <span style="color:#777; font-size:11px; float:left;">تاريخ الإصدار: ${escapeHtml(t.date)}</span>
            </div>`;
        }).join('');
    }
    document.getElementById('detTagsContainer').innerHTML = tagsHtml;

    showScreen('detailedReportScreen');
    window.currentReportText = `*تقرير TPM*\n🏭 القسم: ${a.dept}\n⚙️ الماكينة: ${a.machine||'عام'}\n👤 المراجع: ${a.auditor}\n📅 التاريخ: ${a.date}\n⭐ النتيجة: ${a.totalPct}%\n\nراجع النظام للتفاصيل.`;
}

// ==========================================
// FULL AUDIT DATA
// ==========================================
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