// ==========================================
// 🚀 FACTORY OS - V5.0 (ENTERPRISE GRADE ARCHITECTURE)
// ==========================================

const db = firebase.database();
const auth = firebase.auth();

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

// ------------------------------------------
// 🛡️ أدوات النظام والتنبيهات (Utilities)
// ------------------------------------------
function hasRole(...allowed) { return currentUser && currentUser.role && allowed.includes(currentUser.role); }
function safeUrl(url) { const val = String(url || '').trim(); return (val.startsWith('https://') || val.startsWith('http://') || val.startsWith('data:image/')) ? val : ''; }
function nl2brSafe(text) { return sanitizeInput(text).replace(/\n/g, '<br>'); }

// ------------------------------------------
// 🔄 محرك المزامنة الذكي (Real-time Sync Engine)
// ------------------------------------------
let dbListeners = {};
function clearAllListeners() {
    for (let path in dbListeners) { db.ref('tpm_system/' + path).off('value', dbListeners[path]); }
    dbListeners = {};
}

function renderProductionDashboard() {} function renderMasterData() {} function renderUsersPanel() {}

firebase.auth().onAuthStateChanged(async user => {
    const mainHeader = document.getElementById('mainHeader');
    
    if (user) {
        isDataLoaded = true;
        if (mainHeader) mainHeader.style.display = 'flex';

        // 🚀 السحب الذكي للبيانات الأساسية
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
            window.currentUser = currentUser; 
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
            window.currentUser = currentUser;
        }

        document.querySelectorAll('.btn-role-admin').forEach(el => el.style.display = currentUser.role === 'admin' ? 'block' : 'none');
        document.querySelectorAll('.btn-role-auditor').forEach(el => el.style.display = (currentUser.role === 'admin' || currentUser.role === 'auditor') ? 'block' : 'none');
        
        if (currentUser.status === 'pending') {
            showToast("حسابك قيد المراجعة. يرجى انتظار موافقة الإدارة.");
            firebase.auth().signOut(); return;
        } else { showScreen('homeScreen'); }

        updateDeptDropdown();

        // 📡 تشغيل قنوات المراقبة الحية
        dbListeners.tags = db.ref('tpm_system/tags').orderByChild('id').limitToLast(100).on('value', snap => {
            let data = snap.val() || {};
            tagsData = Object.values(data).filter(x => x && x.id).sort((a,b)=>b.id-a.id);
            window.tagsData = tagsData; 
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
            window.historyData = historyData; 
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
            if(document.getElementById('knowledgeScreen').classList.contains('active')) renderKnowledgeBase(); 
        });
        
    } else {
        isInitialLoad = true; isDataLoaded = false; 
        if (mainHeader) mainHeader.style.display = 'none'; // 🛡️ حجر صحي
        showScreen('loginScreen');
    }
});

// ------------------------------------------
// 🏆 نظام النقاط والرتب (Enterprise Elite)
// ------------------------------------------
function awardPoints(pts, reason) {
    const uid = firebase.auth().currentUser.uid;
    if(!uid) return;
    
    let currentPts = (userPoints[uid] || 0) + pts;
    syncRecord('points/' + uid, currentPts);
    
    let achievementId = uniqueNumericId();
    syncRecord('global_achievements/' + achievementId, {
        user: currentUser.name, uid: uid, reason: reason, points: pts, date: new Date().toLocaleString('ar-EG')
    });

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

    if(sortable.length === 0) { 
        lc.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px; width:100%;">المصنع بانتظار أول بطل... 🚀</div>'; 
        return; 
    }

    const topLimit = 20;
    const topUsers = sortable.slice(0, topLimit);
    let html = topUsers.map((item, idx) => generateEliteCardHTML(item, idx)).join('');

    const myUid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    const myRankIndex = sortable.findIndex(u => u.uid === myUid);

    if (myUid && myRankIndex >= topLimit) {
        let myData = sortable[myRankIndex];
        html += `<div style="width:100%; text-align:center; color:var(--gold); margin: 15px 0 5px; font-size:12px; font-weight:bold;">🔻 مركزك الحالي 🔻</div>`;
        html += generateEliteCardHTML(myData, myRankIndex); 
    }

    lc.innerHTML = html;
}

function generateEliteCardHTML(item, idx) {
    let rankClass = (idx === 0) ? 'gold-glow' : (idx === 1 ? 'silver-glow' : (idx === 2 ? 'bronze-glow' : ''));
    let rankIcon = (idx === 0) ? '<i class="bx bxs-medal"></i>' : (idx === 1 ? '<i class="bx bx-medal"></i>' : (idx === 2 ? '<i class="bx bx-award"></i>' : idx + 1));
    
    let rankTitle = "مبتدئ تقني"; let rankColor = "var(--text-muted)";
    if(item.points > 1500) { rankTitle = "أسطورة المصنع"; rankColor = "var(--gold)"; }
    else if(item.points > 800) { rankTitle = "خبير TPM سينيور"; rankColor = "var(--primary)"; }
    else if(item.points > 300) { rankTitle = "تقني محترف"; rankColor = "var(--success)"; }

    return `
    <div class="elite-card ${rankClass}" onclick="viewOtherUserProfile('${item.uid}')">
        <div class="elite-rank">${rankIcon}</div>
        <img class="elite-avatar" src="${item.avatar || 'https://ui-avatars.com/api/?name='+item.name+'&background=1e293b&color=3b82f6'}">
        <div class="elite-info">
            <div class="elite-name">${item.name}</div>
            <div class="elite-level" style="color:${rankColor}; font-weight:900;">${rankTitle}</div>
        </div>
        <div class="elite-score">
            <span class="pts-val">${item.points}</span>
            <small style="color:var(--text-muted); font-size:10px;">نقطة</small>
        </div>
    </div>`;
}

// 👤 محرك مركز القيادة الشخصي
async function openMyFullProfile() {
    const uid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    if(!uid || !usersData[uid]) return showToast('خطأ في جلب بيانات المستخدم');
    
    const u = usersData[uid];
    const activeName = currentUser.name; 

    document.getElementById('myBigAvatar').src = u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=1e293b&color=3b82f6`;
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
        <div class="item-row" style="border-right-color: ${item.type === 'tag' ? 'var(--danger)' : (item.type === 'kaizen' ? 'var(--success)' : 'var(--primary)')};">
            <span style="flex:1;">${item.text}</span>
            <small style="color:var(--text-muted); font-size:10px; margin-right:10px;">${item.date}</small>
        </div>
    `).join('');

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
}

let mainChartInstance = null;

// 📈 محرك الشاشة الرئيسية
function updateHomeDashboard() {
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
        if (mainChartInstance) mainChartInstance.destroy(); 
        mainChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: deptLabels,
                datasets: [{
                    label: 'كفاءة القسم %', data: deptScores,
                    backgroundColor: deptScores.map(s => s >= 80 ? 'rgba(16, 185, 129, 0.2)' : (s >= 50 ? 'rgba(249, 115, 22, 0.2)' : 'rgba(239, 68, 68, 0.2)')),
                    borderColor: deptScores.map(s => s >= 80 ? '#10b981' : (s >= 50 ? '#f97316' : '#ef4444')),
                    borderWidth: 1, borderRadius: 5
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#94a3b8', font: {family: 'Cairo'} } }, x: { ticks: { color: '#f8fafc', font: {family: 'Cairo', weight: 'bold'} } } },
                plugins: { legend: { display: false } }
            }
        });
    }

    let criticalTags = tagsData.filter(t => t.status === 'open' && t.color === 'red').slice(0, 5);
    let cTagsHtml = criticalTags.map(t => `
        <div style="background:rgba(239, 68, 68, 0.1); border-right:3px solid var(--danger); padding:10px; margin-bottom:10px; border-radius:8px; font-size:12px; cursor:pointer;" onclick="showScreen('tagsScreen'); document.getElementById('filterTagDept').value='${t.dept}'; renderTags();">
            <b style="color:var(--text-main);">${t.desc}</b><br>
            <div style="margin-top:5px;"><span style="color:var(--danger); font-weight:bold;">${t.dept}</span> <span style="color:var(--text-muted);">- ${t.machine||'عام'}</span></div>
        </div>
    `).join('');
    
    const critContainer = document.getElementById('criticalTagsList');
    if(critContainer) critContainer.innerHTML = cTagsHtml || '<div style="text-align:center; color:var(--success); font-size:12px; padding:20px 0;"><i class="bx bx-check-shield" style="font-size:30px; display:block; margin-bottom:10px;"></i>لا توجد أعطال حرجة متوقفة 🎉</div>';
}

let deptRadarInstance = null; let deptTrendInstance = null;

window.openDeptDashboard = function(dept) {
    currentViewedDept = dept;
    showScreen('deptDashboardScreen');
    
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
            if (deptRadarInstance) deptRadarInstance.destroy();
            deptRadarInstance = new Chart(radarCtx, { type: 'radar', data: { labels: ['التحضيرية', 'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'], datasets: [{ label: 'مستوى التنفيذ %', data: stepScores, backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6', pointBackgroundColor: '#3b82f6', borderWidth: 2 }] }, options: { scales: { r: { beginAtZero: true, max: 100, ticks: { display: false }, grid: {color:'rgba(255,255,255,0.1)'}, angleLines: {color:'rgba(255,255,255,0.1)'} } }, plugins: { legend: { display: false } } } });
        }
    } catch(e) {}

    try {
        const trendCtx = document.getElementById('deptTrendChart');
        if (trendCtx && typeof Chart !== 'undefined') {
            if (deptTrendInstance) deptTrendInstance.destroy();
            deptTrendInstance = new Chart(trendCtx, { type: 'line', data: { labels: deptAudits.slice(-5).map(a => a.date.split('/')[0] + '/' + a.date.split('/')[1]), datasets: [{ label: 'الكفاءة %', data: deptAudits.slice(-5).map(a => a.totalPct), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 }] }, options: { scales: { y: { beginAtZero: true, max: 100, grid:{color:'rgba(255,255,255,0.05)'} }, x: {grid:{display:false}} }, plugins: { legend: { display: false } } } });
        }
    } catch(e) {}

    const actionItemsEl = document.getElementById('deptActionItems');
    if(actionItemsEl) {
        actionItemsEl.innerHTML = deptTags.slice(0,3).map(t => `
            <div style="background:var(--surface-inset); padding:15px; border-right:4px solid var(--danger); border-radius:12px; margin-bottom:10px; border: 1px solid var(--border-glass);">
                <div style="font-size:13px; font-weight:bold; color:var(--text-main);"><i class='bx bx-error-circle' style="color:var(--danger);"></i> ${t.desc}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:8px;"><i class='bx bx-cog'></i> ${t.machine || 'عام'} | <i class='bx bx-user'></i> ${t.auditor}</div>
            </div>
        `).join('') || '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:20px;"><i class="bx bx-check-double" style="font-size:40px; color:var(--success); display:block; margin-bottom:10px;"></i>القسم مستقر ولا توجد أعطال حرجة</div>';
    }
};

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

function renderCurrentAuditStep() {
    const k = currentAudit.stepsOrder[currentAudit.currentStepIndex]; 
    const sd = AUDIT_DATA[k];
    
    currentStepSelections = (currentAudit.results[k] && currentAudit.results[k].selections) ? currentAudit.results[k].selections : {};
    currentStepImages = (currentAudit.results[k] && currentAudit.results[k].images) ? currentAudit.results[k].images : {};

    document.getElementById('auditStepTitle').innerText = `${k}: ${sd.name}`;
    document.getElementById('stepCounter').innerText = `خطوة ${currentAudit.currentStepIndex + 1} من 7`;
    document.getElementById('auditProgressBar').style.width = `${((currentAudit.currentStepIndex + 1) / 7) * 100}%`;

    const container = document.getElementById('auditItemsContainer');
    if(container) {
        container.innerHTML = sd.items.map(item => {
            let hasImage = currentStepImages['img_' + item.id] ? `<div style="margin-top:15px; display:flex; align-items:center; gap:10px;"><img src="${currentStepImages['img_' + item.id].data}" style="height:60px; width:60px; object-fit:cover; border-radius:10px; border:2px solid var(--primary); cursor:pointer;" onclick="window.open('${currentStepImages['img_' + item.id].data}')"><button class="btn btn-outline btn-sm" onclick="runAIVision(${item.id}, '${item.title.replace(/'/g, "\\'")}')"><i class='bx bx-bot'></i> تحليل بالذكاء الاصطناعي</button></div>` : '';
            
            return `
            <div class="card glass-card" style="padding:20px;">
                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px; border-bottom:1px solid var(--border-glass); padding-bottom:15px;">
                    <div style="display:flex; align-items:flex-start; gap:12px; width:100%;">
                        <div style="background:var(--primary); color:white; width:35px; height:35px; display:flex; align-items:center; justify-content:center; border-radius:10px; font-weight:900; flex-shrink:0; font-size:16px;">${item.id}</div>
                        <div style="flex:1; font-weight:bold; font-size:15px; color:var(--text-main); line-height:1.4;">${item.title}</div>
                        <span style="font-size:11px; background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:20px; white-space:nowrap;">من ${item.maxScore}</span>
                    </div>
                    <div class="row-flex" style="justify-content:flex-end;">
                        <button class="btn btn-sm btn-outline" style="border-radius:20px; font-size:11px;" onclick="explainItem('${item.title}')"><i class='bx bx-info-circle'></i> شرح البند</button>
                        <button class="btn btn-sm btn-outline" style="border-radius:20px; font-size:11px; color:var(--primary); border-color:var(--primary);" onclick="openImageSourcePicker(${item.id}, '${item.title.replace(/'/g, "\\'")}')"><i class='bx bx-camera'></i> إرفاق دليل</button>
                    </div>
                </div>
                <div id="preview_img_${item.id}">${hasImage}</div>
                <div style="margin-top:15px;">
                    ${item.levels.map(lvl => {
                        let isSel = (currentStepSelections['item_'+item.id] && currentStepSelections['item_'+item.id].score === lvl.score) ? 'selected' : '';
                        let selStyle = isSel ? 'background:rgba(16,185,129,0.1); border-color:var(--success); color:var(--success); box-shadow:0 0 15px rgba(16,185,129,0.2);' : 'background:var(--surface-inset); border-color:transparent; color:var(--text-main);';
                        return `
                        <div style="padding:15px; border-radius:12px; margin-bottom:10px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:0.3s; border:1px solid var(--border-glass); ${selStyle}" onclick="selectLevel(${item.id}, ${lvl.score}, ${item.maxScore}, this)">
                            <div style="background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:8px; font-weight:bold; font-size:12px; white-space:nowrap;">${lvl.score} ن</div>
                            <div style="flex:1; font-size:13px; line-height:1.5;">${lvl.desc}</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        }).join('');
    }
    currentStepImprovements = []; showScreen('auditScreen'); saveAuditDraft(); updateCumulativeScoreUI();
}

function updateCumulativeScoreUI() {
    let totalScoreSoFar = 0, totalMaxSoFar = 0;
    for (let i = 0; i < currentAudit.currentStepIndex; i++) {
        let stepKey = currentAudit.stepsOrder[i]; let res = currentAudit.results[stepKey];
        if (res && !res.skipped) { totalScoreSoFar += res.score; totalMaxSoFar += res.max; }
    }
    for (let key in currentStepSelections) { totalScoreSoFar += currentStepSelections[key].score; totalMaxSoFar += currentStepSelections[key].max; }
    
    const pct = totalMaxSoFar === 0 ? 0 : Math.round((totalScoreSoFar / totalMaxSoFar) * 100);
    const pctEl = document.getElementById('cumulativeScoreText');
    const pointsEl = document.getElementById('cumulativePointsText');
    const barEl = document.getElementById('cumulativeProgressBar');

    if (pctEl) { pctEl.innerText = pct + '%'; pctEl.style.color = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)'); }
    if (pointsEl) pointsEl.innerText = `${totalScoreSoFar} / ${totalMaxSoFar}`;
    if (barEl) { barEl.style.width = pct + '%'; barEl.style.background = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)'); }
}

function selectLevel(id, score, max, el) { 
    currentStepSelections['item_'+id] = {score, max}; 
    el.parentElement.querySelectorAll('div[onclick]').forEach(o=>{ o.style.background='var(--surface-inset)'; o.style.borderColor='transparent'; o.style.color='var(--text-main)'; o.style.boxShadow='none'; }); 
    el.style.background='rgba(16,185,129,0.1)'; el.style.borderColor='var(--success)'; el.style.color='var(--success)'; el.style.boxShadow='0 0 15px rgba(16,185,129,0.2)';
    saveAuditDraft(); updateCumulativeScoreUI();
}

function openImageSourcePicker(itemId, itemTitle) { currentUploadItemId = itemId; currentUploadItemTitle = itemTitle; document.getElementById('imageSourceModal').style.display = 'flex'; }
function triggerCamera() { document.getElementById('cameraInput').click(); document.getElementById('imageSourceModal').style.display = 'none'; }
function triggerGallery() { document.getElementById('galleryInput').click(); document.getElementById('imageSourceModal').style.display = 'none'; }

async function handleImageSelection(event) {
    const file = event.target.files[0]; if(!file || !currentUploadItemId) return;
    showToast('جاري رفع وتحليل الصورة...');
    processAndEnhanceImage(file, async function(dataUrl) {
        const url = await uploadImageToStorage(dataUrl);
        if (url) { currentStepImages['img_' + currentUploadItemId] = { title: currentUploadItemTitle, data: url }; saveAuditDraft(); renderCurrentAuditStep(); showToast('تم الرفع'); } 
        else { showToast('فشل الرفع'); }
    });
}

function finishCurrentStep() {
    const k = currentAudit.stepsOrder[currentAudit.currentStepIndex]; const sd = AUDIT_DATA[k];
    if(Object.keys(currentStepSelections).length < sd.items.length) { showToast('⚠️ يرجى تقييم جميع البنود قبل الحفظ'); return; }
    
    let totalScore = 0, totalMax = 0; currentStepImprovements = [];
    for(let key in currentStepSelections) { 
        let itemData = currentStepSelections[key]; totalScore += itemData.score; totalMax += itemData.max; 
        if(itemData.score < itemData.max) { 
            let id = key.split('_')[1]; let itm = sd.items.find(i=>i.id == id); 
            if(itm) {
                let maxLvl = itm.levels.find(l => l.score === itm.maxScore); let targetAction = maxLvl ? maxLvl.desc : "الوصول للمعايير القياسية";
                currentStepImprovements.push(`[${itm.title}] 🎯 المطلوب: ${targetAction}`); 
            }
        }
    }
    
    currentAudit.results[k] = { skipped: false, score: totalScore, max: totalMax, improvements: currentStepImprovements, selections: currentStepSelections, images: currentStepImages };
    saveAuditDraft();
    
    const pct = Math.round((totalScore/totalMax)*100);
    const sumPctEl = document.getElementById('summaryPct'); if(sumPctEl) { sumPctEl.innerText = pct + '%'; sumPctEl.style.color = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)'); }
    const sumScoreEl = document.getElementById('summaryScoreStr'); if(sumScoreEl) sumScoreEl.innerText = `المجموع: ${totalScore} من ${totalMax} نقطة`;
    
    const oppContainer = document.getElementById('opportunitiesContainer');
    if(oppContainer) {
        oppContainer.innerHTML = currentStepImprovements.length > 0 ? currentStepImprovements.map(i=>`<div style="background:var(--surface-inset); padding:15px; border-radius:12px; margin-bottom:10px; border-right:4px solid var(--warning); font-size:13px; text-align:right; color:var(--text-main);"><i class='bx bx-info-circle' style="color:var(--warning);"></i> ${i}</div>`).join('') : '<div style="color:var(--success); font-weight:bold; text-align:center; padding:20px;"><i class="bx bx-check-shield" style="font-size:40px; display:block; margin-bottom:10px;"></i> أداء مثالي، لا توجد ملاحظات</div>';
    }
    showScreen('stepSummaryScreen');
}

function skipCurrentStep() { currentAudit.results[currentAudit.stepsOrder[currentAudit.currentStepIndex]] = {skipped:true, score:0, max:0, improvements:[], selections:{}, images:{}}; saveAuditDraft(); goToNextStep(); }
function goToNextStep() { currentAudit.currentStepIndex++; if(currentAudit.currentStepIndex < 7) renderCurrentAuditStep(); else generateFinalReport(); }

function switchSettingsTab(tabId) {
    document.querySelectorAll('.settings-tab-content').forEach(c => { c.classList.remove('active'); c.style.display = 'none'; });
    document.querySelectorAll('#settingsScreen .row-flex .btn').forEach(b => { b.classList.remove('active'); b.style.background='transparent'; b.style.color='var(--text-main)'; });
    
    const targetTab = document.getElementById('tab-' + tabId); if(targetTab) { targetTab.classList.add('active'); targetTab.style.display = 'block'; }
    const clickedBtn = event.currentTarget; if(clickedBtn) { clickedBtn.classList.add('active'); clickedBtn.style.background='var(--primary)'; clickedBtn.style.color='white'; }
}

async function savePersonalData() {
    const uid = firebase.auth().currentUser.uid;
    const newName = document.getElementById('editName').value.trim(); const newPhone = document.getElementById('editPhone').value.trim(); const newDept = document.getElementById('editDept').value;
    if(!newName) return showToast('الاسم مطلوب');
    showToast('جاري تحديث هويتك... ⏳');
    await db.ref(`tpm_system/users/${uid}`).update({ name: newName, phone: newPhone, dept: newDept });
    currentUser.name = newName; localStorage.setItem('tpm_user', newName); showToast('تم تحديث بياناتك بنجاح ✅'); renderProfileAndSettings(); showScreen('settingsScreen');
}

function initSignaturePad() {
    setTimeout(() => {
        sigCanvas = document.getElementById('signatureCanvas'); if(!sigCanvas) return;
        sigCtx = sigCanvas.getContext('2d'); sigCtx.lineWidth = 3; sigCtx.strokeStyle = '#3b82f6'; sigCtx.lineCap = 'round'; clearSignature(); 
        const startDrawing = (x, y) => { isDrawing = true; canvasRect = sigCanvas.getBoundingClientRect(); sigCtx.beginPath(); sigCtx.moveTo(x - canvasRect.left, y - canvasRect.top); };
        const draw = (x, y) => { if(isDrawing) { sigCtx.lineTo(x - canvasRect.left, y - canvasRect.top); sigCtx.stroke(); } };
        sigCanvas.onmousedown = (e) => startDrawing(e.clientX, e.clientY); sigCanvas.onmousemove = (e) => draw(e.clientX, e.clientY); sigCanvas.onmouseup = () => isDrawing = false; sigCanvas.onmouseleave = () => isDrawing = false;
        sigCanvas.ontouchstart = (e) => { startDrawing(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }; sigCanvas.ontouchmove = (e) => { draw(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }; sigCanvas.ontouchend = () => isDrawing=false;
    }, 300); 
}
function clearSignature() { if(sigCtx) { sigCtx.fillStyle = "#ffffff"; sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height); } }

function generateFinalReport() {
    let s=0, m=0; currentAudit.stepsOrder.forEach(k=>{if(!currentAudit.results[k].skipped){s+=currentAudit.results[k].score; m+=currentAudit.results[k].max;}});
    let p=m===0?0:Math.round((s/m)*100); currentAudit.totalPct = p;
    const finalPctEl = document.getElementById('finalTotalPct'); if(finalPctEl) finalPctEl.innerText = p+'%'; 
    const finalDeptEl = document.getElementById('finalDeptName'); if(finalDeptEl) finalDeptEl.innerText = currentAudit.dept;
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
    await db.ref('tpm_system/history/' + currentAudit.id).set(currentAudit); awardPoints(50, 'إتمام مراجعة رسمية'); clearAuditDraft(); showToast('تم حفظ التقرير بنجاح ✅ جاري تحويلك للأرشيف...');
    setTimeout(() => { showScreen('historyScreen'); }, 1500);
}

// ------------------------------------------
// 📊 أرشيف التقارير (History)
// ------------------------------------------
function renderHistory() {
    const container = document.getElementById('historyListContainer');
    if (!container) return; // 🛡️ حماية معمارية

    let real = historyData.filter(h=>!h.stepsOrder.includes('ManualKaizen')).reverse();
    let html = real.map(a => {
        let controls = (hasRole('admin') || currentUser.name === a.auditor) ? `
            <div style="margin-top:15px; display:flex; gap:10px; border-top:1px solid var(--border-glass); padding-top:15px;">
                <button class="btn btn-sm btn-outline flex-1" onclick="event.stopPropagation(); editReport('${a.id}')"><i class='bx bx-edit'></i> تعديل</button>
                <button class="btn btn-sm btn-danger flex-1" onclick="event.stopPropagation(); deleteReport('${a.id}')"><i class='bx bx-trash'></i> حذف</button>
            </div>
        ` : '';
        let colorClass = a.totalPct >= 80 ? 'success' : (a.totalPct >= 50 ? 'warning' : 'danger');
        
        return `
        <div class="card glass-card" style="cursor:pointer; padding: 20px; border-right: 4px solid var(--${colorClass});" onclick="viewDetailedReport('${a.id}')">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h3 style="color:var(--text-main); font-size:16px; margin:0 0 8px;"><i class='bx bx-buildings'></i> ${a.dept}</h3>
                    <div style="font-size:12px; color:var(--text-muted); display:flex; flex-direction:column; gap:4px;">
                        <span><i class='bx bx-user'></i> ${a.auditor}</span>
                        <span><i class='bx bx-calendar'></i> ${a.date}</span>
                        <span><i class='bx bx-cog'></i> ${a.machine || 'عام'}</span>
                    </div>
                </div>
                <div style="font-size:26px; font-weight:900; color:var(--${colorClass}); background:rgba(255,255,255,0.05); padding:10px 15px; border-radius:16px; border:1px solid var(--border-glass);">
                    ${a.totalPct}%
                </div>
            </div>
            ${controls}
        </div>`;
    }).join('');
    container.innerHTML = html || '<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:14px; width:100%;"><i class="bx bx-archive" style="font-size:50px; display:block; margin-bottom:10px;"></i> لا توجد تقارير في الأرشيف حالياً</div>';
}

function deleteReport(id) { if(confirm('تأكيد الحذف النهائي للتقرير؟')) { deleteRecord('history/' + id); showToast('تم الحذف بنجاح'); } }
function editReport(id) { let rep = historyData.find(h => h.id === id); if(!rep) return; currentAudit = JSON.parse(JSON.stringify(rep)); currentAudit.currentStepIndex = 0; renderCurrentAuditStep(); }

function viewDetailedReport(id) {
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
    const sigDiv = document.getElementById('detSignatureImg');
    if (a.signature) { sigDiv.innerHTML = `<img src="${a.signature}" style="height:80px; max-width:200px;">`; } else { sigDiv.innerHTML = '<div style="color:#94a3b8; font-size:12px;">لا يوجد توقيع</div>'; }
    showScreen('detailedReportScreen');
}

function downloadProfessionalPDF() { window.scrollTo(0,0); const btns = document.querySelectorAll('#detailedReportScreen .row-flex'); btns.forEach(b => b.style.display = 'none'); html2pdf().set({margin:0.2, filename:'تقرير_مراجعة.pdf', image:{type:'jpeg',quality:1}, html2canvas:{scale:2, useCORS:true}, jsPDF:{unit:'in', format:'a4', orientation:'portrait'}}).from(document.getElementById('printableReportArea')).save().then(()=>{ btns.forEach(b => b.style.display = 'flex'); }); }
function shareWhatsApp() { showToast("جاري تجهيز النص..."); }

// ------------------------------------------
// 📋 إدارة المهام (Tasks Kanban)
// ------------------------------------------
function renderTasks() {
    let htmlFolders = '';
    const cols = { pending: '', progress: '', done: '' };
    const counts = { pending: 0, progress: 0, done: 0 };
    
    let currentDeptTasks = tasksData.filter(t => t.dept === currentTaskDept);

    currentDeptTasks.forEach(t => {
        let deleteBtnHTML = hasRole('admin') ? `<button class="btn btn-sm btn-danger" style="padding:4px 8px; margin:0;" onclick="deleteTask('${t.id}')"><i class='bx bx-trash'></i></button>` : '';
        
        if(t.isFolder) {
            let total = t.subTasks ? t.subTasks.length : 0; 
            let done = t.subTasks ? t.subTasks.filter(s=>s.status==='done').length : 0;
            htmlFolders += `
                <div class="card glass-card" style="border-right: 4px solid var(--gold); margin-bottom:15px; padding:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid var(--border-glass); padding-bottom:10px;">
                        <b style="color:var(--gold); font-size:14px;"><i class='bx bx-folder'></i> ${t.task}</b>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <span style="background:var(--surface-inset); padding:4px 10px; border-radius:8px; font-size:11px;">${done}/${total}</span>
                            ${deleteBtnHTML}
                        </div>
                    </div>
                    ${t.subTasks ? t.subTasks.map((s,i)=>`
                        <div style="font-size:13px; padding:8px 0; border-bottom:1px solid var(--border-glass);">
                            <label style="cursor:pointer; display:flex; gap:10px; align-items:flex-start; ${s.status==='done'?'text-decoration:line-through; color:var(--text-muted);':''}">
                                <input type="checkbox" style="margin-top:4px;" ${s.status==='done'?'checked':''} onclick="toggleFolderSubTask('${t.id}', ${i})"> 
                                <span style="flex:1; line-height:1.5;">${s.text}</span>
                            </label>
                        </div>`).join('') : ''}
                </div>`;
        } else {
            const status = t.status || 'pending';
            counts[status]++;
            
            let actions = '';
            if(status === 'pending') actions = `<button class="btn btn-sm btn-warning flex-1" onclick="changeTaskStatus('${t.id}', 'progress')"><i class='bx bx-play'></i> بدء</button>`;
            else if(status === 'progress') actions = `<button class="btn btn-sm btn-success flex-1" onclick="changeTaskStatus('${t.id}', 'done')"><i class='bx bx-check'></i> إنجاز</button>`;
            else if(status === 'done') actions = `<button class="btn btn-sm btn-outline flex-1" onclick="changeTaskStatus('${t.id}', 'pending')"><i class='bx bx-undo'></i> إعادة</button>`;

            cols[status] += `
            <div class="kanban-item">
                <div style="font-weight:bold; margin-bottom:10px; font-size:14px;">${t.task}</div>
                ${t.image ? `<img src="${t.image}" style="width:100%; border-radius:10px; margin-bottom:10px; border:1px solid var(--border-glass); cursor:pointer;" onclick="window.open('${t.image}')">` : ''}
                <div style="font-size:11px; color:var(--text-muted); margin-bottom:15px;"><i class='bx bx-buildings'></i> ${t.dept}</div>
                <div class="row-flex" style="gap:8px;">
                    ${actions}
                    ${hasRole('admin') ? `<button class="btn btn-sm btn-danger" style="width:40px; padding:0;" onclick="deleteTask('${t.id}')"><i class='bx bx-trash'></i></button>` : ''}
                </div>
            </div>`;
        }
    });

    ['pending', 'progress', 'done'].forEach(s => {
        const listEl = document.getElementById('kanban_' + s);
        const countEl = document.getElementById('count_' + s);
        if(listEl) listEl.innerHTML = cols[s] || '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:15px;">لا توجد مهام</div>';
        if(countEl) countEl.innerText = counts[s];
    });

    let fC = document.getElementById('auditFoldersContainer'); 
    if(fC) fC.innerHTML = htmlFolders || '<div style="font-size:13px; color:var(--text-muted); text-align:center; width:100%; padding:20px;">لا توجد مجلدات تحسين من المراجعات</div>';
    
    updateTasksDeptGrid();
}

function deleteTask(id) { if(confirm('⚠️ هل أنت متأكد من حذف هذه المهمة نهائياً؟')) { deleteRecord('tasks/' + id); showToast('تم الحذف بنجاح 🗑️'); } }

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
    if(dG) {
        dG.innerHTML = departments.map(d => `
            <div class="card glass-card" style="padding:20px; text-align:center; cursor:pointer; border-bottom:3px solid ${deptStats[d].p>0?'var(--danger)':'var(--success)'};" onclick="openTasksDept('${d}')">
                <h4 style="color:var(--text-main); font-size:16px; margin:0 0 10px;"><i class='bx bx-buildings'></i> ${d}</h4>
                <div style="font-size:12px; color:var(--text-muted);">مهام نشطة: <b style="color:var(--danger); font-size:16px;">${deptStats[d].p}</b></div>
            </div>`).join('');
    }
}

function openTasksDept(dept) { currentTaskDept = dept; document.getElementById('tasksDeptTitle').innerText = `مهام ${dept}`; document.getElementById('tasksMainView').style.display='none'; document.getElementById('tasksDeptView').style.display='block'; renderTasks(); }
function closeTasksDept() { currentTaskDept = null; document.getElementById('tasksDeptView').style.display='none'; document.getElementById('tasksMainView').style.display='block'; renderTasks(); }
function toggleFolderSubTask(fId, sIdx) { let f = tasksData.find(x=>x.id==fId); if(f) { f.subTasks[sIdx].status = f.subTasks[sIdx].status==='done'?'pending':'done'; syncRecord('tasks/' + fId, f); } }
function changeTaskStatus(id, st) { let t=tasksData.find(x=>x.id==id); if(t) {t.status=st; syncRecord('tasks/' + id, t);} }
function addManualTaskDept() { let v=document.getElementById('newTaskInput').value; if(v){ let id = uniqueNumericId().toString(); syncRecord('tasks/' + id, {id:id, task:v, dept:currentTaskDept, status:'pending'}); document.getElementById('newTaskInput').value=''; showToast('تمت الإضافة'); } }

// ------------------------------------------
// 💡 مجتمع كايزن (Kaizen Engine)
// ------------------------------------------
function handleKaizenImage(e, type) {
    const f=e.target.files[0]; if(!f) return;
    showToast('جاري تحضير الصورة...');
    processAndEnhanceImage(f, function(dataUrl) { kaizenImgs[type] = dataUrl; document.getElementById(type==='before'?'kaizenBeforePreview':'kaizenAfterPreview').innerHTML=`<span style="color:var(--success); font-size:12px; font-weight:bold; display:block; margin-top:10px;"><i class='bx bx-check'></i> تم الإرفاق</span>`; });
}

function submitManualKaizen() {
    let t = document.getElementById('newKaizenTitle').value; let d = document.getElementById('newKaizenDept').value;
    if(!t || !kaizenImgs.before || !kaizenImgs.after) { showToast('⚠️ برجاء كتابة الوصف وإرفاق الصورتين'); return; }
    
    const btn = document.getElementById('submitKaizenBtn'); btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري الدمج..."; btn.disabled = true;
    
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
    const imgBefore = new Image(); const imgAfter = new Image();
    
    imgBefore.onload = function() {
        imgAfter.onload = async function() {
            canvas.width = 600; canvas.height = 300;
            ctx.fillStyle = "#0f172a"; ctx.fillRect(0,0,600,300);
            ctx.drawImage(imgBefore, 0, 0, 295, 300); ctx.drawImage(imgAfter, 305, 0, 295, 300);
            
            ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.moveTo(280, 150); ctx.lineTo(320, 130); ctx.lineTo(320, 170); ctx.fill();
            ctx.fillStyle = "rgba(239,68,68,0.9)"; ctx.fillRect(10, 10, 60, 30);
            ctx.fillStyle = "white"; ctx.font = "bold 16px Cairo"; ctx.fillText("قبل", 25, 32);
            ctx.fillStyle = "rgba(16,185,129,0.9)"; ctx.fillRect(530, 10, 60, 30);
            ctx.fillStyle = "white"; ctx.font = "bold 16px Cairo"; ctx.fillText("بعد", 545, 32);
            
            const mergedB64 = canvas.toDataURL('image/jpeg', 0.8);
            const uploadedUrl = await uploadImageToStorage(mergedB64);
            if (uploadedUrl) {
                let kId = uniqueNumericId().toString();
                syncRecord('history/' + kId, { id: kId, dept: d, auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG'), stepsOrder: ['ManualKaizen'], totalPct: 100, results: { 'ManualKaizen': { images: { 'img_1': { title: t, data: uploadedUrl } } } } });
                
                document.getElementById('newKaizenTitle').value = ''; document.getElementById('kaizenBeforePreview').innerHTML = ''; document.getElementById('kaizenAfterPreview').innerHTML = ''; kaizenImgs = { before: null, after: null };
                document.getElementById('kaizenUploadModal').style.display = 'none';
                awardPoints(40, 'مشاركة كايزن'); showToast('تم نشر الكايزن بنجاح 🚀');
            } else { showToast('فشل الرفع'); }
            
            btn.innerHTML = "اعتماد التحسين"; btn.disabled = false;
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
        let controls = canEdit ? `<button class="btn btn-sm btn-outline flex-1" onclick="editKaizen('${k.id}')"><i class='bx bx-edit'></i> تعديل</button><button class="btn btn-sm btn-danger flex-1" onclick="deleteKaizen('${k.id}')"><i class='bx bx-trash'></i> حذف</button>` : '';
        let comments = kaizenComments[lId] || [];
        let commentsHtml = comments.map(cm => `<div style="background:var(--surface-inset); padding:10px 15px; border-radius:10px; margin-bottom:8px; border-right:3px solid var(--primary); font-size:13px;"><b style="color:var(--primary); display:block; margin-bottom:3px;">${cm.user}:</b> ${cm.text} <span style="font-size:10px; color:var(--text-muted); float:left;">${cm.date}</span></div>`).join('');

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
}

function toggleKaizenLike(id) { if(!likesData[id]) likesData[id]=[]; let i=likesData[id].indexOf(currentUser.name); if(i>-1) likesData[id].splice(i,1); else likesData[id].push(currentUser.name); syncRecord('likes/' + id, likesData[id]); }
function deleteKaizen(id) { if(confirm('تأكيد مسح الكايزن؟')) { deleteRecord('history/' + id); showToast('تم الحذف'); } }
function editKaizen(id) { let k=historyData.find(x=>x.id===id); if(!k) return; let v=prompt('تعديل الوصف:', k.results.ManualKaizen.images.img_1.title); if(v) { k.results.ManualKaizen.images.img_1.title=sanitizeInput(v); syncRecord('history/' + id, k); showToast('تم التعديل'); } }
function addKaizenComment(id) { let el=document.getElementById(`comment_input_${id}`); let txt=sanitizeInput(el.value); if(!txt) return; if(!kaizenComments[id]) kaizenComments[id]=[]; kaizenComments[id].push({user:currentUser.name, text:txt, date:new Date().toLocaleTimeString('ar-EG')}); syncRecord('kaizenComments/' + id, kaizenComments[id]); el.value=''; awardPoints(2, 'تعليق'); }

// ------------------------------------------
// 🏷️ التاجات والمشكلات (Tags Engine)
// ------------------------------------------
function handleTagImage(e) {
    const f=e.target.files[0]; if(!f) return;
    showToast('جاري تحضير الصورة...');
    processAndEnhanceImage(f, function(dataUrl) { currentTagImg=dataUrl; document.getElementById('tagImagePreview').innerHTML=`<span style="color:var(--success); font-size:12px; font-weight:bold;"><i class='bx bx-check'></i> صورة جاهزة</span>`; });
}

async function addNewTag() {
    let d=document.getElementById('newTagDesc').value, c=document.getElementById('newTagColor').value, dp=document.getElementById('newTagDept').value, m=document.getElementById('newTagMachine').value, sp=document.getElementById('newTagSpareParts').value;
    if(!d) { showToast('⚠️ أدخل وصف المشكلة'); return; }
    
    let fullDesc = sp ? `${d} [أجزاء: ${sp}]` : d;
    let uploadedUrl = null;
    
    if (currentTagImg) {
        showToast('جاري رفع التاج والصورة... ⏳');
        uploadedUrl = await uploadImageToStorage(currentTagImg);
        if(!uploadedUrl) showToast('⚠️ فشل رفع الصورة. سيتم الحفظ كنص.');
    }
    
    let tId = uniqueNumericId().toString();
    syncRecord('tags/' + tId, {id:tId, desc:fullDesc, color:c, dept:dp, machine:m, image:uploadedUrl, status:'open', auditor:currentUser.name, date:new Date().toLocaleDateString('ar-EG'), timestamp: Date.now()});
    
    document.getElementById('newTagDesc').value=''; document.getElementById('newTagMachine').value=''; document.getElementById('newTagSpareParts').value=''; currentTagImg = null;
    let preview = document.getElementById('tagImagePreview'); if(preview) preview.innerHTML = '';
    
    awardPoints(10, 'إصدار تاج جديد'); 
    if(uploadedUrl || !currentTagImg) showToast('تم إصدار التاج بنجاح ✅');
}

function renderTags() {
    let rc = document.getElementById('redTagsContainer'); let bc = document.getElementById('blueTagsContainer');
    if(!rc || !bc) return; // 🛡️ حماية
    
    let fDept = document.getElementById('filterTagDept').value; 
    let fMach = document.getElementById('filterTagMachine').value.trim().toLowerCase();
    let fStatus = document.getElementById('filterTagStatus') ? document.getElementById('filterTagStatus').value : 'active';
    
    let redHtml = '', blueHtml = ''; let currentTime = Date.now(); const THREE_DAYS_MS = 259200000;

    tagsData.forEach(t => {
        if(fDept !== 'الكل' && t.dept !== fDept) return;
        if(fMach !== '' && (!t.machine || !t.machine.toLowerCase().includes(fMach))) return;
        let isClosed = (t.status === 'closed');
        if(fStatus === 'active' && isClosed) return;
        if(fStatus === 'closed' && !isClosed) return;

        let isAged = false; if(!isClosed && t.timestamp && (currentTime - t.timestamp > THREE_DAYS_MS)) isAged = true;

        let canEdit = hasRole('admin', 'auditor') || currentUser.name === t.auditor;
        let controls = canEdit ? `
            <select class="form-control flex-2" style="font-size:12px; padding:8px; margin:0;" onchange="updateTagState('${t.id}', this.value)">
                <option value="open" ${t.status==='open'?'selected':''}>مفتوح</option>
                <option value="progress" ${t.status==='progress'?'selected':''}>جاري</option>
                <option value="review" ${t.status==='review'?'selected':''}>مراجعة</option>
                <option value="closed" ${t.status==='closed'?'selected':''}>مغلق</option>
            </select>
            <button class="btn btn-sm btn-outline flex-1" style="margin:0; padding:8px;" onclick="editTag('${t.id}')"><i class='bx bx-edit'></i></button>
            <button class="btn btn-sm btn-danger" style="margin:0; padding:8px; width:45px;" onclick="deleteTag('${t.id}')"><i class='bx bx-trash'></i></button>
        ` : `<span style="font-size:12px; font-weight:bold; color:var(--text-main); padding:6px 12px; background:var(--surface-inset); border-radius:8px;">الحالة: ${t.status}</span>`;
        
        let ticketClass = t.color === 'red' ? 'ticket-red' : 'ticket-blue';
        let warningBadge = isAged ? `<div style="position:absolute; top:10px; left:-25px; background:var(--danger); color:white; font-size:10px; font-weight:bold; padding:2px 25px; transform:rotate(-45deg);">متأخر</div>` : '';

        let cardHtml = `
        <div class="tag-ticket ${ticketClass}">
            ${warningBadge}
            <div style="font-size:14px; font-weight:900; color:var(--text-main); margin-bottom:10px;">${t.desc}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:15px; background:rgba(0,0,0,0.2); padding:8px; border-radius:8px;">
                <i class='bx bx-buildings'></i> ${t.dept} ${t.machine ? ' | <i class="bx bx-cog"></i> ' + t.machine : ''}<br>
                <i class='bx bx-user'></i> ${t.auditor} | <i class='bx bx-calendar'></i> ${t.date}
            </div>
            ${t.image ? `<img src="${t.image}" style="width:100%; border-radius:10px; margin-bottom:15px; border:1px solid var(--border-glass); cursor:pointer;" onclick="window.open('${t.image}', '_blank')">` : ''}
            <div class="row-flex" style="border-top:1px solid var(--border-glass); padding-top:15px;">
                ${controls}
            </div>
        </div>`;

        if(t.color === 'red') redHtml += cardHtml; else blueHtml += cardHtml;
    });

    rc.innerHTML = redHtml || '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:20px;">لا توجد تاجات صيانة</div>';
    bc.innerHTML = blueHtml || '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:20px;">لا توجد تاجات إنتاج</div>';
}

function updateTagState(id, st) { let t=tagsData.find(x=>x.id==id); if(t) {t.status=st; syncRecord('tags/' + id, t); if(st==='closed') awardPoints(20, 'إغلاق تاج');} }
function deleteTag(id) { if(confirm('تأكيد الحذف نهائياً؟')) { deleteRecord('tags/' + id); showToast('تم الحذف'); } }
function editTag(id) { let t=tagsData.find(x=>x.id==id); if(!t) return; let v=prompt('تعديل الوصف:', t.desc); if(v) { t.desc=sanitizeInput(v); syncRecord('tags/' + id, t); showToast('تم التعديل'); } }


// ------------------------------------------
// 🤖 المستشار الذكي وعقل المصنع (AI)
// ------------------------------------------
async function getBase64FromUrl(url) {
    try { 
        const res = await fetch(url); const blob = await res.blob(); 
        return new Promise(resolve => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(blob); });
    } catch(e) { 
        return new Promise((resolve, reject) => { 
            let img = new Image(); img.crossOrigin = 'Anonymous'; 
            img.onload = () => { let canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height; canvas.getContext('2d').drawImage(img, 0, 0); resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]); }; 
            img.onerror = reject; img.src = url; 
        }); 
    }
}

async function runAIVision(itemId, itemTitle) {
    let imgObj = currentStepImages['img_' + itemId]; if(!imgObj) return showToast('لا توجد صورة لفحصها');
    document.getElementById('aiModalText').innerHTML = "<div style='text-align:center;'><i class='bx bx-loader-alt bx-spin' style='font-size:30px; color:var(--primary);'></i><br>جاري فحص الصورة...</div>"; 
    document.getElementById('aiModal').style.display = 'flex';
    
    try {
        const base64Img = await getBase64FromUrl(imgObj.data);
        let fullPrompt = `أنت مهندس صيانة. حلل هذه الصورة بناءً على بند: "${itemTitle}". رد بـ HTML منسق (استخدم <div> و <b> و <ul> فقط). ممنوع كتابة علامات \`\`\`html نهائياً.\n`;
        if(knowledgeBaseData && knowledgeBaseData.length > 0) fullPrompt += "\nكتالوجات المصنع المعتمدة:\n" + knowledgeBaseData.map(kb => `[${kb.title}]: ${kb.content}`).join('\n');
        
        const response = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: fullPrompt, imageBase64: base64Img }) });
        const result = await response.json(); if(result.error) throw new Error(result.error);
        
        let text = result.candidates[0].content.parts[0].text; text = text.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
        document.getElementById('aiModalText').innerHTML = text; awardPoints(5, 'تحليل AI');
    } catch(e) { document.getElementById('aiModalText').innerHTML = `<div style="color:red; text-align:center;">خطأ في الاتصال: ${e.message}</div>`; }
}

async function predictMachineFailures() {
    const r = document.getElementById('aiPredictionResult'); r.style.display='block'; r.innerHTML='<i class="bx bx-loader-alt bx-spin"></i> جاري التحليل...';
    try {
        let prompt = "بناءً على التاجات التالية، توقع الماكينات المعرضة للتوقف وقدم نصيحة. أجب بنص عادي أو HTML بسيط بدون علامات \`\`\`html: " + tagsData.map(t=>t.desc).join(',');
        const response = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt, imageBase64: null }) });
        const j = await response.json(); if(j.error) throw new Error(j.error);
        let text = j.candidates[0].content.parts[0].text; text = text.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
        r.innerHTML = text;
    } catch(e) { r.innerHTML = `<span style="color:var(--danger);"><i class='bx bx-error'></i> فشل الاتصال: ${e.message}</span>`; }
}

async function explainItem(t) {
    document.getElementById('aiModal').style.display='flex'; 
    document.getElementById('aiModalText').innerHTML = '<div style="text-align:center; padding:30px;"><i class="bx bx-brain" style="font-size:50px; color:var(--primary); animation:pulse 1s infinite;"></i><br>جاري تحضير خطوات العمل...</div>';
    try {
        let prompt = `أنت مهندس صيانة خبير ومراجع TPM. اشرح البند التالي للفنيين: "${t}". رد بخطوات عمل محددة ومرقمة. أجب بنص عادي.`;
        let plainTextResponse = await window.fetchGeminiAPI(prompt);
        document.getElementById('aiModalText').innerHTML = `<div style="font-size:14px; line-height:1.8; text-align:right;">${plainTextResponse.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--primary);">$1</b>')}</div>`;
    } catch(e) { document.getElementById('aiModalText').innerHTML = `<div style="color:red; text-align:center;">⚠️ خطأ: ${e.message}</div>`; }
}

window.askFactoryAI = async function() {
    const q = document.getElementById('kbSearchInput').value.trim(); if(!q) return showToast('اكتب سؤالك أولاً!');
    document.getElementById('aiSearchResponse').style.display = 'block';
    if(document.getElementById('oplBtnContainer')) document.getElementById('oplBtnContainer').style.display = 'none';
    document.getElementById('aiResponseText').innerHTML = '<div style="text-align:center; color:var(--primary);"><i class="bx bx-loader-alt bx-spin"></i> جاري البحث في عقل المصنع...</div>';
    try {
        let prompt = `أنت مستشار فني في مصنع يطبق نظام TPM. أجب على هذا السؤال من الفنيين بشكل عملي وواضح: "${q}". أجب بنص عادي فقط.`;
        let answer = await window.fetchGeminiAPI(prompt);
        document.getElementById('aiResponseText').innerHTML = `<div style="color:var(--primary); font-weight:bold; margin-bottom:10px;"><i class='bx bx-bulb'></i> الإجابة:</div>${answer.replace(/\n/g, '<br>')}`;
        window.lastAIAnswer = answer; if(document.getElementById('oplBtnContainer')) document.getElementById('oplBtnContainer').style.display = 'block';
    } catch(e) { document.getElementById('aiResponseText').innerHTML = `<b style="color:var(--danger);"><i class='bx bx-error'></i> ${e.message}</b>`; }
};

window.generateTPMQuiz = async function() {
    const topic = prompt("أدخل موضوع الاختبار الفني:"); if(!topic) return;
    document.getElementById('aiSearchResponse').style.display = 'block';
    if(document.getElementById('oplBtnContainer')) document.getElementById('oplBtnContainer').style.display = 'none';
    document.getElementById('aiResponseText').innerHTML = '<div style="text-align:center; color:var(--warning);"><i class="bx bx-loader-alt bx-spin"></i> جاري تصميم الاختبار...</div>';
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
    const reader = new FileReader();
    reader.onload = function(e) { tempBase64Pdf = e.target.result; document.getElementById('pdfExtractStatus').innerHTML = `<i class='bx bx-check-circle' style='color:var(--success);'></i> جاهز: <b style="color:var(--text-main);">${file.name}</b>`; };
    reader.readAsDataURL(file);
};

window.saveNewBook = async function() {
    const title = document.getElementById('kbTitle').value; if (!title) return showToast("⚠️ يرجى إدخال عنوان المرجع.");
    let bookId = Date.now().toString(); let catEl = document.getElementById('kbCategory'); let cat = catEl ? catEl.value : 'JH';
    let newBook = { id: bookId, title: title, category: cat, hasPdf: !!tempBase64Pdf };
    
    if(tempBase64Pdf) {
        showToast("جاري الرفع لقاعدة البيانات... ⏳");
        try { await db.ref('tpm_system/pdf_files/' + bookId).set({ base64: tempBase64Pdf }); } catch(e) { return alert("⚠️ فشل رفع الملف."); }
    }
    
    let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {});
    kbArray.push(newBook); knowledgeBaseData = kbArray; syncRecord('knowledgeBase', knowledgeBaseData);
    
    document.getElementById('addBookModal').style.display = 'none'; document.getElementById('kbTitle').value = '';
    document.getElementById('pdfExtractStatus').innerHTML = "<i class='bx bxs-file-pdf'></i> اختر ملف PDF"; tempBase64Pdf = null;
    showToast("✅ تم حفظ المرجع بنجاح!"); window.renderKnowledgeBase();
};

window.renderKnowledgeBase = function() {
    const container = document.getElementById('knowledgeListContainer');
    if(!container) return; // 🛡️ حماية معمارية
    
    let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {});
    
    if(kbArray.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:50px 20px; background:var(--surface-inset); border-radius:var(--radius-lg); border:1px dashed var(--border-glass);">
                <i class='bx bx-ghost' style="font-size:60px; color:var(--text-muted); margin-bottom:15px; display:block;"></i>
                <h3 style="color:var(--text-main); font-size:16px;">لا توجد مراجع أو كتالوجات في الأرشيف حالياً</h3>
            </div>`;
        return;
    }
    
    container.innerHTML = kbArray.map(kb => {
        let badgeColor = 'var(--primary)'; let badgeBg = 'var(--primary-glow)';
        if(kb.category === 'JH') { badgeColor = 'var(--success)'; badgeBg = 'rgba(16, 185, 129, 0.1)'; }
        else if(kb.category === 'PM') { badgeColor = 'var(--danger)'; badgeBg = 'rgba(239, 68, 68, 0.1)'; }
        else if(kb.category === 'SOP') { badgeColor = 'var(--warning)'; badgeBg = 'rgba(249, 115, 22, 0.1)'; }

        return `
        <div class="card glass-card" style="display:flex; flex-direction:column; justify-content:space-between; height:100%; min-height:200px; padding:20px;">
            <div style="flex:1;">
                <span style="display:inline-block; padding:4px 12px; border-radius:8px; font-size:11px; font-weight:900; margin-bottom:15px; background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeColor};">${kb.category || 'عام'}</span>
                <h4 style="font-size:16px; color:var(--text-main); font-weight:800; line-height:1.4; margin-bottom:10px;">${kb.title}</h4>
                <div style="display:flex; align-items:center; gap:5px; color:var(--text-muted); font-size:11px;">
                    <i class='bx bxs-file-pdf' style="color:var(--danger); font-size:16px;"></i> ملف PDF مؤرشف
                </div>
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
                const blob = new Blob([arr], {type: 'application/pdf'}); const url = URL.createObjectURL(blob);
                window.open(url, '_blank'); document.getElementById('aiModal').style.display = 'none';
            } else { alert("الملف غير متوفر حالياً على السيرفر."); document.getElementById('aiModal').style.display = 'none'; }
        } catch(e) { alert("خطأ في الاتصال بقاعدة البيانات."); document.getElementById('aiModal').style.display = 'none'; }
    }
};

window.deleteKnowledgeBook = async function(id) {
    if(confirm("⚠️ هل أنت متأكد من الحذف النهائي؟")) {
        let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {}); knowledgeBaseData = kbArray.filter(b => b.id != id); syncRecord('knowledgeBase', knowledgeBaseData);
        try { await db.ref('tpm_system/pdf_files/' + id).remove(); } catch(e){} window.renderKnowledgeBase(); showToast("تم الحذف 🗑️");
    }
};

// ------------------------------------------
// إعدادات أخرى
// ------------------------------------------
function updateDeptDropdown() { let opts = departments.map(d=>`<option value="${d}">${d}</option>`).join(''); document.querySelectorAll('select').forEach(s => {if(s.id.includes('Dept')) s.innerHTML=opts;}); }
function updateDeptListUI() { }
function addOrUpdateDept() { let v = document.getElementById('newDeptInput').value; if(v){ departments.push(v); syncRecord('departments', departments); updateDeptDropdown(); showToast('تم الحفظ'); } }
function addEngineer() { let n=document.getElementById('newEngName').value, p=document.getElementById('newEngPhone').value; if(n&&p) { maintenanceEngineers.push({name:n, phone:p}); syncRecord('maintenanceEngineers', maintenanceEngineers); document.getElementById('newTagEngineer').innerHTML+=`<option value="${p}">${n}</option>`; showToast('تم الإضافة'); } }

// ------------------------------------------
// 📉 محرك التحسين المستمر وشجرة الفواقد (KK Engine)
// ------------------------------------------
const tpmLosses = [
    { id: 'L1', name: 'أعطال الماكينات', type: 'availability', icon: 'bx bx-wrench', color: '--danger' },
    { id: 'L2', name: 'الإعداد والضبط', type: 'availability', icon: 'bx bx-cog', color: '--warning' },
    { id: 'L3', name: 'تغيير أدوات ومقاسات', type: 'availability', icon: 'bx bx-cut', color: '--warning' },
    { id: 'L4', name: 'بدء التشغيل', type: 'availability', icon: 'bx bx-power-off', color: '--primary' },
    { id: 'L5', name: 'توقفات صغيرة عابرة', type: 'performance', icon: 'bx bx-time', color: '--gold' },
    { id: 'L6', name: 'انخفاض السرعة', type: 'performance', icon: 'bx bx-tachometer', color: '--gold' },
    { id: 'L7', name: 'العيوب وإعادة العمل', type: 'quality', icon: 'bx bx-error', color: '--danger' },
    { id: 'L8', name: 'نقص الخامات', type: 'availability', icon: 'bx bx-package', color: '--text-muted' }
];

let registeredLosses = []; const COST_PER_MINUTE = 50;
let pdcaData = []; let isPdcaListenerActive = false; let currentPDCAImg = null; let pdcaChartInstance = null;

window.switchKKTab = function(tabId, btnElement) {
    document.querySelectorAll('.kk-tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('#kkScreen .row-flex .btn').forEach(b => { b.classList.remove('btn-primary'); b.classList.add('btn-outline'); b.style.border = 'none'; });
    const targetTab = document.getElementById('kkTab-' + tabId); if(targetTab) targetTab.style.display = 'block';
    if(btnElement) { btnElement.classList.add('btn-primary'); btnElement.classList.remove('btn-outline'); }
};

window.renderKKDashboard = function() {
    const lossContainer = document.getElementById('kkLossTreeContainer');
    const pdcaContainer = document.getElementById('kkPdcaContainer');
    if (!lossContainer || !pdcaContainer) return; // 🛡️ حماية معمارية

    if(!isPdcaListenerActive && isOnline && firebase.auth().currentUser) {
        db.ref('tpm_system/pdca').on('value', snap => { pdcaData = snap.val() ? Object.values(snap.val()) : []; renderKKDashboard(); });
        isPdcaListenerActive = true;
    }

    let filterEl = document.getElementById('kkGlobalDeptFilter'); let selectedDept = filterEl ? filterEl.value : 'الكل';
    let filteredLosses = registeredLosses; if (selectedDept !== 'الكل') filteredLosses = registeredLosses.filter(l => l.dept === selectedDept);

    lossContainer.innerHTML = tpmLosses.map(loss => {
        let currentLossMins = filteredLosses.filter(l => l.lossId === loss.id).reduce((sum, curr) => sum + curr.minutes, 0);
        let currentLossCost = currentLossMins * COST_PER_MINUTE; 
        let borderColor = currentLossMins > 60 ? 'var(--danger)' : (currentLossMins > 0 ? 'var(--warning)' : 'var(--border-glass)');
        
        return `
        <div class="card glass-card" style="border-top:4px solid ${borderColor}; text-align:center; padding:20px; cursor:pointer;" onclick="openLossRegistration('${loss.id}', '${loss.name}')">
            <i class='${loss.icon}' style="font-size:36px; color:var(${loss.color}); margin-bottom:10px; display:block;"></i>
            <div style="font-size:13px; font-weight:bold; color:var(--text-main); margin-bottom:15px;">${loss.name}</div>
            <div style="background:var(--surface-inset); padding:10px; border-radius:10px; border:1px solid var(--border-glass);">
                <div style="font-size:12px; color:var(--text-muted);"><i class='bx bx-time'></i> ${currentLossMins} دقيقة</div>
                <div style="font-size:14px; font-weight:900; color:${currentLossCost > 0 ? 'var(--danger)' : 'var(--success)'}; margin-top:5px;">${currentLossCost.toLocaleString()} ج.م</div>
            </div>
        </div>`;
    }).join('');

    let totalMins = filteredLosses.reduce((sum, l) => sum + l.minutes, 0);
    if(document.getElementById('kkTotalLossHours')) document.getElementById('kkTotalLossHours').innerText = (totalMins / 60).toFixed(1);
    if(document.getElementById('kkTotalLossCost')) document.getElementById('kkTotalLossCost').innerText = (totalMins * COST_PER_MINUTE).toLocaleString();

    let filteredPDCA = pdcaData; if (selectedDept !== 'الكل') filteredPDCA = pdcaData.filter(p => p.dept === selectedDept);
    let activePDCACount = filteredPDCA.filter(p => p.status !== 'Closed').length;
    if(document.getElementById('kkActiveProjects')) document.getElementById('kkActiveProjects').innerText = activePDCACount;

    if(filteredPDCA.length === 0) {
        pdcaContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:40px; background:var(--surface-inset); border-radius:var(--radius-lg);"><i class="bx bx-bulb" style="font-size:50px; display:block; margin-bottom:15px; opacity:0.5;"></i>لا توجد مشاريع تحسين مسجلة لهذا القسم.</div>';
    } else {
        pdcaContainer.innerHTML = filteredPDCA.reverse().map(p => {
            let statusColor = p.status === 'Plan' ? 'var(--warning)' : (p.status === 'Do' ? 'var(--primary)' : (p.status === 'Check' ? 'var(--gold)' : (p.status === 'Act' ? 'var(--success)' : 'var(--text-muted)')));
            let controls = hasRole('admin') || currentUser.name === p.owner ? `
                <select class="form-control flex-2" style="margin:0; padding:6px; font-size:11px; border-color:${statusColor}; color:${statusColor}; font-weight:bold;" onclick="event.stopPropagation()" onchange="updatePDCAStatus('${p.id}', this.value)">
                    <option value="Plan" ${p.status==='Plan'?'selected':''}>خطط (Plan)</option>
                    <option value="Do" ${p.status==='Do'?'selected':''}>نفذ (Do)</option>
                    <option value="Check" ${p.status==='Check'?'selected':''}>تحقق (Check)</option>
                    <option value="Act" ${p.status==='Act'?'selected':''}>اعتمد (Act)</option>
                    <option value="Closed" ${p.status==='Closed'?'selected':''}>مغلق</option>
                </select>
                <button class="btn btn-sm btn-danger flex-1" style="margin:0; padding:6px;" onclick="event.stopPropagation(); deletePDCA('${p.id}')"><i class='bx bx-trash'></i></button>
            ` : `<div style="font-size:12px; font-weight:bold; color:${statusColor}; background:var(--surface-inset); padding:6px 15px; border-radius:8px;">${p.status}</div>`;

            return `
            <div class="card glass-card" style="padding:20px; border-right:4px solid ${statusColor}; cursor:pointer;" onclick="viewPDCADetails('${p.id}')">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <b style="color:var(--text-main); font-size:15px;">${p.title}</b>
                    <span style="font-size:11px; color:var(--text-muted);"><i class='bx bx-calendar'></i> ${p.date}</span>
                </div>
                <div style="font-size:12px; color:var(--text-muted); margin-bottom:15px; background:var(--surface-inset); padding:10px; border-radius:8px; border:1px solid var(--border-glass);">
                    <i class='bx bx-buildings'></i> ${p.dept} | <i class='bx bx-user'></i> ${p.owner} | 🎯 ${p.impact}
                </div>
                <div class="row-flex" style="align-items:center;">${controls}</div>
            </div>`;
        }).join('');
    }
};

window.createNewPDCA = function() {
    let opts = departments.map(d => `<option value="${d}">${d}</option>`).join(''); document.getElementById('pdcaDept').innerHTML = opts;
    let filterEl = document.getElementById('kkGlobalDeptFilter'); if(filterEl && filterEl.value !== 'الكل') document.getElementById('pdcaDept').value = filterEl.value;
    document.getElementById('pdcaTitle').value = ''; document.getElementById('pdcaBefore').value = ''; document.getElementById('pdcaAfter').value = ''; document.getElementById('pdcaUnit').value = ''; document.getElementById('pdcaPlan').value = ''; document.getElementById('pdcaDo').value = ''; document.getElementById('pdcaCheck').value = ''; document.getElementById('pdcaAct').value = ''; currentPDCAImg = null; document.getElementById('pdcaImgPreview').innerHTML = '';
    document.getElementById('pdcaCreateModal').style.display = 'flex';
};

window.handlePDCAImage = function(e) { const f = e.target.files[0]; if(!f) return; showToast('جاري تحضير الصورة...'); processAndEnhanceImage(f, function(dataUrl) { currentPDCAImg = dataUrl; document.getElementById('pdcaImgPreview').innerHTML = `<span style="color:var(--success);"><i class='bx bx-check'></i> صورة جاهزة للرفع</span>`; }); };

window.saveNewPDCA = async function() {
    let t = document.getElementById('pdcaTitle').value; let b = parseFloat(document.getElementById('pdcaBefore').value) || 0; let a = parseFloat(document.getElementById('pdcaAfter').value) || 0; let unit = document.getElementById('pdcaUnit').value || 'وحدة';
    if(!t) return showToast('⚠️ عنوان المشروع مطلوب!');

    let uploadedUrl = null;
    if (currentPDCAImg) { showToast('جاري رفع صورة المشروع... ⏳'); uploadedUrl = await uploadImageToStorage(currentPDCAImg); }

    let pdcaObj = { id: uniqueNumericId().toString(), title: sanitizeInput(t), dept: document.getElementById('pdcaDept').value, impact: document.getElementById('pdcaImpact').value, beforeVal: b, afterVal: a, unit: sanitizeInput(unit), planText: sanitizeInput(document.getElementById('pdcaPlan').value), doText: sanitizeInput(document.getElementById('pdcaDo').value), checkText: sanitizeInput(document.getElementById('pdcaCheck').value), actText: sanitizeInput(document.getElementById('pdcaAct').value), image: uploadedUrl, status: 'Plan', owner: currentUser.name || 'مجهول', date: new Date().toLocaleDateString('ar-EG') };
    if (pdcaObj.actText !== '') pdcaObj.status = 'Closed'; else if (pdcaObj.checkText !== '') pdcaObj.status = 'Check'; else if (pdcaObj.doText !== '') pdcaObj.status = 'Do';
    pdcaData.push(pdcaObj); renderKKDashboard(); syncRecord('pdca/' + pdcaObj.id, pdcaObj); document.getElementById('pdcaCreateModal').style.display = 'none'; awardPoints(25, 'إطلاق PDCA'); showToast('تم إطلاق المشروع بنجاح 🚀');
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

window.updatePDCAStatus = function(id, newStatus) { let p = pdcaData.find(x => x.id == id); if(p) { p.status = newStatus; syncRecord('pdca/' + id, p); if(newStatus === 'Act') awardPoints(20, 'اعتماد تحسين (Act)'); } };
window.deletePDCA = function(id) { if(confirm('هل أنت متأكد من حذف هذا المشروع نهائياً؟')) { deleteRecord('pdca/' + id); showToast('تم مسح المشروع 🗑️'); } };

window.openLossRegistration = function(lossId, lossName) {
    let filterEl = document.getElementById('kkGlobalDeptFilter'); let targetDept = filterEl ? filterEl.value : 'الكل';
    if(targetDept === 'الكل') {
        targetDept = prompt(`لأي قسم تريد تسجيل هذا الفقد؟\n(${departments.join(' أو ')})`, departments[0]);
        if(!targetDept || !departments.includes(targetDept)) return showToast('⚠️ يرجى إدخال اسم قسم صحيح.');
    }
    let mins = prompt(`تسجيل فقد لـ [${targetDept}]:\nنوع الفقد: ${lossName}\n\nأدخل مدة التوقف (بالدقائق):`);
    if(mins && !isNaN(mins) && parseInt(mins) > 0) {
        let lossObj = { id: uniqueNumericId().toString(), lossId: lossId, dept: targetDept, minutes: parseInt(mins), date: new Date().toLocaleDateString('ar-EG'), user: currentUser.name || 'مجهول' };
        registeredLosses.push(lossObj); renderKKDashboard(); syncRecord('losses/' + lossObj.id, lossObj); awardPoints(5, 'تسجيل فقد'); showToast(`✅ تم تسجيل الفقد.`);
    } else if (mins) showToast('⚠️ إدخال غير صحيح');
};

window.startKKAudit = function() { const selectedDept = document.getElementById('kkAuditDeptSelect').value; if(!selectedDept) return showToast('يرجى اختيار القسم أولاً'); showToast(`تم تجهيز بيئة المراجعة. جاري البرمجة! 🚀`); };

// Service Worker (Offline Support)
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW Registration Failed', err)); }); }

// JH KPIs Engine
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

window.openJHKPIsScreen = function() {
    showScreen('jhKPIsScreen'); renderKPIDeptTabs(); loadKPIsForDepartment(currentKPIDept); calculateGlobalKPIs(); filterKPITable('All'); setTimeout(() => { initEnterpriseCharts(); }, 300);
};

window.renderKPIDeptTabs = function() {
    let opts = departments.map(d => `<option value="${d}">${d}</option>`).join('');
    let f1 = document.getElementById('kpiDeptFilter'); if(f1) f1.innerHTML = `<option value="factory">المصنع بالكامل</option>` + opts;
    
    // Auto populate month filter
    let mFilter = document.getElementById('kpiMonthFilter');
    if(mFilter && mFilter.options.length === 0) {
        let cm = new Date().toISOString().slice(0, 7);
        mFilter.innerHTML = `<option value="${cm}">الشهر الحالي</option>`;
    }
};

window.reloadEnterpriseKPIs = function() {
    let d = document.getElementById('kpiDeptFilter').value; if(d !== 'factory') currentKPIDept = d;
    loadKPIsForDepartment(currentKPIDept);
};

window.loadKPIsForDepartment = async function(dept) {
    let currentMonth = document.getElementById('kpiMonthFilter') ? document.getElementById('kpiMonthFilter').value : new Date().toISOString().slice(0, 7); 
    const snap = await db.ref(`tpm_system/jh_kpis/${currentMonth}/${dept}`).once('value'); kpiDataStore = snap.val() || {};

    let deptAudits = historyData.filter(h => h.dept === dept && !h.stepsOrder.includes('ManualKaizen'));
    let auditScore = deptAudits.length > 0 ? deptAudits[deptAudits.length-1].totalPct : 0;
    let openTags = tagsData.filter(t => t.dept === dept && t.color === 'red' && t.status !== 'closed').length;
    let closedTags = tagsData.filter(t => t.dept === dept && t.color === 'red' && t.status === 'closed').length;
    let kaizens = historyData.filter(h => h.dept === dept && h.stepsOrder.includes('ManualKaizen')).length;
    let oee = Math.max(0, Math.round((auditScore * 0.95) - (openTags * 1.5)));

    if(document.getElementById('kpiDashOEE')) document.getElementById('kpiDashOEE').innerText = oee + '%';
    if(document.getElementById('kpiDashAudit')) document.getElementById('kpiDashAudit').innerText = auditScore + '%';
    if(document.getElementById('kpiDashTags')) document.getElementById('kpiDashTags').innerText = `${closedTags}/${openTags}`;
    if(document.getElementById('kpiDashKaizen')) document.getElementById('kpiDashKaizen').innerText = kaizens;

    renderEnterpriseKPITable();
};

window.calculateGlobalKPIs = function() {}; // Reserved for future global aggr

window.filterKPITable = function(category) {
    window.currentPQCDSMFilter = category;
    document.querySelectorAll('#jhKPIsScreen .row-flex button').forEach(btn => {
        if(btn.innerText.includes(category) || (category === 'All' && btn.innerText.includes('الكل'))) { btn.classList.add('btn-primary'); btn.classList.remove('btn-outline'); } 
        else { btn.classList.remove('btn-primary'); btn.classList.add('btn-outline'); }
    });
    renderEnterpriseKPITable();
};

window.renderEnterpriseKPITable = function() {
    let tbody = document.getElementById('enterpriseKPITableBody'); if(!tbody) return; tbody.innerHTML = '';
    let filteredKPIs = TPM_MASTER_KPIs.filter(kpi => window.currentPQCDSMFilter === 'All' || kpi.cat === window.currentPQCDSMFilter);
    
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

        let isGood = kpi.dir === 'up' ? (val >= kpi.target) : (val <= kpi.target);
        let statusIcon = isGood ? '<i class="bx bx-check-circle"></i>' : '<i class="bx bx-error-circle"></i>';
        let statusClass = isGood ? 'success-text' : 'danger-text';

        tbody.innerHTML += `<tr style="border-bottom: 1px solid var(--border-glass);">
            <td style="text-align:center; padding:12px;"><span class="kpi-category-badge cat-${kpi.cat}">${kpi.cat}</span></td>
            <td style="color:var(--text-main); font-weight:bold;">${kpi.name} ${sourceBadge}</td>
            <td style="text-align:center; color:var(--gold);">${kpi.target}</td>
            <td style="text-align:center; font-weight:900; color:${val>0?'#fff':'var(--text-muted)'};">${val}</td>
            <td style="text-align:center;" class="${statusClass}">${statusIcon}</td>
        </tr>`;
    });
};

window.openKPIEntryModal = function() {
    let nameEl = document.getElementById('manualKPIDeptName'); if(nameEl) nameEl.innerHTML = `<i class='bx bx-edit'></i> إدخال بيانات: ${currentKPIDept}`;
    let fieldsHtml = TPM_MASTER_KPIs.filter(k => k.type === 'manual').map(kpi => `<div class="form-group"><label style="color:var(--text-muted); font-size:12px;">${kpi.name} (${kpi.unit})</label><input type="number" id="manual_kpi_${kpi.id}" class="form-control" value="${kpiDataStore[kpi.id] || 0}"></div>`).join('');
    let fieldsContainer = document.getElementById('manualKPIFields'); if(fieldsContainer) fieldsContainer.innerHTML = fieldsHtml;
    let modal = document.getElementById('manualKPIModal'); if(modal) modal.style.display = 'flex';
};

window.saveManualKPIs = async function() {
    let currentMonth = document.getElementById('kpiMonthFilter') ? document.getElementById('kpiMonthFilter').value : new Date().toISOString().slice(0, 7);
    let updates = {}; TPM_MASTER_KPIs.filter(k => k.type === 'manual').forEach(kpi => { let el = document.getElementById(`manual_kpi_${kpi.id}`); if(el) updates[kpi.id] = parseFloat(el.value) || 0; });
    await db.ref(`tpm_system/jh_kpis/${currentMonth}/${currentKPIDept}`).set(updates);
    document.getElementById('manualKPIModal').style.display = 'none'; showToast('تم حفظ المؤشرات ✅'); loadKPIsForDepartment(currentKPIDept); 
};

window.initEnterpriseCharts = function() {
    let ctxRadar = document.getElementById('kpiMaturityRadar');
    if(ctxRadar) {
        if(kpiRadarChartInst) kpiRadarChartInst.destroy();
        kpiRadarChartInst = new Chart(ctxRadar, { type: 'radar', data: { labels: ['إنتاجية', 'جودة', 'تكلفة', 'تسليم', 'سلامة', 'معنويات'], datasets: [{ label: 'الحالي', data: [85, 92, 70, 88, 100, 95], backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#f59e0b', pointBackgroundColor: '#f59e0b', borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' }, angleLines: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { font: { family: 'Cairo' }, color: '#94a3b8' } } }, plugins: { legend: { display: false } } } });
    }
    let ctxTrend = document.getElementById('kpiTrendLine');
    if(ctxTrend) {
        if(kpiTrendChartInst) kpiTrendChartInst.destroy();
        kpiTrendChartInst = new Chart(ctxTrend, { type: 'line', data: { labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'], datasets: [{ label: 'OEE %', data: [72, 75, 74, 78, 80, 82], borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 3, fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Cairo' } } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } } }, plugins: { legend: { display: false } } } });
    }
};

// Checklists & CLIT maps logic reserved
