/* External Audit Runtime v3 — syntax-verified, cache-isolated */
(()=>{const F={report:{title:'نتائج المراجعة الخارجية — H2 2026',period:'H2 2026',sourceFile:'TPM Detailed Report - Ref A - H2 2026.pdf',generatedFromPages:159},departments:[{department:'الفاكيوم',items:[['5S',100,79],['JH-0',100,75],['JH-1',100,76],['JH-2',100,68],['JH-3',100,61],['JH-4',100,63],['JH-5',100,49],['JH-6',100,47],['JH-7',100,28],['PM-1',100,67],['PM-2',100,72],['PM-3',100,76],['PM-4',100,70],['PM-5',100,60],['PM-6',100,52],['PM-7',100,32],['E&T',100,79],['KK',100,61],['SHE',100,70]]},{department:'حقن الباب',items:[['5S',100,79],['JH-0',100,77],['JH-1',100,78],['JH-2',100,70],['JH-3',100,78],['JH-4',100,69],['JH-5',100,61],['JH-6',100,60],['JH-7',100,28],['PM-1',100,77],['PM-2',100,72],['PM-3',100,76],['PM-4',100,70],['PM-5',100,58],['PM-6',100,52],['PM-7',100,32],['E&T',100,79],['KK',100,61],['SHE',100,70]]},{department:'تشكيل المواسير',items:[['5S',100,90],['JH-0',100,83],['JH-1',100,80],['JH-2',100,73],['JH-3',100,76],['JH-4',175,116],['JH-5',100,50],['PM-1',100,67],['PM-2',100,72],['PM-3',100,76],['PM-4',100,70],['PM-5',100,60],['PM-6',100,52],['E&T',100,79],['KK',100,64],['SHE',100,70]]},{department:'حقن الكابينة',items:[['5S',100,84],['JH-0',100,79],['JH-1',100,75],['JH-2',100,82],['JH-3',100,77],['JH-4',100,62],['JH-5',100,50],['JH-6',100,47],['JH-7',100,28],['PM-1',100,67],['PM-2',100,72],['PM-3',100,76],['PM-4',100,70],['PM-5',100,58],['PM-6',100,52],['PM-7',100,32],['E&T',100,79],['KK',100,62],['SHE',100,70]]}]};
const CREATE_JH_TEAM_CRITERIA = [
  [1,'يوجد هيكل تنظيمي للفريق تم وضعه طبقاً لمتطلبات التشكيل الصحيح للفريق ومعتمد من مدير عام المصنع',5],
  [2,'تحديد المهام والمسؤوليات',5],
  [3,'وضع لائحة واضحة لتقييم أعضاء الفريق وإجراء تقييم شهري لأداء كل عضو داخل الفريق ورفعه للسيد مدير عام المصنع واتخاذ إجراءات تحسين بخصوص الأعضاء غير الملتزمين في الفريق',15],
  [4,'% نسبة الحضور الفعلي للمتدربين إلى عدد المتدربين المستهدف 100%',5],
  [5,'نسبة المدربين الذين أصبحوا مدربين بوصولهم للمستوى الرابع من عدد المدربين الكلي 30% وتم تأهيلهم للحصول على دورة TOT',10],
  [6,'% نسبة المدربين الذين وصلوا إلى المستوى الثالث من عدد المدربين الكلي 70%',10],
  [7,'تم تأهيل المدربين الذين لم يتجاوزوا درجة النجاح حتى يصلوا إلى المستوى الثالث',10],
  [8,'عقد امتحان للمدربين بعد 21 يوم',5],
  [9,'لجميع المتدربين قبل وبعد Radar Chart عمل ملف تدريبي لكل عضو لجميع الدورات الحاصل عليها والمواد العلمية وعمل تقييمهم',10],
  [10,'شهادات تقدير للمتدربين المتميزين واعتمادهم كمدربين من إدارة التدريب',5],
  [11,'سياسة الفريق',5],
  [12,'أهداف الفريق',10],
  [13,'ملفات توثيق أنشطة الفريق',5]
].map(([i,t,p]) => ({i,t,a:null,p}));


const TEAM_CREATE_CATALOG = {
  jh: {
    code:'JH', name:'فريق الصيانة الذاتية', activity:'Create JH Team',
    description:'تأسيس فريق JH وحوكمته وتجهيزه للتشغيل المستدام.',
    criteria: CREATE_JH_TEAM_CRITERIA
  },
  fiveS: {
    code:'5S', name:'فريق 5S', activity:'Create 5S Team',
    description:'تأسيس فريق 5S وتحديد نطاق العمل ومسؤوليات التدقيق والتحسين.',
    criteria:[
      [1,'تشكيل فريق 5S واعتماد الهيكل والمسؤوليات',10],[2,'تحديد نطاق المناطق وخريطة المسؤوليات',10],
      [3,'تحديد معايير 5S وقواعد التقييم الموحدة',15],[4,'تدريب أعضاء الفريق على 5S والتدقيق',10],
      [5,'خطة جولات التدقيق الدورية ومواعيدها',10],[6,'آلية تسجيل الملاحظات وفرص التحسين',10],
      [7,'آلية إغلاق الملاحظات والتحقق من الاستدامة',10],[8,'لوحة متابعة مرئية ومؤشرات أداء 5S',10],
      [9,'نظام توثيق الصور والنتائج قبل/بعد',5],[10,'أهداف الفريق وخطة التحسين السنوية',10]
    ].map(([i,t,p])=>({i,t,a:null,p}))
  },
  pm: {
    code:'PM', name:'فريق الصيانة المخططة', activity:'Create PM Team',
    description:'تأسيس فريق PM لإدارة استراتيجية الصيانة والتخطيط والتنفيذ والتحسين.',
    criteria:[
      [1,'هيكل فريق PM وتحديد الأدوار والمسؤوليات',10],[2,'تصنيف المعدات وتحديد الأولويات الحرجة',10],
      [3,'خطة الصيانة الوقائية والدورية المعتمدة',15],[4,'نظام إدارة أوامر العمل وسجل تاريخ المعدات',10],
      [5,'إدارة قطع الغيار الحرجة ومستويات المخزون',10],[6,'مؤشرات MTBF وMTTR والالتزام بالخطة',15],
      [7,'تحليل الأعطال المتكررة وإجراءات منع التكرار',10],[8,'برنامج الصيانة التنبؤية وتشخيص الحالة',10],
      [9,'مراجعة دورية لأداء خطة PM وإجراءات التحسين',5],[10,'ملفات توثيق واعتماد أنشطة الفريق',5]
    ].map(([i,t,p])=>({i,t,a:null,p}))
  },
  et: {
    code:'E&T', name:'فريق التعليم والتدريب', activity:'Create E&T Team',
    description:'تأسيس نظام تعليم وتدريب قائم على فجوات المهارات واحتياجات الوظائف.',
    criteria:[
      [1,'هيكل الفريق وتحديد مسؤوليات التدريب',10],[2,'تحديد مصفوفة المهارات والمستويات المستهدفة',15],
      [3,'تحليل فجوات المهارات لكل وظيفة وقسم',15],[4,'خطة تدريب سنوية مرتبطة بالفجوات',15],
      [5,'تأهيل المدربين ونظام اعتمادهم',10],[6,'تنفيذ OJT وتوثيق نتائج التدريب',10],
      [7,'اختبارات تحقق قبل/بعد التدريب ومتابعة التحسن',10],[8,'ملفات تدريب فردية وشهادات واعتمادات',5],
      [9,'مراجعة فعالية التدريب وإجراءات التحسين',5],[10,'أهداف ومؤشرات أداء فريق E&T',5]
    ].map(([i,t,p])=>({i,t,a:null,p}))
  },
  kk: {
    code:'KK', name:'فريق التحسين المستمر', activity:'Create KK Team',
    description:'تأسيس فريق Kaizen / Focused Improvement لإدارة دورة التحسين ونتائجها.',
    criteria:[
      [1,'هيكل الفريق وتحديد قائد ومسؤوليات الأعضاء',10],[2,'منهج واضح لاختيار فرص التحسين وترتيب أولوياتها',10],
      [3,'نظام A3 / PDCA موحد لتوثيق المشروعات',15],[4,'تحليل السبب الجذري والتحقق من الحلول',10],
      [5,'تحديد أهداف كمية وخط أساس لكل مشروع',10],[6,'متابعة الأثر على QCDSME أو المؤشرات ذات الصلة',15],
      [7,'مراجعة واعتماد نتائج المشروعات وإغلاقها',10],[8,'توحيد الحلول الناجحة وتعميمها',10],
      [9,'قاعدة معرفة ودروس مستفادة للمشروعات',5],[10,'مؤشرات أداء وخطة تحسين مستمرة للفريق',5]
    ].map(([i,t,p])=>({i,t,a:null,p}))
  },
  hse: {
    code:'HSE', name:'فريق السلامة والصحة والبيئة', activity:'Create HSE Team',
    description:'تأسيس فريق SHE لإدارة المخاطر والامتثال والتحسين المستدام.',
    criteria:[
      [1,'هيكل الفريق وتحديد المسؤوليات والصلاحيات',10],[2,'حصر المخاطر وتقييمها وتحديد الأولويات',15],
      [3,'خطة التحكم في المخاطر والإجراءات الوقائية',15],[4,'برنامج التفتيش والجولات الدورية',10],
      [5,'نظام الإبلاغ عن الحوادث والحالات غير الآمنة',10],[6,'متابعة الإجراءات التصحيحية والتحقق من الإغلاق',10],
      [7,'برامج التوعية والتدريب والطوارئ',10],[8,'مؤشرات SHE ومراجعة الاتجاهات',10],
      [9,'إدارة المتطلبات البيئية والنفايات والانبعاثات',5],[10,'مراجعة فعالية الفريق وخطة التحسين',5]
    ].map(([i,t,p])=>({i,t,a:null,p}))
  }
};

const ACTIVITY_CRITERIA_TEMPLATES = {
  '5S': [
    'خطة 5S ونطاق التطبيق المعتمد','تصنيف وفرز المواد والمعدات','تنظيم وترميز أماكن العمل',
    'معايير التنظيف والفحص','الإدارة المرئية واللوحات','التدقيق الدوري وتوثيق النتائج',
    'إغلاق الملاحظات والتحقق من الاستدامة','تحسينات قبل/بعد ونتائجها','مشاركة العاملين والانضباط','استدامة المستوى ومراجعة الإدارة'
  ],
  'E&T': [
    'خطة التعليم والتدريب المبنية على فجوات المهارات','مصفوفة المهارات والمستويات المستهدفة','تأهيل المدربين واعتمادهم',
    'تنفيذ التدريب وOJT','تقييم المتدرب قبل وبعد التدريب','ملفات التدريب الفردية والتوثيق',
    'التحقق من تطبيق المهارة في الميدان','مراجعة فعالية التدريب','الإجراءات التصحيحية لفجوات المهارات','مؤشرات وأهداف E&T'
  ],
  'KK': [
    'خطة ومجالات التحسين ذات الأولوية','اختيار المشروعات وتحليل المشكلة','A3 / PDCA وتحديد خط الأساس',
    'تحليل السبب الجذري','تنفيذ الحل والتحقق من الفاعلية','قياس الأثر على المؤشرات',
    'إغلاق المشروع واعتماد النتيجة','توحيد الحل وتعميمه','الدروس المستفادة','مراجعة محفظة التحسين'
  ],
  'SHE': [
    'خطة SHE وتقييم المخاطر','حصر المخاطر وتحديد الأولويات','إجراءات التحكم والوقاية',
    'الجولات والتفتيش الدوري','الإبلاغ عن الحوادث والحالات غير الآمنة','الإجراءات التصحيحية والتحقق من الإغلاق',
    'التدريب والتوعية والطوارئ','مؤشرات السلامة والصحة والبيئة','الامتثال البيئي وإدارة النفايات','مراجعة وتحسين نظام SHE'
  ],
  'PM-1':['خطة PM ونطاق المعدات','تصنيف حرجة المعدات','خطط الصيانة الوقائية','التزام التنفيذ','تاريخ المعدات وسجل الأعمال','مؤشرات الأداء','مراجعة وتحسين الخطة','منع تكرار الأعطال'],
  'PM-2':['تحليل الأعطال المتكررة','نظام تسجيل الأعطال','MTBF وMTTR','تحليل السبب الجذري','إجراءات منع التكرار','متابعة الفاعلية','مراجعة الاتجاهات','تحديث معايير الصيانة'],
  'PM-3':['برنامج Condition Based Maintenance','تحديد نقاط القياس','حدود الإنذار والتدخل','تنفيذ القياسات','تحليل الاتجاهات','أوامر العمل الناتجة','التحقق من الفاعلية','مراجعة دورية للبرنامج'],
  'PM-4':['هيكل بيانات المعدات','قوائم قطع الغيار الحرجة','حدود المخزون وإعادة الطلب','دقة بيانات المخزون','تحليل الاستهلاك','توثيق المواصفات','مراجعة التقادم','تحسين تكلفة المخزون'],
  'PM-5':['خطة الصيانة الدورية','تحديد الترددات','التزام الجدول','جودة التنفيذ','توثيق نتائج الصيانة','إدارة التوقفات المخططة','مراجعة الأداء','تحسين الترددات'],
  'PM-6':['خطة الصيانة التنبؤية','تقنيات القياس والتشخيص','تحديد حدود الحالة','تحليل بيانات الحالة','التنبؤ بالتدهور','تحويل النتائج إلى أعمال','قياس تجنب الأعطال','مراجعة البرنامج'],
  'PM-7':['تقييم نظام PM','تحقيق أهداف الاعتمادية','تحقيق أهداف تكلفة الصيانة','تحقيق أهداف MTBF/MTTR','مراجعة الأعطال الحرجة','مراجعة الموارد والمهارات','خطط التحسين','استدامة النظام'],
};

function normalizeTemplateCriteria(activity){
  const names=ACTIVITY_CRITERIA_TEMPLATES[activity];
  if(!Array.isArray(names)||!names.length)return [];
  const weights=names.length===10 ? [10,10,10,10,10,10,10,10,10,10] : names.length===8 ? [12,12,13,13,12,13,12,13] : names.map(()=>Math.round(100/names.length));
  let total=weights.reduce((a,b)=>a+b,0);
  if(total!==100) weights[weights.length-1]+=100-total;
  return names.map((t,i)=>({i:i+1,t,p:weights[i],a:null}));
}

function getAuditDataCriteria(activity){
  try{
    if(typeof AUDIT_DATA!=='undefined' && AUDIT_DATA?.[activity]?.items?.length){
      return AUDIT_DATA[activity].items.map(x=>({i:Number(x.id),t:String(x.title||''),p:Number(x.maxScore||0),a:null,levels:x.levels||[]}));
    }
  }catch(_){}
  return [];
}

function teamCreateByActivity(activity){
  return Object.values(TEAM_CREATE_CATALOG).find(x=>x.activity===activity)||null;
}


const M={
  'Create JH Team':['CREATE JH TEAM','Create JH Team','تشكيل وإنشاء فريق الصيانة الذاتية'],
  '5S':['5S','5S Activity','بيئة العمل'],
  'JH-0':['JH-0','JH Step 0','الخطوة التحضيرية'],
  'JH-1':['JH-1','JH Step 1','التنظيف الابتدائي'],
  'JH-2':['JH-2','JH Step 2','معالجة التلوث والأماكن الصعبة'],
  'JH-3':['JH-3','JH Step 3','المعايير المؤقتة'],
  'JH-4':['JH-4','JH Step 4','الفحص العام'],
  'JH-5':['JH-5','JH Step 5','الفحص الذاتي'],
  'JH-6':['JH-6','JH Step 6','التوحيد'],
  'JH-7':['JH-7','JH Step 7','الإدارة الذاتية'],
  'PM-1':['PM-1','PM Step 1','دعم الصيانة الذاتية'],
  'PM-2':['PM-2','PM Step 2','إدارة الأعطال'],
  'PM-3':['PM-3','PM Step 3','الصيانة المعتمدة على الحالة'],
  'PM-4':['PM-4','PM Step 4','بيانات وقطع الغيار'],
  'PM-5':['PM-5','PM Step 5','الصيانة الدورية'],
  'PM-6':['PM-6','PM Step 6','الصيانة التنبؤية'],
  'PM-7':['PM-7','PM Step 7','تقييم نظام الصيانة'],
  'E&T':['E&T','E&T Activity','التعليم والتدريب'],
  'KK':['KK','KK Activity','التحسين المستمر'],
  'SHE':['SHE','SHE Activity','السلامة والصحة والبيئة']
};

const S=window.__externalAuditRebuild||{data:null,activity:'all',department:null};
window.__externalAuditRebuild=S;
const esc=v=>window.escapeTPM?window.escapeTPM(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsArg=v=>esc(JSON.stringify(String(v??'')));
const fmt=n=>n==null||n===''?'—':new Intl.NumberFormat('ar-EG').format(Number(n||0));
const pct=(a,p)=>a==null||p==null||Number(p)===0?null:Math.round(Number(a)/Number(p)*1000)/10;
const crit=d=>!Array.isArray(d)?[]:d.map((x,i)=>typeof x==='string'
  ?{i:i+1,t:x,a:null,p:null}
  :{i:Number(x.index||x.number||x.i||i+1),t:String(x.criterion||x.name||x.text||x.description||x.title||x.t||'').trim(),a:x.actual==null?(x.score==null?(x.a==null?null:Number(x.a)):Number(x.score)):Number(x.actual),p:x.planned==null?(x.max==null?(x.p==null?null:Number(x.p)):Number(x.max)):Number(x.planned)}
).filter(x=>x.t);

function normalizeNumber(v){
  if(v===null||v===undefined||v==='') return null;
  const n=Number(v);
  return Number.isFinite(n)?n:null;
}
function evidenceSafeKey(v){return encodeURIComponent(String(v||'')).replace(/[.#$/[\]]/g,'_');}
function auditCriteriaFor(activity,item){
  const direct=crit(item?.criteria||item?.rows||item?.evaluations||item?.evaluationCriteria||item?.checklist);
  if(direct.length) return direct;
  const audit=getAuditDataCriteria(activity);
  if(audit.length) return audit;
  return normalizeTemplateCriteria(activity);
}
function evidencePath(dept,activity){return 'tpm_system/external_audit_evidence/'+evidenceSafeKey(dept)+'/'+evidenceSafeKey(activity);}
async function loadEvidence(dept,activity){
  try{
    const snap=await firebase.database().ref(evidencePath(dept,activity)).once('value');
    return snap.val()||{};
  }catch(error){console.warn('[External Audit] evidence read failed',error);return {};}
}
async function saveEvidence(dept,activity,criterionId,kind,url){
  const user=firebase.auth().currentUser;
  const payload={url,kind,uploadedAt:Date.now(),uploadedByUid:user?.uid||'',uploadedByName:window.currentUser?.name||''};
  await firebase.database().ref(evidencePath(dept,activity)+'/'+criterionId+'/'+kind).set(payload);
}
function canWriteEvidence(){
  return ['admin','auditor'].includes(window.currentUser?.role);
}
function renderEvidenceSlot({dept,activity,criterionId,kind,label,evidence}){
  const ev=evidence?.[criterionId]?.[kind];
  if(ev?.url){
    return '<div class="ea-evidence-slot has-image"><div class="ea-evidence-slot-head"><span><i class="bx '+(kind==='standard'?'bx-check-shield':'bx-current-location')+'"></i>'+label+'</span><button type="button" title="حذف الدليل" onclick="removeExternalAuditEvidence('+jsArg(dept)+','+jsArg(activity)+','+criterionId+','+jsArg(kind)+')"><i class="bx bx-trash"></i></button></div><img src="'+esc(ev.url)+'" alt="'+label+'" onclick="openExternalAuditEvidenceImage(this.src)"><small>تم الإرفاق</small></div>';
  }
  if(!canWriteEvidence()){
    return '<div class="ea-evidence-slot empty-slot is-readonly"><i class="bx bx-lock-alt"></i><b>'+label+'</b><small>لا توجد صورة مرفقة</small></div>';
  }
  return '<label class="ea-evidence-slot empty-slot"><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onchange="uploadExternalAuditEvidence(event,'+jsArg(dept)+','+jsArg(activity)+','+criterionId+','+jsArg(kind)+')"><span><i class="bx bx-image-add"></i><b>'+label+'</b><small>أضف صورة</small></span></label>';
}
function renderCriterionCards(dept,activity,criteria,evidence){
  if(!criteria.length) return '<div class="ea-v2-no-criteria-panel"><i class="bx bx-info-circle"></i><b>لا توجد معايير تفصيلية محمّلة لهذه الخطوة.</b><span>البيانات الحالية تحتوي على الدرجة الإجمالية فقط. أضف مصدر المعايير التفصيلية لهذه الخطوة قبل استخدامها في التقييم.</span></div>';
  return '<div class="ea-criteria-list">'+criteria.map(c=>'<article class="ea-criterion-card"><div class="ea-criterion-head"><span class="ea-criterion-number">'+fmt(c.i)+'</span><div><b>'+esc(c.t)+'</b><small>الدرجة المخططة: '+fmt(c.p)+'</small></div></div><div class="ea-criterion-evidence-grid">'+renderEvidenceSlot({dept,activity,criterionId:c.i,kind:'standard',label:'الوضع المعياري',evidence})+renderEvidenceSlot({dept,activity,criterionId:c.i,kind:'current',label:'الوضع الحالي',evidence})+'</div></article>').join('')+'</div>';
}
async function seed(){
  const raw=String(window.EXTERNAL_AUDIT_SEED_B64||'').replace(/\s+/g,'');
  if(!raw) return F;
  try{
    const normalized=raw.replace(/-/g,'+').replace(/_/g,'/');
    const padded=normalized+'='.repeat((4-normalized.length%4)%4);
    const binary=atob(padded);
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    if(typeof DecompressionStream==='undefined') throw Error('gzip_decompression_unavailable');
    return await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
  }catch(error){
    console.warn('[External Audit] compressed seed unavailable; using embedded fallback.',error);
    return F;
  }
}
function norm(d){
  const src=d||F;
  return {
    report:src.report||F.report,
    departments:(src.departments||[]).map(dep=>({
      department:dep.department,
      items:(dep.items||[]).map(x=>{
        const q=Array.isArray(x)
          ? {activity:x[0],planned:normalizeNumber(x[1]),actual:normalizeNumber(x[2])}
          : {...x,planned:normalizeNumber(x.planned),actual:normalizeNumber(x.actual)};
        q.criteria=crit(q.criteria||q.rows||q.evaluations||q.evaluationCriteria||q.checklist);
        return q;
      })
    }))
  };
}
function ensureTeamCreateCatalog(data){
  return data;
}
async function load(){
  if(S.data)return S.data;
  try{S.data=ensureTeamCreateCatalog(norm(await seed()));}
  catch(e){console.warn('[External Audit]',e);S.data=ensureTeamCreateCatalog(norm(F));}
  return S.data;
}
const acts=d=>{
  const all=[...new Set(d.departments.flatMap(x=>x.items.map(i=>i.activity)))].filter(a=>!teamCreateByActivity(a));
  const preferred=['5S','JH-0','JH-1','JH-2','JH-3','JH-4','JH-5','JH-6','JH-7','PM-1','PM-2','PM-3','PM-4','PM-5','PM-6','PM-7','E&T','KK','SHE'];
  return all.sort((a,b)=>(preferred.indexOf(a)<0?999:preferred.indexOf(a))-(preferred.indexOf(b)<0?999:preferred.indexOf(b)));
};
const getDept=n=>S.data.departments.find(x=>x.department===n);
const overall=n=>{
  const scored=(getDept(n)?.items||[]).filter(x=>x.actual!=null&&x.planned!=null&&Number(x.planned)>0);
  const p=scored.reduce((s,x)=>s+Number(x.planned||0),0),v=scored.reduce((s,x)=>s+Number(x.actual||0),0);
  return{p,a:v,r:pct(v,p),c:scored.length};
};
window.setExternalAuditActivity=a=>{S.activity=a||'all';window.renderExternalAudit()};
window.openExternalAuditDepartment=async(d,a)=>{S.activity=a||'all';S.department=d;showScreen('externalAuditDepartmentScreen');await window.renderExternalAuditDepartment(d)};
window.setExternalAuditDepartmentActivity=a=>{S.activity=a||'all';if(S.department)window.renderExternalAuditDepartment(S.department)};
window.openExternalAuditEvidenceImage=url=>{const root=document.getElementById('externalAuditDepartmentRoot');if(!root)return;const modal=document.createElement('div');modal.className='ea-image-modal';modal.innerHTML='<div class="ea-image-modal-backdrop" onclick="this.parentElement.remove()"></div><div class="ea-image-modal-card"><button type="button" onclick="this.parentElement.parentElement.remove()"><i class="bx bx-x"></i></button><img src="'+esc(url)+'" alt="دليل المراجعة"></div>';root.appendChild(modal)};
window.uploadExternalAuditEvidence=async(event,dept,activity,criterionId,kind)=>{
  const file=event?.target?.files?.[0];
  if(!file)return;
  if(!canWriteEvidence())return showToast?.('⚠️ ليس لديك صلاحية إضافة أدلة المراجعة.');
  if(!/^image\/(jpeg|png|webp)$/i.test(file.type)||file.size>8*1024*1024){
    event.target.value='';
    return showToast?.('⚠️ استخدم JPG/PNG/WEBP وبحجم لا يتجاوز 8 ميجابايت.');
  }
  try{
    showToast?.('جاري رفع صورة '+(kind==='standard'?'الوضع المعياري':'الوضع الحالي')+'…');
    let url='';
    if(typeof window.processAndEnhanceImage==='function'&&typeof window.uploadImageToStorage==='function'){
      url=await new Promise((resolve,reject)=>window.processAndEnhanceImage(file,async dataUrl=>{try{resolve(await window.uploadImageToStorage(dataUrl));}catch(e){reject(e);}}));
    }else{
      const dataUrl=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(file)});
      if(typeof window.uploadImageToStorage!=='function')throw Error('image_upload_helper_unavailable');
      url=await window.uploadImageToStorage(dataUrl);
    }
    if(!url)throw Error('upload_failed');
    await saveEvidence(dept,activity,criterionId,kind,url);
    showToast?.('✅ تم حفظ الدليل.');
    await window.renderExternalAuditDepartment(dept);
  }catch(error){
    console.error('[External Audit] evidence upload failed',error);
    showToast?.('⚠️ تعذر رفع الدليل. راجع صلاحيات Storage وحاول مرة أخرى.');
  }finally{if(event?.target)event.target.value='';}
};
window.removeExternalAuditEvidence=async(dept,activity,criterionId,kind)=>{
  if(!canWriteEvidence())return showToast?.('⚠️ ليس لديك صلاحية حذف الأدلة.');
  if(!confirm('حذف صورة '+(kind==='standard'?'الوضع المعياري':'الوضع الحالي')+'؟'))return;
  try{
    await firebase.database().ref(evidencePath(dept,activity)+'/'+criterionId+'/'+kind).remove();
    await window.renderExternalAuditDepartment(dept);
    showToast?.('🗑️ تم حذف الدليل من السجل.');
  }catch(error){console.error('[External Audit] evidence delete failed',error);showToast?.('⚠️ تعذر حذف الدليل.');}
};

function criterionActual(evidence,criterionId){
  const raw=evidence?.[criterionId]?.score;
  const n=normalizeNumber(raw?.value ?? raw);
  return n==null?null:n;
}
async function saveCriterionScore(dept,activity,criterionId,value){
  if(!canWriteEvidence()) return showToast?.('⚠️ ليس لديك صلاحية تعديل درجات المراجعة.');
  const n=normalizeNumber(value);
  const team=teamCreateByActivity(activity);
  const criteria=team?.criteria?.length?team.criteria:auditCriteriaFor(activity,{});
  const c=criteria.find(x=>Number(x.i)===Number(criterionId));
  if(!c) return;
  if(n==null||n<0||n>Number(c.p||0)) return showToast?.('⚠️ الدرجة يجب أن تكون بين 0 والدرجة المخططة للبند.');
  try{
    await firebase.database().ref(evidencePath(dept,activity)+'/'+criterionId+'/score').set({
      value:n,updatedAt:Date.now(),updatedByUid:firebase.auth().currentUser?.uid||'',updatedByName:window.currentUser?.name||''
    });
    showToast?.('✅ تم حفظ الدرجة الفعلية للبند.');
    await window.renderExternalAuditDepartment(dept);
  }catch(error){console.error('[External Audit] criterion score save failed',error);showToast?.('⚠️ تعذر حفظ درجة البند.');}
}
window.saveExternalAuditCriterionScore=saveCriterionScore;

function renderCriterionCards(dept,activity,criteria,evidence){
  if(!criteria.length) return '<div class="ea-v2-no-criteria-panel"><i class="bx bx-info-circle"></i><b>لا توجد معايير تفصيلية محمّلة لهذه الخطوة.</b><span>البيانات الحالية تحتوي على الدرجة الإجمالية فقط. أضف مصدر المعايير التفصيلية لهذه الخطوة قبل استخدامها في التقييم.</span></div>';
  const editable=canWriteEvidence();
  return '<div class="ea-criteria-list">'+criteria.map(c=>{
    const actual=criterionActual(evidence,c.i) ?? normalizeNumber(c.a);
    const actualText=actual==null?'غير مسجل':fmt(actual);
    const input=editable
      ? '<label class="ea-criterion-score-editor"><span>الفعلي</span><input type="number" min="0" max="'+Number(c.p||0)+'" step="0.5" value="'+(actual==null?'':actual)+'" placeholder="—" onchange="saveExternalAuditCriterionScore('+jsArg(dept)+','+jsArg(activity)+','+Number(c.i)+',this.value)"></label>'
      : '<div class="ea-criterion-score-value"><span>الفعلي</span><b>'+actualText+'</b></div>';
    return '<article class="ea-criterion-card"><div class="ea-criterion-head"><span class="ea-criterion-number">'+fmt(c.i)+'</span><div><b>'+esc(c.t)+'</b><small>الدرجة المخططة للبند: '+fmt(c.p)+'</small></div><div class="ea-criterion-score-pair"><div><span>المخطط</span><b>'+fmt(c.p)+'</b></div>'+input+'</div></div><div class="ea-criterion-evidence-grid">'+renderEvidenceSlot({dept,activity,criterionId:c.i,kind:'standard',label:'الوضع المعياري',evidence})+renderEvidenceSlot({dept,activity,criterionId:c.i,kind:'current',label:'الوضع الحالي',evidence})+'</div></article>';
  }).join('')+'</div>';
}

function teamCriteriaWithScores(team,evidence){
  return (team.criteria||[]).map(c=>({...c,a:criterionActual(evidence,c.i)}));
}
async function loadTeamCreateEvidence(team){
  return loadEvidence('__TEAM__',team.activity);
}
window.openExternalAuditTeamCreate=async key=>{
  const team=TEAM_CREATE_CATALOG[key];
  if(!team)return;
  window.__externalAuditCreateTeamKey=key;
  showScreen('externalAuditTeamCreateScreen');
  const root=document.getElementById('externalAuditTeamCreateRoot');
  if(!root)return;
  root.innerHTML='<div class="ea-v2-loading"><i class="bx bx-loader-alt bx-spin"></i><b>جاري فتح ملف إنشاء '+esc(team.name)+'...</b></div>';
  const evidence=await loadTeamCreateEvidence(team);
  const criteria=teamCriteriaWithScores(team,evidence);
  const actual=criteria.reduce((s,c)=>s+(c.a==null?0:Number(c.a)),0);
  const planned=criteria.reduce((s,c)=>s+Number(c.p||0),0);
  const entered=criteria.filter(c=>c.a!=null).length;
  root.innerHTML='<section class="ea-team-create-hero"><button class="ea-v2-back" onclick="goBack()"><i class="bx bx-arrow-back"></i> رجوع خطوة</button><span>TEAM CREATION / '+esc(team.code)+'</span><h1>إنشاء وتقييم '+esc(team.name)+'</h1><p>'+esc(team.description)+' هذا الملف مستقل عن الأقسام التشغيلية.</p><div class="ea-team-create-summary"><article><span>الفعلي المسجل</span><b>'+fmt(entered?actual:'—')+'</b></article><article><span>المخطط</span><b>'+fmt(planned)+'</b></article><article><span>نسبة التقييم</span><b>'+(entered?fmt(Math.round(actual/planned*1000)/10)+'%':'غير مسجل')+'</b></article><article><span>بنود مقيمة</span><b>'+entered+' / '+criteria.length+'</b></article></div></section><section class="ea-team-create-body"><div class="ea-team-create-head"><div><span>TEAM CREATION CRITERIA</span><h2>معايير إنشاء الفريق</h2><small>الدرجة الفعلية لا تُستنتج من درجات الأقسام؛ تُسجل هنا مباشرة على مستوى الفريق.</small></div></div><div class="ea-team-create-list">'+criteria.map(c=>{
    const input=canWriteEvidence()?'<input type="number" min="0" max="'+Number(c.p||0)+'" step="0.5" value="'+(c.a==null?'':c.a)+'" placeholder="غير مسجل" onchange="saveExternalAuditCriterionScore(\'__TEAM__\',\''+esc(team.activity)+'\','+Number(c.i)+',this.value)">':'<b class="ea-team-create-actual">'+(c.a==null?'غير مسجل':fmt(c.a))+'</b>';
    return '<article class="ea-team-create-row"><span class="ea-team-create-no">'+fmt(c.i)+'</span><div><b>'+esc(c.t)+'</b><small>المخطط: '+fmt(c.p)+'</small></div><label><span>الفعلي</span>'+input+'</label></article>';
  }).join('')+'</div></section>';
};

window.renderExternalAudit=async()=>{
  const root=document.getElementById('externalAuditRoot');if(!root)return;
  root.innerHTML='<div class="ea-v2-loading"><i class="bx bx-loader-alt bx-spin"></i><b>جاري تحميل المراجعة الخارجية...</b></div>';
  try{
    const d=await load(),as=acts(d),sel=S.activity,ds=d.departments.filter(x=>sel==='all'||x.items.some(i=>i.activity===sel));
    root.innerHTML='<section class="ea-v2-hero"><div><span>EXTERNAL AUDIT • H2 2026</span><h1>المراجعة الخارجية</h1><p>TPM ACTIVITY ← التصنيف الأول • DEPARTMENT ← التصنيف الثاني. ملفات إنشاء الفرق مستقلة عن الأقسام، بينما خطوات التنفيذ تُعرض بدرجات كل قسم ومعاييرها التفصيلية.</p></div><div class="ea-v2-source"><b>Ref.A</b><span>H2 2026</span><small>159 صفحة</small></div></section><section class="ea-v2-block"><div class="ea-v2-head"><div><span>TEAM CREATION</span><h2>إنشاء وتقييم فرق TPM</h2></div><small>ملفات مستقلة عن الأقسام</small></div><div class="ea-team-create-grid">'+Object.entries(TEAM_CREATE_CATALOG).map(([key,t])=>'<button type="button" class="ea-team-create-card" onclick="openExternalAuditTeamCreate('+jsArg(key)+')"><span>'+esc(t.code)+'</span><b>'+esc(t.name)+'</b><small>'+esc(t.description)+'</small><em>فتح ملف الإنشاء <i class="bx bx-left-arrow-alt"></i></em></button>').join('')+'</div></section><section class="ea-v2-block"><div class="ea-v2-head"><div><span>TPM ACTIVITY</span><h2>نشاط المراجعة</h2></div><button class="ea-v2-reset" onclick="setExternalAuditActivity(&quot;all&quot;)">كل الأنشطة</button></div><div class="ea-v2-activity-grid">'+as.map(a=>{const m=M[a]||[a,a,''];return '<button class="ea-v2-activity-card '+(sel===a?'active':'')+'" onclick="setExternalAuditActivity('+jsArg(a)+')"><span>'+esc(m[0])+'</span><b>'+esc(m[1])+'</b><small>'+esc(m[2])+'</small></button>'}).join('')+'</div></section><section class="ea-v2-block"><div class="ea-v2-head"><div><span>DEPARTMENT</span><h2>الأقسام</h2></div><small>'+esc(sel==='all'?'كل الأنشطة':M[sel]?.[1]||sel)+'</small></div><div class="ea-v2-dept-grid">'+ds.map(x=>{const o=overall(x.department),it=x.items.find(i=>i.activity===sel),score=sel==='all'?o.r:pct(it?.actual,it?.planned);const scoreText=score==null?'—':fmt(score)+'%';return '<button class="ea-v2-dept-card" onclick="openExternalAuditDepartment('+jsArg(x.department)+','+jsArg(sel==='all'?'':sel)+')"><div class="ea-v2-dept-top"><span>DEPARTMENT</span><b>'+esc(x.department)+'</b><strong>'+scoreText+'</strong></div><div class="ea-v2-bar"><i style="width:'+Math.min(100,Math.max(0,Number(score||0)))+'%"></i></div><div class="ea-v2-open">فتح صفحة القسم <i class="bx bx-left-arrow-alt"></i></div></button>'}).join('')+'</div></section>';
  }catch(e){console.error(e);root.innerHTML='<div class="ea-v2-error"><b>تعذر تحميل المراجعة الخارجية</b><span>'+esc(e.message)+'</span><button class="btn btn-outline" onclick="renderExternalAudit()">إعادة المحاولة</button></div>'}
};
window.renderExternalAuditDepartment=async n=>{
  const root=document.getElementById('externalAuditDepartmentRoot');if(!root)return;
  root.innerHTML='<div class="ea-v2-loading"><i class="bx bx-loader-alt bx-spin"></i><b>جاري فتح صفحة القسم...</b></div>';
  try{
    const d=await load(),x=getDept(n);if(!x)throw Error('القسم غير موجود');
    const o=overall(n),focus=S.activity==='all'?'all':S.activity,items=focus==='all'?x.items:x.items.filter(i=>i.activity===focus);
    const evidenceCache={};
    for(const it of items) evidenceCache[it.activity]=await loadEvidence(n,it.activity);
    const activityOptions=acts(d).map(a=>'<option value="'+esc(a)+'" '+(focus===a?'selected':'')+'>'+esc(M[a]?.[1]||a)+'</option>').join('');
    const panels=items.map((it,idx)=>{
      const m=M[it.activity]||[it.activity,it.activity,''];
      const p=it.planned,a=it.actual,s=pct(a,p),criteria=auditCriteriaFor(it.activity,it),evidence=evidenceCache[it.activity]||{};
      const scoreText=s==null?'غير مسجل':fmt(s)+'%';
      const criteriaCount=criteria.length;
      const criteriaHtml=renderCriterionCards(n,it.activity,criteria,evidence);
      return '<details class="ea-v2-activity-panel" '+(focus===it.activity||focus==='all'&&idx===0?'open':'')+'><summary><span><b>'+esc(m[0])+'</b><small>'+esc(m[1])+'</small></span><em>'+fmt(a)+' / '+fmt(p)+'</em><strong>'+scoreText+'</strong><i class="bx bx-chevron-down"></i></summary><div class="ea-v2-score-line"><div><span>الدرجة الفعلية</span><b>'+fmt(a)+'</b></div><div><span>الدرجة المخططة</span><b>'+fmt(p)+'</b></div><div><span>النسبة</span><b>'+scoreText+'</b></div></div><div class="ea-criteria-section"><div class="ea-criteria-section-head"><div><span>CRITERIA & FIELD EVIDENCE</span><h3>معايير التقييم وأدلة الميدان</h3><small>'+criteriaCount+' معيار · لكل معيار صورتان: الوضع المعياري والوضع الحالي</small></div><i class="bx bx-images"></i></div>'+criteriaHtml+'</div></details>';
    }).join('');
    root.innerHTML='<section class="ea-v2-detail-hero"><button class="ea-v2-back" onclick="goBack()"><i class="bx bx-arrow-back"></i> رجوع خطوة</button><span>DEPARTMENT</span><h1>'+esc(n)+'</h1><p>صفحة مستقلة لدرجات القسم ومعايير كل خطوة وأدلة الوضع المعياري والوضع الحالي.</p><div class="ea-v2-summary-grid"><article><span>الدرجة الفعلية</span><b>'+fmt(o.a)+'</b></article><article><span>الدرجة المخططة</span><b>'+fmt(o.p)+'</b></article><article><span>النسبة</span><b>'+fmt(o.r)+'%</b></article><article><span>الأنشطة المسجلة</span><b>'+fmt(o.c)+'</b></article></div></section><section class="ea-v2-detail-body"><div class="ea-v2-head"><div><span>TPM ACTIVITY</span><h2>تفاصيل الدرجات والمعايير</h2></div><select class="ea-v2-filter" onchange="setExternalAuditDepartmentActivity(this.value)"><option value="all" '+(focus==='all'?'selected':'')+'>كل الأنشطة</option>'+activityOptions+'</select></div><div class="ea-v2-activity-detail-list">'+panels+'</div></section>';
  }catch(e){console.error(e);root.innerHTML='<div class="ea-v2-error"><b>تعذر فتح صفحة القسم</b><span>'+esc(e.message)+'</span><button class="btn btn-outline" onclick="goBack()">رجوع</button></div>'}
};
})();
