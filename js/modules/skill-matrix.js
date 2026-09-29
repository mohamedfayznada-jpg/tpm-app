/* FACTORY OS — Skill Matrix V1 */
(() => {
  'use strict';

  const DB_ROOT = 'tpm_system/skill_matrix';
  const TARGET = 4;

  const SKILLS = {
    tpm: [
      { id:'tpm-foundation', name:'أساسيات TPM', weight:1 },
      { id:'tpm-losses', name:'فهم الفواقد وتحليلها', weight:1.2 },
      { id:'tpm-jh', name:'الصيانة الذاتية JH', weight:1.3 },
      { id:'tpm-clit', name:'CLIT والمعايير المؤقتة', weight:1.3 },
      { id:'tpm-tags', name:'التاجات واكتشاف الشذوذ', weight:1 },
      { id:'tpm-kaizen', name:'Kaizen / PDCA', weight:1 },
      { id:'tpm-oee', name:'OEE وقراءة مؤشرات الأداء', weight:1.1 },
      { id:'tpm-audit', name:'TPM Audit والتشخيص', weight:1.2 },
      { id:'tpm-visual', name:'Visual Management', weight:.8 },
      { id:'tpm-standard', name:'Standardization & Sustain', weight:1.1 }
    ],
    technical: [
      { id:'tech-process', name:'معرفة العملية التشغيلية', weight:1.2 },
      { id:'tech-machine', name:'تشغيل المعدة/الماكينة', weight:1.3 },
      { id:'tech-parameters', name:'ضبط ومراقبة المعلمات', weight:1.3 },
      { id:'tech-quality', name:'فحص الجودة ومعايير القبول', weight:1.2 },
      { id:'tech-troubleshoot', name:'استكشاف الأعطال', weight:1.4 },
      { id:'tech-changeover', name:'Changeover / Setup', weight:1.1 },
      { id:'tech-standard-work', name:'Standard Work / OPL', weight:1 },
      { id:'tech-tools', name:'استخدام العدد وأدوات القياس', weight:1.1 },
      { id:'tech-safety', name:'السلامة أثناء التشغيل', weight:1.3 },
      { id:'tech-response', name:'الاستجابة للحالة غير الطبيعية', weight:1.2 }
    ]
  };

  let matrixData = {};
  let activeDomain = 'tpm';
  let search = '';
  let selectedPerson = null;

  const esc = v => window.escapeTPM ? window.escapeTPM(v) : String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const skills = () => SKILLS[activeDomain] || [];
  const currentDept = () => String(window.currentJHDept || '').trim();
  const dbPath = () => currentDept() ? DB_ROOT + '/' + currentDept() : DB_ROOT;
  const canEdit = () => ['admin','engineer','auditor'].includes(window.currentUser?.role);

  function getPeople() {
    const users = window.usersData || {};
    const rows = Object.entries(users).map(([uid,u]) => {
      if (!u || typeof u !== 'object') return null;
      return { uid, name:String(u.name || u.username || '').trim(), dept:String(u.dept || u.department || '').trim(), role:String(u.role || '').trim(), status:String(u.status || '').trim() };
    }).filter(Boolean).filter(u => u.name && u.status !== 'pending');
    if (window.currentUser?.uid && !rows.some(u => u.uid === window.currentUser.uid) && window.currentUser?.name) {
      rows.push({uid:window.currentUser.uid,name:window.currentUser.name,dept:'',role:window.currentUser.role,status:'active'});
    }
    const dept=currentDept();
    const scoped=dept ? rows.filter(u => String(u.dept || '').trim()===dept || String(u.department || '').trim()===dept) : rows;
    return scoped.sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  }

  function score(uid, domain, skillId) {
    return Number(matrixData?.[uid]?.[domain]?.[skillId] ?? 0);
  }

  function personStats(uid, domain) {
    const list = SKILLS[domain] || [];
    let weighted=0, weightTotal=0, gaps=0;
    list.forEach(s => {
      const value=score(uid,domain,s.id);
      weighted += value*s.weight; weightTotal += s.weight;
      if (value < TARGET) gaps++;
    });
    const avg=weightTotal ? weighted/weightTotal : 0;
    return { avg, gaps, pct:Math.round((avg/TARGET)*100) };
  }

  function renderKPIs() {
    const people=getPeople(), domain=activeDomain, list=skills();
    const all=people.flatMap(p=>list.map(s=>score(p.uid,domain,s.id)));
    const avg=all.length ? all.reduce((a,b)=>a+b,0)/all.length : 0;
    const gaps=all.filter(v=>v<TARGET).length;
    const critical=people.filter(p=>personStats(p.uid,domain).avg<2).length;
    const k=document.getElementById('skillMatrixKpis');
    if(!k)return;
    k.innerHTML=[
      ['bx-group','العاملون',people.length],
      ['bx-bar-chart-alt-2','متوسط المستوى',avg.toFixed(1)+' / '+TARGET],
      ['bx-error-circle','فجوات مهارية',gaps],
      ['bx-user-x','يحتاجون خطة',critical]
    ].map(x=>'<article class="skill-kpi"><i class="bx '+x[0]+'"></i><div><strong>'+x[2]+'</strong><span>'+x[1]+'</span></div></article>').join('');
  }

  function scoreOptions(value) {
    return [0,1,2,3,4].map(v=>'<option value="'+v+'" '+(Number(value)===v?'selected':'')+'>'+v+' — '+(['غير مقيم','مبتدئ','أساسي','متمكن','متقدم'][v])+'</option>').join('');
  }

  function renderMatrix() {
    const mount=document.getElementById('skillMatrixTable');
    if(!mount)return;
    const q=search.toLowerCase();
    const people=getPeople().filter(p=>!q || (p.name+' '+p.dept+' '+p.role).toLowerCase().includes(q));
    const list=skills();

    if(!people.length){
      mount.innerHTML='<div class="skill-empty"><i class="bx bx-user-x"></i><h3>لا يوجد عاملون مطابقون</h3><p>تحقق من المستخدمين أو غيّر البحث.</p></div>';
      return;
    }

    mount.innerHTML='<div class="skill-matrix-scroll"><table><thead><tr><th class="skill-person-col">العامل</th>'+list.map(s=>'<th title="'+esc(s.name)+'">'+esc(s.name)+'</th>').join('')+'<th>المتوسط</th><th>الفجوات</th></tr></thead><tbody>'+
      people.map(p=>{
        const st=personStats(p.uid,activeDomain);
        return '<tr><th class="skill-person"><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.dept||'غير محدد')+'</small></div></th>'+
          list.map(s=>'<td><select '+(canEdit()?'':'disabled')+' aria-label="'+esc(p.name)+' — '+esc(s.name)+'" onchange="window.saveSkillScore(\''+esc(p.uid)+'\',\''+activeDomain+'\',\''+s.id+'\',this.value)">'+scoreOptions(score(p.uid,activeDomain,s.id))+'</select></td>').join('')+
          '<td><span class="skill-avg '+(st.avg<2?'critical':st.avg<3?'watch':'good')+'">'+st.avg.toFixed(1)+'</span></td>'+
          '<td><b class="skill-gap-count">'+st.gaps+'</b></td></tr>';
      }).join('')+'</tbody></table></div>';

    renderKPIs();
  }

  function renderTrainingPlan() {
    const mount=document.getElementById('skillTrainingPlan');
    if(!mount)return;
    const people=getPeople();
    const candidates=[];
    people.forEach(p=>{
      ['tpm','technical'].forEach(domain=>{
        SKILLS[domain].forEach(s=>{
          const current=score(p.uid,domain,s.id), gap=TARGET-current;
          if(gap>0) candidates.push({person:p,domain,skill:s,current,gap,priority:gap*s.weight});
        });
      });
    });
    candidates.sort((a,b)=>b.priority-a.priority);
    const top=candidates.slice(0,20);
    if(!top.length){
      mount.innerHTML='<div class="skill-plan-empty"><i class="bx bx-check-shield"></i><strong>لا توجد فجوات تدريبية مسجلة.</strong><span>كل المهارات الحالية عند المستوى المستهدف.</span></div>';
      return;
    }
    const plan=top.map((x,i)=>{
      const level=x.current;
      const action=level<=1?'تدريب تأسيسي + تطبيق ميداني':level===2?'تدريب تطبيقي + OJT':'تدريب تحسين + تقييم تحقق';
      return '<article class="skill-plan-row"><span class="skill-plan-rank">'+(i+1)+'</span><div class="skill-plan-person"><strong>'+esc(x.person.name)+'</strong><small>'+esc(x.person.dept||'')+'</small></div><div class="skill-plan-skill"><b>'+esc(x.skill.name)+'</b><small>'+ (x.domain==='tpm'?'TPM':'فني') +' · المستوى '+level+' → '+TARGET+'</small></div><span class="skill-plan-gap">-'+x.gap+'</span><div class="skill-plan-action"><b>'+action+'</b><small>أولوية '+Math.round(x.priority*10)/10+'</small></div></article>';
    }).join('');
    mount.innerHTML='<div class="skill-plan-head"><div><span class="eyebrow">TRAINING NEEDS ANALYSIS</span><h3>خطة التدريب المبنية على الفجوات</h3><p>الأولوية تُحسب من حجم الفجوة × وزن المهارة، وتجمع مهارات TPM والمهارات الفنية.</p></div><button class="btn btn-outline" onclick="window.exportSkillTrainingPlan()"><i class="bx bx-export"></i> تصدير الخطة</button></div>'+plan;
  }

  async function load() {
    if (!window.firebase?.database || !window.currentUser?.uid || !currentDept()) return;
    try {
      const snap=await firebase.database().ref(dbPath()).once('value');
      matrixData=snap.val() || {};
      window.renderSkillMatrix?.();
    } catch(error) {
      console.error('[Skill Matrix] load failed',error);
      window.showToast?.('⚠️ تعذر تحميل مصفوفة المهارات.');
    }
  }

  async function saveSkillScore(uid,domain,skillId,value) {
    if(!canEdit()) return window.showToast?.('⚠️ لا تملك صلاحية تعديل مصفوفة المهارات.');
    const v=Math.max(0,Math.min(TARGET,Number(value)||0));
    try {
      await firebase.database().ref(dbPath()+'/'+uid+'/'+domain+'/'+skillId).set({
        score:v, updatedAt:Date.now(), updatedByUid:window.currentUser.uid, updatedByName:window.currentUser.name||''
      });
      matrixData[uid]=matrixData[uid]||{};
      matrixData[uid][domain]=matrixData[uid][domain]||{};
      matrixData[uid][domain][skillId]=v;
      renderMatrix();
      renderTrainingPlan();
    } catch(error) {
      console.error('[Skill Matrix] save failed',error);
      window.showToast?.('⚠️ تعذر حفظ مستوى المهارة.');
    }
  }

  function renderTraining() {
    renderTrainingPlan();
    const panel=document.getElementById('skillTrainingPanel');
    if(panel) panel.hidden=false;
    document.getElementById('skillTrainingPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function setDomain(domain) {
    if(!SKILLS[domain])return;
    activeDomain=domain;
    document.querySelectorAll('[data-skill-domain]').forEach(b=>b.classList.toggle('active',b.dataset.skillDomain===domain));
    const title=document.getElementById('skillMatrixDomainTitle');
    if(title)title.textContent=domain==='tpm'?'مهارات خاصة بالـ TPM':'مهارات فنية خاصة بالعمليات';
    renderMatrix();
  }

  function render() {
    renderKPIs(); renderMatrix(); renderTrainingPlan();
  }

  window.renderSkillMatrix=render;
  window.openJHDepartmentSkillMatrix=function(){
    if(!currentDept()) return window.showToast?.('⚠️ اختر قسم JH أولًا.');
    window.showScreen?.('jhSkillMatrixScreen');
    load();
  };
  window.setSkillMatrixDomain=setDomain;
  window.showSkillTrainingPlan=renderTraining;
  window.saveSkillScore=saveSkillScore;
  window.exportSkillTrainingPlan=function(){
    const people=getPeople(), rows=[['العامل','القسم','المجال','المهارة','المستوى الحالي','المستوى المستهدف','الفجوة','الأولوية']];
    people.forEach(p=>['tpm','technical'].forEach(domain=>SKILLS[domain].forEach(s=>{
      const cur=score(p.uid,domain,s.id); if(cur<TARGET) rows.push([p.name,p.dept,domain==='tpm'?'TPM':'فني',s.name,cur,TARGET,TARGET-cur,Math.round((TARGET-cur)*s.weight*10)/10]);
    })));
    if(window.XLSX){const ws=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Training Plan');XLSX.writeFile(wb,'TPM-Training-Plan.xlsx');}
  };

  document.addEventListener('input',e=>{if(e.target?.id==='skillMatrixSearch'){search=e.target.value||'';renderMatrix();}});
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-skill-domain]');
    if(b)setDomain(b.dataset.skillDomain);
  });
  document.addEventListener('DOMContentLoaded',()=>{ if(document.getElementById('jhSkillMatrixScreen')) load(); });
  window.addEventListener('tpm:jh-skill-matrix-open',()=>{load();});
})();
