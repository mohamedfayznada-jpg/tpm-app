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
let currentTagImg = null, currentTaskDept = null, currentOplImg = null, kaizenImgs = { before: null, after: null };
let sigCanvas, sigCtx, isDrawing = false;

function hasRole(...allowed) { return currentUser && currentUser.role && allowed.includes(currentUser.role); }
function sanitizeInput(val) { return String(val || '').replace(/[<>]/g, '').trim(); }
function uniqueNumericId() { return (Date.now() * 1000) + Math.floor(Math.random() * 1000); }
function safeUrl(url) { const val = String(url || '').trim(); return (val.startsWith('https://') || val.startsWith('http://') || val.startsWith('data:image/')) ? val : ''; }

db.ref('.info/connected').on('value', snap => {
    isOnline = snap.val() === true;
    const el = document.getElementById('cloudStatus');
    if(el) el.innerHTML = isOnline ? "متصل" : "غير متصل";
});

firebase.auth().onAuthStateChanged(user => {
    if (tpmSystemRef && tpmSystemListener) tpmSystemRef.off('value', tpmSystemListener);
    if (user) {
        tpmSystemRef = db.ref('tpm_system');
        tpmSystemListener = snapshot => {
            const data = snapshot.val() || {};
            departments = data.departments || ['إنتاج', 'صيانة'];
            historyData = data.history ? Object.values(data.history).filter(x => x.id).sort((a,b)=>a.id-b.id) : [];
            tasksData = data.tasks ? Object.values(data.tasks).filter(x => x.id).sort((a,b)=>a.id-b.id) : [];
            logsData = data.logs ? Object.values(data.logs).filter(x => x).sort((a,b)=>a.id-b.id) : [];
            usersData = data.users || {};
            globalApiKeys = data.api_keys || { imgbb: "", gemini: "" };
            likesData = data.likes || {};
            tagsData = data.tags ? Object.values(data.tags).filter(x => x.id).sort((a,b)=>b.id-a.id) : [];
            userPoints = data.points || {};
            deptPhones = data.deptPhones || {};
            maintenanceEngineers = data.maintenanceEngineers || [];
            kaizenComments = data.kaizenComments || {};
            knowledgeBaseData = data.knowledgeBase ? Object.values(data.knowledgeBase).filter(x => x) : [];
            isDataLoaded = true;

            if (isInitialLoad) {
                isInitialLoad = false;
                const savedName = localStorage.getItem('tpm_user') || user.email.split('@')[0];
                const savedUsername = localStorage.getItem('tpm_username') || user.email.split('@')[0];
                let role = 'viewer';
                if (user.email.toLowerCase().includes('mfayez') || savedUsername.toLowerCase() === 'mfayez') { role = 'admin'; db.ref('tpm_system/users/' + user.uid).set('admin'); }
                else if (usersData[user.uid]) role = usersData[user.uid];
                else if (usersData[savedUsername]) role = usersData[savedUsername];
                currentUser = { name: savedName, username: savedUsername, role: role };
                document.querySelectorAll('.btn-role-admin').forEach(el => el.style.display = role === 'admin' ? 'block' : 'none');
                document.querySelectorAll('.btn-role-auditor').forEach(el => el.style.display = (role === 'admin' || role === 'auditor') ? 'block' : 'none');
                document.getElementById('bottomNav').style.display = 'flex';
                showScreen('homeScreen');
                initSignaturePad();
            }
            updateDeptDropdown(); updateDeptListUI(); renderHistory(); renderTasks();
            if(currentUser.role) { updateHomeDashboard(); if(currentViewedDept) updateDeptDashboard(); }
            if(currentUser.role === 'admin') { renderUsersPanel(); renderLogsPanel(); }
            renderKaizenFeed(); renderTags(); renderKnowledgeBase();
        };
        tpmSystemRef.on('value', tpmSystemListener);
    } else {
        isInitialLoad = true; isDataLoaded = false; document.getElementById('bottomNav').style.display = 'none'; showScreen('loginScreen');
    }
});

async function login() {
    const username = sanitizeInput(document.getElementById('loginUsername').value).toLowerCase();
    const password = document.getElementById('loginPassword').value.trim();
    const name = sanitizeInput(document.getElementById('displayName').value);
    if(!username || !password || !name) return;
    document.getElementById('cloudStatus').innerHTML = "جاري الدخول";
    if(document.getElementById('rememberMe').checked) { localStorage.setItem('tpm_user', name); localStorage.setItem('tpm_username', username); }
    try { await firebase.auth().signInWithEmailAndPassword(username + "@tpm.app", password); } catch (e) {}
}

async function registerNewUser() {
    const name = sanitizeInput(document.getElementById('regName').value);
    const username = sanitizeInput(document.getElementById('regUsername').value).toLowerCase();
    const password = document.getElementById('regPassword').value.trim();
    if(!name || !username || password.length < 6) return;
    try { await firebase.auth().createUserWithEmailAndPassword(username + "@tpm.app", password); await db.ref('tpm_system/users/' + username).set('viewer'); localStorage.setItem('tpm_user', name); localStorage.setItem('tpm_username', username); window.location.reload(); } catch(e) {}
}

function logout() { firebase.auth().signOut().then(() => { localStorage.clear(); window.location.reload(); }); }

function biometricLogin() {
    const u = localStorage.getItem('tpm_username'); const n = localStorage.getItem('tpm_user');
    if(!u) return; document.getElementById('loginUsername').value = u; document.getElementById('displayName').value = n;
}

function syncToServer() {
    if (!isDataLoaded || !firebase.auth().currentUser) return;
    const updates = {};
    historyData.forEach(h => updates['tpm_system/history/' + h.id] = h);
    tasksData.forEach(t => updates['tpm_system/tasks/' + t.id] = t);
    tagsData.forEach(t => updates['tpm_system/tags/' + t.id] = t);
    logsData.forEach(l => updates['tpm_system/logs/' + l.id] = l);
    updates['tpm_system/kaizenComments'] = kaizenComments || {}; updates['tpm_system/likes'] = likesData || {}; updates['tpm_system/points'] = userPoints || {};
    if (hasRole('admin')) { updates['tpm_system/departments'] = departments; updates['tpm_system/users'] = usersData; updates['tpm_system/deptPhones'] = deptPhones; updates['tpm_system/maintenanceEngineers'] = maintenanceEngineers; updates['tpm_system/knowledgeBase'] = knowledgeBaseData; updates['tpm_system/api_keys'] = globalApiKeys; }
    db.ref().update(updates).catch(e => {});
}

function awardPoints(pts, reason) {
    if(!currentUser.name) return;
    userPoints[currentUser.name] = (userPoints[currentUser.name] || 0) + pts;
    syncToServer(); logAction(`النقاط المكتسبة: ${pts} (${reason})`);
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const map = { 'homeScreen':0, 'tasksScreen':1, 'historyScreen':2, 'detailedReportScreen':2, 'kaizenScreen':3, 'tagsScreen':4, 'knowledgeScreen':5, 'settingsScreen':6 };
    if(map[id]!==undefined && document.querySelectorAll('.nav-item')[map[id]]) document.querySelectorAll('.nav-item')[map[id]].classList.add('active');
    window.scrollTo(0,0);
}

function updateUsersLeaderboard() {
    const c = document.getElementById('podiumContainer'); const lc = document.getElementById('usersLeaderboardContainer');
    if(!c || !lc) return;
    let sortable = []; for (let user in userPoints) { sortable.push({ user: user, points: userPoints[user] }); }
    sortable.sort((a, b) => b.points - a.points);
    if(sortable.length === 0) { c.innerHTML = ''; lc.innerHTML = 'لا يوجد'; return; }
    
    let htmlPodium = '';
    if(sortable[1]) htmlPodium += `<div class="podium-step step-2"><div>2</div><div>${sortable[1].user}</div><div style="font-size:10px;">${sortable[1].points}</div></div>`;
    if(sortable[0]) htmlPodium += `<div class="podium-step step-1"><div>1</div><div>${sortable[0].user}</div><div style="font-size:10px;">${sortable[0].points}</div></div>`;
    if(sortable[2]) htmlPodium += `<div class="podium-step step-3"><div>3</div><div>${sortable[2].user}</div><div style="font-size:10px;">${sortable[2].points}</div></div>`;
    c.innerHTML = htmlPodium;
    
    lc.innerHTML = sortable.slice(3).map((item, idx) => `<div class="leaderboard-item"><span>${idx+4}. ${item.user}</span><span>${item.points} نقطة</span></div>`).join('');
}

function updateHomeDashboard() {
    let tScore = 0, aCount = 0;
    let grid = departments.map(d => {
        let auds = historyData.filter(h => h.dept === d && !h.stepsOrder.includes('ManualKaizen'));
        let sc = auds.length > 0 ? auds[auds.length-1].totalPct : 0;
        if(auds.length > 0) { tScore+=sc; aCount++; }
        let rTags = tagsData.filter(t => t.dept === d && t.status === 'open' && t.color === 'red').length;
        return `<div class="card" onclick="openDeptDashboard('${d}')"><div class="card-title">${d}</div><div class="stat-value ${sc>=80?'success-text':(sc>=50?'warning-text':'danger-text')}">${sc}%</div><div>تاجات صيانة: ${rTags}</div></div>`;
    }).join('');
    document.getElementById('homeDeptGrid').innerHTML = grid;
    document.getElementById('homeAvgScore').innerText = aCount > 0 ? Math.round(tScore/aCount) + '%' : '0%';
    document.getElementById('homeOpenTags').innerText = tagsData.filter(t => t.status === 'open').length;
    document.getElementById('homeClosedTags').innerText = tagsData.filter(t => t.status === 'closed').length;
    updateUsersLeaderboard();
}

function openDeptDashboard(dept) { currentViewedDept = dept; document.getElementById('deptDashTitle').innerText = dept; document.getElementById('selectDept').value = dept; showScreen('deptDashboardScreen'); updateDeptDashboard(); }

function updateDeptDashboard() {
    if(!currentViewedDept) return;
    let dTags = tagsData.filter(t => t.dept === currentViewedDept && t.status !== 'closed');
    let dTasks = tasksData.filter(t => t.dept === currentViewedDept);
    document.getElementById('deptKpiOpenTags').innerText = dTags.length;
    document.getElementById('deptKpiTasks').innerText = dTasks.filter(t=>t.status==='pending').length;
    document.getElementById('deptKpiComp').innerText = dTasks.length===0?0:Math.round((dTasks.filter(t=>t.status==='done').length/dTasks.length)*100)+'%';
    
    let auds = historyData.filter(h => h.dept === currentViewedDept && !h.stepsOrder.includes('ManualKaizen'));
    let scArr = [0,0,0,0,0,0,0];
    if(auds.length > 0) {
        const last = auds[auds.length - 1];
        ['JH-0','JH-1','JH-2','JH-3','JH-4','JH-5','JH-6'].forEach((k,i) => { if(last.results[k] && !last.results[k].skipped) scArr[i] = Math.round((last.results[k].score/last.results[k].max)*100); });
    }
    if(radarChartInstance) radarChartInstance.destroy();
    if(document.getElementById('radarChart')) radarChartInstance = new Chart(document.getElementById('radarChart'), { type:'radar', data:{labels:['0','1','2','3','4','5','6'], datasets:[{label:'أداء', data:scArr, borderColor:'#b87333'}]} });
}

function startNewAuditFlow() { if(currentViewedDept) document.getElementById('selectDept').value = currentViewedDept; showScreen('setupScreen'); }
function initAuditSequential() {
    currentAudit = { id: uniqueNumericId().toString(), dept: document.getElementById('selectDept').value, machine: document.getElementById('setupMachine').value||'عام', auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG'), stepsOrder: ['JH-0','JH-1','JH-2','JH-3','JH-4','JH-5','JH-6'], currentStepIndex: 0, results: {} };
    renderCurrentAuditStep();
}

function renderCurrentAuditStep() {
    const k = currentAudit.stepsOrder[currentAudit.currentStepIndex]; const sd = AUDIT_DATA[k];
    document.getElementById('auditStepTitle').innerText = `${k}: ${sd.name}`;
    document.getElementById('auditItemsContainer').innerHTML = sd.items.map(item => `
        <div class="audit-item"><div class="item-header"><div class="item-num">${item.id}</div><div class="item-title">${item.title}</div>
        <button class="btn btn-sm btn-outline" onclick="explainItem('${item.title}')">استشارة</button></div>
        ${item.levels.map(lvl => `<div class="level-opt" onclick="selectLevel(${item.id}, ${lvl.score}, ${item.maxScore}, this)"><div class="level-num">${lvl.level}</div><div>${lvl.desc}</div></div>`).join('')}
        </div>`).join('');
    currentStepSelections = {}; currentStepImprovements = []; showScreen('auditScreen');
}

function selectLevel(id, score, max, el) { currentStepSelections['item_'+id] = {score, max}; el.parentElement.querySelectorAll('.level-opt').forEach(o=>o.classList.remove('selected')); el.classList.add('selected'); }

function finishCurrentStep() {
    const k = currentAudit.stepsOrder[currentAudit.currentStepIndex]; const sd = AUDIT_DATA[k];
    if(Object.keys(currentStepSelections).length < sd.items.length) { alert('يجب الإجابة على جميع البنود.'); return; }
    let s=0, m=0; currentStepImprovements=[];
    for(let key in currentStepSelections) { s+=currentStepSelections[key].score; m+=currentStepSelections[key].max; if(currentStepSelections[key].score < currentStepSelections[key].max) { let id = key.split('_')[1]; let itm = sd.items.find(i=>i.id==id); if(itm) currentStepImprovements.push(itm.title); } }
    currentAudit.results[k] = { skipped:false, score:s, max:m, improvements:currentStepImprovements };
    document.getElementById('summaryPct').innerText = Math.round((s/m)*100)+'%';
    document.getElementById('opportunitiesContainer').innerHTML = currentStepImprovements.map(i=>`<div>${i}</div>`).join('');
    document.getElementById('aiCapaBtn').style.display = currentStepImprovements.length>0?'block':'none';
    showScreen('stepSummaryScreen');
}
function skipCurrentStep() { currentAudit.results[currentAudit.stepsOrder[currentAudit.currentStepIndex]] = {skipped:true, score:0, max:0, improvements:[]}; goToNextStep(); }
function goToNextStep() { currentAudit.currentStepIndex++; if(currentAudit.currentStepIndex < 7) renderCurrentAuditStep(); else generateFinalReport(); }

function initSignaturePad() {
    sigCanvas = document.getElementById('signatureCanvas'); if(!sigCanvas) return;
    sigCtx = sigCanvas.getContext('2d'); sigCtx.lineWidth = 2; sigCtx.strokeStyle = '#1b2a47';
    sigCanvas.onmousedown = (e) => { isDrawing = true; sigCtx.beginPath(); sigCtx.moveTo(e.offsetX, e.offsetY); };
    sigCanvas.onmousemove = (e) => { if(isDrawing) { sigCtx.lineTo(e.offsetX, e.offsetY); sigCtx.stroke(); } };
    sigCanvas.onmouseup = () => isDrawing = false;
    sigCanvas.onmouseleave = () => isDrawing = false;
    sigCanvas.ontouchstart = (e) => { isDrawing=true; let r=sigCanvas.getBoundingClientRect(); sigCtx.beginPath(); sigCtx.moveTo(e.touches[0].clientX-r.left, e.touches[0].clientY-r.top); e.preventDefault(); };
    sigCanvas.ontouchmove = (e) => { if(isDrawing) { let r=sigCanvas.getBoundingClientRect(); sigCtx.lineTo(e.touches[0].clientX-r.left, e.touches[0].clientY-r.top); sigCtx.stroke(); } e.preventDefault(); };
    sigCanvas.ontouchend = () => isDrawing=false;
}
function clearSignature() { if(sigCtx) sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height); }

function generateFinalReport() {
    let s=0, m=0; currentAudit.stepsOrder.forEach(k=>{if(!currentAudit.results[k].skipped){s+=currentAudit.results[k].score; m+=currentAudit.results[k].max;}});
    let p=m===0?0:Math.round((s/m)*100); currentAudit.totalPct = p;
    document.getElementById('finalTotalPct').innerText = p+'%'; document.getElementById('finalDeptName').innerText = currentAudit.dept;
    showScreen('finalReportScreen');
    clearSignature();
}

function saveFinalAudit() {
    if(!hasRole('auditor', 'admin')) { alert('غير مصرح.'); return; }
    if(sigCanvas) currentAudit.signature = sigCanvas.toDataURL();
    
    let allImprovements = [];
    currentAudit.stepsOrder.forEach(step => {
        if(currentAudit.results[step] && currentAudit.results[step].improvements) {
            allImprovements.push(...currentAudit.results[step].improvements);
        }
    });
    
    if(allImprovements.length > 0) {
        tasksData.push({
            id: uniqueNumericId(),
            isFolder: true, dept: currentAudit.dept, date: currentAudit.date, machine: currentAudit.machine || 'عام',
            task: `تحسينات مراجعة (${currentAudit.date})`,
            subTasks: allImprovements.map(imp => ({ text: imp, status: 'pending' })),
            status: 'pending'
        });
    }

    historyData.push(currentAudit); 
    awardPoints(50, 'إتمام مراجعة');
    syncToServer(); 
    alert('تم حفظ المراجعة والتقارير بنجاح.');
    showScreen('historyScreen'); 
    renderHistory();
}

function renderHistory() {
    let real = historyData.filter(h=>!h.stepsOrder.includes('ManualKaizen')).reverse();
    document.getElementById('historyListContainer').innerHTML = real.map(a=>`<div class="card" onclick="viewDetailedReport('${a.id}')"><div class="card-title">${a.dept}</div><div>${a.date} | ${a.totalPct}%</div></div>`).join('');
}

function viewDetailedReport(id) {
    let a = historyData.find(h=>h.id===id); if(!a) return;
    document.getElementById('detDept').innerText = a.dept; 
    document.getElementById('detMachine').innerText = a.machine || 'عام'; 
    document.getElementById('detAuditor').innerText = a.auditor; 
    document.getElementById('detDate').innerText = a.date; 
    document.getElementById('detPct').innerText = a.totalPct+'%';
    
    let html = a.stepsOrder.map(k=> {
        let r=a.results[k]; 
        if(!r||r.skipped) return `<div style="padding:10px; border:1px solid var(--copper); margin-bottom:10px; border-radius:8px;"><b>${k}</b>: تخطي</div>`;
        let p = Math.round((r.score/r.max)*100);
        let imps = (r.improvements && r.improvements.length > 0) ? r.improvements.map(i=>`<li>- ${i}</li>`).join('') : 'لا توجد ملاحظات';
        return `<div style="padding:15px; border:1px solid var(--copper); margin-bottom:10px; border-radius:8px; background:rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;"><b>${k} : ${AUDIT_DATA[k] ? AUDIT_DATA[k].name : ''}</b><b style="color:var(--gold);">${p}%</b></div>
            <div style="font-size:12px; margin-bottom:10px;"><b>فرص التحسين:</b><ul style="list-style:none; padding:0; margin-top:5px;">${imps}</ul></div>
        </div>`;
    }).join('');
    document.getElementById('detStepsContainer').innerHTML = html;
    
    let sigDiv = document.getElementById('printSignature');
    if(sigDiv) {
        sigDiv.style.display = 'flex';
        let sigImg = a.signature ? `<img src="${a.signature}" style="height:60px; margin-top:10px;">` : '<br><br>.......................';
        sigDiv.innerHTML = `<div style="flex:1;">توقيع المراجع<br>${sigImg}</div><div style="flex:1;">مدير الصيانة<br><br>.......................</div><div style="flex:1;">مدير المصنع<br><br>.......................</div>`;
    }
    
    window.currentReportText = `تقرير TPM\nالقسم: ${a.dept}\nالماكينة: ${a.machine||'عام'}\nالنتيجة: ${a.totalPct}%\nالمراجع: ${a.auditor}\nالتاريخ: ${a.date}`;
    showScreen('detailedReportScreen');
}

function downloadProfessionalPDF() {
    window.scrollTo(0,0);
    const el = document.getElementById('printableReportArea');
    html2pdf().set({margin:0.2, filename:'تقرير.pdf', image:{type:'jpeg',quality:1}, html2canvas:{scale:2, useCORS:true}, jsPDF:{unit:'in', format:'a4', orientation:'portrait'}}).from(el).save();
}
function shareWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent(window.currentReportText)}`); }

function renderTasks() {
    let html = tasksData.map(t=>{
        if(t.isFolder) {
            return `<div class="audit-item"><div class="card-title">${t.task}</div>${t.subTasks.map((s,i)=>`<div><input type="checkbox" ${s.status==='done'?'checked':''} onclick="toggleFolderSubTask(${t.id}, ${i})"> ${s.text}</div>`).join('')}</div>`;
        }
        return `<div class="audit-item"><div>${t.task} (${t.status})</div><button class="btn btn-outline btn-sm" onclick="changeTaskStatus(${t.id}, 'done')">إتمام</button></div>`;
    }).join('');
    let c = document.getElementById('tasksListContainer'); if(c) c.innerHTML = html;
}
function toggleFolderSubTask(fId, sIdx) { let f = tasksData.find(x=>x.id==fId); if(f) { f.subTasks[sIdx].status = f.subTasks[sIdx].status==='done'?'pending':'done'; syncToServer(); renderTasks(); } }
function changeTaskStatus(id, st) { let t=tasksData.find(x=>x.id==id); if(t) {t.status=st; syncToServer(); renderTasks();} }
function addManualTaskDept() { let v=document.getElementById('newTaskInput').value; if(v){ tasksData.push({id:uniqueNumericId(), task:v, dept:document.getElementById('selectDept').value, status:'pending'}); syncToServer(); renderTasks(); document.getElementById('newTaskInput').value=''; } }

function handleKaizenImage(e, type) {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>{ kaizenImgs[type]=ev.target.result; document.getElementById(type==='before'?'kaizenBeforePreview':'kaizenAfterPreview').innerHTML=`تم الاستلام`; }; r.readAsDataURL(f);
}
function submitManualKaizen() {
    let t = document.getElementById('newKaizenTitle').value; let d = document.getElementById('newKaizenDept').value;
    if(!t || !kaizenImgs.before || !kaizenImgs.after) { alert('يجب إكمال الوصف والصور.'); return; }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const imgBefore = new Image(); const imgAfter = new Image();
    
    imgBefore.onload = function() {
        imgAfter.onload = function() {
            canvas.width = 600; canvas.height = 300;
            ctx.fillStyle = "#111d33"; ctx.fillRect(0,0,600,300);
            ctx.drawImage(imgBefore, 0, 0, 295, 300);
            ctx.drawImage(imgAfter, 305, 0, 295, 300);
            
            ctx.fillStyle = "#d4af37";
            ctx.beginPath(); ctx.moveTo(280, 150); ctx.lineTo(320, 130); ctx.lineTo(320, 170); ctx.fill();
            
            ctx.fillStyle = "rgba(198,40,40,0.8)"; ctx.fillRect(10, 10, 50, 25);
            ctx.fillStyle = "white"; ctx.font = "bold 14px Cairo"; ctx.fillText("قبل", 25, 27);
            
            ctx.fillStyle = "rgba(46,125,50,0.8)"; ctx.fillRect(540, 10, 50, 25);
            ctx.fillStyle = "white"; ctx.font = "bold 14px Cairo"; ctx.fillText("بعد", 555, 27);
            
            const mergedB64 = canvas.toDataURL('image/jpeg', 0.8);
            
            historyData.push({ 
                id: uniqueNumericId().toString(), dept: d, auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG'), 
                stepsOrder: ['ManualKaizen'], totalPct: 100, 
                results: { 'ManualKaizen': { images: { 'img_1': { title: t, data: mergedB64 } } } }
            });
            
            document.getElementById('newKaizenTitle').value = '';
            document.getElementById('kaizenBeforePreview').innerHTML = ''; document.getElementById('kaizenAfterPreview').innerHTML = '';
            kaizenImgs = { before: null, after: null };
            document.getElementById('kaizenUploadModal').style.display = 'none';
            
            awardPoints(40, 'مشاركة كايزن');
            syncToServer(); renderKaizenFeed(); 
            alert('تم تسجيل الكايزن بنجاح.');
        };
        imgAfter.src = kaizenImgs.after;
    };
    imgBefore.src = kaizenImgs.before;
}

function renderKaizenFeed() {
    let c = document.getElementById('kaizenFeedContainer'); if(!c) return;
    let html = historyData.filter(h=>h.stepsOrder.includes('ManualKaizen')).map(k=> {
        let lId = k.id; let liked = likesData[lId] && likesData[lId].includes(currentUser.name);
        let canEdit = hasRole('admin') || currentUser.name === k.auditor;
        let controls = canEdit ? `<button class="btn btn-sm btn-danger" onclick="deleteKaizen('${k.id}')">حذف</button>` : '';
        return `<div class="kaizen-post"><b>${k.auditor}</b><br><img src="${k.results.ManualKaizen.images.img_1.data}" class="kaizen-img"><br><b>${k.results.ManualKaizen.images.img_1.title}</b><br><div style="display:flex; gap:5px; margin-top:10px;"><button class="btn btn-sm ${liked?'btn-success':'btn-outline'}" onclick="toggleKaizenLike('${lId}')">إعجاب</button>${controls}</div></div>`;
    }).join('');
    c.innerHTML = html;
}

function toggleKaizenLike(id) { if(!likesData[id]) likesData[id]=[]; let i=likesData[id].indexOf(currentUser.name); if(i>-1) likesData[id].splice(i,1); else likesData[id].push(currentUser.name); syncToServer(); renderKaizenFeed(); }
function deleteKaizen(id) { if(confirm('تأكيد الحذف؟')) { historyData = historyData.filter(x=>x.id!==id); syncToServer(); renderKaizenFeed(); } }

function renderTags() {
    let c = document.getElementById('tagsListContainer'); if(!c) return;
    c.innerHTML = tagsData.map(t => {
        let canEdit = hasRole('admin', 'auditor') || currentUser.name === t.auditor;
        let controls = canEdit ? `
            <select class="form-control" style="width:120px; font-size:12px; padding:2px; margin-top:5px;" onchange="updateTagState(${t.id}, this.value)">
                <option value="open" ${t.status==='open'?'selected':''}>مفتوح</option>
                <option value="review" ${t.status==='review'?'selected':''}>تحت المراجعة</option>
                <option value="progress" ${t.status==='progress'?'selected':''}>قيد التنفيذ</option>
                <option value="closed" ${t.status==='closed'?'selected':''}>مغلق</option>
            </select>
            <button class="btn btn-sm btn-warning" onclick="editTag(${t.id})">تعديل</button>
            <button class="btn btn-sm btn-danger" onclick="deleteTag(${t.id})">حذف</button>
        ` : `<span style="font-size:12px; color:var(--gold);">${t.status}</span>`;
        
        return `<div class="audit-item" style="border-right: 5px solid ${t.color==='red'?'var(--danger)':'var(--primary-light)'}">
            <b>${t.desc}</b><br>
            <span style="font-size:11px; color:var(--text-muted);">${t.dept} | الماكينة: ${t.machine||'عام'} | ${t.date}</span><br>
            ${t.image ? `<img src="${t.image}" style="max-height:100px; margin-top:10px; border-radius:5px;"><br>` : ''}
            <div style="display:flex; gap:5px; align-items:center; margin-top:10px;">${controls}</div>
        </div>`;
    }).join('');
}
function updateTagState(id, st) { let t=tagsData.find(x=>x.id==id); if(t) {t.status=st; syncToServer(); renderTags(); if(st==='closed') awardPoints(20, 'إغلاق تاج');} }
function deleteTag(id) { if(confirm('تأكيد الحذف؟')) { tagsData = tagsData.filter(x=>x.id!=id); syncToServer(); renderTags(); } }
function editTag(id) { let t=tagsData.find(x=>x.id==id); if(!t) return; let v=prompt('تعديل الوصف:', t.desc); if(v) { t.desc=v; syncToServer(); renderTags(); } }

function handleTagImage(e) {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>{ currentTagImg=ev.target.result; document.getElementById('tagImagePreview').innerHTML=`تم الاستلام`; }; r.readAsDataURL(f);
}

function addNewTag() {
    let d=document.getElementById('newTagDesc').value, c=document.getElementById('newTagColor').value, dp=document.getElementById('newTagDept').value, m=document.getElementById('newTagMachine').value;
    if(!d) { alert('أدخل الوصف'); return; }
    
    document.getElementById('newTagDesc').value='';
    document.getElementById('newTagMachine').value='';
    
    tagsData.unshift({id:uniqueNumericId(), desc:d, color:c, dept:dp, machine:m, image:currentTagImg, status:'open', auditor:currentUser.name, date:new Date().toLocaleDateString('ar-EG')});
    currentTagImg = null;
    let preview = document.getElementById('tagImagePreview');
    if(preview) preview.innerHTML = '';
    
    awardPoints(10, 'إصدار تاج'); syncToServer(); renderTags(); 
    alert('تم تسجيل التاج بنجاح.');
    
    if(c==='red' && document.getElementById('newTagEngineer').value) window.open(`https://wa.me/${document.getElementById('newTagEngineer').value.replace(/\D/g,'')}?text=${encodeURIComponent(`تاج أحمر قسم ${dp}: ${d}`)}`);
}

async function predictMachineFailures() {
    const k = globalApiKeys.gemini; if(!k) return;
    const r = document.getElementById('aiPredictionResult'); r.style.display='block'; r.innerText='جاري التحليل...';
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "توقع اعطال بناء على: " + tagsData.map(t=>t.desc).join(',') }] }] })
        });
        const j = await res.json(); r.innerHTML = nl2brSafe(j.candidates[0].content.parts[0].text);
    } catch(e) { r.innerText='خطأ'; }
}

async function explainItem(t) {
    const k = globalApiKeys.gemini; if(!k) return;
    document.getElementById('aiModal').style.display='flex'; document.getElementById('aiModalText').innerText='جاري الشرح...';
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "اشرح بند الصيانة: " + t }] }] })
        });
        const j = await res.json(); document.getElementById('aiModalText').innerHTML = nl2brSafe(j.candidates[0].content.parts[0].text);
    } catch(e) { document.getElementById('aiModalText').innerText='خطأ'; }
}

async function autoGenerateCAPA() {
    if(currentStepImprovements.length===0) return;
    currentStepImprovements.forEach(i => tasksData.push({id:uniqueNumericId(), task:i, dept:currentAudit.dept, status:'pending'}));
    syncToServer(); alert('تم التوليد بنجاح');
}

function toggleDarkMode() { document.body.style.filter = document.body.style.filter === 'invert(1)' ? 'none' : 'invert(1)'; }
function updateDeptDropdown() { let opts = departments.map(d=>`<option value="${d}">${d}</option>`).join(''); document.querySelectorAll('select').forEach(s => {if(s.id.includes('Dept')) s.innerHTML=opts;}); }
function updateDeptListUI() { }
function addOrUpdateDept() { let v = document.getElementById('newDeptInput').value; if(v){ departments.push(v); syncToServer(); updateDeptDropdown(); } }
function addEngineer() { let n=document.getElementById('newEngName').value, p=document.getElementById('newEngPhone').value; if(n&&p) { maintenanceEngineers.push({name:n, phone:p}); syncToServer(); document.getElementById('newTagEngineer').innerHTML+=`<option value="${p}">${n}</option>`; } }
function saveApiKeys() { globalApiKeys.gemini = document.getElementById('geminiKeyInput').value; syncToServer(); }
function logAction(act) { logsData.push({user:currentUser.name, action:act, time:new Date().toLocaleTimeString('ar-EG')}); syncToServer(); }

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