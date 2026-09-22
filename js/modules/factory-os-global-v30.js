import { UI } from '../utils/ui.js';
import { db, auth } from '../core/firebase-init.js';

const modules=[
  {code:'PM',title:'إدارة المهام',en:'Planned Maintenance',icon:'bx-task',screen:'tasksScreen'},
  {code:'JH',title:'فرق TPM',en:'Jishu Hozen',icon:'bx-group',screen:'tpmTeamsScreen'},
  {code:'AUD',title:'تقارير المراجعات',en:'Audit & Performance',icon:'bx-bar-chart-alt-2',screen:'historyScreen'},
  {code:'KK',title:'مجتمع كايزن',en:'Focused Improvement',icon:'bx-bulb',screen:'kaizenScreen'},
  {code:'AI',title:'عقل المصنع',en:'Factory Intelligence',icon:'bx-brain',screen:'knowledgeScreen'},
  {code:'SET',title:'حسابي والإعدادات',en:'Profile & Settings',icon:'bx-user-circle',screen:'settingsScreen'}
];

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=v=>Array.isArray(v)?v:Object.values(v||{});
const auditRows=()=>arr(window.historyData).filter(x=>x && !(Array.isArray(x.stepsOrder)&&x.stepsOrder.includes('ManualKaizen')));
const tagRows=()=>arr(window.tagsData);
const taskRows=()=>arr(window.tasksData);

function taskSummary(){
  const rows=taskRows();
  let pending=0,progress=0,done=0;
  rows.forEach(t=>{
    if(t?.isFolder){
      const subs=Array.isArray(t.subTasks)?t.subTasks:[];
      const d=subs.filter(s=>s?.status==='done').length;
      const p=subs.filter(s=>s?.status==='progress').length;
      if(subs.length&&d===subs.length) done++;
      else if(p>0||d>0) progress++;
      else pending++;
    }else if(t?.status==='done') done++;
    else if(t?.status==='progress') progress++;
    else pending++;
  });
  return {total:rows.length,pending,progress,done};
}

function tagSummary(){
  const rows=tagRows();
  const open=rows.filter(t=>!['closed','verified','done'].includes(t?.status));
  const closed=rows.filter(t=>['closed','verified','done'].includes(t?.status));
  const critical=open.filter(t=>t?.priority==='critical'||(t?.color==='red'&&t?.priority!=='low')).length;
  const overdue=open.filter(t=>typeof window.getTagSLA==='function'&&window.getTagSLA(t).overdue).length;
  return {total:rows.length,open:open.length,closed:closed.length,critical,overdue};
}

function reviewSummary(){
  const rows=auditRows().filter(x=>Number.isFinite(Number(x.totalPct)));
  const scores=rows.map(x=>Number(x.totalPct));
  const average=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  const last=[...rows].sort((a,b)=>Number(b.id||0)-Number(a.id||0));
  const recent=last.slice(0,7);
  const departments=[...new Set(rows.map(x=>x.dept).filter(Boolean))];
  return {rows,scores,average,recent,departments};
}

function homeMarkup(){
return `<div class="factory-dashboard">
  <section class="factory-hero">
    <div class="hero-copy">
      <span class="hero-kicker">ELARABY · REF-A · FACTORY OS</span>
      <h1>لوحة التشغيل الفعلية للمصنع</h1>
      <p>المراجعات · الأعطال · المهام · التحسين — من بيانات النظام الحالية</p>
    </div>
    <div class="hero-brand"><strong>REF-A</strong><span>TPM OPERATIONS CONTROL</span></div>
  </section>

  <section class="kpi-grid">
    <article class="kpi-card kpi-blue"><div class="kpi-icon"><i class="bx bx-bar-chart-alt-2"></i></div><div><span>متوسط نتائج المراجعات</span><strong id="xAuditAverage">—</strong><small>آخر البيانات المسجلة</small></div></article>
    <article class="kpi-card kpi-green"><div class="kpi-icon"><i class="bx bx-check-shield"></i></div><div><span>المراجعات المنفذة</span><strong id="xAuditCount">0</strong><small>سجل مراجعات فعلي</small></div></article>
    <article class="kpi-card kpi-amber"><div class="kpi-icon"><i class="bx bx-error-circle"></i></div><div><span>الأعطال المفتوحة</span><strong id="xOpenTags">0</strong><small id="xCriticalTags">0 حرجة</small></div></article>
    <article class="kpi-card kpi-red"><div class="kpi-icon"><i class="bx bx-time-five"></i></div><div><span>تاجات متجاوزة للمهلة</span><strong id="xOverdueTags">0</strong><small>وفق SLA الحالي</small></div></article>
  </section>

  <section class="dashboard-grid-main">
    <article class="panel recent-panel">
      <div class="panel-head"><div><h2>آخر نتائج المراجعات <i class="bx bx-clipboard"></i></h2></div><button class="soft-action" onclick="showScreen('historyScreen')">عرض كل النتائج <i class="bx bx-left-arrow-alt"></i></button></div>
      <div class="review-list" id="xRecentReviews"></div>
    </article>

    <article class="panel performance-panel">
      <div class="panel-head"><div><h2>اتجاه نتائج المراجعة <i class="bx bx-line-chart"></i></h2></div><span class="data-badge" id="xChartMeta">آخر 7 مراجعات</span></div>
      <div class="performance-chart"><canvas id="xReviewChart"></canvas><div class="chart-empty" id="xReviewEmpty">لا توجد نتائج مراجعات مسجلة بعد.</div></div>
      <div class="chart-legend"><span><i class="legend-dot blue"></i> نسبة المراجعة %</span><span><i class="legend-dot green"></i> متوسط النتائج</span></div>
    </article>
  </section>

  <section class="dashboard-bottom">
    <article class="panel quick-panel"><div class="panel-head"><h2>الوصول السريع <i class="bx bx-grid-alt"></i></h2></div><div class="quick-grid">${modules.slice(0,4).map(m=>`<button class="quick-item" onclick="showScreen('${esc(m.screen)}');toggleSidebar()"><i class="bx ${m.icon}"></i><span>${m.title}</span></button>`).join('')}</div></article>
    <article class="panel teams-panel"><div class="panel-head"><h2>تغطية المصنع <i class="bx bx-buildings"></i></h2></div><div class="ring-stats"><div><strong id="xDeptCount">0</strong><span>أقسام لها مراجعات</span></div><div><strong id="xTeamCount">0</strong><span>فرق TPM</span></div><div><strong id="xTaskCount">0</strong><span>إجمالي المهام</span></div></div></article>
    <article class="panel alerts-panel"><div class="panel-head"><h2>ما يحتاج متابعة <i class="bx bx-bell"></i></h2></div><div id="xAlertsList"></div></article>
  </section>

  <footer class="factory-footer"><span>FACTORY OS · REF-A</span><span>بيانات مباشرة من سجلات النظام</span><span class="online-dot">● متصل</span></footer>
</div>`;
}

function renderRecentReviews(){
  const el=document.getElementById('xRecentReviews'); if(!el)return;
  const rows=reviewSummary().recent;
  if(!rows.length){el.innerHTML='<div class="data-empty"><i class="bx bx-clipboard"></i><b>لا توجد مراجعات مسجلة</b><span>ستظهر نتائج المراجعات هنا فور وجود سجلات فعلية.</span></div>';return;}
  el.innerHTML=rows.slice(0,6).map(r=>{
    const score=Number(r.totalPct)||0;
    const tone=score>=80?'good':score>=60?'warn':'bad';
    return `<div class="review-row"><div class="review-icon ${tone}"><i class="bx ${score>=80?'bx-check':score>=60?'bx-minus':'bx-x'}"></i></div><div class="review-main"><b>${esc(r.dept||'قسم غير محدد')}</b><span>${esc(r.date||'—')} · ${esc(r.auditor||r.user||'مراجع غير محدد')}</span></div><strong class="review-score ${tone}">${score}%</strong></div>`;
  }).join('');
}

function renderAlerts(){
  const el=document.getElementById('xAlertsList'); if(!el)return;
  const tags=tagRows().filter(t=>!['closed','verified','done'].includes(t?.status));
  const urgent=tags.filter(t=>t?.priority==='critical'||(typeof window.getTagSLA==='function'&&window.getTagSLA(t).overdue)).slice(0,4);
  if(!urgent.length){el.innerHTML='<div class="data-empty compact"><i class="bx bx-check-shield"></i><b>لا توجد استثناءات حرجة</b><span>لا توجد تاجات حرجة أو متجاوزة للمهلة في البيانات الحالية.</span></div>';return;}
  el.innerHTML=urgent.map(t=>{
    const overdue=typeof window.getTagSLA==='function'&&window.getTagSLA(t).overdue;
    return `<div class="alert-item ${overdue?'overdue':''}"><i class="bx ${overdue?'bx-alarm-exclamation':'bx-error-circle'}"></i><div><b>${esc(t.desc||t.machine||'تاج بدون وصف')}</b><span>${esc(t.dept||'قسم غير محدد')} · ${overdue?'متجاوز للمهلة':'أولوية عالية'}</span></div></div>`;
  }).join('');
}

function renderTeams(){
  const teams=window.TPM_TEAM_HUB||window.TPM_TEAM_CATALOG||[];
  const depts=reviewSummary().departments;
  const task=taskSummary();
  const e=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v);};
  e('xDeptCount',depts.length);
  e('xTeamCount',Array.isArray(teams)?teams.length:Object.keys(teams||{}).length);
  e('xTaskCount',task.total);
}

function renderHomeData(){
  const r=reviewSummary(), t=tagSummary(), task=taskSummary();
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v);};
  set('xAuditAverage',r.rows.length?`${r.average}%`:'—');
  set('xAuditCount',r.rows.length);
  set('xOpenTags',t.open);
  set('xCriticalTags',`${t.critical} حرجة`);
  set('xOverdueTags',t.overdue);
  renderRecentReviews();
  renderAlerts();
  renderTeams();
  renderReviewChart();
}

function renderReviewChart(){
  const C=window.Chart,canvas=document.getElementById('xReviewChart'),empty=document.getElementById('xReviewEmpty');
  if(!canvas)return;
  const rows=reviewSummary().recent.reverse();
  if(!C||!rows.length){canvas.style.display='none';if(empty)empty.style.display='grid';return;}
  if(empty)empty.style.display='none';
  canvas.style.display='block';
  const old=C.getChart(canvas);if(old)old.destroy();
  const scores=rows.map(x=>Number(x.totalPct)||0);
  const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  new C(canvas.getContext('2d'),{type:'line',data:{labels:rows.map(x=>String(x.date||'—').replace(/^.*?(٠-٩|[0-9]).*$/,'$&')),datasets:[
    {label:'نسبة المراجعة',data:scores,borderColor:'#2583e8',backgroundColor:'rgba(37,131,232,.08)',borderWidth:3,pointRadius:4,tension:.3,fill:false},
    {label:'متوسط النتائج',data:scores.map(()=>avg),borderColor:'#20a66a',backgroundColor:'transparent',borderWidth:2,pointRadius:0,borderDash:[6,5],tension:0,fill:false}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,max:100,grid:{color:'#e8edf2'},ticks:{color:'#6d7c89',callback:v=>v+'%'}},x:{grid:{display:false},ticks:{color:'#6d7c89',maxRotation:0}}}}});
}

let homeDataBound=false;
function bindHomeData(){
  if(homeDataBound||!auth.currentUser)return;
  homeDataBound=true;
  const refresh=()=>setTimeout(renderHomeData,60);
  [
    'departments','tasks','history','tags'
  ].forEach(path=>db.ref('tpm_system/'+path).on('value',refresh));
  auth.onAuthStateChanged(user=>{if(user)setTimeout(renderHomeData,100);});
  setTimeout(renderHomeData,200);
}

function mountHome(){
  const el=document.getElementById('homeScreen');if(!el)return;
  if(!el.dataset.xMounted){el.dataset.xMounted='1';el.innerHTML=homeMarkup();}
  bindHomeData();
  renderHomeData();
}

export function mountFactoryOSGlobal(){mountHome();}
