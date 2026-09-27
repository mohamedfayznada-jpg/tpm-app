// 📊 JH KPI / KAI Engine — corrected and data-traceable
// ==========================================================
const TPM_MASTER_KPIs = [
    { id:"oee", name:"الكفاءة الكلية للمعدات (OEE)", cat:"P", type:"external", unit:"%", target:85, dir:"up", source:"production" },
    { id:"mtbf", name:"متوسط الوقت بين الأعطال (MTBF)", cat:"P", type:"manual", unit:"ساعة", target:120, dir:"up" },
    { id:"breakdowns", name:"تاجات الصيانة الحمراء المفتوحة", cat:"P", type:"auto", unit:"تاج", target:0, dir:"down" },
    { id:"defect_rate", name:"نسبة العيوب / الهالك", cat:"Q", type:"manual", unit:"%", target:1, dir:"down" },
    { id:"maintenance_cost", name:"تكلفة الصيانة", cat:"C", type:"manual", unit:"جنيه", target:5000, dir:"down" },
    { id:"plan_achievement", name:"تحقيق الخطة", cat:"D", type:"manual", unit:"%", target:98, dir:"up" },
    { id:"safety_tags", name:"إغلاق تاجات الأمان", cat:"S", type:"manual", unit:"%", target:100, dir:"up" },
    { id:"jh_audit_score", name:"نتيجة مراجعة الصيانة الذاتية", cat:"M", type:"auto", unit:"%", target:90, dir:"up" },
    { id:"kaizen_implemented", name:"كايزن المطبقة", cat:"M", type:"auto", unit:"فكرة", target:10, dir:"up" }
];

window.currentPQCDSMFilter = window.currentPQCDSMFilter || 'All';
window.currentKPIDept = window.currentKPIDept || '';

function getKPIDept() {
    if (window.currentKPIDept) return window.currentKPIDept;
    try { if (typeof currentJHDept !== 'undefined' && currentJHDept) return currentJHDept; } catch (_) {}
    try { if (Array.isArray(departments) && departments[0]) return departments[0]; } catch (_) {}
    return '';
}
function getAuditList(dept) {
    const source = Array.isArray(window.historyData) ? window.historyData : (typeof historyData !== 'undefined' && Array.isArray(historyData) ? historyData : []);
    return source.filter(h => h && h.dept === dept && Array.isArray(h.stepsOrder) && !h.stepsOrder.includes('ManualKaizen'))
        .sort((a,b) => (Number(a.timestamp||0)-Number(b.timestamp||0)) || String(a.date||'').localeCompare(String(b.date||'')));
}
function getTags() {
    return Array.isArray(window.tagsData) ? window.tagsData : (typeof tagsData !== 'undefined' && Array.isArray(tagsData) ? tagsData : []);
}
function escapeKPI(value) {
    return window.escapeTPM ? window.escapeTPM(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

window.openJHKPIsScreen = function() {
    const dept = getKPIDept();
    if (dept) window.currentKPIDept = dept;
    showScreen('jhKPIsScreen');
    window.renderKPIDeptTabs();
    window.loadKPIsForDepartment(window.currentKPIDept);
    window.calculateGlobalKPIs();
    window.filterKPITable('All');
    setTimeout(() => window.initEnterpriseCharts(), 150);
};

window.renderKPIDeptTabs = function() {
    let opts = '';
    try { opts = (Array.isArray(departments) ? departments : []).map(d => `<option value="${escapeKPI(d)}">${escapeKPI(d)}</option>`).join(''); } catch (_) {}
    const filter = document.getElementById('kpiDeptFilter');
    if (filter) {
        const current = getKPIDept();
        filter.innerHTML = '<option value="factory">المصنع بالكامل</option>' + opts;
        if (current && [...filter.options].some(o => o.value === current)) filter.value = current;
    }
    const month = document.getElementById('kpiMonthFilter');
    if (month && month.options.length === 0) {
        const cm = new Date().toISOString().slice(0,7);
        month.innerHTML = `<option value="${cm}">الشهر الحالي</option>`;
    }
};

window.reloadEnterpriseKPIs = function() {
    const filter = document.getElementById('kpiDeptFilter');
    const selected = filter?.value;
    if (selected && selected !== 'factory') window.currentKPIDept = selected;
    else if (!window.currentKPIDept) window.currentKPIDept = getKPIDept();
    window.loadKPIsForDepartment(window.currentKPIDept);
};

window.loadKPIsForDepartment = async function(dept) {
    if (!dept) {
        window.kpiDataStore = {};
        window.renderEnterpriseKPITable();
        return;
    }
    window.currentKPIDept = dept;
    const currentMonth = document.getElementById('kpiMonthFilter')?.value || new Date().toISOString().slice(0,7);
    try {
        const snap = await db.ref(`tpm_system/jh_kpis/${currentMonth}/${dept}`).once('value');
        window.kpiDataStore = snap.val() || {};
    } catch (error) {
        console.error('[JH KPI] load failed', error);
        window.kpiDataStore = {};
        window.showToast?.('⚠️ تعذر تحميل مؤشرات JH');
    }

    const audits = getAuditList(dept);
    const tags = getTags().filter(t => t && t.dept === dept);
    const store = window.kpiDataStore || {};
    const lastAudit = audits[audits.length - 1];
    const auditScore = lastAudit ? Number(lastAudit.totalPct) : null;
    const openRed = tags.filter(t => t.color === 'red' && !['closed','done','verified'].includes(String(t.status||'').toLowerCase())).length;
    const closedRed = tags.filter(t => t.color === 'red' && ['closed','done','verified'].includes(String(t.status||'').toLowerCase())).length;
    const kaizens = (Array.isArray(window.historyData) ? window.historyData : []).filter(h => h && h.dept === dept && Array.isArray(h.stepsOrder) && h.stepsOrder.includes('ManualKaizen')).length;
    const oee = Number.isFinite(Number(store.oee)) ? Number(store.oee) : null;

    const setText = (id, value) => { const el=document.getElementById(id); if(el) el.textContent=value; };
    setText('kpiDashOEE', oee === null ? '—' : Math.round(oee) + '%');
    setText('kpiDashAudit', auditScore === null ? '—' : Math.round(auditScore) + '%');
    setText('kpiDashTags', `${closedRed}/${openRed}`);
    setText('kpiDashKaizen', String(kaizens));
    window.renderEnterpriseKPITable();
};

window.calculateGlobalKPIs = function() {};

window.filterKPITable = function(category) {
    window.currentPQCDSMFilter = category;
    document.querySelectorAll('#jhKPIsScreen button[onclick^="filterKPITable"]').forEach(btn => {
        const active = btn.getAttribute('onclick')?.includes(`'${category}'`) || (category === 'All' && btn.textContent.includes('الكل'));
        btn.classList.toggle('btn-primary', active);
        btn.classList.toggle('btn-outline', !active);
    });
    window.renderEnterpriseKPITable();
};

function resolveKPIValue(kpi, store, dept) {
    if (kpi.type === 'manual') return Number.isFinite(Number(store[kpi.id])) ? Number(store[kpi.id]) : null;
    if (kpi.type === 'external') return Number.isFinite(Number(store[kpi.id])) ? Number(store[kpi.id]) : null;
    const tags = getTags().filter(t => t && t.dept === dept);
    if (kpi.id === 'breakdowns') return tags.filter(t => t.color === 'red' && !['closed','done','verified'].includes(String(t.status||'').toLowerCase())).length;
    if (kpi.id === 'jh_audit_score') {
        const audits = getAuditList(dept);
        return audits.length ? Number(audits[audits.length-1].totalPct) : null;
    }
    if (kpi.id === 'kaizen_implemented') {
        const source = Array.isArray(window.historyData) ? window.historyData : [];
        return source.filter(h => h && h.dept === dept && Array.isArray(h.stepsOrder) && h.stepsOrder.includes('ManualKaizen')).length;
    }
    return null;
}

window.renderEnterpriseKPITable = function() {
    const tbody = document.getElementById('enterpriseKPITableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const dept = getKPIDept();
    const store = window.kpiDataStore || {};
    const list = TPM_MASTER_KPIs.filter(k => window.currentPQCDSMFilter === 'All' || k.cat === window.currentPQCDSMFilter);
    list.forEach(kpi => {
        const val = resolveKPIValue(kpi, store, dept);
        const unavailable = val === null;
        const good = !unavailable && (kpi.dir === 'up' ? val >= kpi.target : val <= kpi.target);
        const statusIcon = unavailable ? '<i class="bx bx-minus-circle"></i>' : (good ? '<i class="bx bx-check-circle"></i>' : '<i class="bx bx-error-circle"></i>');
        const statusClass = unavailable ? 'muted-text' : (good ? 'success-text' : 'danger-text');
        const sourceBadge = kpi.type === 'manual'
            ? '<span title="إدخال معتمد"><i class="bx bx-edit"></i></span>'
            : kpi.type === 'external'
                ? '<span title="مصدر إنتاجي خارجي"><i class="bx bx-link-external"></i></span>'
                : '<span title="محسوب من سجلات JH"><i class="bx bx-bot"></i></span>';
        tbody.insertAdjacentHTML('beforeend', `<tr style="border-bottom:1px solid var(--border-glass);">
            <td style="text-align:center;padding:12px;"><span class="kpi-category-badge cat-${kpi.cat}">${kpi.cat}</span></td>
            <td style="color:var(--text-main);font-weight:bold;">${escapeKPI(kpi.name)} ${sourceBadge}</td>
            <td style="text-align:center;color:var(--gold);">${escapeKPI(kpi.target)}</td>
            <td style="text-align:center;font-weight:900;color:${unavailable ? 'var(--text-muted)' : '#fff'};">${unavailable ? '—' : escapeKPI(val)}</td>
            <td style="text-align:center;" class="${statusClass}">${statusIcon}</td>
        </tr>`);
    });
};

window.openKPIEntryModal = function() {
    const dept = getKPIDept();
    if (!dept) return window.showToast?.('⚠️ اختر قسمًا أولًا لإدخال مؤشرات JH');
    const nameEl = document.getElementById('manualKPIDeptName');
    if (nameEl) nameEl.innerHTML = `<i class='bx bx-edit'></i> إدخال بيانات: ${escapeKPI(dept)}`;
    const store = window.kpiDataStore || {};
    const fields = TPM_MASTER_KPIs.filter(k => k.type === 'manual').map(kpi => `
        <div class="form-group"><label style="color:var(--text-muted);font-size:12px;">${escapeKPI(kpi.name)} (${escapeKPI(kpi.unit)})</label>
        <input type="number" id="manual_kpi_${kpi.id}" class="form-control" value="${Number.isFinite(Number(store[kpi.id])) ? Number(store[kpi.id]) : 0}"></div>`).join('');
    const container = document.getElementById('manualKPIFields');
    if (container) container.innerHTML = fields;
    const modal = document.getElementById('manualKPIModal');
    if (modal) modal.style.display = 'flex';
};

window.saveManualKPIs = async function() {
    const dept = getKPIDept();
    if (!dept) return window.showToast?.('⚠️ اختر قسمًا أولًا');
    const month = document.getElementById('kpiMonthFilter')?.value || new Date().toISOString().slice(0,7);
    const updates = {};
    TPM_MASTER_KPIs.filter(k => k.type === 'manual').forEach(kpi => {
        const el = document.getElementById(`manual_kpi_${kpi.id}`);
        if (el) updates[kpi.id] = parseFloat(el.value);
    });
    try {
        await db.ref(`tpm_system/jh_kpis/${month}/${dept}`).update(updates);
        document.getElementById('manualKPIModal')?.style && (document.getElementById('manualKPIModal').style.display='none');
        window.showToast?.('تم حفظ المؤشرات بنجاح ✅');
        await window.loadKPIsForDepartment(dept);
    } catch (error) {
        console.error('[JH KPI] save failed', error);
        window.showToast?.('⚠️ تعذر حفظ المؤشرات. حاول مرة أخرى.');
    }
};

window.initEnterpriseCharts = function() {
    if (typeof Chart === 'undefined') return;
    const dept = getKPIDept();
    const audits = getAuditList(dept).slice(-8);
    const store = window.kpiDataStore || {};

    const radar = document.getElementById('kpiMaturityRadar');
    if (radar) {
        window.kpiRadarChartInst?.destroy();
        const categoryMap = { P:[], Q:[], C:[], D:[], S:[], M:[] };
        TPM_MASTER_KPIs.forEach(kpi => {
            const val = resolveKPIValue(kpi, store, dept);
            if (val === null) return;
            const ratio = kpi.dir === 'up' ? (val / kpi.target) * 100 : (kpi.target === 0 ? (val === 0 ? 100 : 0) : (kpi.target / val) * 100);
            if (Number.isFinite(ratio)) categoryMap[kpi.cat].push(Math.max(0, Math.min(100, ratio)));
        });
        const data = Object.keys(categoryMap).map(cat => categoryMap[cat].length ? Math.round(categoryMap[cat].reduce((a,b)=>a+b,0)/categoryMap[cat].length) : null);
        window.kpiRadarChartInst = new Chart(radar, {
            type:'radar',
            data:{labels:['إنتاجية','جودة','تكلفة','تسليم','سلامة','معنويات'],datasets:[{label:'تغطية المؤشرات الحالية',data,backgroundColor:'rgba(37,131,232,.12)',borderColor:'#2583e8',pointBackgroundColor:'#2583e8',borderWidth:2}]},
            options:{responsive:true,maintainAspectRatio:false,scales:{r:{min:0,max:100,ticks:{display:false},pointLabels:{font:{family:'Cairo'},color:'#94a3b8'}}},plugins:{legend:{display:false},tooltip:{rtl:true}}}
        });
    }

    const trend = document.getElementById('kpiTrendLine');
    if (trend) {
        window.kpiTrendChartInst?.destroy();
        const labels = audits.map(a => a.date || (a.timestamp ? new Date(a.timestamp).toLocaleDateString('ar-EG') : ''));
        const values = audits.map(a => Number(a.totalPct) || 0);
        window.kpiTrendChartInst = new Chart(trend, {
            type:'line',
            data:{labels,datasets:[{label:'نتيجة JH %',data:values,borderColor:'#1769aa',backgroundColor:'rgba(23,105,170,.10)',borderWidth:3,fill:true,tension:.28}]},
            options:{responsive:true,maintainAspectRatio:false,scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'}},x:{grid:{display:false}}},plugins:{legend:{display:false},tooltip:{rtl:true}}}
        });
    }
};

// ==========================================
