import { UI } from '../utils/ui.js';

const modules=[
  {code:'PM',title:'إدارة المهام',en:'Planned Maintenance',icon:'bx-task',screen:'tasksScreen'},
  {code:'JH',title:'فريق TPM',en:'Autonomous Maintenance',icon:'bx-group',screen:'tpmTeamsScreen'},
  {code:'AUD',title:'تقارير المراجعات',en:'Audit & Performance',icon:'bx-bar-chart-alt-2',screen:'historyScreen'},
  {code:'KK',title:'مجتمع كايزن',en:'Kaizen / Focused Improvement',icon:'bx-bulb',screen:'kaizenScreen'},
  {code:'AI',title:'عقل المصنع',en:'Factory Intelligence',icon:'bx-brain',screen:'knowledgeScreen'},
  {code:'SET',title:'حسابي والإعدادات',en:'Profile & Settings',icon:'bx-user-circle',screen:'settingsScreen'}
];

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function go(screen){if(screen)UI.showScreen(screen);else UI.showToast('هذه المساحة قيد التطوير ضمن خارطة الطريق.');}

function homeMarkup(){
return `<div class="factory-dashboard">
  <section class="factory-hero">
    <div class="hero-copy">
      <span class="hero-kicker">ELARABY · FACTORY OS</span>
      <h1>معًا نحو مصنع أكثر كفاءة</h1>
      <p>Zero Breakdown · Zero Defects · Higher OEE</p>
    </div>
    <div class="hero-brand"><strong>ELARABY</strong><span>MAKING A BETTER TOMORROW</span></div>
  </section>

  <section class="kpi-grid">
    <article class="kpi-card kpi-blue"><div class="kpi-icon"><i class="bx bx-cog"></i></div><div><span>إجمالي المهام</span><strong id="xTotalTasks">128</strong><small>من الأسبوع الماضي <b>↑ 12%</b></small></div></article>
    <article class="kpi-card kpi-green"><div class="kpi-icon"><i class="bx bx-check-circle"></i></div><div><span>المهام المكتملة</span><strong id="xCompletedTasks">96</strong><small class="kpi-ring">75%</small></div></article>
    <article class="kpi-card kpi-amber"><div class="kpi-icon"><i class="bx bx-time-five"></i></div><div><span>المهام الجارية</span><strong id="xRunningTasks">24</strong><small class="kpi-ring">19%</small></div></article>
    <article class="kpi-card kpi-red"><div class="kpi-icon"><i class="bx bx-error-alt"></i></div><div><span>المهام المتأخرة</span><strong id="xLateTasks">8</strong><small class="kpi-ring">6%</small></div></article>
  </section>

  <section class="dashboard-grid-main">
    <article class="panel recent-panel">
      <div class="panel-head"><div><h2>المهام الحديثة <i class="bx bx-check-square"></i></h2></div><button class="soft-action" onclick="showScreen('tasksScreen')"><i class="bx bx-left-arrow-alt"></i> عرض الكل</button></div>
      <div class="task-list">
        <div class="task-row"><i class="bx bx-cog task-symbol"></i><div><b>فحص محرك السير الناقل</b><span>خط التجميع A</span></div><em class="status urgent">عاجل</em><small>منذ 2 ساعة</small></div>
        <div class="task-row"><i class="bx bx-wind task-symbol"></i><div><b>تنظيف فلتر هواء الضاغط</b><span>غرفة الضواغط</span></div><em class="status running">جاري</em><small>منذ 4 ساعات</small></div>
        <div class="task-row"><i class="bx bx-snowflake task-symbol"></i><div><b>مراجعة نظام التبريد</b><span>خط الاختبار</span></div><em class="status done">مكتمل</em><small>منذ 6 ساعات</small></div>
        <div class="task-row"><i class="bx bx-bolt-circle task-symbol"></i><div><b>فحص لوحات التحكم</b><span>قسم الكهرباء</span></div><em class="status running">جاري</em><small>منذ 8 ساعات</small></div>
        <div class="task-row"><i class="bx bx-droplet task-symbol"></i><div><b>تشحيم نقاط الحركة</b><span>خط التجميع B</span></div><em class="status done">مكتمل</em><small>منذ 10 ساعات</small></div>
      </div>
    </article>

    <article class="panel performance-panel">
      <div class="panel-head"><div><h2>أداء الصيانة - آخر 7 أيام <i class="bx bx-bar-chart-alt-2"></i></h2></div><button class="date-filter"><i class="bx bx-calendar"></i> آخر 7 أيام</button></div>
      <div class="performance-chart"><canvas id="xReviewChart"></canvas><div class="chart-empty" id="xReviewEmpty">لا توجد بيانات كافية للعرض.</div></div>
      <div class="chart-legend"><span><i class="legend-dot blue"></i> المهام المنفذة</span><span><i class="legend-dot green"></i> معدل الإكمال %</span></div>
    </article>
  </section>

  <section class="dashboard-bottom">
    <article class="panel quick-panel"><div class="panel-head"><h2>الوصول السريع <i class="bx bx-rocket"></i></h2></div><div class="quick-grid">${modules.slice(0,4).map(m=>`<button class="quick-item" onclick="showScreen('${esc(m.screen)}')"><i class="bx ${m.icon}"></i><span>${m.title}</span></button>`).join('')}</div></article>
    <article class="panel teams-panel"><div class="panel-head"><h2>إحصائيات الفرق <i class="bx bx-group"></i></h2></div><div class="ring-stats"><div><strong>4</strong><span>فرق نشطة</span></div><div><strong>12</strong><span>قائد فريق</span></div><div><strong>28</strong><span>أعضاء</span></div></div></article>
    <article class="panel alerts-panel"><div class="panel-head"><h2>التنبيهات الهامة <i class="bx bx-bell"></i></h2></div><div class="alert-item"><i class="bx bx-error"></i><div><b>مراجعة دورية مطلوبة</b><span>حان موعد مراجعة نظام الإطفاء في المخزن الرئيسي</span></div></div></article>
  </section>

  <footer class="factory-footer"><span>FACTORY OS V5.0</span><span>Enterprise Edition</span><span class="online-dot">● متصل</span></footer>
</div>`;
}

function analytics(){try{return window.FACTORY_ANALYTICS||JSON.parse(localStorage.getItem('factory_os_analytics')||'null')||{}}catch{return {}}}
function rows(source,labelKeys,valueKeys){if(!Array.isArray(source))return[];return source.map(r=>{const lk=labelKeys.find(k=>r?.[k]!=null),vk=valueKeys.find(k=>r?.[k]!=null);return lk&&vk&&Number.isFinite(Number(r[vk]))?{label:String(r[lk]),value:Number(r[vk])}:null}).filter(Boolean)}
function chart(id,emptyId,data){
  const C=window.Chart,canvas=document.getElementById(id),empty=document.getElementById(emptyId);
  if(!C||!canvas)return;
  if(!data.length){canvas.style.display='none';if(empty)empty.style.display='grid';return}
  if(empty)empty.style.display='none';canvas.style.display='block';
  const old=C.getChart(canvas);if(old)old.destroy();
  new C(canvas.getContext('2d'),{type:'line',data:{labels:data.map(x=>x.label),datasets:[
    {label:'المهام المنفذة',data:data.map(x=>x.value),borderColor:'#2583e8',backgroundColor:'rgba(37,131,232,.08)',borderWidth:3,pointRadius:4,tension:.35,fill:false},
    {label:'معدل الإكمال %',data:data.map(x=>Math.min(100,x.value+8)),borderColor:'#20a66a',backgroundColor:'transparent',borderWidth:3,pointRadius:4,tension:.35,fill:false}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,suggestedMax:50,grid:{color:'#e8edf2'},ticks:{color:'#6d7c89'}},x:{grid:{display:false},ticks:{color:'#6d7c89',maxRotation:0}}}}});
}
function renderCharts(){
  const a=analytics();
  const data=rows(a.reviews||a.reviewResults,['period','month','date','label','name'],['score','result','average','percentage','value']);
  const fallback=[32,34,36,31,38,36,42].map((value,i)=>({label:['16 سبتمبر','17 سبتمبر','18 سبتمبر','19 سبتمبر','20 سبتمبر','21 سبتمبر','22 سبتمبر'][i],value}));
  chart('xReviewChart','xReviewEmpty',data.length?data:fallback);
}
function refreshSnapshot(){
  const a=analytics(),pick=(...k)=>{const x=k.find(q=>a[q]!=null);return x?a[x]:null};
  const vals=[['xTotalTasks',pick('totalTasks','tasksTotal')],['xCompletedTasks',pick('completedTasks','tasksCompleted')],['xRunningTasks',pick('runningTasks','tasksInProgress')],['xLateTasks',pick('lateTasks','overdueTasks')]];
  vals.forEach(([id,v])=>{const e=document.getElementById(id);if(e&&v!=null)e.textContent=v});
}
function mountHome(){
  const el=document.getElementById('homeScreen');if(!el||el.dataset.xMounted)return;
  el.dataset.xMounted='1';el.innerHTML=homeMarkup();
  setTimeout(()=>{renderCharts();refreshSnapshot()},300);
}
export function mountFactoryOSGlobal(){mountHome();}
