/* FACTORY OS — Skill Matrix V2: department people + editable skill catalog */
(() => {
  'use strict';

  const DB_ROOT = 'tpm_system/skill_matrix';
  const TARGET = 4;
  const LEVELS = ['غير مقيم','مبتدئ','أساسي','متمكن','متقدم'];

  const DEFAULT_SKILLS = {
    tpm: [
      ['tpm-foundation','أساسيات TPM',1],['tpm-losses','فهم الفواقد وتحليلها',1.2],
      ['tpm-jh','الصيانة الذاتية JH',1.3],['tpm-clit','CLIT والمعايير المؤقتة',1.3],
      ['tpm-tags','التاجات واكتشاف الشذوذ',1],['tpm-kaizen','Kaizen / PDCA',1],
      ['tpm-oee','OEE وقراءة مؤشرات الأداء',1.1],['tpm-audit','TPM Audit والتشخيص',1.2],
      ['tpm-visual','Visual Management',.8],['tpm-standard','Standardization & Sustain',1.1]
    ].map(([id,name,weight])=>({id,name,weight})),
    technical: [
      ['tech-process','معرفة العملية التشغيلية',1.2],['tech-machine','تشغيل المعدة/الماكينة',1.3],
      ['tech-parameters','ضبط ومراقبة المعلمات',1.3],['tech-quality','فحص الجودة ومعايير القبول',1.2],
      ['tech-troubleshoot','استكشاف الأعطال',1.4],['tech-changeover','Changeover / Setup',1.1],
      ['tech-standard-work','Standard Work / OPL',1],['tech-tools','استخدام العدد وأدوات القياس',1.1],
      ['tech-safety','السلامة أثناء التشغيل',1.3],['tech-response','الاستجابة للحالة غير الطبيعية',1.2]
    ].map(([id,name,weight])=>({id,name,weight}))
  };

  let matrixData = {};
  let peopleData = {};
  let skillsData = {tpm:[],technical:[]};
  let activeDomain = 'tpm';
  let search = '';
  let managementTab = 'people';

  const esc = v => window.escapeTPM ? window.escapeTPM(v) : String(v ?? '').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const currentDept = () => {
    try { if (typeof currentJHDept !== 'undefined' && currentJHDept) return String(currentJHDept).trim(); } catch (_) {}
    return String(window.currentJHDept || '').trim();
  };
  const dbPath = () => currentDept() ? DB_ROOT + '/' + currentDept() : DB_ROOT;
  const metaPath = () => dbPath() + '/_meta';
  const canEdit = () => ['admin','engineer','auditor'].includes(window.currentUser?.role);
  const skillList = () => skillsData[activeDomain] || [];

  function notify(msg){ window.showToast?.(msg); }

  function seedDefaults(raw) {
    const result = raw && typeof raw === 'object' ? raw : {};
    ['tpm','technical'].forEach(domain => {
      if (!result[domain] || !Object.keys(result[domain]).length) {
        result[domain] = {};
        DEFAULT_SKILLS[domain].forEach(s => { result[domain][s.id] = {...s, active:true}; });
      }
    });
    return result;
  }

  function normalizePeople(raw) {
    if (!raw || typeof raw !== 'object') return {};
    const out = {};
    Object.entries(raw).forEach(([id,p]) => {
      if (!p || typeof p !== 'object' || !String(p.name||'').trim()) return;
      out[id] = {id, name:String(p.name).trim(), job:String(p.job||'').trim(), active:p.active!==false, createdAt:p.createdAt||Date.now(), createdByUid:p.createdByUid||''};
    });
    return out;
  }

  function getSystemPeopleForDept() {
    const users = window.usersData || {}, dept=currentDept();
    return Object.entries(users).map(([uid,u]) => {
      if (!u || typeof u !== 'object') return null;
      const name=String(u.name||u.username||'').trim();
      const userDept=String(u.dept||u.department||'').trim();
      if (!name || u.status==='pending' || !dept || userDept!==dept) return null;
      return {id:uid,name,job:String(u.role||'').trim(),active:true,systemUid:uid};
    }).filter(Boolean);
  }

  function getPeople() {
    const manual=Object.values(peopleData).filter(p=>p.active!==false);
    const system=getSystemPeopleForDept();
    const merged=new Map();
    [...manual,...system].forEach(p=>{ if(p?.name) merged.set(p.id,p); });
    return [...merged.values()].sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  }

  function score(personId,domain,skillId) {
    const raw=matrixData?.[personId]?.[domain]?.[skillId];
    return Number(raw && typeof raw==='object' ? raw.score : raw ?? 0) || 0;
  }

  function personStats(personId,domain) {
    const list=skillList(); let weighted=0,total=0,gaps=0;
    list.forEach(s=>{const v=score(personId,domain,s.id);weighted+=v*Number(s.weight||1);total+=Number(s.weight||1);if(v<TARGET)gaps++;});
    const avg=total?weighted/total:0;
    return {avg,gaps,pct:Math.round(avg/TARGET*100)};
  }

  function renderKPIs() {
    const people=getPeople(), list=skillList(), all=people.flatMap(p=>list.map(s=>score(p.id,activeDomain,s.id)));
    const avg=all.length?all.reduce((a,b)=>a+b,0)/all.length:0;
    const gaps=all.filter(v=>v<TARGET).length;
    const critical=people.filter(p=>personStats(p.id,activeDomain).avg<2).length;
    const k=document.getElementById('skillMatrixKpis'); if(!k)return;
    k.innerHTML=[
      ['bx-group','العاملون',people.length],['bx-bar-chart-alt-2','متوسط المستوى',avg.toFixed(1)+' / '+TARGET],
      ['bx-error-circle','فجوات مهارية',gaps],['bx-user-x','يحتاجون خطة',critical]
    ].map(x=>'<article class="skill-kpi"><i class="bx '+x[0]+'"></i><div><strong>'+x[2]+'</strong><span>'+x[1]+'</span></div></article>').join('');
  }

  function scoreOptions(value) {
    return [0,1,2,3,4].map(v=>'<option value="'+v+'" '+(Number(value)===v?'selected':'')+'>'+v+' — '+LEVELS[v]+'</option>').join('');
  }

  function renderMatrix() {
    const mount=document.getElementById('skillMatrixTable'); if(!mount)return;
    const q=search.toLowerCase();
    const people=getPeople().filter(p=>!q || (p.name+' '+p.job).toLowerCase().includes(q));
    const list=skillList();
    if(!people.length){
      mount.innerHTML='<div class="skill-empty"><i class="bx bx-user-plus"></i><h3>لا يوجد عاملون بالقسم</h3><p>استخدم «إضافة عامل» لإضافة الأسماء الخاصة بهذا القسم.</p></div>';
      renderKPIs(); renderMobileMatrix(); return;
    }
    if(!list.length){
      mount.innerHTML='<div class="skill-empty"><i class="bx bx-wrench"></i><h3>لا توجد مهارات</h3><p>أضف مهارة من «إدارة المهارات» للبدء.</p></div>';
      renderKPIs(); renderMobileMatrix(); return;
    }
    mount.innerHTML='<div class="skill-matrix-scroll"><table><thead><tr><th class="skill-person-col">العامل</th>'+
      list.map(s=>'<th title="'+esc(s.name)+'">'+esc(s.name)+'</th>').join('')+
      '<th>المتوسط</th><th>الفجوات</th></tr></thead><tbody>'+
      people.map(p=>{
        const st=personStats(p.id,activeDomain);
        return '<tr><th class="skill-person"><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.job||'عامل')+'</small></div></th>'+
          list.map(s=>'<td><select '+(canEdit()?'':'disabled')+' aria-label="'+esc(p.name)+' — '+esc(s.name)+'" onchange="window.saveSkillScore(\''+esc(p.id)+'\',\''+activeDomain+'\',\''+esc(s.id)+'\',this.value)">'+scoreOptions(score(p.id,activeDomain,s.id))+'</select></td>').join('')+
          '<td><span class="skill-avg '+(st.avg<2?'critical':st.avg<3?'watch':'good')+'">'+st.avg.toFixed(1)+'</span></td>'+
          '<td><b class="skill-gap-count">'+st.gaps+'</b></td></tr>';
      }).join('')+'</tbody></table></div>';
    renderKPIs();
    renderMobileMatrix();
  }

  function renderMobileMatrix() {
    const mount=document.getElementById('skillMatrixMobile'); if(!mount)return;
    const q=search.toLowerCase();
    const people=getPeople().filter(p=>!q || (p.name+' '+p.job).toLowerCase().includes(q));
    const list=skillList();
    if(!people.length || !list.length){
      mount.innerHTML='<div class="skill-mobile-empty"><i class="bx bx-grid-alt"></i><strong>'+(!people.length?'لا يوجد عاملون مطابقون للبحث.':'لا توجد مهارات في هذا المجال.')+'</strong></div>';
      return;
    }
    mount.innerHTML=people.map(p=>{
      const st=personStats(p.id,activeDomain);
      const tone=st.avg<2?'critical':st.avg<3?'watch':'good';
      const rows=list.map(s=>'<div class="skill-mobile-skill"><div><strong>'+esc(s.name)+'</strong><small>الوزن '+Number(s.weight||1).toFixed(1)+'</small></div><select '+(canEdit()?'':'disabled')+' aria-label="'+esc(p.name)+' — '+esc(s.name)+'" onchange="window.saveSkillScore(\\''+esc(p.id)+'\\',\\''+activeDomain+'\\',\\''+esc(s.id)+'\\',this.value)">'+scoreOptions(score(p.id,activeDomain,s.id))+'</select></div>').join('');
      return '<article class="skill-mobile-person-card"><header><div class="skill-mobile-avatar"><i class="bx bx-user"></i></div><div class="skill-mobile-person-copy"><strong>'+esc(p.name)+'</strong><small>'+esc(p.job||'عامل')+'</small></div><div class="skill-mobile-person-score '+tone+'"><b>'+st.avg.toFixed(1)+'</b><small>متوسط</small></div></header><div class="skill-mobile-meta"><span><i class="bx bx-error-circle"></i> '+st.gaps+' فجوات</span><span><i class="bx bx-target-lock"></i> الهدف '+TARGET+'</span><span>'+st.pct+'%</span></div><div class="skill-mobile-skills">'+rows+'</div></article>';
    }).join('');
  }

  function renderTrainingPlan() {
    const mount=document.getElementById('skillTrainingPlan'); if(!mount)return;
    const candidates=[];
    getPeople().forEach(p=>['tpm','technical'].forEach(domain=>
      (skillsData[domain]||[]).forEach(s=>{
        const current=score(p.id,domain,s.id),gap=TARGET-current;
        if(gap>0)candidates.push({person:p,domain,skill:s,current,gap,priority:gap*Number(s.weight||1)});
      })
    ));
    candidates.sort((a,b)=>b.priority-a.priority);
    const top=candidates.slice(0,30);
    if(!top.length){mount.innerHTML='<div class="skill-plan-empty"><i class="bx bx-check-shield"></i><strong>لا توجد فجوات تدريبية مسجلة.</strong><span>كل المهارات الحالية عند المستوى المستهدف.</span></div>';return;}
    const rows=top.map((x,i)=>{
      const action=x.current<=1?'تدريب تأسيسي + تطبيق ميداني':x.current===2?'تدريب تطبيقي + OJT':'تدريب تحسين + تقييم تحقق';
      return '<article class="skill-plan-row"><span class="skill-plan-rank">'+(i+1)+'</span><div class="skill-plan-person"><strong>'+esc(x.person.name)+'</strong><small>'+esc(x.person.job||'')+'</small></div><div class="skill-plan-skill"><b>'+esc(x.skill.name)+'</b><small>'+(x.domain==='tpm'?'TPM':'فني')+' · '+x.current+' → '+TARGET+'</small></div><span class="skill-plan-gap">-'+x.gap+'</span><div class="skill-plan-action"><b>'+action+'</b><small>أولوية '+Math.round(x.priority*10)/10+'</small></div></article>';
    }).join('');
    mount.innerHTML='<div class="skill-plan-head"><div><span class="eyebrow">TRAINING NEEDS ANALYSIS</span><h3>خطة التدريب المبنية على الفجوات</h3><p>الأولوية = حجم الفجوة × وزن المهارة. وتشمل TPM والمهارات الفنية للقسم.</p></div><button class="btn btn-outline" onclick="window.exportSkillTrainingPlan()"><i class="bx bx-export"></i> تصدير الخطة</button></div>'+rows;
  }

  async function load() {
    if(!window.firebase?.database || !window.currentUser?.uid || !currentDept())return;
    try{
      const snap=await firebase.database().ref(dbPath()).once('value');
      const raw=snap.val()||{};
      matrixData=raw.scores&&typeof raw.scores==='object' ? raw.scores : Object.fromEntries(Object.entries(raw).filter(([key])=>key!=='_meta'));
      peopleData=normalizePeople(raw._meta?.people);
      skillsData={tpm:[],technical:[]};
      const seeded=seedDefaults(raw._meta?.skills);
      ['tpm','technical'].forEach(domain=>skillsData[domain]=Object.values(seeded[domain]||{}).filter(s=>s&&s.active!==false));
      // Keep the catalog persistent so edits are department-specific and survive reloads.
      if(canEdit() && (!raw._meta?.skills || !raw._meta.skills.tpm || !raw._meta.skills.technical)){
        await firebase.database().ref(metaPath()+'/skills').set(seeded);
      }
      window.renderSkillMatrix?.();
    }catch(error){console.error('[Skill Matrix] load failed',error);notify('⚠️ تعذر تحميل مصفوفة المهارات.');}
  }

  async function saveSkillScore(personId,domain,skillId,value) {
    if(!canEdit())return notify('⚠️ لا تملك صلاحية تعديل مصفوفة المهارات.');
    const v=Math.max(0,Math.min(TARGET,Number(value)||0));
    try{
      await firebase.database().ref(dbPath()+'/scores/'+personId+'/'+domain+'/'+skillId).set({score:v,updatedAt:Date.now(),updatedByUid:window.currentUser.uid,updatedByName:window.currentUser.name||''});
      matrixData[personId]=matrixData[personId]||{};matrixData[personId][domain]=matrixData[personId][domain]||{};matrixData[personId][domain][skillId]=v;
      renderMatrix();renderTrainingPlan();
    }catch(error){console.error('[Skill Matrix] save score failed',error);notify('⚠️ تعذر حفظ مستوى المهارة.');}
  }

  async function savePerson() {
    if(!canEdit())return notify('⚠️ لا تملك صلاحية إدارة العاملين.');
    const name=(document.getElementById('skillPersonName')?.value||'').trim();
    const job=(document.getElementById('skillPersonJob')?.value||'').trim();
    const editId=(document.getElementById('skillPersonId')?.value||'').trim();
    if(name.length<2)return notify('⚠️ اكتب اسم العامل بالكامل.');
    const duplicate=Object.values(peopleData).some(p=>p.id!==editId && p.active!==false && String(p.name||'').trim().toLowerCase()===name.toLowerCase());
    if(duplicate)return notify('⚠️ هذا الاسم موجود بالفعل في قائمة العاملين اليدويين.');
    const now=Date.now();
    if(editId && peopleData[editId]){
      const data={...peopleData[editId],name,job,updatedAt:now,updatedByUid:window.currentUser?.uid||'',updatedByName:window.currentUser?.name||''};
      await firebase.database().ref(metaPath()+'/people/'+editId).set(data);
      peopleData[editId]=data;
      clearPersonForm();render();openManageModal('people');notify('✅ تم تحديث بيانات العامل.');
      return;
    }
    const id='person_'+now+'_'+Math.floor(Math.random()*1000);
    const data={id,name,job,active:true,createdAt:now,createdByUid:window.currentUser?.uid||'',createdByName:window.currentUser?.name||''};
    await firebase.database().ref(metaPath()+'/people/'+id).set(data);
    peopleData[id]=data;
    clearPersonForm();render();openManageModal('people');
    notify('✅ تم إضافة العامل إلى قسم '+currentDept());
  }

  function editPerson(id){
    const p=peopleData[id]; if(!p)return;
    const idEl=document.getElementById('skillPersonId');if(idEl)idEl.value=p.id;
    const nameEl=document.getElementById('skillPersonName');if(nameEl)nameEl.value=p.name||'';
    const jobEl=document.getElementById('skillPersonJob');if(jobEl)jobEl.value=p.job||'';
    const label=document.getElementById('skillPersonSaveLabel');if(label)label.textContent='حفظ التعديل';
    document.getElementById('skillPersonName')?.focus();
  }

  function clearPersonForm(){
    ['skillPersonId','skillPersonName','skillPersonJob'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    const label=document.getElementById('skillPersonSaveLabel');if(label)label.textContent='إضافة العامل';
  }

  async function togglePersonActive(id){
    if(!canEdit())return;
    const p=peopleData[id];if(!p)return;
    const next=p.active===false;
    const data={...p,active:next,updatedAt:Date.now(),updatedByUid:window.currentUser?.uid||'',updatedByName:window.currentUser?.name||''};
    await firebase.database().ref(metaPath()+'/people/'+id).set(data);
    peopleData[id]=data;render();openManageModal('people');notify(next?'✅ تم إعادة تفعيل العامل.':'⏸️ تم إيقاف العامل مع الحفاظ على بياناته ودرجاته.');
  }


  async function saveSkillDefinition() {
    if(!canEdit())return notify('⚠️ لا تملك صلاحية إدارة المهارات.');
    const id=(document.getElementById('skillDefId')?.value||'').trim();
    const name=(document.getElementById('skillDefName')?.value||'').trim();
    const weight=Number(document.getElementById('skillDefWeight')?.value||1);
    const domain=document.getElementById('skillDefDomain')?.value||activeDomain;
    if(name.length<2)return notify('⚠️ اكتب اسم المهارة.');
    const skillId=id || (domain==='tpm'?'tpm-':'tech-')+Date.now();
    const duplicate=(skillsData[domain]||[]).some(s=>s.id!==skillId && String(s.name||'').trim().toLowerCase()===name.toLowerCase());
    if(duplicate)return notify('⚠️ توجد مهارة بنفس الاسم داخل هذا المجال بالفعل.');
    const originalDomain=(document.getElementById('skillDefOriginalDomain')?.value||'').trim();
    const skill={id:skillId,name,weight:Number.isFinite(weight)&&weight>0?Math.min(5,weight):1,active:true,updatedAt:Date.now(),updatedByUid:window.currentUser?.uid||'',updatedByName:window.currentUser?.name||''};
    await firebase.database().ref(metaPath()+'/skills/'+domain+'/'+skillId).set(skill);
    if(id && originalDomain && originalDomain!==domain){
      await firebase.database().ref(metaPath()+'/skills/'+originalDomain+'/'+skillId).remove();
      skillsData[originalDomain]=skillsData[originalDomain].filter(s=>s.id!==skillId);
    }
    skillsData[domain]=[...skillsData[domain].filter(s=>s.id!==skillId),skill];
    activeDomain=domain;
    clearSkillForm();render();openManageModal('skills');notify(id?'✅ تم تعديل المهارة.':'✅ تمت إضافة المهارة.');
  }

  async function removeSkill(domain,id) {
    if(!canEdit())return;
    const s=(skillsData[domain]||[]).find(x=>x.id===id);if(!s)return;
    if(!confirm('حذف مهارة «'+s.name+'» من كتالوج هذا القسم؟\nلن يتم حذف درجاتها القديمة تلقائيًا.'))return;
    await firebase.database().ref(metaPath()+'/skills/'+domain+'/'+id).remove();
    skillsData[domain]=skillsData[domain].filter(x=>x.id!==id);
    render();openManageModal('skills');notify('🗑️ تم حذف المهارة.');
  }

  function editSkill(domain,id) {
    const s=(skillsData[domain]||[]).find(x=>x.id===id);if(!s)return;
    document.getElementById('skillDefId').value=s.id;
    document.getElementById('skillDefName').value=s.name;
    document.getElementById('skillDefWeight').value=s.weight||1;
    document.getElementById('skillDefDomain').value=domain;
    const original=document.getElementById('skillDefOriginalDomain');if(original)original.value=domain;
    document.getElementById('skillDefSaveLabel').textContent='حفظ التعديل';
    document.getElementById('skillDefName')?.focus();
  }

  function clearSkillForm() {
    ['skillDefId','skillDefName','skillDefWeight','skillDefOriginalDomain'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=id==='skillDefWeight'?'1':id==='skillDefOriginalDomain'?'': '';});
    const d=document.getElementById('skillDefDomain');if(d)d.value=activeDomain;
    const l=document.getElementById('skillDefSaveLabel');if(l)l.textContent='إضافة المهارة';
  }

  function renderManagement() {
    const mount=document.getElementById(managementTab==='people'?'skillPeopleList':'skillSkillsList');if(!mount)return;
    if(managementTab==='people'){
      const people=Object.values(peopleData).sort((a,b)=>Number(b.active!==false)-Number(a.active!==false) || String(a.name||'').localeCompare(String(b.name||''),'ar'));
      const systemPeople=getSystemPeopleForDept();
      mount.innerHTML='<div class="skill-manage-summary"><div><strong>'+people.filter(p=>p.active!==false).length+'</strong><span>عامل يدوي نشط</span></div><div><strong>'+people.filter(p=>p.active===false).length+'</strong><span>مؤرشف</span></div><div><strong>'+systemPeople.length+'</strong><span>حساب نظام</span></div></div>'+
        '<div class="skill-manage-list-head"><div><b>دليل العاملين للقسم</b><span>الحسابات النظامية تظهر تلقائيًا ولا يتم تعديل بياناتها من هنا.</span></div><button type="button" class="skill-mini-action" onclick="window.clearSkillPersonForm()"><i class="bx bx-plus"></i> جديد</button></div>'+
        (people.length?people.map(p=>'<article class="skill-person-manage-card '+(p.active===false?'is-inactive':'')+'"><div class="skill-person-manage-main"><div class="skill-person-avatar"><i class="bx bx-user"></i></div><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.job||'عامل')+'</small><span>'+ (p.active===false?'مؤرشف':'نشط') +'</span></div></div><div class="skill-person-manage-actions"><button class="skill-icon-btn" title="تعديل البيانات" onclick="window.editSkillPerson(\\''+esc(p.id)+'\\')"><i class="bx bx-edit-alt"></i></button><button class="skill-icon-danger" title="'+(p.active===false?'إعادة تفعيل':'إيقاف')+'" onclick="window.toggleSkillPerson(\\''+esc(p.id)+'\\')"><i class="bx '+(p.active===false?'bx-check-circle':'bx-archive-in')+'"></i></button></div></article>').join(''):
        '<div class="skill-manage-empty">لا توجد أسماء مضافة يدويًا بعد. أضف أول عامل لهذا القسم من النموذج أعلاه.</div>');
      if(systemPeople.length)mount.innerHTML += '<div class="skill-system-people"><div class="skill-system-head"><i class="bx bx-shield-quarter"></i><div><b>أعضاء النظام المرتبطون بالقسم</b><span>مصدرهم Users / صلاحيات النظام</span></div></div>'+systemPeople.map(p=>'<div class="skill-system-person"><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.job||'عضو نظام')+'</small></div><span><i class="bx bx-link"></i> مرتبط</span></div>').join('')+'</div>';
    }else{
      const domain=activeDomain,list=skillsData[domain]||[];
      mount.innerHTML='<div class="skill-manage-list-head"><div><b>كتالوج '+(domain==='tpm'?'مهارات TPM':'المهارات الفنية')+'</b><span>'+list.length+' مهارة</span></div></div>'+
        (list.length?list.map(s=>'<div class="skill-manage-row"><div><strong>'+esc(s.name)+'</strong><small>الوزن '+Number(s.weight||1).toFixed(1)+' · '+esc(domain==='tpm'?'TPM':'فني')+'</small></div><div class="skill-row-actions"><button class="skill-icon-btn" title="تعديل" onclick="window.editSkillDefinition(\''+domain+'\',\''+esc(s.id)+'\')"><i class="bx bx-edit-alt"></i></button><button class="skill-icon-danger" title="حذف" onclick="window.removeSkillDefinition(\''+domain+'\',\''+esc(s.id)+'\')"><i class="bx bx-trash"></i></button></div></div>').join(''):
        '<div class="skill-manage-empty">لا توجد مهارات في هذا المجال.</div>');
    }
  }

  function openManageModal(tab='people') {
    const modal=document.getElementById('skillManagementModal');if(!modal)return;
    if(!canEdit()){notify('⚠️ لا تملك صلاحية الإدارة.');return;}
    managementTab=tab;modal.style.display='flex'; const deptEl=document.getElementById('skillManageDeptName'); if(deptEl)deptEl.textContent=currentDept()||'القسم'; const deptInline=document.getElementById('skillManageDeptNameInline');if(deptInline)deptInline.textContent=currentDept()||'القسم';
    document.querySelectorAll('[data-skill-manage-tab]').forEach(b=>b.classList.toggle('active',b.dataset.skillManageTab===tab));
    document.getElementById('skillPeopleForm').style.display=tab==='people'?'grid':'none';
    document.getElementById('skillDefinitionForm').style.display=tab==='skills'?'grid':'none';
    if(tab==='skills')clearSkillForm();
    if(tab==='people')clearPersonForm();
    renderManagement();
  }

  function closeManageModal(){const modal=document.getElementById('skillManagementModal');if(modal)modal.style.display='none';}
  function render(){renderKPIs();renderMatrix();renderTrainingPlan();}

  window.renderSkillMatrix=render;
  window.openJHDepartmentSkillMatrix=function(){
    const dept=currentDept();if(!dept)return notify('⚠️ اختر قسم JH أولًا.');
    window.currentJHDept=dept;activeDomain='tpm';search='';matrixData={};peopleData={};skillsData={tpm:[],technical:[]};
    showScreen('jhSkillMatrixScreen');
    const title=document.getElementById('jhSkillDeptName');if(title)title.textContent=dept;
    load();
  };
  window.setSkillMatrixDomain=domain=>{if(!skillsData[domain])return;activeDomain=domain;document.querySelectorAll('[data-skill-domain]').forEach(b=>b.classList.toggle('active',b.dataset.skillDomain===domain));const title=document.getElementById('skillMatrixDomainTitle');if(title)title.textContent=domain==='tpm'?'مهارات خاصة بالـ TPM':'مهارات فنية خاصة بالعمليات';render();};
  window.showSkillTrainingPlan=()=>{renderTrainingPlan();const panel=document.getElementById('skillTrainingPanel');if(panel)panel.hidden=false;panel?.scrollIntoView({behavior:'smooth',block:'start'});};
  window.saveSkillScore=saveSkillScore;
  window.openSkillManagement=openManageModal;
  window.closeSkillManagement=closeManageModal;
  window.addSkillPerson=savePerson;
  window.editSkillPerson=editPerson;
  window.clearSkillPersonForm=clearPersonForm;
  window.toggleSkillPerson=togglePersonActive;
  window.saveSkillDefinition=saveSkillDefinition;
  window.editSkillDefinition=editSkill;
  window.removeSkillDefinition=removeSkill;
  window.clearSkillDefinitionForm=clearSkillForm;

  window.exportSkillTrainingPlan=function(){
    const rows=[['العامل','القسم','المجال','المهارة','المستوى الحالي','المستوى المستهدف','الفجوة','الأولوية']];
    getPeople().forEach(p=>['tpm','technical'].forEach(domain=>(skillsData[domain]||[]).forEach(s=>{
      const cur=score(p.id,domain,s.id);if(cur<TARGET)rows.push([p.name,currentDept(),domain==='tpm'?'TPM':'فني',s.name,cur,TARGET,TARGET-cur,Math.round((TARGET-cur)*Number(s.weight||1)*10)/10]);
    })));
    if(window.XLSX){const ws=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Training Plan');XLSX.writeFile(wb,'TPM-Training-Plan-'+(currentDept()||'Dept')+'.xlsx');}
  };

  document.addEventListener('input',e=>{if(e.target?.id==='skillMatrixSearch'){search=e.target.value||'';renderMatrix();}});
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-skill-domain]');if(b)window.setSkillMatrixDomain(b.dataset.skillDomain);
    const m=e.target.closest?.('[data-skill-manage-tab]');if(m)openManageModal(m.dataset.skillManageTab);
  });
  document.addEventListener('DOMContentLoaded',()=>{if(document.getElementById('jhSkillMatrixScreen')&&currentDept())load();});
  window.addEventListener('tpm:jh-skill-matrix-open',()=>{if(currentDept()){const title=document.getElementById('jhSkillDeptName');if(title)title.textContent=currentDept();load();}});
})();
