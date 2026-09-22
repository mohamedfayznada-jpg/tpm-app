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
