// JH Semantic Spreadsheet Importer
// Parses messy Excel/CSV sheets, infers the document schema, previews mappings,
// and writes only normalized records to the current JH department.
(function(){
  'use strict';

  const esc=v=>window.escapeTPM?window.escapeTPM(String(v??'')):String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm=v=>String(v??'').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();

  const SCHEMAS={
    CLIT:{
      label:'CLIT',
      fields:{
        region:{label:'المنطقة',required:true,aliases:['المنطقة','منطقة','zone','area','region','location','المكان','الموقع','محطة','خط','line','machine','ماكينة','equipment']},
        part:{label:'الجزء / نقطة الفحص',required:true,aliases:['الجزء','جزء','part','component','item','element','point','نقطة','النقطة','المعدة','المعدة جزء','component name']},
        operation:{label:'العملية',required:true,aliases:['العملية','نوع العملية','عملية','operation','activity','clit','clit type','type','c l i t','c/l/i/t','النشاط']},
        frequency:{label:'الدورية',required:false,aliases:['الدورية','التكرار','frequency','freq','period','periodicity','daily','weekly','monthly','yearly','يومي','اسبوعي','أسبوعي','شهري','سنوي']},
        action:{label:'الإجراء',required:true,aliases:['الإجراء','الاجراء','action','procedure','task','method','instruction','what to do','النشاط المطلوب']},
        optimalState:{label:'المعيار / الحالة المثلى',required:false,aliases:['المعيار','الحالة المثلى','standard','specification','spec','condition','optimal state','normal state','expected','target','المواصفة']},
        degradation:{label:'التدهور / غير الطبيعي',required:false,aliases:['التدهور','degradation','abnormal','abnormality','failure mode','defect','غير طبيعي','علامة التدهور']},
        tools:{label:'الأدوات',required:false,aliases:['الأدوات','ادوات','tools','tool','equipment used','طريقة التنفيذ','وسيلة']},
        machineState:{label:'حالة الماكينة',required:false,aliases:['حالة الماكينة','حالة المعدة','machine state','machine status','running','stop','stopped','حالة التشغيل']},
        timeBefore:{label:'زمن قبل',required:false,aliases:['قبل','زمن قبل','وقت قبل','time before','before time','before','baseline','standard time','وقت التنفيذ']},
        timeAfter:{label:'زمن بعد',required:false,aliases:['بعد','زمن بعد','وقت بعد','time after','after time','after','improved time','target time']}
      }
    },
    Contamination:{
      label:'مصادر التلوث',
      fields:{
        location:{label:'المكان',required:true,aliases:['المكان','الموقع','location','area','zone','مكان','where']},
        typeDesc:{label:'نوع التلوث',required:true,aliases:['نوع التلوث','التلوث','contamination','contamination type','source','مصدر التلوث','نوع']},
        severity:{label:'الشدة',required:false,aliases:['الشدة','severity','level','criticality','خطورة']},
        action:{label:'الإجراء',required:false,aliases:['الإجراء','الاجراء','action','countermeasure','control','حل','إجراء مضاد']}
      }
    },
    SOC:{
      label:'أماكن صعبة الوصول',
      fields:{
        location:{label:'المكان',required:true,aliases:['المكان','الموقع','location','area','zone','point']},
        reason:{label:'سبب الصعوبة',required:true,aliases:['سبب الصعوبة','السبب','reason','difficulty','hard to access','access problem']},
        barrier:{label:'العائق',required:false,aliases:['العائق','عائق','barrier','obstacle','obstruction']},
        action:{label:'الإجراء',required:false,aliases:['الإجراء','الاجراء','action','countermeasure','improvement','حل']}
      }
    },
    Safety:{
      label:'خريطة الأمان',
      fields:{
        hazard:{label:'الخطر',required:true,aliases:['الخطر','وصف الخطر','hazard','risk','danger','unsafe','hazard description']},
        location:{label:'المكان',required:true,aliases:['المكان','الموقع','location','area','zone','where']},
        level:{label:'مستوى الخطر',required:false,aliases:['مستوى الخطر','الشدة','severity','level','risk level','criticality']},
        control:{label:'إجراء التحكم',required:false,aliases:['الإجراء','التحكم','control','countermeasure','action','mitigation']}
      }
    },
    Anatomy:{
      label:'تشريح الماكينة',
      fields:{
        name:{label:'اسم الجزء',required:true,aliases:['اسم الجزء','الجزء','part','component','name','equipment','machine part']},
        desc:{label:'الوصف / الوظيفة',required:false,aliases:['الوصف','الشرح','الوصف والوظيفة','description','desc','function','purpose','inspection']},
        location:{label:'الموقع',required:false,aliases:['الموقع','المكان','location','area','zone']},
        machine:{label:'الماكينة',required:false,aliases:['الماكينة','المعدة','machine','equipment','asset']}
      }
    }
  };

  let state={type:'CLIT',fileName:'',sheet:'',rows:[],headers:[],headerRow:0,mapping:{},confidence:0,normalized:[]};

  function toast(msg){window.showToast?.(msg);}

  function getModal(){return document.getElementById('jhSemanticImportModal');}
  function setStatus(html){const el=document.getElementById('jhImportStatus');if(el)el.innerHTML=html||'';}

  function openModal(type){
    state={type:type||window.__jhActiveDocType||'CLIT',fileName:'',sheet:'',rows:[],headers:[],headerRow:0,mapping:{},confidence:0,normalized:[]};
    const modal=getModal(); if(!modal)return;
    const title=document.getElementById('jhImportTitle');
    if(title) title.innerHTML='<i class="bx bx-spreadsheet"></i> استيراد وتحليل '+esc(SCHEMAS[state.type]?.label||state.type);
    const input=document.getElementById('jhImportFile'); if(input)input.value='';
    const preview=document.getElementById('jhImportPreview'); if(preview)preview.innerHTML='<div class="jh-import-empty"><i class="bx bx-upload"></i><b>ارفع Excel أو CSV</b><span>التحليل لا يحتاج قالبًا ثابتًا.</span></div>';
    const mapping=document.getElementById('jhImportMapping'); if(mapping)mapping.innerHTML='';
    const save=document.getElementById('jhImportSave'); if(save)save.disabled=true;
    setStatus('');
    modal.style.display='flex';
  }

  function closeModal(){const modal=getModal();if(modal)modal.style.display='none';}

  function fieldScore(header,aliases){
    const h=norm(header); if(!h)return 0;
    let best=0;
    aliases.forEach(a=>{
      const x=norm(a); if(!x)return;
      if(h===x)best=Math.max(best,100);
      else if(h.includes(x)||x.includes(h))best=Math.max(best,78);
      else{
        const hs=new Set(h.split(' ')), xs=x.split(' ');
        const overlap=[...xs].filter(t=>t&&hs.has(t)).length;
        if(overlap)best=Math.max(best,Math.min(70,20+overlap*18));
      }
    });
    return best;
  }

  function semanticValueScore(field,value){
    const s=norm(value); if(!s)return 0;
    if(field==='operation')return /تنظيف|تنطيف|تزييت|تشحيم|فحص|تربيط|ربط|clean|lube|lubric|inspect|tighten|c|l|i|t/.test(s)?72:0;
    if(field==='frequency')return /يوم|اسبوع|أسبوع|شهر|سن|daily|week|month|year|hour|shift|يومى/.test(s)?70:0;
    if(/^time/.test(field))return /(?:\d+(?:[\.,]\d+)?\s*(?:ms|sec|s|ث|ثانية|min|m|د|minute|hr|h|س|ساعة))|^\d+(?:[\.,]\d+)?\s*:\s*\d{1,2}$/i.test(String(value))?75:0;
    if(field==='level')return /high|medium|low|حرج|عالي|متوسط|منخفض|critical/.test(s)?60:0;
    return 0;
  }

  function findHeaderRow(matrix, schema){
    let best={row:0,score:0};
    const limit=Math.min(matrix.length,20);
    for(let i=0;i<limit;i++){
      const row=matrix[i]||[];
      let score=0, matched=0;
      Object.values(schema.fields).forEach(f=>{
        const local=Math.max(...row.map(v=>fieldScore(v,f.aliases)),0);
        if(local>=55){matched++;score+=local;}
      });
      score+=Math.min(row.filter(v=>String(v??'').trim()).length,12)*2;
      if(matched>=1 && score>best.score)best={row:i,score,matched};
    }
    return best.matched?best.row:0;
  }

  function inferMapping(headers,rows,schema){
    const mapping={}; const used=new Set();
    Object.entries(schema.fields).forEach(([field,meta])=>{
      let best={idx:-1,score:0};
      headers.forEach((h,idx)=>{
        if(used.has(idx))return;
        const headerScore=fieldScore(h,meta.aliases);
        const sample=rows.slice(0,Math.min(rows.length,35)).map(r=>r?.[idx]).filter(v=>String(v??'').trim());
        const valueScore=sample.length?Math.max(...sample.map(v=>semanticValueScore(field,v))):0;
        const score=Math.min(100,headerScore*0.78+valueScore*0.22);
        if(score>best.score)best={idx,score};
      });
      if(best.idx>=0 && best.score>=32){mapping[field]={idx:best.idx,score:Math.round(best.score)};used.add(best.idx);}
    });
    // No-header fallback: assign likely columns by value semantics, then positional text columns.
    const missing=Object.keys(schema.fields).filter(f=>!mapping[f]);
    const available=headers.map((_,i)=>i).filter(i=>!used.has(i));
    missing.forEach(field=>{
      let best={idx:-1,score:0};
      available.forEach(idx=>{
        const sample=rows.slice(0,50).map(r=>r?.[idx]).filter(v=>String(v??'').trim());
        const valueScore=sample.length?Math.max(...sample.map(v=>semanticValueScore(field,v))):0;
        if(valueScore>best.score)best={idx,score:valueScore};
      });
      if(best.idx>=0 && best.score>=55){mapping[field]={idx:best.idx,score:Math.round(best.score)};used.add(best.idx);available.splice(available.indexOf(best.idx),1);}
    });
    // For required text fields with no semantic signal, use remaining text-heavy columns.
    Object.keys(schema.fields).filter(f=>schema.fields[f].required&&!mapping[f]).forEach(field=>{
      const candidate=available.find(idx=>rows.slice(0,30).filter(r=>typeof r?.[idx]==='string'&&norm(r[idx])).length>=Math.max(1,Math.floor(rows.length*.15)));
      if(candidate!==undefined){mapping[field]={idx:candidate,score:38};used.add(candidate);available.splice(available.indexOf(candidate),1);}
    });
    return mapping;
  }

  function value(row,m){return m&&m.idx!=null?String(row?.[m.idx]??'').trim():'';}

  function normalizeOperation(v){
    const s=norm(v);
    if(/تنظيف|تنطيف|clean/.test(s))return 'تنظيف';
    if(/تزييت|تشحيم|lube|lubric/.test(s))return 'تزييت';
    if(/فحص|inspect|inspection/.test(s))return 'فحص';
    if(/تربيط|ربط|tight/.test(s))return 'تربيط';
    return String(v??'').trim();
  }
  function normalizeFrequency(v){
    const s=norm(v);
    if(/يومي|daily|day/.test(s))return 'يومي';
    if(/اسبوع|أسبوع|weekly|week/.test(s))return 'أسبوعي';
    if(/شهر|monthly|month/.test(s))return 'شهري';
    if(/سن|yearly|annual|year/.test(s))return 'سنوي';
    return String(v??'').trim();
  }
  function normalizeLevel(v){
    const s=norm(v);
    if(/حرج|critical|high|عالي/.test(s))return 'high';
    if(/متوسط|medium|med/.test(s))return 'med';
    if(/منخفض|low/.test(s))return 'low';
    return String(v??'').trim();
  }

  function buildRecords(){
    const schema=SCHEMAS[state.type], rows=state.rows;
    state.normalized=rows.map((row,rowIndex)=>{
      const raw={};
      Object.keys(state.mapping).forEach(f=>raw[f]=value(row,state.mapping[f]));
      const base={
        id:window.uniqueNumericId().toString(),
        date:new Date().toLocaleDateString('ar-EG'),
        user:window.currentUser?.name||'',
        uid:firebase.auth().currentUser?.uid||'',
        createdAt:Date.now(),
        updatedAt:Date.now(),
        createdByUid:firebase.auth().currentUser?.uid||'',
        updatedByUid:firebase.auth().currentUser?.uid||'',
        updatedByName:window.currentUser?.name||'',
        schemaVersion:3,
        imported:true,
        importSource:state.fileName,
        importSheet:state.sheet,
        importRow:rowIndex+state.headerRow+2,
        importConfidence:Math.round(Object.values(state.mapping).reduce((s,m)=>s+m.score,0)/Math.max(1,Object.keys(state.mapping).length))
      };
      if(state.type==='CLIT'){
        Object.assign(base,{region:raw.region||'عام',part:raw.part||'',operation:normalizeOperation(raw.operation),frequency:normalizeFrequency(raw.frequency),action:raw.action||'',optimalState:raw.optimalState||'',degradation:raw.degradation||'',tools:raw.tools||'',machineState:raw.machineState||'',timeBefore:raw.timeBefore||'',timeAfter:raw.timeAfter||''});
      }else if(state.type==='Contamination'){
        Object.assign(base,{location:raw.location||'',typeDesc:raw.typeDesc||'',severity:raw.severity||'',action:raw.action||''});
      }else if(state.type==='SOC'){
        Object.assign(base,{location:raw.location||'',reason:raw.reason||'',barrier:raw.barrier||'',action:raw.action||''});
      }else if(state.type==='Safety'){
        Object.assign(base,{hazard:raw.hazard||'',location:raw.location||'',level:normalizeLevel(raw.level),control:raw.control||''});
      }else{
        Object.assign(base,{name:raw.name||'',desc:raw.desc||'',location:raw.location||'',machine:raw.machine||''});
      }
      return base;
    }).filter(r=>state.type==='CLIT'?r.action||r.part||r.region:(r.location||r.hazard||r.name));
  }

  function renderMapping(){
    const el=document.getElementById('jhImportMapping'); if(!el)return;
    const schema=SCHEMAS[state.type];
    const rows=Object.entries(schema.fields).map(([field,meta])=>{
      const m=state.mapping[field];
      return '<div class="jh-import-map-row"><div><b>'+esc(meta.label)+'</b><small>'+ (meta.required?'مطلوب':'اختياري') +'</small></div><select data-import-field="'+esc(field)+'"><option value="-1">— لم يتم التعرف —</option>'+state.headers.map((h,i)=>'<option value="'+i+'" '+(m?.idx===i?'selected':'')+'>'+esc(String.fromCharCode(65+i))+' · '+esc(h||('عمود '+(i+1)))+'</option>').join('')+'</select><span class="'+(m&&m.score>=70?'good':m&&m.score>=50?'mid':'low')+'">'+(m?m.score+'%':'—')+'</span></div>';
    }).join('');
    el.innerHTML='<div class="jh-import-map-head"><b>فهم الأعمدة</b><span>يمكنك تصحيح أي تخمين قبل الحفظ.</span></div>'+rows;
    el.querySelectorAll('[data-import-field]').forEach(sel=>sel.addEventListener('change',e=>{const field=e.target.dataset.importField;const idx=Number(e.target.value);if(idx<0)delete state.mapping[field];else state.mapping[field]={idx,score:100};state.normalized=buildRecords();renderPreview();}));
  }

  function renderPreview(){
    const el=document.getElementById('jhImportPreview');if(!el)return;
    state.normalized=buildRecords();
    const schema=SCHEMAS[state.type];
    const missing=Object.entries(schema.fields).filter(([f,m])=>m.required&&!state.mapping[f]).map(([,m])=>m.label);
    const rows=state.normalized.slice(0,8);
    const cols=state.type==='CLIT'?['region','part','operation','frequency','action','timeBefore','timeAfter']:Object.keys(schema.fields);
    let html='<div class="jh-import-preview-head"><b>'+state.normalized.length+' سجل قابل للاستيراد</b><span>العينة: '+Math.min(8,state.normalized.length)+' صف</span></div>';
    if(missing.length)html+='<div class="jh-import-warning"><i class="bx bx-error"></i> حقول مطلوبة لم تُفهم: '+esc(missing.join('، '))+'</div>';
    html+='<div class="jh-import-table-wrap"><table><thead><tr>'+cols.map(c=>'<th>'+esc(schema.fields[c]?.label||c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(c=>'<td>'+esc(r[c]||'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
    el.innerHTML=html;
    const save=document.getElementById('jhImportSave');if(save)save.disabled=!state.normalized.length||missing.length>0;
    setStatus(state.normalized.length?'<span class="ok">✓ تم تحليل الملف واكتشاف بنية البيانات</span>':'<span class="bad">لم يتم العثور على سجلات قابلة للاستيراد.</span>');
  }

  async function analyzeFile(file){
    if(!file)return;
    if(!window.XLSX){setStatus('<span class="bad">مكتبة قراءة Excel غير متاحة. أعد تحميل الصفحة.</span>');return;}
    const status=document.getElementById('jhImportStatus'); if(status)status.innerHTML='<span class="loading"><i class="bx bx-loader-alt bx-spin"></i> جاري قراءة وتحليل الملف...</span>';
    try{
      const buffer=await file.arrayBuffer();
      const wb=XLSX.read(buffer,{type:'array',cellDates:true,raw:false});
      const sheetName=wb.SheetNames[0]; const ws=wb.Sheets[sheetName];
      const matrix=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',blankrows:false});
      if(!matrix.length)throw new Error('empty');
      const schema=SCHEMAS[state.type];
      const headerRow=findHeaderRow(matrix,schema);
      const headers=(matrix[headerRow]||[]).map((v,i)=>String(v??'').trim()||('عمود '+(i+1)));
      const data=matrix.slice(headerRow+1).filter(row=>row.some(v=>String(v??'').trim()));
      state.fileName=file.name;state.sheet=sheetName;state.headerRow=headerRow;state.headers=headers;state.rows=data;state.mapping=inferMapping(headers,data,schema);state.confidence=Math.round(Object.values(state.mapping).reduce((s,m)=>s+m.score,0)/Math.max(1,Object.keys(state.mapping).length));
      renderMapping();renderPreview();
      setStatus('<span class="ok">✓ '+esc(file.name)+' — تم اكتشاف صف العناوين '+(headerRow+1)+' بثقة تقريبية '+state.confidence+'%</span>');
    }catch(error){console.error('[JH importer]',error);setStatus('<span class="bad">⚠️ تعذر تحليل الملف. تأكد أنه Excel/CSV صالح.</span>');}
  }

  async function commit(){
    if(!state.normalized.length||!currentJHDept)return toast('⚠️ لا توجد بيانات جاهزة أو لم يتم اختيار قسم JH');
    const btn=document.getElementById('jhImportSave');if(btn)btn.disabled=true;
    try{
      const updates={};
      state.normalized.forEach(r=>{updates[r.id]=r;});
      await db.ref('tpm_system/jh_records/'+currentJHDept+'/'+state.type).update(updates);
      window.currentLoadedRecords=[...(window.currentLoadedRecords||[]),...state.normalized];
      toast('تم استيراد '+state.normalized.length+' نقطة بنجاح ✅');
      closeModal();
      window.openJHDocument?.(state.type);
    }catch(error){console.error('[JH importer] save failed',error);toast('⚠️ تعذر حفظ البيانات المستوردة.');if(btn)btn.disabled=false;}
  }

  function manualOpen(type){
    const modal=document.getElementById('jhManualRecordModal');if(!modal)return;
    const title=document.getElementById('jhManualRecordTitle');if(title)title.innerHTML='<i class="bx bx-plus-circle"></i> إضافة '+esc(SCHEMAS[type]?.label||type)+' جديدة';
    const form=document.getElementById('jhManualRecordFields'); if(!form)return;
    const fields=SCHEMAS[type].fields;
    form.innerHTML=Object.entries(fields).map(([f,m])=>'<div class="form-group"><label>'+esc(m.label)+(m.required?' <b>*</b>':'')+'</label><input class="form-control" data-manual-field="'+esc(f)+'" placeholder="'+esc(m.label)+'"></div>').join('');
    modal.dataset.type=type;modal.style.display='flex';
  }
  function manualClose(){const m=document.getElementById('jhManualRecordModal');if(m)m.style.display='none';}
  async function manualSave(){
    const modal=document.getElementById('jhManualRecordModal'),type=modal?.dataset.type;if(!type||!currentJHDept)return;
    const data={id:window.uniqueNumericId().toString(),date:new Date().toLocaleDateString('ar-EG'),user:window.currentUser?.name||'',uid:firebase.auth().currentUser?.uid||'',createdAt:Date.now(),updatedAt:Date.now(),createdByUid:firebase.auth().currentUser?.uid||'',updatedByUid:firebase.auth().currentUser?.uid||'',updatedByName:window.currentUser?.name||'',schemaVersion:3};
    document.querySelectorAll('[data-manual-field]').forEach(el=>data[el.dataset.manualField]=el.value.trim());
    const required=Object.entries(SCHEMAS[type].fields).filter(([,m])=>m.required).map(([f])=>f).filter(f=>!data[f]);
    if(required.length)return toast('⚠️ أكمل: '+required.map(f=>SCHEMAS[type].fields[f].label).join('، '));
    if(type==='CLIT'){data.operation=normalizeOperation(data.operation);data.frequency=normalizeFrequency(data.frequency);}
    if(type==='Safety')data.level=normalizeLevel(data.level);
    try{await db.ref('tpm_system/jh_records/'+currentJHDept+'/'+type+'/'+data.id).set(data);toast('تمت إضافة النقطة بنجاح ✅');manualClose();window.openJHDocument?.(type);}catch(error){console.error('[JH manual]',error);toast('⚠️ تعذر حفظ النقطة.');}
  }

  window.openJHImportModal=openModal;
  window.closeJHImportModal=closeModal;
  window.openJHManualAdd=manualOpen;
  window.closeJHManualAdd=manualClose;
  window.saveJHManualRecord=manualSave;
  window.analyzeJHSpreadsheet=analyzeFile;
  window.commitJHSpreadsheetImport=commit;

  window.mountJHDataTools=function(type){
    window.__jhActiveDocType=type;
    const area=document.getElementById('jhDocActionArea');
    if(!area||type==='CLIT')return;
    let bar=area.querySelector('.jh-data-tools');
    if(!bar){
      bar=document.createElement('div');bar.className='jh-data-tools';
      area.appendChild(bar);
    }
    bar.innerHTML='<button type="button" class="jh-tool-add" onclick="openJHManualAdd(\''+esc(type)+'\')"><i class="bx bx-plus"></i> إضافة نقطة</button><button type="button" class="jh-tool-import" onclick="openJHImportModal(\''+esc(type)+'\')"><i class="bx bx-spreadsheet"></i> استيراد Excel / CSV</button>';
  };

  document.addEventListener('change',e=>{if(e.target?.id==='jhImportFile')analyzeFile(e.target.files?.[0]);});
  document.addEventListener('DOMContentLoaded',()=>{
    const modal=document.getElementById('jhSemanticImportModal');
    if(modal)modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
  });
})();