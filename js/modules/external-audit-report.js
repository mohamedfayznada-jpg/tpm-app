(()=> {
const R='external-audit-h2-2026', S={data:null,plans:{},dept:'all',activity:'all',q:'',filter:'all',team:null};
window.EXTERNAL_AUDIT_FALLBACK_DATA={report:{title:'نتائج المراجعة الخارجية — النصف الثاني 2026',period:'النصف الثاني 2026',sourceFile:'TPM Detailed Report - Ref A - H2 2026.pdf',generatedFromPages:159},teams:[['5S','فريق 5S',86],['JH','فريق الصيانة الذاتية',65],['SHE','فريق السلامة والصحة والبيئة',74],['E&T','فريق التعليم والتدريب',80],['KK','فريق التحسين المستمر',69],['PM','فريق الصيانة المخططة',65]],departments:[{department:"الفاكيوم",items:[['5S',100,79],['JH-0',100,75],['JH-1',100,76],['JH-2',100,68],['JH-3',100,61],['JH-4',100,63],['JH-5',100,49],['JH-6',100,47],['JH-7',100,28],['PM-1',100,67],['PM-2',100,72],['PM-3',100,76],['PM-4',100,70],['PM-5',100,60],['PM-6',100,52],['PM-7',100,32],['E&T',100,79],['KK',100,61],['SHE',100,70]]},{department:"حقن الباب",items:[['5S',100,79],['JH-0',100,77],['JH-1',100,78],['JH-2',100,70],['JH-3',100,78],['JH-4',100,69],['JH-5',100,61],['JH-6',100,60],['JH-7',100,28],['PM-1',100,77],['PM-2',100,72],['PM-3',100,76],['PM-4',100,70],['PM-5',100,58],['PM-6',100,52],['PM-7',100,32],['E&T',100,79],['KK',100,61],['SHE',100,70]]},{department:"تشكيل المواسير",items:[['5S',100,90],['JH-0',100,83],['JH-1',100,80],['JH-2',100,73],['JH-3',100,76],['JH-4',175,116],['JH-5',100,50],['PM-1',100,67],['PM-2',100,72],['PM-3',100,76],['PM-4',100,70],['PM-5',100,60],['PM-6',100,52],['E&T',100,79],['KK',100,64],['SHE',100,70]]},{department:"حقن الكابينة",items:[['5S',100,84],['JH-0',100,79],['JH-1',100,75],['JH-2',100,82],['JH-3',100,77],['JH-4',100,62],['JH-5',100,50],['JH-6',100,47],['JH-7',100,28],['PM-1',100,67],['PM-2',100,72],['PM-3',100,76],['PM-4',100,70],['PM-5',100,58],['PM-6',100,52],['PM-7',100,32],['E&T',100,79],['KK',100,62],['SHE',100,70]]}]};
const esc=v=>window.escapeTPM?window.escapeTPM(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>firebase.auth&&firebase.auth().currentUser?firebase.auth().currentUser.uid:'';
const fmt=n=>new Intl.NumberFormat('ar-EG').format(Number(n||0));
const pc=n=>(Number(n||0).toFixed(Number(n)%1?1:0))+'%';
const avg=a=>a.length?a.reduce((x,y)=>x+Number(y||0),0)/a.length:0;
const deptScore=d=>{const p=(d?.items||[]).reduce((s,x)=>s+Number(x.planned||0),0),a=(d?.items||[]).reduce((s,x)=>s+Number(x.actual||0),0);return p?a/p*100:0};
const slug=s=>String(s||'').replace(/[^\w\u0600-\u06FF-]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
const emptyAuditData=()=>({report:{title:'نتائج المراجعة الخارجية',period:'غير محمل',sourceFile:'',generatedFromPages:0},teams:[],departments:[]});
async function load(){
 if(S.data)return;
 S.seedError='';
 try{
   const raw=String(window.EXTERNAL_AUDIT_SEED_B64||'').replace(/\s+/g,'');
   if(!raw)throw new Error('بيانات التقرير الأساسية غير متاحة');
   if(!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)||raw.length%4!==0)throw new Error('بيانات التقرير الأساسية تالفة أو غير مكتملة');
   const b=atob(raw),u=Uint8Array.from(b,c=>c.charCodeAt(0));
   if(u[0]!==0x1f||u[1]!==0x8b)throw new Error('ملف التقرير الأساسي ليس GZIP صالحاً');
   const st=new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'));
   S.data=JSON.parse(await new Response(st).text());
 }catch(e){
   console.warn('[External Audit] bundled seed unavailable; using verified score fallback.',e);
   const fb=window.EXTERNAL_AUDIT_FALLBACK_DATA;
   if(fb){
     S.data={
       report:fb.report,
       teams:fb.teams.map(x=>({id:x[0],name:x[1],score:x[2],percent:x[2]})),
       departments:fb.departments.map(d=>({department:d.department,items:d.items.map((x,i)=>({activity:x[0],planned:Number(x[1]||100),actual:Number(x[2]||0),percent:Number(x[1]||100)?Math.round(Number(x[2]||0)/Number(x[1]||100)*1000)/10:0,department:d.department,scorePage:0,findingsPage:0,sourceDepartment:d.department,dataQualityFlags:[],improvements:[],comments:[]}))}))
     };
   }else{
     S.seedError=e?.message||'تعذر تحميل التقرير الأساسي';
     S.data=emptyAuditData();
   }
 }
 normalizeAuditFindings();
 if(firebase.database&&uid()){
   try{S.plans=(await firebase.database().ref('tpm_system/external_audit_action_plans/'+R).once('value')).val()||{}}
   catch(e){console.warn('[External Audit] action plans unavailable',e)}
 }
}
const normalizeAuditFindings=()=>{
 if(!S.data)return;
 S.data.departments=(S.data.departments||[]).map(d=>({...d,items:(d.items||[]).map(x=>{
   const improvements=Array.isArray(x.improvements)?x.improvements:(Array.isArray(x.opportunities)?x.opportunities:(Array.isArray(x.findings)?x.findings:[]));
   const comments=Array.isArray(x.comments)?x.comments:(Array.isArray(x.strengths)?x.strengths:(Array.isArray(x.auditorNotes)?x.auditorNotes:(Array.isArray(x.notes)?x.notes:[])));
   const planned=Number(x.planned||0),actual=Number(x.actual||0);
   return {...x,planned,actual,percent:Number.isFinite(Number(x.percent))?Number(x.percent):(planned?actual/planned*100:0),improvements:improvements.map(v=>String(v||'').trim()).filter(Boolean),comments:comments.map(v=>String(v||'').trim()).filter(Boolean)};
 })}));
 S.data.teams=(S.data.teams||[]).map(t=>({...t,percent:Number(t.percent??t.score??0)}));
};
const teamMatchesActivity=(teamId,activity)=>{
 const a=String(activity||'').trim().toUpperCase().replace(/\s+/g,'');
 const t=String(teamId||'').trim().toUpperCase();
 return t==='5S'?a==='5S':t==='JH'?/^JH-\d+$/.test(a):t==='PM'?/^PM-\d+$/.test(a):a===t;
};
const teamScoreForDepartment=(teamId,department)=>{
 if(department==='all')return S.data.teams.find(t=>t.id===teamId)?.percent||0;
 const d=(S.data.departments||[]).find(x=>x.department===department);
 const rows=(d?.items||[]).filter(x=>teamMatchesActivity(teamId,x.activity));
 const planned=rows.reduce((s,x)=>s+Number(x.planned||0),0),actual=rows.reduce((s,x)=>s+Number(x.actual||0),0);
 return planned?actual/planned*100:0;
};
const items=()=>S.data.departments.flatMap(d=>d.items.map(x=>Object.assign({department:d.department},x)));
const imps=()=>items().flatMap(x=>(x.improvements||[]).map((t,i)=>({id:slug(x.department)+'__'+slug(x.activity)+'__'+i,department:x.department,activity:x.activity,text:t,page:x.findingsPage})));
const plan=id=>S.plans[id]||{status:'not_started',owner:'',dueDate:'',plan:'',responseNote:'',evidenceUrl:'',evidenceName:''};
const status=s=>({not_started:'لم يبدأ',in_progress:'جاري التنفيذ',blocked:'متوقف',done:'مكتمل'})[s]||'لم يبدأ';
window.renderExternalAudit=async function(){
 try{await load();const root=document.getElementById('externalAuditRoot');if(!root)return;const all=items(),allI=imps(),sel=S.dept==='all'?null:S.dept,allN=all.flatMap(x=>(x.comments||[]));
 const vis=all.filter(x=>(!sel||x.department===sel)&&(S.activity==='all'||x.activity===S.activity)&&(!S.q||[x.department,x.activity].concat(x.improvements||[],x.comments||[]).join(' ').toLowerCase().includes(S.q.toLowerCase())));
 const shown=allI.filter(x=>(!sel||x.department===sel)&&(!S.team||((S.team==='5S'&&x.activity==='5S')||(S.team==='JH'&&/^JH-\d+$/i.test(x.activity))||(S.team==='SHE'&&x.activity==='SHE')||(S.team==='E&T'&&x.activity==='E&T')||(S.team==='KK'&&x.activity==='KK')||(S.team==='PM'&&/^PM-\d+$/i.test(x.activity))))&&(!S.q||x.text.toLowerCase().includes(S.q.toLowerCase()))&&(S.filter==='all'||(S.filter==='open'&&plan(x.id).status!=='done')||(S.filter==='done'&&plan(x.id).status==='done')));
 let h=((S.seedError||!allI.length||!allN.length)?'<div class="ea-seed-warning" role="status"><i class="bx bx-error-circle"></i><div><b>تفاصيل المراجعة غير مكتملة في النسخة الحالية</b><span>'+esc(S.seedError||'تم تحميل الدرجات، لكن فرص التحسين وملاحظات المراجعين غير موجودة في النسخة المضمنة. استخدم «استيراد Excel» من نفس تقرير المراجعة لتحميلها بالكامل.')+'</span></div></div>':'')+'<section class="ea-hero"><div class="ea-hero-copy"><span class="ea-eyebrow">EXTERNAL AUDIT • H2 2026</span><h1>مركز قيادة المراجعة الخارجية</h1><p>نتائج الفرق والأقسام، فرص التحسين، وخطط الاستجابة في مساحة تشغيلية واحدة.</p><div class="ea-hero-actions"><button class="btn btn-primary" onclick="document.getElementById(\'eaXlsx\').click()">استيراد Excel</button><button class="btn btn-outline" onclick="document.getElementById(\'eaPdf\').click()">استيراد PDF</button><button class="btn btn-outline" onclick="window.print()">طباعة</button><input id="eaXlsx" type="file" accept=".xlsx,.xls,.xlsm" hidden onchange="window.importExternalAuditXlsx?.(event)"><input id="eaPdf" type="file" accept=".pdf" hidden onchange="window.importExternalAuditPdf?.(event)"></div></div><div class="ea-orbit"><b>H2</b><span>2026</span><em>RESULTS</em><em>RESPONSE</em></div></section>';
 const open=allI.filter(x=>plan(x.id).status!=='done').length,done=allI.length-open,evi=allI.filter(x=>plan(x.id).evidenceUrl).length;
 h+='<section class="ea-kpis">'+[['الأقسام',S.data.departments.length,'bx-buildings'],['الأنشطة',all.length,'bx-check-shield'],['فرص التحسين',allI.length,'bx-bulb'],['خطط مفتوحة',open,'bx-task'],['مكتمل',done,'bx-check-double'],['أدلة استجابة',evi,'bx-image']].map(x=>'<article class="ea-kpi"><i class="bx '+x[2]+'"></i><span>'+x[0]+'</span><b>'+fmt(x[1])+'</b></article>').join('')+'</section>';
 h+='<section class="ea-toolbar"><div class="ea-tabs"><button class="'+(S.filter==='all'?'active':'')+'" onclick="setEAF(\'all\')">كل الفرص</button><button class="'+(S.filter==='open'?'active':'')+'" onclick="setEAF(\'open\')">تحتاج استجابة</button><button class="'+(S.filter==='done'?'active':'')+'" onclick="setEAF(\'done\')">مغلقة</button></div><input class="ea-search" placeholder="ابحث في النتائج والملاحظات..." value="'+esc(S.q)+'" oninput="setEAQ(this.value)"><select class="ea-select" onchange="setEAD(this.value)"><option value="all">كل الأقسام</option>'+S.data.departments.map(d=>'<option '+(S.dept===d.department?'selected':'')+' value="'+esc(d.department)+'">'+esc(d.department)+'</option>').join('')+'</select><select class="ea-select" onchange="setEAA(this.value)"><option value="all">كل الأنشطة</option>'+Array.from(new Set(all.map(x=>x.activity))).map(a=>'<option '+(S.activity===a?'selected':'')+' value="'+esc(a)+'">'+esc(a)+'</option>').join('')+'</select></section>';
 h+='<section class="ea-section"><div class="ea-section-head"><div><span class="ea-eyebrow">TPM TEAMS</span><h2>نتائج الفرق</h2></div><span>كل فريق مستقل</span></div><div class="ea-team-grid">'+S.data.teams.map(t=>{const score=teamScoreForDepartment(t.id,S.dept);return '<button class="ea-team-card '+(S.team===t.id?'selected':'')+'" onclick="setEAT(\''+esc(t.id)+'\')"><i class="bx bx-shield"></i><span><small>'+esc(t.id)+'</small><b>'+esc(t.name)+'</b><em>'+(S.dept==='all'?'كل الأقسام':esc(S.dept))+'</em></span><strong>'+pc(score)+'</strong></button>'}).join('')join('')+'</div></section>';
 if(!S.team){h+='<section class="ea-section"><div class="ea-section-head"><div><span class="ea-eyebrow">OPERATIONAL DEPARTMENTS</span><h2>الأقسام التشغيلية</h2></div><span>كل قسم مستقل</span></div><div class="ea-dept-grid">'+S.data.departments.filter(d=>S.dept==='all'||d.department===S.dept).map(d=>{const q=vis.filter(x=>x.department===d.department);return '<article class="ea-dept-card"><div class="ea-dept-head"><div><span>DEPARTMENT</span><h3>'+esc(d.department)+'</h3><button class="ea-link" onclick="setEAD(\''+esc(d.department)+'\')">عرض القسم</button></div><b class="ea-score">'+pc(deptScore(d))+'</b></div><div class="ea-activity-list">'+q.map(x=>'<button class="ea-activity" onclick="openEA(\''+esc(x.department)+'\',\''+esc(x.activity)+'\')"><span><b>'+esc(x.activity)+'</b><small>'+fmt(x.improvements?.length||0)+' فرصة • '+fmt(x.comments?.length||0)+' ملاحظة</small></span><strong>'+pc(x.percent)+'</strong><i class="bx bx-chevron-left"></i></button>').join('')+'</div></article>'}).join('')+'</div></section>'}
 else {const t=S.data.teams.find(x=>x.id===S.team);h+='<section class="ea-section ea-team-detail"><div class="ea-section-head"><h2>'+esc(t?t.name:S.team)+'</h2><button class="ea-link" onclick="setEAT(\'\')">إغلاق</button></div><div class="ea-detail-hero"><div><span>النتيجة</span><b>'+pc(t?t.percent:0)+'</b></div><div><span>الفترة</span><b>H2 2026</b></div><div><span>المصدر</span><b>External Audit</b></div></div></section>'}
 h+='<section class="ea-section"><div class="ea-section-head"><div><span class="ea-eyebrow">EXECUTION BOARD</span><h2>فرص التحسين وخطط الاستجابة</h2></div><span>'+fmt(shown.length)+' بند</span></div><div class="ea-opportunity-list">'+(shown.length?shown.map(x=>{const p=plan(x.id);return '<article class="ea-opportunity '+(p.status==='done'?'is-done':'')+'"><div class="ea-opp-main"><div class="ea-opp-meta"><span>'+esc(x.department)+'</span><b>'+esc(x.activity)+'</b><em>صفحة '+fmt(x.page)+'</em></div><h3>'+esc(x.text)+'</h3><div class="ea-opp-actions"><span class="ea-status '+(p.status==='done'?'ea-done':p.status==='in_progress'?'ea-live':p.status==='blocked'?'ea-risk':'ea-muted')+'">'+status(p.status)+'</span>'+(p.owner?'<span>'+esc(p.owner)+'</span>':'')+(p.dueDate?'<span>'+esc(p.dueDate)+'</span>':'')+(p.evidenceUrl?'<button onclick="viewEAE(\''+esc(x.id)+'\')">دليل الاستجابة</button>':'')+'</div></div><button class="ea-plan-btn" onclick="openEAP(\''+esc(x.id)+'\')">'+(p.plan?'تعديل خطة العمل':'إضافة خطة عمل')+'</button></article>'}).join(''):'<div class="ea-empty"><i class="bx bx-bulb"></i><b>لا توجد فرص تحسين في النطاق المحدد</b><span>غيّر القسم أو النشاط أو الفلتر، أو استورد ملف Excel/PDF التفصيلي إذا كانت الفرص موجودة في المصدر.</span></div>')+'</div></section>';
 const notes=all.flatMap(x=>(x.comments||[]).map(t=>({d:x.department,a:x.activity,t:t,p:x.findingsPage}))).filter(x=>(!sel||x.d===sel)&&(!S.team||teamMatchesActivity(S.team,x.a))&&(!S.q||x.t.toLowerCase().includes(S.q.toLowerCase())));
 h+='<section class="ea-section"><div class="ea-section-head"><div><span class="ea-eyebrow">AUDITOR NOTES</span><h2>ملاحظات المراجع</h2></div><span>'+fmt(notes.length)+' ملاحظة</span></div><div class="ea-comments-grid">'+(notes.length?notes.map(x=>'<article class="ea-comment"><div><span>'+esc(x.d)+'</span><b>'+esc(x.a)+'</b></div><p>'+esc(x.t)+'</p><small>صفحة '+fmt(x.p)+'</small></article>').join(''):'<div class="ea-empty"><i class="bx bx-note"></i><b>لا توجد ملاحظات في النطاق المحدد</b><span>غيّر القسم أو الفريق أو البحث، أو استورد التقرير التفصيلي إذا كانت الملاحظات موجودة في المصدر.</span></div>')+'</div></section><div id="eaModal" class="ea-modal" hidden></div>';
 root.innerHTML=h;
 }catch(e){console.error(e);const r=document.getElementById('externalAuditRoot');if(r)r.innerHTML='<div class="ea-empty ea-error"><b>تعذر تحميل التقرير</b><span>'+esc(e.message)+'</span></div>'}
};
window.setEAD=v=>{S.dept=v;S.activity='all';renderExternalAudit()};window.setEAA=v=>{S.activity=v;renderExternalAudit()};window.setEAF=v=>{S.filter=v;renderExternalAudit()};window.setEAQ=v=>{S.q=v;renderExternalAudit()};window.setEAT=v=>{S.team=v||null;S.dept='all';S.activity='all';renderExternalAudit()};window.openEA=(d,a)=>{S.dept=d;S.activity=a;S.team=null;renderExternalAudit()};
window.openEAP=id=>{const r=imps().find(x=>x.id===id),p=plan(id),m=document.getElementById('eaModal');if(!r||!m)return;m.hidden=false;m.innerHTML='<div class="ea-modal-backdrop" onclick="closeEAM()"></div><div class="ea-modal-card"><div class="ea-modal-head"><div><span class="ea-eyebrow">RESPONSE PLAN</span><h3>خطة الاستجابة — '+esc(r.department)+' / '+esc(r.activity)+'</h3></div><button onclick="closeEAM()">×</button></div><div class="ea-source-box"><b>فرصة التحسين</b><p>'+esc(r.text)+'</p><small>صفحة '+fmt(r.page)+'</small></div><div class="ea-form-grid"><label>الحالة<select id="eas"><option value="not_started">لم يبدأ</option><option value="in_progress">جاري التنفيذ</option><option value="blocked">متوقف</option><option value="done">مكتمل</option></select></label><label>المسؤول<input id="eao" value="'+esc(p.owner)+'"></label><label>تاريخ الاستحقاق<input id="ead" type="date" value="'+esc(p.dueDate)+'"></label><label class="full">خطة العمل<textarea id="eap" rows="5">'+esc(p.plan)+'</textarea></label><label class="full">ملاحظات الاستجابة<textarea id="ean" rows="3">'+esc(p.responseNote)+'</textarea></label><label class="full ea-upload-box">صورة دليل الاستجابة<input id="eaf" type="file" accept="image/*"></label></div><div class="ea-modal-actions"><button class="btn btn-outline" onclick="closeEAM()">إلغاء</button><button class="btn btn-primary" onclick="saveEAP(\''+esc(id)+'\')">حفظ خطة الاستجابة</button></div></div>';document.getElementById('eas').value=p.status||'not_started'};
window.closeEAM=()=>{const m=document.getElementById('eaModal');if(m)m.hidden=true};
window.saveEAP=async id=>{if(!uid())return showToast('⚠️ سجّل الدخول أولاً');try{const r=imps().find(x=>x.id===id),old=plan(id),f=document.getElementById('eaf')?.files?.[0];let url=old.evidenceUrl||'',name=old.evidenceName||'';if(f){url=await new Promise((res,rej)=>{const rd=new FileReader();rd.onload=()=>res(rd.result);rd.onerror=rej;rd.readAsDataURL(f)});name=f.name}const d={id:id,reportId:R,department:r.department,activity:r.activity,status:document.getElementById('eas').value,owner:document.getElementById('eao').value.trim(),dueDate:document.getElementById('ead').value,plan:document.getElementById('eap').value.trim(),responseNote:document.getElementById('ean').value.trim(),evidenceUrl:url,evidenceName:name,updatedAt:new Date().toISOString(),updatedByUid:uid()};await firebase.database().ref('tpm_system/external_audit_action_plans/'+R+'/'+id).set(d);S.plans[id]=d;closeEAM();renderExternalAudit();showToast('✅ تم حفظ خطة الاستجابة ودليلها')}catch(e){console.error(e);showToast('❌ تعذر حفظ خطة الاستجابة')}};
window.viewEAE=id=>{const p=plan(id),m=document.getElementById('eaModal');if(!p.evidenceUrl||!m)return;m.hidden=false;m.innerHTML='<div class="ea-modal-backdrop" onclick="closeEAM()"></div><div class="ea-image-viewer"><button onclick="closeEAM()">×</button><img src="'+esc(p.evidenceUrl)+'"><b>'+esc(p.evidenceName||'دليل الاستجابة')+'</b></div>'};

function buildExternalAuditFromXlsx(wb){
 const toRows=name=>{const ws=wb.Sheets[name];return ws?XLSX.utils.sheet_to_json(ws,{defval:null,raw:false}):[]};
 const toMatrix=name=>{const ws=wb.Sheets[name];return ws?XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:false}):[]};
 const summary=toRows('Audit Summary');
 const notes=toRows('Notes – Full');
 const raw=toMatrix('Raw PDF Text');
 if(!summary.length)throw new Error('ورقة Audit Summary غير موجودة أو فارغة');
 const rawMap=new Map();
 raw.slice(1).forEach(r=>{if(r&&r[0]!=null)rawMap.set(Number(r[0]),{score:cleanEA(r[5]),narrative:cleanEA(r[6])})});
 const noteMap=new Map();
 notes.forEach(n=>{const id=Number(n.Record);if(!noteMap.has(id))noteMap.set(id,{improvements:[],creation:[]});const text=cleanEA(n['Full Note']);if(!text)return;if(n.Type==='فرصة تحسين')noteMap.get(id).improvements.push(text);if(n.Type==='Creation Comment')noteMap.get(id).creation.push(text)});
 const deptFromText=(text,activity)=>{
   const t=String(text||'').replace(/\s+/g,' ');
   const pos=t.toLowerCase().indexOf(String(activity||'').toLowerCase());
   if(pos<0)return '';
   const tail=t.slice(pos+String(activity||'').length,pos+String(activity||'').length+140);
   if(tail.includes('الفاكيوم'))return 'الفاكيوم';
   if(tail.includes('حقن الباب'))return 'حقن الباب';
   if(tail.includes('الباب حقن'))return 'حقن الباب';
   if(tail.includes('تشكيل المواسير'))return 'تشكيل المواسير';
   if(tail.includes('المواسير تشكيل'))return 'تشكيل المواسير';
   if(tail.includes('حقن الكابينة'))return 'حقن الكابينة';
   if(tail.includes('الكابينة حقن'))return 'حقن الكابينة';
   return '';
 };
 const parseComments=text=>{
   const t=cleanEA(text),m=t.match(/(?:5s|JH-\d+|PM-\d+|E&T|SHE|kk|KK)\s*Comment([\s\S]*?)(?=REF\.\s*B|$)/i);
   if(!m)return [];
   return tSplit(m[1]);
 };
 const teams=summary.filter(r=>String(r.Department||'')==='TPM Teams').map(r=>{
   const code=normEA(String(r.Activity||'').replace(/^Create\s+/i,'').replace(/\s+Team$/i,''));
   const n=noteMap.get(Number(r.Record));
   return {id:code,name:({5S:'فريق 5S',JH:'فريق الصيانة الذاتية',SHE:'فريق السلامة والصحة والبيئة','E&T':'فريق التعليم والتدريب',KK:'فريق التحسين المستمر',PM:'فريق الصيانة المخططة'})[code]||code,planned:Number(r['Planned Total']||0),actual:Number(r['Actual Total']||0),gap:Number(r.Gap||0),percent:Number(r['Score %']||0)*100,comments:n?.creation||[]};
 });
 const recs=summary.filter(r=>String(r.Department||'')!=='TPM Teams').map(r=>{
   const id=Number(r.Record),rawRow=rawMap.get(id)||{},activity=normEA(r.Activity),dept=deptFromText(rawRow.score,activity)||String(r.Department||''),planned=Number(r['Planned Total']||0),actual=Number(r['Actual Total']||0),n=noteMap.get(id)||{improvements:[],creation:[]};
   return {department:dept,activity,planned,actual,percent:planned?actual/planned*100:0,scorePage:Number(r['Score Page']||0),findingsPage:Number(r['Narrative Page']||0),improvements:n.improvements,comments:parseComments(rawRow.narrative).concat(n.creation||[])};
 });
 const groups={};recs.forEach(x=>{(groups[x.department]||(groups[x.department]=[])).push(x)});
 const departments=Object.entries(groups).map(([department,items])=>({department,items}));
 return {report:{title:'نتائج المراجعة الخارجية — النصف الثاني 2026',period:'النصف الثاني 2026',sourceFile:'TPM_Detailed_Report_RefA_H2_2026_Detailed.xlsx',generatedFromPages:159},teams,departments};
}
const cleanEA=v=>String(v??'').replace(/[\u200e\u200f]/g,'').replace(/\uE115|\uE116/g,'').replace(/\r/g,'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();
const normEA=v=>String(v??'').replace(/\s+Activity$/i,'').trim().replace(/^kk$/i,'KK').replace(/^e&t$/i,'E&T').replace(/^she$/i,'SHE');
const tSplit=v=>String(v??'').split(/\n+/).map(cleanEA).filter(x=>x.length>12);
window.importExternalAuditXlsx=async e=>{
 const f=e.target.files?.[0];if(!f)return;
 try{
   if(!window.XLSX)throw new Error('مكتبة Excel غير متاحة');
   showToast('⏳ جاري تحليل Audit Summary و Notes – Full...');
   const wb=XLSX.read(await f.arrayBuffer(),{dense:true});
   const d=buildExternalAuditFromXlsx(wb);
   S.data=d;S.seedError='';S.dept='all';S.activity='all';S.q='';S.filter='all';S.team=null;
   await renderExternalAudit();
   showToast('✅ تم تحميل '+fmt(d.departments.length)+' أقسام و'+fmt(imps().length)+' فرصة و'+fmt(allAuditNotes().length)+' ملاحظة');
 }catch(err){console.error('[External Audit] XLSX import failed',err);showToast('❌ '+err.message)}
 e.target.value='';
};
const allAuditNotes=()=>items().flatMap(x=>x.comments||[]);
window.importExternalAuditPdf=async e=>{const f=e.target.files?.[0];if(!f)return;try{if(!window.pdfjsLib)throw Error('PDF.js غير متاحة');showToast('⏳ جاري تحليل التقرير صفحة بصفحة...');const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise,pages=[];for(let n=1;n<=pdf.numPages;n++){const tc=await(await pdf.getPage(n)).getTextContent();pages.push(tc.items.map(x=>x.str).join(' '))}const d=parseExternalAuditPdf(pages);if(!d.departments.length)throw Error('لم أتعرف على بنية التقرير');S.data=d;S.dept='all';S.activity='all';S.q='';S.filter='all';S.team=null;await load();renderExternalAudit();showToast('✅ تم تحليل '+pages.length+' صفحة وتحميل النتائج الكاملة')}catch(err){console.error(err);showToast('❌ '+err.message)}e.target.value=''};
function parseExternalAuditPdf(pages){
 const norm=v=>String(v??'').normalize('NFKC').replace(/[\u200e\u200f]/g,'').replace(/\s+/g,' ').trim();
 const P=(pages||[]).map(norm);
 const teamDefs=[['5S','فريق 5S'],['JH','فريق الصيانة الذاتية'],['SHE','فريق السلامة والصحة والبيئة'],['E&T','فريق التعليم والتدريب'],['KK','فريق التحسين المستمر'],['PM','فريق الصيانة المخططة']];
 const teams=teamDefs.map(([id,name],i)=>{
   const t=P[i*2+1]||'';
   const m=t.match(/(\d+)\s+(\d+)\s+Ref\.\s*A\s+Create/i);
   const score=Number(m?.[2]||0);
   return {id,name,score,percent:score};
 });
 const scoreInfo=t=>{
   const m=t.match(/Ref\.\s*A\s+((?:5\s*S)|(?:J\s*H\s*-\s*\d+)|(?:P\s*M\s*-\s*\d+)|(?:E\s*&\s*T)|(?:k\s*k)|(?:S\s*H\s*E))\s+/i);
   if(!m)return null;
   const activity=m[1].replace(/\s+/g,'').toUpperCase();
   const before=t.slice(0,m.index);
   const nums=before.match(/(?<!\d)\d+(?!\d)/g)||[];
   if(nums.length<2)return null;
   const planned=Number(nums[nums.length-2]),actual=Number(nums[nums.length-1]);
   const footer=t.slice(m.index+m[0].length);
   const sm=footer.match(new RegExp('(.+?)\\s+0\\s+1\\s+0\\s+0\\s+'+actual+'\\s+Factory Name','i'));
   return {activity,planned,actual,sourceDepartment:norm(sm?.[1]||'')};
 };
 const splitFindings=t=>{
   const imp=t.match(/فرص\s+التحسين([\s\S]*?)(?=نقاط\s+القوة|REF\.\s*B|$)/i);
   const com=t.match(/نقاط\s+القوة([\s\S]*?)(?=REF\.\s*B|$)/i);
   const split=x=>{
     if(!x)return [];
     const parts=String(x).split(/(?=(?:مطلوب|تم\s+|توجد|يوجد|يتم|يتضح))/).map(norm).filter(v=>v.length>=25);
     return parts.length?parts:[norm(x)].filter(v=>v.length>=25);
   };
   return {improvements:split(imp?.[1]),comments:split(com?.[1])};
 };
 const canonicalSource=s=>{
   const x=norm(s);
   if(/الفاكيوم/.test(x))return 'الفاكيوم';
   if(/الباب\s*حقن|حقن\s*الباب/.test(x))return 'حقن الباب';
   if(/المواسير\s*تشكيل|تشكيل\s*المواسير/.test(x))return 'تشكيل المواسير';
   if(/الكابينة\s*حقن|حقن\s*الكابينة/.test(x))return 'حقن الكابينة';
   return x;
 };
 const ranges=[['الفاكيوم',14,51],['حقن الباب',52,89],['تشكيل المواسير',90,121],['حقن الكابينة',122,159]];
 const departments=ranges.map(([dept,start,end])=>{
   const items=[];
   for(let p=start;p<=Math.min(end,P.length);p+=2){
     const info=scoreInfo(P[p-1]||'');
     if(!info)continue;
     const findings=splitFindings(P[p]||'');
     const source=canonicalSource(info.sourceDepartment);
     items.push({
       activity:info.activity,scorePage:p,findingsPage:p+1,department:dept,
       sourceDepartment:source,dataQualityFlags:source&&source!==dept?['القسم في خانة المصدر لا يطابق مجموعة الصفحات']:[],
       planned:info.planned,actual:info.actual,
       percent:info.planned?Math.round(info.actual/info.planned*1000)/10:0,
       improvements:findings.improvements,comments:findings.comments
     });
   }
   return {department:dept,items};
 });
 return {
   report:{title:'نتائج المراجعة الخارجية — النصف الثاني 2026',period:'النصف الثاني 2026',sourceFile:'PDF import',generatedFromPages:P.length},
   teams,departments
 };
}
})();