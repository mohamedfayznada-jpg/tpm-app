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
