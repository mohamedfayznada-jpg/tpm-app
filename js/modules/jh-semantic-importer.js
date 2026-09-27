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


  let state={type:'CLIT',fileName:'',workbook:null,analysis:null,normalized:[],stats:null};
  function toast(msg){window.showToast?.(msg);}
  function getModal(){return document.getElementById('jhSemanticImportModal');}
  function setStatus(html){const el=document.getElementById('jhImportStatus');if(el)el.innerHTML=html||'';}
  function setImportSummary(html){const el=document.getElementById('jhImportSummary');if(el)el.innerHTML=html||'';}
  function openModal(type){
    state={type:type||window.__jhActiveDocType||'CLIT',fileName:'',workbook:null,analysis:null,normalized:[],stats:null};
    const modal=getModal();if(!modal)return;
    const title=document.getElementById('jhImportTitle');
    if(title)title.innerHTML='<i class="bx bx-brain"></i> الاستيراد الذكي — '+esc(SCHEMAS[state.type]?.label||state.type);
    const input=document.getElementById('jhImportFile');if(input)input.value='';
    setStatus('');
    renderAIResult(null);
    modal.style.display='flex';
  }
  function closeModal(){const modal=getModal();if(modal)modal.style.display='none';}

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function colToIndex(value){
    if(typeof value==='number'&&Number.isFinite(value))return Math.max(0,Math.floor(value));
    const s=String(value??'').trim().toUpperCase();
    if(!s)return -1;
    if(/^\d+$/.test(s))return Math.max(0,Number(s)-1);
    if(!/^[A-Z]+$/.test(s))return -1;
    let n=0;for(const ch of s)n=n*26+(ch.charCodeAt(0)-64);return n-1;
  }
  function safeText(value,max=160){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max);}
  function rowHasData(row){return Array.isArray(row)&&row.some(v=>String(v??'').trim()!=='');}
  function cellPreview(value){const s=safeText(value,120);return s?'"'+s.replace(/"/g,'\\"')+'"':'""';}

  function buildWorkbookDigest(wb){
    const sheets=(wb?.SheetNames||[]).map(name=>{
      const ws=wb.Sheets[name];
      const matrix=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',blankrows:false,raw:false});
      const nonEmpty=matrix.map((row,index)=>({index,row})).filter(x=>rowHasData(x.row));
      const likelyHeader=[];
      nonEmpty.forEach(({index,row})=>{
        const joined=row.map(v=>norm(v)).join(' ');
        if(/رقم.*نقط|اسم.*نقط|الإجراء|الاجراء|دورية|frequency|operation|action|standard|الحالة المثلى|التدهور|tools|ادوات/.test(joined))likelyHeader.push(index);
      });
      const sampleSet=new Set([
        ...nonEmpty.slice(0,24).map(x=>x.index),
        ...nonEmpty.slice(-18).map(x=>x.index),
        ...likelyHeader.flatMap(i=>Array.from({length:14},(_,k)=>i+k).filter(n=>n>=0&&n<matrix.length))
      ]);
      const sampleIndexes=[...sampleSet].sort((a,b)=>a-b).slice(0,180);
      const rows=sampleIndexes.map(index=>{
        const row=matrix[index]||[],cells=[];
        row.forEach((v,c)=>{if(String(v??'').trim()!=='')cells.push(XLSX.utils.encode_col(c)+'='+cellPreview(v));});
        return 'R'+(index+1)+': '+cells.join(' | ');
      });
      const merges=(ws['!merges']||[]).slice(0,80).map(m=>XLSX.utils.encode_range(m));
      return {name,ref:ws['!ref']||'',rows:matrix.length,columns:matrix.reduce((m,r)=>Math.max(m,r?.length||0),0),nonEmptyRows:nonEmpty.length,likelyHeaderRows:likelyHeader.map(i=>i+1),merges,sample:rows.join('\n')};
    });
    let digest=JSON.stringify({workbookSheets:sheets.length,sheets});
    if(digest.length>48000)digest=digest.slice(0,48000)+'\n[TRUNCATED DIGEST]';
    return digest;
  }

  function schemaPrompt(type){
    const schema=SCHEMAS[type];
    return Object.entries(schema.fields).map(([key,meta])=>key+': '+meta.label+' | '+(meta.required?'REQUIRED':'optional')+' | aliases: '+meta.aliases.join(', ')).join('\n');
  }

  function buildAIImportPrompt(type,digest,fileName){
    return 'You are the Factory OS TPM spreadsheet ingestion engine.\n'+
      'Inspect a messy real-world Excel/CSV workbook and identify the actual data records for the target TPM map. The workbook may contain titles, blank rows, merged headers, multi-row headers, repeated headers, notes, totals, multiple tables, multiple sheets, Arabic/English/mixed language, inconsistent column names, and unrelated sections.\n\n'+
      'TARGET DOCUMENT: '+type+' ('+(SCHEMAS[type]?.label||type)+')\nFILE: '+fileName+'\n\n'+
      'TARGET FIELDS:\n'+schemaPrompt(type)+'\n\n'+
      'CRITICAL RULES:\n'+
      '1. Do not ask the user to map columns, choose rows, or confirm anything.\n'+
      '2. Inspect ALL sheets and all evidence in the digest. Prefer tables that actually contain operational map records.\n'+
      '3. You may return multiple blocks from the same sheet if it contains separate tables.\n'+
      '5. Identify the true header row(s) and data range for every block.\n'+
      '6. Map fields by meaning, not position. Arabic, English, abbreviations, synonyms and TPM/JH terminology are valid clues.\n'+
      '7. Never invent cell values. Every imported value must come from an existing workbook cell.\n'+
      '7. Required fields MUST have a defensible source column. If a required field cannot be found, reject that block.\n'+
      '8. Ignore titles, decorative rows, instructions, signatures, totals/subtotals, page numbers, and repeated headers.\n'+
      '9. Merged cells may carry machine/area context; the importer will preserve merged-cell context.\n'+
      '10. Do not rewrite factual text. The application may only normalize controlled values after extraction.\n'+
      '11. Confidence must reflect evidence quality.\n'+
      '12. Return ONLY valid JSON. No markdown or prose outside JSON.\n\n'+
      'JSON SHAPE:\n'+
      '{"decision":"import|reject","confidence":0-100,"reason":"short explanation","sheets":[{"sheet":"exact name","blocks":[{"headerRows":[1,2],"dataStartRow":3,"dataEndRow":120,"repeatHeaderRows":[55],"skipRows":[121],"mapping":{"fieldName":{"column":"A","confidence":95}},"confidence":0-100}]}]}\n'+
      'TARGET FIELD NAMES MUST BE EXACTLY the names listed above. Do not return unknown fields. Do not return a block with no usable required-field mapping. Row numbers are 1-based and inclusive.\n\nWORKBOOK DIGEST:\n'+digest;
  }

  function extractJson(text){
    const fence=String.fromCharCode(96).repeat(3);
    const raw=String(text||'').trim().replace(new RegExp('^'+fence+'(?:json)?','i'),'').replace(new RegExp(fence+'$'),'').trim();
    try{return JSON.parse(raw);}catch(_){}
    const first=raw.indexOf('{'),last=raw.lastIndexOf('}');
    if(first>=0&&last>first){try{return JSON.parse(raw.slice(first,last+1));}catch(_){}}
    throw new Error('AI returned invalid JSON.');
  }

  function validateAIPlan(plan,type,wb){
    const schema=SCHEMAS[type],allowed=new Set(Object.keys(schema.fields)),out=[];
    if(!plan||!Array.isArray(plan.sheets))throw new Error('لم يتم الحصول على خريطة بيانات صالحة من الذكاء الاصطناعي.');
    for(const sheetPlan of plan.sheets){
      const name=String(sheetPlan?.sheet||'');
      if(!name||!wb.Sheets[name]||!Array.isArray(sheetPlan.blocks))continue;
      const matrix=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',blankrows:false,raw:false});
      const ws=wb.Sheets[name];
      for(const block of sheetPlan.blocks){
        if(!block||!block.mapping)continue;
        const start=Math.max(1,Number(block.dataStartRow)||0),end=Math.min(matrix.length,Number(block.dataEndRow)||0);
        if(!start||!end||end<start)continue;
        const mapping={};
        for(const [field,meta] of Object.entries(block.mapping)){
          if(!allowed.has(field))continue;
          const column=colToIndex(meta?.column),confidence=Math.max(0,Math.min(100,Number(meta?.confidence)||0));
          if(column>=0&&column<120&&confidence>=45)mapping[field]={column,confidence};
        }
        const context={};
        for(const [field,meta] of Object.entries(block.context||{})){
          if(!allowed.has(field))continue;
          const sourceCell=String(meta?.sourceCell||'').trim();
          const value=String(meta?.value??'').trim();
          const confidence=Math.max(0,Math.min(100,Number(meta?.confidence)||0));
          let verified=value;
          if(sourceCell&&ws[sourceCell])verified=String(ws[sourceCell].v??'').trim();
          if(verified&&confidence>=45)context[field]={value:verified,sourceCell,confidence};
        }
        const missing=Object.entries(schema.fields)
          .filter(([f,m])=>m.required&&!mapping[f]&&!context[f]).map(([f])=>f);
        if(missing.length)continue;
        out.push({
          sheet:name,matrix,headerRows:Array.isArray(block.headerRows)?block.headerRows.map(Number).filter(Boolean):[],
          dataStartRow:start,dataEndRow:end,
          repeatHeaderRows:Array.isArray(block.repeatHeaderRows)?block.repeatHeaderRows.map(Number):[],
          skipRows:Array.isArray(block.skipRows)?block.skipRows.map(Number):[],
          mapping,context,
          confidence:Math.max(0,Math.min(100,Number(block.confidence)||Number(plan.confidence)||0))
        });
      }
    }
    if(!out.length)throw new Error('لم يجد الذكاء الاصطناعي جدولًا صالحًا يحتوي على البيانات المطلوبة.');
    const strong=out.filter(b=>b.confidence>=70);
    if(!strong.length)throw new Error('تم العثور على بيانات، لكن درجة الثقة منخفضة لحفظها بأمان.');
    return {confidence:Math.max(...out.map(b=>b.confidence)),blocks:out};
  }

  function materializeMergedContext(matrix,ws){
    const rows=matrix.map(r=>Array.isArray(r)?r.slice():[]),merges=ws?.['!merges']||[];
    merges.forEach(m=>{
      if(m.s.r===m.e.r)return;
      const source=rows[m.s.r]?.[m.s.c];
      if(String(source??'').trim()==='')return;
      for(let r=m.s.r;r<=m.e.r;r++){
        rows[r]=rows[r]||[];
        for(let c=m.s.c;c<=m.e.c;c++)if(String(rows[r][c]??'').trim()==='')rows[r][c]=source;
      }
    });
    return rows;
  }

  function normalizeControlled(type,field,value){
    if(type==='CLIT'&&field==='operation')return normalizeOperation(value);
    if(type==='CLIT'&&field==='frequency')return normalizeFrequency(value);
    if(type==='Safety'&&field==='level')return normalizeLevel(value);
    return String(value??'').trim();
  }

  function buildAIRecords(plan,type,fileName){
    const schema=SCHEMAS[type],records=[],seen=new Set(),user=window.currentUser?.name||'',uid=firebase.auth().currentUser?.uid||'';
    for(const block of plan.blocks){
      const ws=block.matrix,materialized=materializeMergedContext(ws,window.__jhImportWorkbook?.Sheets?.[block.sheet]);
      const repeats=new Set(block.repeatHeaderRows||[]),skips=new Set(block.skipRows||[]);
      for(let rowNo=block.dataStartRow;rowNo<=block.dataEndRow;rowNo++){
        if(repeats.has(rowNo)||skips.has(rowNo))continue;
        const row=materialized[rowNo-1]||[];if(!rowHasData(row))continue;
        const raw={};
        for(const [field,map] of Object.entries(block.mapping))raw[field]=row[map.column]??'';
        for(const [field,ctx] of Object.entries(block.context||{}))if(String(raw[field]??'').trim()==='')raw[field]=ctx.value;
        if(Object.entries(schema.fields).some(([field,meta])=>meta.required&&!String(raw[field]??'').trim()))continue;
        const sourceKey=block.sheet+':'+rowNo+':'+type;if(seen.has(sourceKey))continue;seen.add(sourceKey);
        const base={
          id:window.uniqueNumericId().toString(),date:new Date().toLocaleDateString('ar-EG'),user,uid,
          createdAt:Date.now(),updatedAt:Date.now(),createdByUid:uid,updatedByUid:uid,updatedByName:user,
          schemaVersion:5,imported:true,importMethod:'ai-semantic',importSource:fileName,
          importSheet:block.sheet,importRow:rowNo,importConfidence:Math.round(block.confidence),
          importMapping:{
            ...Object.fromEntries(Object.entries(block.mapping).map(([f,m])=>[f,{column:XLSX.utils.encode_col(m.column),confidence:m.confidence}])),
            ...Object.fromEntries(Object.entries(block.context||{}).map(([f,m])=>[f,{sourceCell:m.sourceCell||'',confidence:m.confidence,mode:'context'}]))
          }
        };
        for(const field of Object.keys(schema.fields))base[field]=normalizeControlled(type,field,raw[field]);
        records.push(base);
      }
    }
    return records;
  }

  function renderAIResult(stats){
    const el=document.getElementById('jhImportSummary');if(!el)return;
    if(!stats){el.innerHTML='<div class="jh-ai-state idle"><i class="bx bx-brain"></i><div><b>جاهز للتحليل الذكي</b><span>ارفع الملف وسيتم فهمه تلقائيًا ثم استيراد البيانات الصحيحة.</span></div></div>';return;}
    if(stats.error){el.innerHTML='<div class="jh-ai-state error"><i class="bx bx-error-circle"></i><div><b>لم يتم الاستيراد</b><span>'+esc(stats.error)+'</span></div></div>';return;}
    el.innerHTML='<div class="jh-ai-state success"><i class="bx bx-check-shield"></i><div><b>تم الفهم والاستيراد تلقائيًا</b><span>'+stats.records+' سجل · '+stats.sheets+' ورقة · '+stats.blocks+' نطاق بيانات · ثقة '+stats.confidence+'%</span></div></div>';
  }

  async function analyzeFile(file){
    if(!file)return;
    if(!window.XLSX){setStatus('<span class="bad">مكتبة قراءة Excel غير متاحة. أعد تحميل الصفحة.</span>');return;}
    if(!currentJHDept){setStatus('<span class="bad">اختر قسم JH أولًا.</span>');return;}
    const modal=getModal();if(modal)modal.style.display='flex';
    state={type:state.type||window.__jhActiveDocType||'CLIT',fileName:file.name,workbook:null,analysis:null,normalized:[],stats:null};
    setImportSummary('<div class="jh-ai-state loading"><i class="bx bx-loader-alt bx-spin"></i><div><b>AI بيفحص الملف...</b><span>بيقرأ الشيتات، يحدد الجداول الحقيقية، ويفهم الأعمدة من المعنى — مش من ترتيبها.</span></div></div>');
    setStatus('<span class="loading"><i class="bx bx-brain"></i> قراءة الملف وتحضير البيانات للتحليل...</span>');
    const started=Date.now();
    try{
      const buffer=await file.arrayBuffer(),wb=XLSX.read(buffer,{type:'array',cellDates:true,raw:false});
      window.__jhImportWorkbook=wb;
      const digest=buildWorkbookDigest(wb);
      setStatus('<span class="loading"><i class="bx bx-brain bx-tada"></i> AI بيحلل بنية الملف ومحتواه...</span>');
      const response=await window.fetchGeminiAPI(buildAIImportPrompt(state.type,digest,file.name),null,{jsonMode:true});
      const plan=extractJson(response),validated=validateAIPlan(plan,state.type,wb),normalized=buildAIRecords(validated,state.type,file.name);
      if(!normalized.length)throw new Error('لم يتم العثور على سجلات مكتملة يمكن إدخالها بأمان.');
      const confidence=Math.round(Math.min(100,Math.max(0,validated.confidence)));
      if(confidence<70)throw new Error('الثقة في فهم الملف منخفضة ('+confidence+'%). تم إيقاف الاستيراد لحماية البيانات.');
      state.analysis=validated;state.normalized=normalized;state.stats={records:normalized.length,sheets:new Set(validated.blocks.map(b=>b.sheet)).size,blocks:validated.blocks.length,confidence};
      setStatus('<span class="ok">✓ تم فهم الملف. جاري حفظ البيانات تلقائيًا...</span>');renderAIResult(state.stats);
      await commit();
      const elapsed=((Date.now()-started)/1000).toFixed(1);
      setStatus('<span class="ok">✓ اكتمل الاستيراد تلقائيًا خلال '+elapsed+' ثانية.</span>');
      await sleep(650);closeModal();
    }catch(error){
      console.error('[JH AI importer]',error);state.stats={error:error?.message||'تعذر تحليل الملف.'};renderAIResult(state.stats);
      setStatus('<span class="bad">⚠️ '+esc(error?.message||'تعذر تحليل الملف. لم يتم حفظ أي بيانات.')+'</span>');
    }finally{window.__jhImportWorkbook=null;}
  }

  async function commit(){
    if(!state.normalized.length||!currentJHDept)throw new Error('لا توجد بيانات جاهزة أو لم يتم اختيار قسم JH.');
    const updates={};state.normalized.forEach(r=>{updates[r.id]=r;});
    await db.ref('tpm_system/jh_records/'+currentJHDept+'/'+state.type).update(updates);
    window.currentLoadedRecords=[...(window.currentLoadedRecords||[]),...state.normalized];
    toast('تم استيراد '+state.normalized.length+' سجل تلقائيًا بواسطة AI ✅');
    window.openJHDocument?.(state.type);
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