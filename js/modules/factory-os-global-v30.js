import { UI } from '../utils/ui.js';

const modules=[
 {code:'JH',title:'الصيانة الذاتية',en:'Autonomous Maintenance',desc:'الجولات · CLIT · التاجات · خرائط المعدة',icon:'bx-map-alt',tone:'success',screen:'jhPortalScreen'},
 {code:'PM',title:'الصيانة المخططة',en:'Planned Maintenance',desc:'الأصول · أوامر العمل · الالتزام',icon:'bx-cog',tone:'primary',screen:'pmScreen'},
 {code:'KK',title:'التحسين المستمر',en:'Kaizen / Focused Improvement',desc:'A3 · PDCA · متابعة الأثر',icon:'bx-bulb',tone:'warning',screen:'kkScreen'},
 {code:'ET',title:'التعليم والتدريب',en:'Education & Training',desc:'المهارات · التأهيل · مصفوفة المهارات',icon:'bx-graduation',tone:'purple',screen:'etScreen'},
 {code:'HSE',title:'السلامة والبيئة',en:'HSE',desc:'ملاحظات · حوادث · إجراءات تصحيحية',icon:'bx-shield-quarter',tone:'danger',screen:'hseScreen'},
 {code:'QM',title:'الصيانة الموجهة للجودة',en:'Quality Maintenance',desc:'ربط جودة المنتج بحالة المعدة',icon:'bx-check-shield',tone:'primary',screen:null},
 {code:'EM',title:'الإدارة المبكرة',en:'Early Management',desc:'دروس المشاريع والمعدات الجديدة',icon:'bx-rocket',tone:'purple',screen:null},
 {code:'OT',title:'TPM الإداري',en:'Office TPM',desc:'البيانات · القرارات · المتابعة',icon:'bx-bar-chart-square',tone:'primary',screen:null}
];
const quick=[
 {title:'مهمة جديدة',sub:'Task',icon:'bx-task',screen:'tasksScreen'},
 {title:'إصدار تاج',sub:'Abnormality',icon:'bx-purchase-tag',screen:'tagsScreen'},
 {title:'5S',sub:'Workplace',icon:'bx-grid-alt',screen:'fiveSScreen'},
 {title:'عقل المصنع',sub:'Knowledge',icon:'bx-brain',screen:'knowledgeScreen'}
];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function go(screen){if(screen) UI.showScreen(screen); else UI.showToast('هذه المساحة قيد البناء ضمن خارطة الطريق 🚀')}
function homeMarkup(){return `<div class="v30-home">
 <section class="v30-hero"><div><span class="v30-eyebrow">FACTORY OS · TPM OPERATING SYSTEM</span><h1>مركز قيادة المصنع</h1><p>كل ما تحتاجه للتشغيل والتحسين والمتابعة — في مسارات واضحة من شاشة واحدة.</p></div><div class="v30-hero-actions"><button class="btn" onclick="showScreen('jhPortalScreen')"><i class="bx bx-map-alt"></i> افتح JH</button><button class="btn" onclick="showScreen('tasksScreen')"><i class="bx bx-task"></i> المهام</button></div></section>
 <section class="v30-section"><div class="v30-section-head"><div><h2>لوحة الحالة</h2><p>مؤشرات سريعة قبل بدء الجولة</p></div></div><div class="v30-status"><div class="v30-status-card"><i class="bx bx-target-lock"></i><b id="v30StatTags">—</b><span>تاجات مفتوحة</span></div><div class="v30-status-card"><i class="bx bx-task"></i><b id="v30StatTasks">—</b><span>مهام تحتاج متابعة</span></div><div class="v30-status-card"><i class="bx bx-bulb"></i><b id="v30StatKaizen">—</b><span>تحسينات</span></div><div class="v30-status-card"><i class="bx bx-check-shield"></i><b>CLIT</b><span>التزام الفحص</span></div></div></section>
 <section class="v30-section"><div class="v30-section-head"><div><h2>منظومة TPM</h2><p>اختار المجال بدل البحث داخل قوائم طويلة</p></div></div><div class="v30-grid">${modules.map(m=>`<article class="v30-module ${m.tone}" data-v30-screen="${esc(m.screen||'')}" data-v30-code="${m.code}"><div class="v30-module-top"><div class="v30-module-icon"><i class="bx ${m.icon}"></i></div><span class="v30-code">${m.code}</span></div><h3>${m.title}</h3><p>${m.en}<br>${m.desc}</p></article>`).join('')}</div></section>
 <section class="v30-section"><div class="v30-section-head"><div><h2>إجراءات سريعة</h2><p>أكثر العمليات استخدامًا — بضغطة واحدة</p></div></div><div class="v30-quick">${quick.map(q=>`<button data-v30-screen="${q.screen}"><i class="bx ${q.icon}"></i><div><b>${q.title}</b><span>${q.sub}</span></div></button>`).join('')}</div></section>
 <section class="v30-section"><div class="v30-section-head"><div><h2>منطق التشغيل</h2><p>اكتشف → نفّذ → وثّق → عالج → تحقق → حسّن</p></div></div><div class="v30-grid-3"><div class="v30-module"><div class="v30-module-icon"><i class="bx bx-search-alt"></i></div><h3>1 · اكتشف</h3><p>الجولة والملاحظة ونقطة الفحص.</p></div><div class="v30-module"><div class="v30-module-icon"><i class="bx bx-wrench"></i></div><h3>2 · عالج</h3><p>Tag أو Action أو Work Order.</p></div><div class="v30-module"><div class="v30-module-icon"><i class="bx bx-line-chart"></i></div><h3>3 · حسّن</h3><p>Kaizen وPDCA وقياس الأثر.</p></div></div></section>
 <div class="v30-footer-note">FACTORY OS · V30 Experience Layer · Mobile First</div>
 </div>`}
function mountHome(){const el=document.getElementById('homeScreen');if(!el||el.dataset.v30Mounted)return;el.dataset.v30Mounted='1';el.innerHTML=homeMarkup();el.querySelectorAll('[data-v30-screen]').forEach(x=>x.addEventListener('click',()=>go(x.dataset.v30Screen)));}
function mountBottomNav(){if(document.getElementById('v30BottomNav'))return;const nav=document.createElement('nav');nav.id='v30BottomNav';nav.innerHTML=`<button data-bnav="home"><i class="bx bx-home"></i><span>الرئيسية</span></button><button data-bnav="jh"><i class="bx bx-map-alt"></i><span>JH</span></button><button data-bnav="tasks"><i class="bx bx-task"></i><span>المهام</span></button><button data-bnav="menu"><i class="bx bx-menu"></i><span>المزيد</span></button>`;document.body.appendChild(nav);nav.querySelector('[data-bnav="home"]').onclick=()=>go('homeScreen');nav.querySelector('[data-bnav="jh"]').onclick=()=>go('jhPortalScreen');nav.querySelector('[data-bnav="tasks"]').onclick=()=>go('tasksScreen');nav.querySelector('[data-bnav="menu"]').onclick=()=>UI.toggleSidebar();}
function syncNav(){const active=document.querySelector('.screen.active')?.id||'';document.querySelectorAll('#v30BottomNav button').forEach(b=>b.classList.toggle('active',(b.dataset.bnav==='home'&&active==='homeScreen')||(b.dataset.bnav==='jh'&&active.startsWith('jh'))||(b.dataset.bnav==='tasks'&&active==='tasksScreen')))}
export function mountFactoryOSGlobal(){mountHome();mountBottomNav();const observer=new MutationObserver(syncNav);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});syncNav();}
