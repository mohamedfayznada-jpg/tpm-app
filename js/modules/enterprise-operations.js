import { db, auth } from '../core/firebase-init.js';
import { UI } from '../utils/ui.js';
import { Services } from '../core/services.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => auth.currentUser?.uid || '';
const role = () => window.normalizeTPMRole?.(window.currentUser?.role) || window.currentUser?.role || 'viewer';
const canEdit = () => ['admin','engineer','technician'].includes(role());
const read = async path => (await db.ref(`tpm_system/${path}`).once('value')).val() || {};

const badge = (text, tone='neutral') => `<span class="eo-badge ${tone}">${esc(text)}</span>`;
const empty = (icon, title, text) => `<div class="eo-empty"><i class="bx ${icon}"></i><h4>${esc(title)}</h4><p>${esc(text)}</p></div>`;

async function save(path, data) {
    if (!canEdit()) return UI.showToast('🔒 هذه العملية تحتاج صلاحية تشغيلية.');
    await Services.syncRecord(path, data);
    UI.showToast('تم الحفظ بنجاح ✅');
}

function base(title, subtitle, icon, body) {
    return `<div class="eo-shell"><div class="eo-head"><div><span class="eo-eyebrow"><i class="bx ${icon}"></i> FACTORY OS · Enterprise</span><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><div class="eo-head-actions">${canEdit()?badge('صلاحية تشغيل','success'):badge('قراءة فقط','neutral')}</div></div>${body}</div>`;
}

async function renderPM() {
    const el = document.getElementById('pmScreen'); if (!el) return;
    const assets = Object.values(await read('pm_assets')).filter(Boolean);
    const orders = Object.values(await read('pm_work_orders')).filter(Boolean);
    const now = Date.now();
    const due = orders.filter(x => x.status !== 'closed' && x.dueAt && new Date(x.dueAt).getTime() < now).length;
    const done = orders.filter(x => x.status === 'closed').length;
    const compliance = orders.length ? Math.round(done / orders.length * 100) : 0;
    const body = `<div class="eo-kpis"><div><b>${assets.length}</b><span>أصول مسجلة</span></div><div><b>${orders.filter(x=>x.status==='open').length}</b><span>أوامر مفتوحة</span></div><div><b>${due}</b><span>متأخرة</span></div><div><b>${compliance}%</b><span>PM Compliance</span></div></div>
      <div class="eo-grid-2"><section class="eo-panel"><div class="eo-panel-head"><div><b>سجل المعدات</b><small>Asset Master</small></div><button class="btn btn-primary btn-sm" data-eo="pm-add-asset"><i class="bx bx-plus"></i> معدة</button></div><div class="eo-table-wrap">${assets.length?`<table class="eo-table"><thead><tr><th>المعدة</th><th>القسم</th><th>التردد</th><th>الحالة</th></tr></thead><tbody>${assets.slice(0,30).map(a=>`<tr><td><b>${esc(a.name)}</b><small>${esc(a.assetId)}</small></td><td>${esc(a.dept||'—')}</td><td>${esc(a.frequency||'شهري')}</td><td>${badge(a.status||'active','success')}</td></tr>`).join('')}</tbody></table>`:empty('bx-cog','لا توجد معدات بعد','ابدأ بإضافة أول معدة لبناء سجل PM حقيقي.')}</div></section>
      <section class="eo-panel"><div class="eo-panel-head"><div><b>أوامر الصيانة</b><small>PM Work Orders</small></div><button class="btn btn-success btn-sm" data-eo="pm-add-order"><i class="bx bx-plus"></i> أمر PM</button></div><div class="eo-list">${orders.length?orders.slice(0,20).map(o=>`<article class="eo-list-item"><div><b>${esc(o.title||o.assetName||'أمر صيانة')}</b><small>${esc(o.dept||'')} · ${esc(o.dueAt||'بدون موعد')}</small></div><div>${badge(o.status==='closed'?'مغلق':o.status==='in_progress'?'جاري':'مفتوح',o.status==='closed'?'success':o.status==='in_progress'?'warning':'danger')}</div></article>`).join(''):empty('bx-calendar-x','لا توجد أوامر PM','أنشئ أول أمر صيانة مجدول لبدء القياس.')}</div></section></div>`;
    el.innerHTML = base('الصيانة المخططة PM','من سجل المعدة إلى الخطة والتنفيذ والالتزام — بدون فقدان التاريخ.','bx-cog',body);
}

async function renderET() {
    const el = document.getElementById('etScreen'); if (!el) return;
    const users = Object.values(await read('users')).filter(u=>u && u.status!=='pending');
    const records = Object.values(await read('training_records')).filter(Boolean);
    const skills = [...new Set(records.map(r=>r.skill).filter(Boolean))];
    const qualified = users.length && skills.length ? Math.round(users.filter(u=>skills.every(s=>records.some(r=>r.uid===u.uid&&r.skill===s&&r.status==='qualified'))).length/users.length*100) : 0;
    const body = `<div class="eo-kpis"><div><b>${users.length}</b><span>أفراد</span></div><div><b>${skills.length}</b><span>مهارات</span></div><div><b>${records.filter(r=>r.status==='qualified').length}</b><span>Qualified</span></div><div><b>${qualified}%</b><span>Matrix Coverage</span></div></div>
      <div class="eo-grid-2"><section class="eo-panel"><div class="eo-panel-head"><div><b>مصفوفة المهارات</b><small>Operator × Skill</small></div><button class="btn btn-primary btn-sm" data-eo="et-add-record"><i class="bx bx-plus"></i> تأهيل</button></div><div class="eo-table-wrap">${users.length?`<table class="eo-table eo-matrix"><thead><tr><th>المستخدم</th>${skills.slice(0,6).map(s=>`<th>${esc(s)}</th>`).join('')}</tr></thead><tbody>${users.slice(0,25).map(u=>`<tr><td><b>${esc(u.name||u.username)}</b></td>${skills.slice(0,6).map(s=>{const r=records.find(x=>x.uid===u.uid&&x.skill===s&&x.status==='qualified');return `<td>${r?badge('مؤهل','success'):badge('فجوة','danger')}</td>`}).join('')}</tr>`).join('')}</tbody></table>`:empty('bx-group','لا يوجد أفراد','ستظهر مصفوفة المهارات بعد إنشاء الحسابات.')}</div></section>
      <section class="eo-panel"><div class="eo-panel-head"><div><b>مسار التأهيل</b><small>Training & Qualification</small></div></div><div class="eo-list">${records.length?records.slice(0,20).map(r=>`<article class="eo-list-item"><div><b>${esc(r.skill)}</b><small>${esc(r.traineeName||r.uid)} · ${esc(r.date||'')}</small></div>${badge(r.status==='qualified'?'مؤهل':r.status==='in_training'?'قيد التدريب':'مطلوب',r.status==='qualified'?'success':r.status==='in_training'?'warning':'danger')}</article>`).join(''):empty('bx-book-open','لا توجد سجلات تدريب','أضف أول عملية تأهيل لبناء مصفوفة مهارات فعلية.')}</div></section></div>`;
    el.innerHTML = base('التعليم والتدريب E&T','مصفوفة مهارات حقيقية تربط الشخص بالمهارة وحالة التأهيل وإعادة التأهيل.','bx-graduation',body);
}

async function renderHSE() {
    const el = document.getElementById('hseScreen'); if (!el) return;
    const obs = Object.values(await read('hse_observations')).filter(Boolean);
    const incidents = Object.values(await read('hse_incidents')).filter(Boolean);
    const actions = Object.values(await read('hse_actions')).filter(Boolean);
    const open = actions.filter(a=>a.status!=='closed').length;
    const critical = incidents.filter(i=>i.severity==='critical').length;
    const body = `<div class="eo-kpis"><div><b>${obs.length}</b><span>Safety Observations</span></div><div><b>${incidents.length}</b><span>حوادث / Near Miss</span></div><div><b>${critical}</b><span>حرجة</span></div><div><b>${open}</b><span>إجراءات مفتوحة</span></div></div>
      <div class="eo-action-grid"><button class="eo-action" data-eo="hse-observation"><i class="bx bx-show-alt"></i><b>Safety Observation</b><span>سجل حالة آمنة أو غير آمنة</span></button><button class="eo-action danger" data-eo="hse-incident"><i class="bx bx-first-aid"></i><b>Incident / Near Miss</b><span>توثيق الحدث وتصنيفه</span></button><button class="eo-action" data-eo="hse-action"><i class="bx bx-task"></i><b>Corrective Action</b><span>إجراء مسؤول وموعد تحقق</span></button></div>
      <div class="eo-grid-2"><section class="eo-panel"><div class="eo-panel-head"><div><b>آخر الملاحظات</b><small>Field Observations</small></div></div><div class="eo-list">${obs.length?obs.slice(0,15).map(o=>`<article class="eo-list-item"><div><b>${esc(o.title||'ملاحظة سلامة')}</b><small>${esc(o.area||'')} · ${esc(o.createdAt||'')}</small></div>${badge(o.type==='unsafe'?'غير آمنة':'آمنة',o.type==='unsafe'?'danger':'success')}</article>`).join(''):empty('bx-shield-quarter','لا توجد ملاحظات','ابدأ بجولة سلامة وسجل أول Observation.')}</div></section>
      <section class="eo-panel"><div class="eo-panel-head"><div><b>الأحداث والإجراءات</b><small>Incident & Action Register</small></div></div><div class="eo-list">${[...incidents,...actions].slice(0,20).map(x=>`<article class="eo-list-item"><div><b>${esc(x.title||x.description||'إجراء')}</b><small>${esc(x.area||x.ownerName||'')} · ${esc(x.createdAt||x.dueDate||'')}</small></div>${badge(x.status==='closed'?'مغلق':x.severity==='critical'?'حرج':'مفتوح',x.status==='closed'?'success':x.severity==='critical'?'danger':'warning')}</article>`).join('')||empty('bx-clipboard','لا توجد سجلات','سجل حادثة أو إجراء تصحيحي لبدء المتابعة.')}</div></section></div>`;
    el.innerHTML = base('الصحة والسلامة والبيئة HSE','من الملاحظة الميدانية إلى الحادث والإجراء التصحيحي والتحقق.','bx-shield-quarter',body);
}

async function promptSave(kind) {
    if (!canEdit()) return UI.showToast('🔒 هذه العملية تحتاج صلاحية تشغيلية.');
    const data = { createdAt:new Date().toISOString(), createdBy:uid(), createdByName:window.currentUser?.name||'مستخدم' };
    if (kind==='pm-add-asset') {
        const name=prompt('اسم المعدة؟'); if(!name)return; data.name=name; data.assetId='AST-'+Date.now().toString().slice(-7); data.dept=prompt('القسم؟')||''; data.frequency=prompt('التردد؟','شهري')||'شهري'; data.status='active'; await save('pm_assets/'+data.assetId,data); return renderPM();
    }
    if (kind==='pm-add-order') {
        const title=prompt('عنوان أمر الصيانة؟'); if(!title)return; data.title=title; data.assetName=prompt('المعدة؟')||''; data.dueAt=prompt('موعد الاستحقاق YYYY-MM-DD؟')||''; data.status='open'; data.id='PM-'+Date.now(); await save('pm_work_orders/'+data.id,data); return renderPM();
    }
    if (kind==='et-add-record') {
        const skill=prompt('اسم المهارة؟'); if(!skill)return; data.skill=skill; data.uid=prompt('UID المستخدم؟')||''; data.traineeName=prompt('اسم المتدرب؟')||''; data.status='qualified'; data.date=new Date().toISOString().slice(0,10); data.id='TR-'+Date.now(); await save('training_records/'+data.id,data); return renderET();
    }
    if (kind==='hse-observation') {
        const title=prompt('وصف ملاحظة السلامة؟'); if(!title)return; data.title=title; data.area=prompt('المنطقة؟')||''; data.type=confirm('هل الحالة غير آمنة؟')?'unsafe':'safe'; data.id='OBS-'+Date.now(); await save('hse_observations/'+data.id,data); return renderHSE();
    }
    if (kind==='hse-incident') {
        const title=prompt('وصف الحادث / Near Miss؟'); if(!title)return; data.title=title; data.area=prompt('المنطقة؟')||''; data.severity=prompt('الشدة: low / medium / critical','medium')||'medium'; data.status='open'; data.id='INC-'+Date.now(); await save('hse_incidents/'+data.id,data); return renderHSE();
    }
    if (kind==='hse-action') {
        const title=prompt('الإجراء التصحيحي؟'); if(!title)return; data.title=title; data.ownerName=prompt('المسؤول؟')||''; data.dueDate=prompt('تاريخ الاستحقاق YYYY-MM-DD؟')||''; data.status='open'; data.id='HSE-'+Date.now(); await save('hse_actions/'+data.id,data); return renderHSE();
    }
}

export function mountEnterpriseOperations() {
    const mount = () => { renderPM(); renderET(); renderHSE(); };
    mount();
    document.addEventListener('click', e => { const target=e.target.closest('[data-eo]'); if(target) promptSave(target.dataset.eo); });
    window.renderEnterpriseOperations = mount;
}
