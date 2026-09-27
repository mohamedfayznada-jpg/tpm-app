// 🧹 CLIT Checklists & Mapping Engine (Restored fully)
function jhRecordEscape(value) {
    return window.escapeTPM ? window.escapeTPM(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

// ==========================================
let clitSelectedZone = 'الكل'; let clitSelectedOp = 'الكل'; let clitSelectedFreq = 'الكل'; let currentDocType = ''; let activeChecklistTasks = [];

window.openJHDocument = async function(type) {
    currentDocType = type;
    const headerMap = {'CLIT':'🧹 خرائط CLIT','Contamination':'🛢️ مصادر التلوث','SOC':'🧗‍♂️ أماكن صعبة الوصول','Safety':'⚠️ خريطة الأمان','Anatomy':'⚙️ تشريح الماكينة'};
    const header=document.getElementById('jhDocHeader'); if(header) header.innerText=headerMap[type]||'السجل';
    const clitWorkspace=document.getElementById('clitMapWorkspace');
    const legacy=['clitStatsSummary','clitZoneFilters','clitOpFilters','clitFrequencyFilters','startChecklistBtnContainer','jhDocActionArea','jhDocListContainer'];
    const isCLIT=type==='CLIT';
    legacy.forEach(id=>{
        const el=document.getElementById(id); if(!el) return;
        const filterUI=['clitStatsSummary','clitZoneFilters','clitOpFilters','clitFrequencyFilters','startChecklistBtnContainer'].includes(id);
        if(isCLIT && filterUI) el.style.display='none';
        else if(id==='jhDocActionArea') el.style.display=isCLIT?'none':'';
        else if(id==='jhDocListContainer') el.style.display=isCLIT?'none':'';
        else if(!isCLIT && filterUI) el.style.display='none';
    });
    if(clitWorkspace) clitWorkspace.hidden=!isCLIT;
    window.renderJHDocForm(type);
    showToast('جاري تحميل السجلات... ⏳');
    try{
        const snap=await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}`).once('value');
        let records=snap.val()?Object.values(snap.val()):[];
        if(type==='CLIT' && currentJHDept==='حقن الكابينة' && records.length===0 && window.factoryCLITData){
            showToast('جاري تهيئة الخرائط القياسية... ⏳');
            const updates={}; window.factoryCLITData.forEach(item=>{updates[item.id]=item;});
            await db.ref(`tpm_system/jh_records/حقن الكابينة/CLIT`).set(updates);
            records=window.factoryCLITData; showToast('تمت التهيئة ✅');
        }
        window.currentLoadedRecords=records;
        if(isCLIT){ window.__clitMapState={zone:'الكل',operation:'الكل',frequency:'الكل',search:''}; window.renderCLITMap(records); }
        else window.renderJHDocList(type,records);
        showScreen('jhDocumentScreen');
    }catch(error){ console.error('[JH] document load failed',error); showToast('⚠️ تعذر تحميل سجلات القسم. حاول مرة أخرى.'); }
};
window.resetFilterButtonsUI = function() {
    document.querySelectorAll('.clit-zone-btn, .clit-op-btn, .clit-freq-btn').forEach(btn => { btn.classList.remove('active', 'btn-primary', 'btn-success'); btn.classList.add('btn-outline'); });
    const zbs = document.querySelectorAll('.clit-zone-btn'); if(zbs.length>0) zbs[0].classList.add('active');
    const obs = document.querySelectorAll('.clit-op-btn'); if(obs.length>0) obs[0].classList.add('active', 'btn-primary');
    const fbs = document.querySelectorAll('.clit-freq-btn'); if(fbs.length>0) fbs[0].classList.add('active');
};

window.filterCLITZone = function(zone, btnEl) { clitSelectedZone = zone; document.querySelectorAll('.clit-zone-btn').forEach(b => b.classList.remove('active')); btnEl.classList.add('active'); window.renderJHDocList('CLIT', window.currentLoadedRecords); };
window.filterCLITOp = function(op, btnEl) { clitSelectedOp = op; document.querySelectorAll('.clit-op-btn').forEach(b => { b.classList.remove('active', 'btn-primary'); b.classList.add('btn-outline'); }); btnEl.classList.add('active', 'btn-primary'); window.renderJHDocList('CLIT', window.currentLoadedRecords); };
window.filterCLITFreq = function(freq, btnEl) { clitSelectedFreq = freq; document.querySelectorAll('.clit-freq-btn').forEach(b => b.classList.remove('active')); btnEl.classList.add('active'); window.renderJHDocList('CLIT', window.currentLoadedRecords); };

window.renderJHDocList = function(type, records) {
    let container = document.getElementById('jhDocListContainer'); if(!container) return;
    if(type === 'CLIT' && currentJHDept === 'حقن الكابينة') {
        let filtered = records.filter(item => { let matchZone = (clitSelectedZone === 'الكل') || (item.region && item.region.includes(clitSelectedZone)); let itemOp = item.operation || ''; let matchOp = (clitSelectedOp === 'الكل') || (clitSelectedOp === 'تزييت' && (itemOp.includes('تزييت') || itemOp.includes('تشحيم'))) || (itemOp.includes(clitSelectedOp)); let matchFreq = (clitSelectedFreq === 'الكل') || (item.frequency && item.frequency.includes(clitSelectedFreq)); return matchZone && matchOp && matchFreq; });
        if(document.getElementById('statActiveFiltered')) document.getElementById('statActiveFiltered').innerText = filtered.length;
        if(document.getElementById('statEstimatedTime')) document.getElementById('statEstimatedTime').innerText = Math.round(filtered.length * 1.5) + 'm';
        if(filtered.length === 0) { container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">لا توجد أي نقاط فحص مطابقة.</div>'; return; }
        const opGroups = { '🧹 التنظيف (C)': [], '🛢️ التزييت والتشحيم (L)': [], '🔍 الفحص (I)': [], '🔧 التربيط (T)': [] };
        filtered.forEach(r => { let op = r.operation || r.clitType || ''; if(op.includes('تنظيف') || op.includes('تنطيف')) opGroups['🧹 التنظيف (C)'].push(r); else if(op.includes('تزييت') || op.includes('تشحيم')) opGroups['🛢️ التزييت والتشحيم (L)'].push(r); else if(op.includes('فحص')) opGroups['🔍 الفحص (I)'].push(r); else if(op.includes('تربيط') || op.includes('ربط')) opGroups['🔧 التربيط (T)'].push(r); else opGroups['🔍 الفحص (I)'].push(r); });
        let html = ''; for (let groupName in opGroups) { if(opGroups[groupName].length > 0) { html += `<h4 style="color:var(--gold); margin:20px 0 10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">${groupName}</h4>` + opGroups[groupName].map(r => window.generateCLITCard(r, type)).join(''); } }
        container.innerHTML = html;
    } else { container.innerHTML = records.reverse().map(r => window.generateCLITCard(r, type)).join('') || '<div style="text-align:center; padding:20px; color:var(--text-muted);">لا توجد سجلات</div>'; }
};

window.generateCLITCard = function(r, type) {
    let content = ''; let borderColor = 'var(--gold)'; let bgGlow = 'rgba(255,255,255,0.02)';
    if(type === 'CLIT') {
        let op = r.operation || r.clitType || ''; let icon = '⚙️';
        if(op.includes('تنظيف')) { borderColor = '#3b82f6'; icon = '🧹'; bgGlow = 'rgba(59, 130, 246, 0.05)'; } else if(op.includes('تزييت')) { borderColor = '#f97316'; icon = '🛢️'; bgGlow = 'rgba(249, 115, 22, 0.05)'; } else if(op.includes('فحص')) { borderColor = '#22c55e'; icon = '🔍'; bgGlow = 'rgba(34, 197, 94, 0.05)'; } else if(op.includes('تربيط')) { borderColor = '#ef4444'; icon = '🔧'; bgGlow = 'rgba(239, 68, 68, 0.05)'; }
        content = `<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;"><b style="color:var(--text-main); font-size:14px;">${icon} [${r.region}] ${r.part ? ' - ' + r.part : ''}</b><span style="font-size:10px; background:${borderColor}; color:white; padding:2px 8px; border-radius:10px;">${r.frequency || 'دوري'}</span></div><div style="font-size:12px; color:var(--text-muted); margin-bottom:5px;"><span style="color:${borderColor}; font-weight:bold;">الإجراء:</span> ${r.action || r.standard}</div><div style="font-size:11px; background:rgba(0,0,0,0.3); padding:8px; border-radius:8px; border:1px dashed ${borderColor};"><b>🎯 المعيار:</b> ${r.optimalState || r.standard || 'حسب المواصفة'}<br>${r.degradation ? `<b>⚠️ التدهور:</b> <span style="color:var(--danger);">${r.degradation}</span><br>` : ''}<b>🛠️ الأدوات/الماكينة:</b> ${r.tools || 'يدوي'} | <span style="color:var(--warning);">${r.machineState || 'مجهول'}</span><br><b>⏱️ الزمن:</b> ${r.timeBefore || '-'} / <span style="color:var(--success);">${r.timeAfter || '-'}</span></div>`;
    } else if(type === 'Contamination') { borderColor = '#795548'; bgGlow = 'rgba(121, 85, 72, 0.05)'; content = `<b>📍 ${r.location}</b><br><small style="color:#795548;">التلوث: ${r.typeDesc}</small>`; } else if(type === 'SOC') { borderColor = 'var(--warning)'; bgGlow = 'rgba(255, 193, 7, 0.05)'; content = `<b>🚧 ${r.location}</b><br><small style="color:var(--warning);">السبب: ${r.reason}</small>`; } else if(type === 'Safety') { borderColor = 'var(--danger)'; bgGlow = 'rgba(244, 67, 54, 0.05)'; content = `<b>${r.level==='high'?'🔴':'🟡'} ${r.hazard}</b>`; } else { borderColor = 'var(--gold)'; bgGlow = 'rgba(255, 193, 7, 0.05)'; content = `<b>⚙️ ${r.name}</b><br><small style="color:var(--gold);">${r.desc}</small>`; }
    let actionBtns = window.hasRole('admin') && r.id ? `<button class="btn btn-sm btn-warning" style="padding:4px; width:100%; margin-top:5px;" onclick="editJHRecord('${type}','${r.id}')"><i class='bx bx-edit'></i></button><button class="btn btn-sm btn-danger" style="padding:4px; width:100%; margin-top:5px;" onclick="deleteJHRecord('${type}','${r.id}')"><i class='bx bx-trash'></i></button>` : '';
    return `<div class="card glass-card" style="border-right:4px solid ${borderColor}; background:${bgGlow}; padding:15px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;"><div style="flex:1;">${content}</div><div style="border-left:1px solid rgba(255,255,255,0.05); padding-left:10px; margin-left:10px;">${actionBtns}</div></div>`;
};

window.renderJHDocForm = function(type) {
    let formHtml = '';
    if(type === 'CLIT') { formHtml = `<h4 style="margin:0 0 10px; color:#00BCD4;">تسجيل نقطة CLIT</h4><div class="row-flex"><select id="clitType" class="form-control flex-1"><option value="تنظيف">تنظيف</option><option value="تزييت">تزييت/تشحيم</option><option value="فحص">فحص</option><option value="تربيط">تربيط</option></select><select id="clitFreq" class="form-control flex-1"><option value="يومي">يومي</option><option value="أسبوعي">أسبوعي</option><option value="شهري">شهري</option><option value="سنوي">سنوي</option></select></div><div class="row-flex"><input type="text" id="clitRegion" class="form-control flex-1" placeholder="المنطقة"><input type="text" id="clitPart" class="form-control flex-1" placeholder="الجزء"></div><textarea id="clitAction" class="form-control" rows="2" placeholder="الإجراء المطلوب"></textarea><div class="row-flex"><input type="text" id="clitStandard" class="form-control flex-1" placeholder="المعيار"><input type="text" id="clitDegradation" class="form-control flex-1" placeholder="التدهور"></div><div class="row-flex"><input type="text" id="clitTools" class="form-control flex-1" placeholder="الأدوات"><select id="clitMachineState" class="form-control flex-1"><option value="لا تعمل">لا تعمل</option><option value="تعمل">تعمل</option></select></div><div class="row-flex"><input type="text" id="clitTimeBefore" class="form-control flex-1" placeholder="وقت قبل"><input type="text" id="clitTimeAfter" class="form-control flex-1" placeholder="وقت بعد"></div><button class="btn btn-primary full-width" onclick="saveJHRecord('CLIT')">➕ إضافة</button>`; } else if(type === 'Contamination') { formHtml = `<input type="text" id="contLocation" class="form-control" placeholder="المكان"><input type="text" id="contType" class="form-control" placeholder="نوع التلوث"><button class="btn btn-primary full-width" onclick="saveJHRecord('Contamination')">➕ رصد</button>`; } else if(type === 'SOC') { formHtml = `<input type="text" id="socLocation" class="form-control" placeholder="المكان"><input type="text" id="socReason" class="form-control" placeholder="سبب الصعوبة"><button class="btn btn-warning full-width" onclick="saveJHRecord('SOC')">➕ إضافة</button>`; } else if(type === 'Safety') { formHtml = `<input type="text" id="safeHazard" class="form-control" placeholder="وصف الخطر"><select id="safeLevel" class="form-control"><option value="high">حرج</option><option value="med">متوسط</option></select><button class="btn btn-danger full-width" onclick="saveJHRecord('Safety')">➕ تسجيل</button>`; } else { formHtml = `<input type="text" id="partName" class="form-control" placeholder="اسم الجزء"><textarea id="partDesc" class="form-control" placeholder="وصف وفحص" rows="2"></textarea><button class="btn btn-primary full-width" onclick="saveJHRecord('Anatomy')">💾 حفظ</button>`; }
    document.getElementById('jhDocActionArea').innerHTML = formHtml;
};

window.saveJHRecord = async function(type) {
    if (!currentJHDept) return showToast('⚠️ اختر قسم JH أولاً');
    const now = Date.now();
    const authUser = firebase.auth().currentUser;
    const data = {
        id: window.uniqueNumericId().toString(),
        date: new Date().toLocaleDateString('ar-EG'),
        user: currentUser?.name || '',
        uid: authUser?.uid || '',
        createdAt: now,
        updatedAt: now,
        createdByUid: authUser?.uid || '',
        updatedByUid: authUser?.uid || '',
        updatedByName: currentUser?.name || '',
        schemaVersion: 2
    };

    if(type === 'CLIT') {
        data.operation = document.getElementById('clitType')?.value || '';
        data.frequency = document.getElementById('clitFreq')?.value || '';
        data.region = document.getElementById('clitRegion')?.value || 'عام';
        data.part = document.getElementById('clitPart')?.value || '';
        data.action = document.getElementById('clitAction')?.value || '';
        data.optimalState = document.getElementById('clitStandard')?.value || '';
        data.degradation = document.getElementById('clitDegradation')?.value || '';
        data.tools = document.getElementById('clitTools')?.value || '';
        data.machineState = document.getElementById('clitMachineState')?.value || '';
        data.timeBefore = document.getElementById('clitTimeBefore')?.value || '';
        data.timeAfter = document.getElementById('clitTimeAfter')?.value || '';
        if(!data.action) return showToast('⚠️ الإجراء مطلوب');
    } else if(type === 'Contamination') {
        data.location = document.getElementById('contLocation')?.value || '';
        data.typeDesc = document.getElementById('contType')?.value || '';
        if(!data.location) return showToast('⚠️ المكان مطلوب');
    } else if(type === 'SOC') {
        data.location = document.getElementById('socLocation')?.value || '';
        data.reason = document.getElementById('socReason')?.value || '';
        if(!data.location) return showToast('⚠️ المكان مطلوب');
    } else if(type === 'Safety') {
        data.hazard = document.getElementById('safeHazard')?.value || '';
        data.level = document.getElementById('safeLevel')?.value || '';
        if(!data.hazard) return showToast('⚠️ وصف الخطر مطلوب');
    } else {
        data.name = document.getElementById('partName')?.value || '';
        data.desc = document.getElementById('partDesc')?.value || '';
        if(!data.name) return showToast('⚠️ اسم الجزء مطلوب');
    }

    try {
        await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}/${data.id}`).set(data);
        showToast('تم الحفظ بنجاح ✅');
        window.openJHDocument(type);
    } catch (error) {
        console.error('[JH records] save failed', error);
        showToast('⚠️ تعذر حفظ السجل. حاول مرة أخرى.');
    }
};

window.editJHRecord = async function(type, id) {
    if (!currentJHDept) return showToast('⚠️ اختر قسم JH أولاً');
    try {
        const snap = await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}/${id}`).once('value');
        const r = snap.val();
        if(!r) return showToast('⚠️ تعذر سحب بيانات السجل');

        const idEl=document.getElementById('editJhId'); const typeEl=document.getElementById('editJhType');
        if(idEl) idEl.value=id; if(typeEl) typeEl.value=type;

        const field=(label,id,value,type='text',placeholder='')=>`
            <div class="form-group">
                <label>${label}</label>
                <input type="${type}" id="${id}" class="form-control" value="${jhRecordEscape(value)}" placeholder="${jhRecordEscape(placeholder)}">
            </div>`;
        let fieldsHtml='';

        if(type === 'CLIT') {
            fieldsHtml=`
                <div class="row-flex">
                    <div class="form-group flex-1"><label>العملية</label><input type="text" id="ed_clitOp" class="form-control" value="${jhRecordEscape(r.operation||r.clitType||'')}"></div>
                    <div class="form-group flex-1"><label>الدورية</label><input type="text" id="ed_clitFreq" class="form-control" value="${jhRecordEscape(r.frequency||'')}"></div>
                </div>
                <div class="row-flex">
                    <div class="form-group flex-1"><label>المنطقة</label><input type="text" id="ed_clitRegion" class="form-control" value="${jhRecordEscape(r.region||'')}"></div>
                    <div class="form-group flex-1"><label>الجزء</label><input type="text" id="ed_clitPart" class="form-control" value="${jhRecordEscape(r.part||'')}"></div>
                </div>
                <div class="form-group"><label>الإجراء</label><textarea id="ed_clitAction" class="form-control" rows="2">${jhRecordEscape(r.action||r.standard||'')}</textarea></div>
                <div class="row-flex">
                    <div class="form-group flex-1"><label>الحالة المثلى</label><input type="text" id="ed_clitStandard" class="form-control" value="${jhRecordEscape(r.optimalState||r.standard||'')}"></div>
                    <div class="form-group flex-1"><label>التدهور</label><input type="text" id="ed_clitDegradation" class="form-control" value="${jhRecordEscape(r.degradation||'')}"></div>
                </div>
                <div class="row-flex">
                    <div class="form-group flex-1"><label>الأدوات</label><input type="text" id="ed_clitTools" class="form-control" value="${jhRecordEscape(r.tools||'')}"></div>
                    <div class="form-group flex-1"><label>حالة الماكينة</label><input type="text" id="ed_clitMachineState" class="form-control" value="${jhRecordEscape(r.machineState||'')}"></div>
                </div>`;
        } else if(type === 'Contamination') {
            fieldsHtml=field('المكان','ed_contLocation',r.location||'')+field('نوع/وصف التلوث','ed_contType',r.typeDesc||'');
        } else if(type === 'SOC') {
            fieldsHtml=field('المكان / النقطة','ed_socLocation',r.location||'')+field('سبب صعوبة الوصول','ed_socReason',r.reason||'');
        } else if(type === 'Safety') {
            fieldsHtml=field('وصف الخطر','ed_safeHazard',r.hazard||'')+`
                <div class="form-group"><label>مستوى الخطر</label><select id="ed_safeLevel" class="form-control">
                    <option value="high" ${r.level==='high'?'selected':''}>حرج</option>
                    <option value="med" ${r.level==='med'?'selected':''}>متوسط</option>
                </select></div>`;
        } else {
            fieldsHtml=field('اسم الجزء','ed_partName',r.name||'')+`
                <div class="form-group"><label>الوصف / الفحص</label><textarea id="ed_partDesc" class="form-control" rows="3">${jhRecordEscape(r.desc||'')}</textarea></div>`;
        }

        const form=document.getElementById('editJhFormFields');
        if(form) form.innerHTML=fieldsHtml;
        const modal=document.getElementById('editJHRecordModal');
        if(modal) modal.style.display='flex';
    } catch(error) {
        console.error('[JH records] edit load failed',error);
        showToast('⚠️ تعذر فتح السجل للتعديل');
    }
};

window.updateJHRecordData = async function() {
    const id=document.getElementById('editJhId')?.value;
    const type=document.getElementById('editJhType')?.value;
    if(!id || !type || !currentJHDept) return showToast('⚠️ بيانات التعديل غير مكتملة');
    const updates={ updatedAt:Date.now(), updatedByUid:firebase.auth().currentUser?.uid||'', updatedByName:currentUser?.name||'', schemaVersion:2 };

    if(type === 'CLIT') {
        Object.assign(updates,{
            operation:document.getElementById('ed_clitOp')?.value||'',
            frequency:document.getElementById('ed_clitFreq')?.value||'',
            region:document.getElementById('ed_clitRegion')?.value||'',
            part:document.getElementById('ed_clitPart')?.value||'',
            action:document.getElementById('ed_clitAction')?.value||'',
            optimalState:document.getElementById('ed_clitStandard')?.value||'',
            degradation:document.getElementById('ed_clitDegradation')?.value||'',
            tools:document.getElementById('ed_clitTools')?.value||'',
            machineState:document.getElementById('ed_clitMachineState')?.value||''
        });
    } else if(type === 'Contamination') {
        Object.assign(updates,{location:document.getElementById('ed_contLocation')?.value||'',typeDesc:document.getElementById('ed_contType')?.value||''});
    } else if(type === 'SOC') {
        Object.assign(updates,{location:document.getElementById('ed_socLocation')?.value||'',reason:document.getElementById('ed_socReason')?.value||''});
    } else if(type === 'Safety') {
        Object.assign(updates,{hazard:document.getElementById('ed_safeHazard')?.value||'',level:document.getElementById('ed_safeLevel')?.value||''});
    } else {
        Object.assign(updates,{name:document.getElementById('ed_partName')?.value||'',desc:document.getElementById('ed_partDesc')?.value||''});
    }

    try {
        await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}/${id}`).update(updates);
        showToast('تم التعديل بنجاح ✅');
        const modal=document.getElementById('editJHRecordModal'); if(modal) modal.style.display='none';
        window.openJHDocument(type);
    } catch(error) {
        console.error('[JH records] update failed',error);
        showToast('⚠️ تعذر حفظ التعديل. حاول مرة أخرى.');
    }
};

window.deleteJHRecord = async function(type, id) {
    if(!currentJHDept) return showToast('⚠️ اختر قسم JH أولاً');
    if(!confirm('هل أنت متأكد من الحذف نهائياً؟')) return;
    try {
        await db.ref(`tpm_system/jh_records/${currentJHDept}/${type}/${id}`).remove();
        showToast('تم الحذف 🗑️');
        window.openJHDocument(type);
    } catch(error) {
        console.error('[JH records] delete failed',error);
        showToast('⚠️ تعذر حذف السجل');
    }
};

window.startCLITChecklist = function() {
    if (clitSelectedFreq === 'الكل') return showToast('⚠️ يرجى اختيار دورية محددة لبدء الفحص.');
    let recordsToExecute = [];
    if (window.currentLoadedRecords) { recordsToExecute = window.currentLoadedRecords.filter(item => { let matchZone = (clitSelectedZone === 'الكل') || (item.region && item.region.includes(clitSelectedZone)); let itemOp = item.operation || ''; let matchOp = (clitSelectedOp === 'الكل') || (clitSelectedOp === 'تزييت' && (itemOp.includes('تزييت') || itemOp.includes('تشحيم'))) || (itemOp.includes(clitSelectedOp)); let matchFreq = (item.frequency && item.frequency.includes(clitSelectedFreq)); return matchZone && matchOp && matchFreq; }); }
    if(recordsToExecute.length === 0) return showToast('لا توجد مهام مطابقة للفلتر.');
    document.getElementById('checklistCurrentDate').innerText = new Date().toLocaleDateString('ar-EG');
    activeChecklistTasks = recordsToExecute.map(r => ({ ...r, status: 'pending', tagId: null }));
    document.getElementById('activeChecklistFreq').innerText = `${clitSelectedFreq} - ${currentJHDept}`;
    window.renderChecklistUI(); showScreen('clitChecklistScreen');
};

window.renderChecklistUI = function() {
    let container = document.getElementById('checklistItemsContainer'); let completedCount = activeChecklistTasks.filter(t => t.status !== 'pending').length; let totalCount = activeChecklistTasks.length;
    document.getElementById('checklistProgress').innerText = completedCount; document.getElementById('checklistTotal').innerText = totalCount; document.getElementById('checklistProgressBar').style.width = `${(completedCount / totalCount) * 100}%`;
    container.innerHTML = activeChecklistTasks.map((t, idx) => {
        let isDone = t.status === 'done'; let isIssue = t.status === 'issue';
        let cardStyle = isDone ? 'border-color:var(--success); background:rgba(16,185,129,0.05);' : (isIssue ? 'border-color:var(--danger); background:rgba(239,68,68,0.05);' : `border-left:5px solid var(--primary);`);
        let tagBadge = t.tagId ? `<div style="margin-top:10px; padding:8px; background:var(--danger); color:white; border-radius:8px; font-size:11px; text-align:center; font-weight:bold; cursor:pointer;" onclick="showScreen('tagsScreen'); document.getElementById('filterTagMachine').value='${t.part || t.region}'; window.renderTags();">🚨 مشكلة تم الإبلاغ عنها [${t.tagId.substring(t.tagId.length - 4)}]</div>` : '';
        return `<div class="card glass-card" style="padding:15px; transition:0.3s; ${cardStyle}"><div style="display:flex; justify-content:space-between; margin-bottom:10px;"><b style="font-size:13px; color:var(--text-main);">${idx+1}. [${t.operation}] ${t.region} ${t.part ? ' - ' + t.part : ''}</b></div><div style="font-size:12px; color:var(--text-muted); margin-bottom:5px;"><b>الإجراء:</b> ${t.action}</div><div class="row-flex" style="gap:10px; margin-top:15px;"><button class="btn btn-sm ${isDone ? 'btn-success' : 'btn-outline'} flex-1" style="border-radius:20px;" onclick="markChecklistItem(${idx}, 'done')">✅ سليم</button><button class="btn btn-sm ${isIssue ? 'btn-danger' : 'btn-outline'} flex-1" style="border-radius:20px;" onclick="openCLITIssueModal(${idx})">❌ عطل</button></div>${tagBadge}</div>`;
    }).join('');
};

window.markChecklistItem = function(idx, status) { activeChecklistTasks[idx].status = status; window.renderChecklistUI(); };
window.currentTaggingChecklistIdx = null;

window.openCLITIssueModal = function(idx) { let t = activeChecklistTasks[idx]; window.currentTaggingChecklistIdx = idx; document.getElementById('clitTagItemName').innerText = `${t.region} - ${t.part || t.action}`; document.getElementById('clitTagDegradation').innerText = t.degradation || 'ظاهرة غير طبيعية'; document.getElementById('clitTagDesc').value = ''; document.getElementById('clitTagModal').style.display = 'flex'; };

window.submitCLITTag = async function() {
    let desc = document.getElementById('clitTagDesc').value.trim(); if(!desc) return showToast('⚠️ يرجى كتابة وصف المشكلة.');
    let t = activeChecklistTasks[window.currentTaggingChecklistIdx]; let fullDesc = `[مكتشف بالصيانة الذاتية]: ${desc} \n(المنطقة: ${t.region} - ${t.part})`; let tId = window.uniqueNumericId().toString();
    window.syncRecord('tags/' + tId, { id: tId, desc: fullDesc, color: 'red', dept: currentJHDept, machine: t.part || t.region, status: 'open', auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG'), timestamp: Date.now() });
    t.status = 'issue'; t.tagId = tId; document.getElementById('clitTagModal').style.display = 'none'; window.awardPoints(15, 'اكتشاف عطل بالصيانة الذاتية'); showToast('🚨 تم إصدار التاج وربطه بنجاح!'); window.renderChecklistUI(); 
};

window.submitFinalChecklist = async function() {
    if(!currentJHDept) return showToast('⚠️ اختر قسم JH أولاً');
    const pending=activeChecklistTasks.filter(t=>t.status==='pending').length;
    if(pending>0 && !confirm(`⚠️ يتبقى ${pending} مهام لم يتم فحصها. سيتم حفظ الدورة كـ "جزئية". هل تريد الاستمرار؟`)) return;

    const now=Date.now();
    const tasks=Array.isArray(activeChecklistTasks)?activeChecklistTasks.map(t=>({...t})):[]; 
    const total=tasks.length;
    const done=tasks.filter(t=>['done','completed','complete','ok','pass','passed'].includes(String(t?.status||'').toLowerCase())).length;
    const issues=tasks.filter(t=>String(t?.status||'').toLowerCase()==='issue').length;
    const status=pending>0?'partial':(issues>0?'completed_with_issues':'completed');
    const authUser=firebase.auth().currentUser;
    const executionObj={
        id:window.uniqueNumericId().toString(), dept:currentJHDept, frequency:clitSelectedFreq,
        date:new Date().toLocaleDateString('ar-EG'), time:new Date().toLocaleTimeString('ar-EG'),
        user:currentUser?.name||'', uid:authUser?.uid||'', createdAt:now,
        completionStatus:status, totalTasks:total, completedTasks:done, issueTasks:issues, pendingTasks:pending,
        tasks
    };

    try{
        showToast('جاري أرشفة دورة الفحص… ⏳');
        await db.ref(`tpm_system/clit_executions/${currentJHDept}/${executionObj.id}`).set(executionObj);
        window.awardPoints?.(30, `تنفيذ قائمة فحص (${clitSelectedFreq})`);
        showToast(status==='partial'?'تم الحفظ كدورة جزئية ⚠️':'تم حفظ دورة الصيانة بنجاح ✅');
        showScreen('jhDocumentScreen');
    }catch(error){
        console.error('[JH CLIT] execution save failed',error);
        showToast('⚠️ تعذر حفظ دورة الفحص. حاول مرة أخرى.');
    }
};
// ==========================================

/* ===== CLIT MAP V1 ===== */
window.__clitMapState={zone:'الكل',operation:'الكل',frequency:'الكل',search:''};
window.resetCLITMapFilters=function(){window.__clitMapState={zone:'الكل',operation:'الكل',frequency:'الكل',search:''};clitSelectedZone='الكل';clitSelectedOp='الكل';clitSelectedFreq='الكل';const i=document.getElementById('clitMapSearch');if(i)i.value='';window.renderCLITMap(window.currentLoadedRecords||[]);};
window.renderCLITMap=function(records){
 const rs=Array.isArray(records)?records:[], st=window.__clitMapState;
 const norm=v=>String(v??'').trim(), opOf=r=>{const o=norm(r.operation||r.clitType);if(o.includes('تنظيف')||o.includes('تنطيف'))return'تنظيف';if(o.includes('تزييت')||o.includes('تشحيم'))return'تزييت';if(o.includes('فحص'))return'فحص';if(o.includes('تربيط')||o.includes('ربط'))return'تربيط';return o||'غير محدد';}, zoneOf=r=>norm(r.region)||'غير محدد', freqOf=r=>norm(r.frequency)||'غير محدد';
 const q=norm(st.search).toLowerCase(), filtered=rs.filter(r=>{const hay=[r.region,r.part,r.action,r.standard,r.optimalState,r.degradation,r.tools,r.machineState,r.operation,r.clitType,r.frequency].map(norm).join(' ').toLowerCase();return(st.zone==='الكل'||zoneOf(r)===st.zone)&&(st.operation==='الكل'||opOf(r)===st.operation)&&(st.frequency==='الكل'||freqOf(r)===st.frequency)&&(!q||hay.includes(q));});
 const zones=[...new Set(rs.map(zoneOf))].filter(Boolean).sort((a,b)=>a.localeCompare(b,'ar')), ops=['تنظيف','تزييت','فحص','تربيط'].filter(o=>rs.some(r=>opOf(r)===o)), freqs=[...new Set(rs.map(freqOf))].filter(Boolean);
 const stat=document.getElementById('clitMapStats'); if(stat){const values=[['إجمالي النقاط',rs.length,'bx-map'],['المعروض',filtered.length,'bx-filter-alt'],['المناطق',zones.length,'bx-buildings'],['العمليات',new Set(rs.map(opOf)).size,'bx-cog'],['يومي',rs.filter(r=>freqOf(r).includes('يومي')).length,'bx-time']];stat.innerHTML=values.map(([l,v,i])=>`<article><i class="bx ${i}"></i><div><strong>${v}</strong><span>${l}</span></div></article>`).join('');}
 const chips=document.getElementById('clitMapZoneChips');if(chips)chips.innerHTML=['الكل',...ops].map(o=>`<button type="button" class="${st.operation===o?'is-active':''}" onclick="setCLITMapOperation('${jhRecordEscape(o)}')">${jhRecordEscape(o)}</button>`).join('');
 const freqChips=document.getElementById('clitMapFrequencyChips');if(freqChips)freqChips.innerHTML=['الكل',...freqs].map(f=>`<button type="button" class="${st.frequency===f?'is-active':''}" onclick="setCLITMapFrequency('${jhRecordEscape(f)}')">${jhRecordEscape(f)}</button>`).join('');
 const zonesEl=document.getElementById('clitMapZones');if(zonesEl)zonesEl.innerHTML=[['الكل',rs.length],...zones.map(z=>[z,rs.filter(r=>zoneOf(r)===z).length])].map(([z,n])=>`<button type="button" class="${st.zone===z?'is-active':''}" onclick="setCLITMapZone('${jhRecordEscape(z)}')"><span>${jhRecordEscape(z)}</span><b>${n}</b></button>`).join('');
 const points=document.getElementById('clitMapPoints');if(!points)return;if(!filtered.length){points.innerHTML='<div class="clit-map-empty"><i class="bx bx-search-alt"></i><h4>لا توجد نقاط مطابقة</h4><p>غيّر المنطقة أو العملية أو كلمة البحث.</p></div>';return;}
 const grouped={};filtered.forEach(r=>{(grouped[zoneOf(r)]??=[]).push(r);});
 points.innerHTML=Object.entries(grouped).map(([z,items])=>`<section class="clit-zone-block"><header><div><span>ZONE</span><h4>${jhRecordEscape(z)}</h4></div><b>${items.length} نقطة</b></header><div class="clit-point-grid">${items.map(r=>{const o=opOf(r),tone={تنظيف:'clean',تزييت:'lube',فحص:'inspect',تربيط:'tight'}[o]||'other',id=jhRecordEscape(r.id||'');return`<article class="clit-point-card ${tone}"><div class="clit-point-top"><span class="clit-op-badge">${jhRecordEscape(o)}</span><span>${jhRecordEscape(freqOf(r))}</span></div><h5>${jhRecordEscape(r.part||'نقطة عامة')}</h5><p>${jhRecordEscape(r.action||r.standard||r.optimalState||'بدون وصف إجراء')}</p><div class="clit-point-meta"><span><i class="bx bx-target-lock"></i>${jhRecordEscape(r.optimalState||r.standard||'المعيار غير محدد')}</span></div><div class="clit-point-actions"><button type="button" onclick="editJHRecord('CLIT','${id}')"><i class="bx bx-edit"></i> تعديل</button><button type="button" onclick="deleteJHRecord('CLIT','${id}')"><i class="bx bx-trash"></i></button></div></article>`}).join('')}</div></section>`).join('');
};
window.setCLITMapZone=function(z){window.__clitMapState.zone=z;clitSelectedZone=z;window.renderCLITMap(window.currentLoadedRecords||[]);};
window.setCLITMapOperation=function(o){window.__clitMapState.operation=o;clitSelectedOp=o;window.renderCLITMap(window.currentLoadedRecords||[]);};
document.addEventListener('input',e=>{if(e.target?.id==='clitMapSearch'){window.__clitMapState.search=e.target.value||'';window.renderCLITMap(window.currentLoadedRecords||[]);}});

window.setCLITMapFrequency=function(freq){window.__clitMapState.frequency=freq;clitSelectedFreq=freq;window.renderCLITMap(window.currentLoadedRecords||[]);};
