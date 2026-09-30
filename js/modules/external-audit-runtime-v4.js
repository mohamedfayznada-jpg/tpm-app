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
  if(activity==='Create JH Team') return CREATE_JH_TEAM_CRITERIA;
  const template=window.AUDIT_DATA?.[activity]?.items;
  if(Array.isArray(template)&&template.length){
    return template.map(x=>({i:Number(x.id),t:String(x.title||''),a:null,p:Number(x.maxScore||0)}));
  }
  return [];
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
function ensureCreateJHTeam(data){
  data.departments.forEach(dep=>{
    if(!dep.items.some(i=>i.activity==='Create JH Team')){
      dep.items.push({activity:'Create JH Team',planned:100,actual:null,criteria:CREATE_JH_TEAM_CRITERIA});
    }
  });
  return data;
}
async function load(){
  if(S.data)return S.data;
  try{S.data=ensureCreateJHTeam(norm(await seed()));}
  catch(e){console.warn('[External Audit]',e);S.data=ensureCreateJHTeam(norm(F));}
  return S.data;
}
const acts=d=>{const all=[...new Set(d.departments.flatMap(x=>x.items.map(i=>i.activity)))];const preferred=['5S','Create JH Team','JH-0','JH-1','JH-2','JH-3','JH-4','JH-5','JH-6','JH-7','PM-1','PM-2','PM-3','PM-4','PM-5','PM-6','PM-7','E&T','KK','SHE'];return all.sort((a,b)=>(preferred.indexOf(a)<0?999:preferred.indexOf(a))-(preferred.indexOf(b)<0?999:preferred.indexOf(b)));};
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
window.renderExternalAudit=async()=>{
  const root=document.getElementById('externalAuditRoot');if(!root)return;
  root.innerHTML='<div class="ea-v2-loading"><i class="bx bx-loader-alt bx-spin"></i><b>جاري تحميل المراجعة الخارجية...</b></div>';
  try{
    const d=await load(),as=acts(d),sel=S.activity,ds=d.departments.filter(x=>sel==='all'||x.items.some(i=>i.activity===sel));
    root.innerHTML='<section class="ea-v2-hero"><div><span>EXTERNAL AUDIT • H2 2026</span><h1>المراجعة الخارجية</h1><p>TPM ACTIVITY ← التصنيف الأول • DEPARTMENT ← التصنيف الثاني. افتح القسم ثم الخطوة لعرض معايير التقييم وأدلة الوضع المعياري والوضع الحالي.</p></div><div class="ea-v2-source"><b>Ref.A</b><span>H2 2026</span><small>159 صفحة</small></div></section><section class="ea-v2-block"><div class="ea-v2-head"><div><span>TPM ACTIVITY</span><h2>نشاط المراجعة</h2></div><button class="ea-v2-reset" onclick="setExternalAuditActivity(&quot;all&quot;)">كل الأنشطة</button></div><div class="ea-v2-activity-grid">'+as.map(a=>{const m=M[a]||[a,a,''];return '<button class="ea-v2-activity-card '+(sel===a?'active':'')+'" onclick="setExternalAuditActivity('+jsArg(a)+')"><span>'+esc(m[0])+'</span><b>'+esc(m[1])+'</b><small>'+esc(m[2])+'</small></button>'}).join('')+'</div></section><section class="ea-v2-block"><div class="ea-v2-head"><div><span>DEPARTMENT</span><h2>الأقسام</h2></div><small>'+esc(sel==='all'?'كل الأنشطة':M[sel]?.[1]||sel)+'</small></div><div class="ea-v2-dept-grid">'+ds.map(x=>{const o=overall(x.department),it=x.items.find(i=>i.activity===sel),score=sel==='all'?o.r:pct(it?.actual,it?.planned);const scoreText=score==null?'—':fmt(score)+'%';return '<button class="ea-v2-dept-card" onclick="openExternalAuditDepartment('+jsArg(x.department)+','+jsArg(sel==='all'?'':sel)+')"><div class="ea-v2-dept-top"><span>DEPARTMENT</span><b>'+esc(x.department)+'</b><strong>'+scoreText+'</strong></div><div class="ea-v2-bar"><i style="width:'+Math.min(100,Math.max(0,Number(score||0)))+'%"></i></div><div class="ea-v2-open">فتح صفحة القسم <i class="bx bx-left-arrow-alt"></i></div></button>'}).join('')+'</div></section>';
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
