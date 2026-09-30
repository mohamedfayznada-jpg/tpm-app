// ==========================================
// 📝 محرك التقييم والمراجعات الصارم (Full Audit Engine)
// ==========================================

// 1. الدالة المفقودة التي تسببت في الانهيار (تم إضافتها وتأمينها)
window.startNewAuditFlowFromPortal = function() {
    if(!currentJHDept) return showToast('⚠️ يرجى اختيار القسم أولاً');
    currentViewedDept = currentJHDept;
    window.startNewAuditFlow();
};

window.getAuditDraftKey = function(dept) {
    const uid = firebase.auth().currentUser?.uid || 'anonymous';
    const safeDept = encodeURIComponent(String(dept || currentViewedDept || currentAudit?.dept || 'unknown'));
    return `tpm_audit_draft:${uid}:${safeDept}`;
};

window.saveAuditDraft = function() {
    if(!currentAudit) return;
    try {
        currentAudit.updatedAt = Date.now();
        const key = window.getAuditDraftKey(currentAudit.dept);
        localStorage.setItem(key, JSON.stringify(currentAudit));
    } catch(error) {
        console.warn('[JH Audit] draft save failed', error);
    }
};

window.loadAuditDraft = function(dept) {
    const key = window.getAuditDraftKey(dept);
    let draft = localStorage.getItem(key);
    if(!draft) draft = localStorage.getItem('tpm_audit_draft'); // one-time backward compatibility
    if(!draft) return false;
    try {
        currentAudit = JSON.parse(draft);
        if(!currentAudit || !currentAudit.dept) throw new Error('invalid draft');
        window.saveAuditDraft();
        window.renderCurrentAuditStep();
        return true;
    } catch(error) {
        console.warn('[JH Audit] invalid draft discarded', error);
        localStorage.removeItem(key);
        return false;
    }
};

window.clearAuditDraft = function(dept) {
    localStorage.removeItem(window.getAuditDraftKey(dept || currentAudit?.dept));
    localStorage.removeItem('tpm_audit_draft');
};

window.startNewAuditFlow = function() {
    if(currentViewedDept) {
        const sd = document.getElementById('selectDept');
        if(sd) sd.value = currentViewedDept;
    }
    const dept = document.getElementById('selectDept')?.value || currentViewedDept || '';
    const key = window.getAuditDraftKey(dept);
    const draft = localStorage.getItem(key) || localStorage.getItem('tpm_audit_draft');
    if(draft) {
        try {
            const dObj = JSON.parse(draft);
            if(dObj?.dept === dept && confirm(`يوجد تقييم غير مكتمل لقسم (${dObj.dept}). هل تريد استكماله؟`)) {
                window.loadAuditDraft(dept);
                return;
            }
        } catch (_) {}
        window.clearAuditDraft(dept);
    }
    showScreen('setupScreen');
};

window.initAuditSequential = function() {
    const authUser = firebase.auth().currentUser;
    const now = Date.now();
    currentAudit = {
        id: window.uniqueNumericId().toString(),
        dept: document.getElementById('selectDept').value,
        machine: document.getElementById('setupMachine').value || 'عام',
        auditor: currentUser.name,
        auditorUid: authUser?.uid || '',
        createdAt: now,
        updatedAt: now,
        date: new Date().toLocaleDateString('ar-EG'),
        templateVersion: 'JH-TEAM..6-v2',
        schemaVersion: 2,
        stepsOrder: ['JH-TEAM','JH-0','JH-1','JH-2','JH-3','JH-4','JH-5','JH-6'],
        currentStepIndex: 0,
        results: {}
    };
    window.renderCurrentAuditStep();
};

window.renderCurrentAuditStep = function() {
    const k = currentAudit.stepsOrder[currentAudit.currentStepIndex]; 
    
    // تأمين جلب البيانات من ملف tpm_data.js
    if(typeof AUDIT_DATA === 'undefined' || !AUDIT_DATA[k]) {
        return showToast(`⚠️ خطأ قاتل: بيانات المراجعة للخطوة ${k} غير موجودة في ملف tpm_data.js`);
    }
    
    const sd = AUDIT_DATA[k];
    currentStepSelections = (currentAudit.results[k] && currentAudit.results[k].selections) ? currentAudit.results[k].selections : {};
    currentStepImages = (currentAudit.results[k] && currentAudit.results[k].images) ? currentAudit.results[k].images : {};

    const titleEl = document.getElementById('auditStepTitle'); 
    if(titleEl) titleEl.innerText = `${k}: ${sd.name}`;
    const totalSteps = currentAudit.stepsOrder.length;
    
    const countEl = document.getElementById('stepCounter'); 
    if(countEl) countEl.innerText = `خطوة ${currentAudit.currentStepIndex + 1} من ${totalSteps}`;
    
    const barEl = document.getElementById('auditProgressBar'); 
    if(barEl) barEl.style.width = `${((currentAudit.currentStepIndex + 1) / totalSteps) * 100}%`;

    const container = document.getElementById('auditItemsContainer');
    if(container) {
        // رسم البنود بالكامل وبدون أي اختصار
        container.innerHTML = sd.items.map(item => {
            const evidence = currentStepImages['item_' + item.id] || {};
            const currentEvidence = evidence.current || currentStepImages['img_' + item.id] || null;
            const standardEvidence = evidence.standard || null;
            const imageSlot = (kind, label, data) => data?.data
                ? `<div class="audit-evidence-slot has-image">
                    <div class="audit-evidence-slot-head"><span><i class="bx ${kind==='standard'?'bx-check-shield':'bx-current-location'}"></i>${label}</span><button type="button" onclick="removeAuditCriterionImage(${item.id}, '${kind}')"><i class="bx bx-trash"></i></button></div>
                    <img src="${data.data}" alt="${label}" onclick="window.open(this.src,'_blank','noopener')">
                    <small>تم الإرفاق</small>
                </div>`
                : `<label class="audit-evidence-slot empty-slot">
                    <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onchange="handleAuditCriterionImage(event, ${item.id}, '${kind}')">
                    <span><i class="bx bx-image-add"></i><b>${label}</b><small>أضف صورة مرجعية</small></span>
                </label>`;
            const currentAi = currentEvidence?.data ? `<button class="btn btn-outline btn-sm audit-ai-btn" onclick="runAIVision(${item.id}, ${JSON.stringify(item.title)})"><i class='bx bx-bot'></i> تحليل الوضع الحالي</button>` : '';
            return `
            <div class="card glass-card audit-criterion-card" style="padding:20px; border-right:4px solid var(--primary);">
                <div class="audit-criterion-head">
                    <div class="audit-criterion-number">${item.id}</div>
                    <div class="audit-criterion-title"><strong>${item.title}</strong><span>الدرجة القصوى: ${item.maxScore}</span></div>
                </div>
                <div class="audit-evidence-grid">
                    ${imageSlot('standard','الوضع المعياري',standardEvidence)}
                    ${imageSlot('current','الوضع الحالي',currentEvidence)}
                </div>
                <div class="audit-criterion-actions">
                    <button class="btn btn-sm btn-outline" onclick="explainItem(${JSON.stringify(item.title)})"><i class='bx bx-info-circle'></i> شرح البند</button>
                    ${currentAi}
                </div>
                <div class="audit-level-list">
                    ${item.levels.map(lvl => {
                        const isSel = currentStepSelections['item_'+item.id] && currentStepSelections['item_'+item.id].score === lvl.score;
                        const selStyle = isSel ? 'is-selected' : '';
                        return `<button type="button" class="audit-level-option ${selStyle}" onclick="selectLevel(${item.id}, ${lvl.score}, ${item.maxScore}, this)"><span>${lvl.score} ن</span><b>${lvl.desc}</b></button>`;
                    }).join('')}
                </div>
            </div>`;
        }).join('');
    }
    currentStepImprovements = []; 
    showScreen('auditScreen'); 
    window.saveAuditDraft(); 
    window.updateCumulativeScoreUI();
};

window.updateCumulativeScoreUI = function() {
    let totalScoreSoFar = 0, totalMaxSoFar = 0;
    for (let i = 0; i < currentAudit.currentStepIndex; i++) {
        let stepKey = currentAudit.stepsOrder[i]; let res = currentAudit.results[stepKey];
        if (res && !res.skipped) { totalScoreSoFar += res.score; totalMaxSoFar += res.max; }
    }
    for (let key in currentStepSelections) { totalScoreSoFar += currentStepSelections[key].score; totalMaxSoFar += currentStepSelections[key].max; }
    
    const pct = totalMaxSoFar === 0 ? 0 : Math.round((totalScoreSoFar / totalMaxSoFar) * 100);
    const pctEl = document.getElementById('cumulativeScoreText'); 
    const pointsEl = document.getElementById('cumulativePointsText');
    if (pctEl) { pctEl.innerText = pct + '%'; pctEl.style.color = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)'); }
    if (pointsEl) pointsEl.innerText = `${totalScoreSoFar} / ${totalMaxSoFar}`;
};

window.removeAuditCriterionImage = function(itemId, kind) {
    const key = 'item_' + itemId;
    if(!currentStepImages[key]) return;
    delete currentStepImages[key][kind];
    if(kind === 'current') delete currentStepImages['img_' + itemId];
    window.saveAuditDraft();
    window.renderCurrentAuditStep();
};

window.handleAuditCriterionImage = async function(event, itemId, kind) {
    const file = event?.target?.files?.[0];
    if(!file) return;
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        event.target.value = '';
        return showToast('⚠️ استخدم JPG أو PNG أو WEBP فقط.');
    }
    if(file.size > 6 * 1024 * 1024) {
        event.target.value = '';
        return showToast('⚠️ الحد الأقصى لصورة دليل المراجعة 6 ميجابايت.');
    }
    try {
        showToast('جاري تجهيز صورة الدليل ورفعها…');
        await new Promise((resolve, reject) => processAndEnhanceImage(file, async (dataUrl) => {
            try {
                const url = await uploadImageToStorage(dataUrl);
                if(!url) return reject(new Error('upload_failed'));
                const key = 'item_' + itemId;
                currentStepImages[key] = currentStepImages[key] || {};
                currentStepImages[key][kind] = { title: kind === 'standard' ? 'الوضع المعياري' : 'الوضع الحالي', data: url, uploadedAt: Date.now() };
                if(kind === 'current') currentStepImages['img_' + itemId] = currentStepImages[key][kind];
                window.saveAuditDraft();
                resolve();
            } catch(error) { reject(error); }
        });
        window.renderCurrentAuditStep();
        showToast('✅ تم حفظ صورة الدليل.');
    } catch(error) {
        console.error('[JH Audit] evidence upload failed', error);
        showToast('⚠️ تعذر رفع صورة الدليل. راجع صلاحيات Storage وحاول مرة أخرى.');
    } finally {
        if(event?.target) event.target.value = '';
    }
};

window.selectLevel = function(id, score, max, el) { 
    currentStepSelections['item_'+id] = {score, max}; 
    el.parentElement.querySelectorAll('div[onclick]').forEach(o=>{ o.style.background='var(--surface-inset)'; o.style.borderColor='transparent'; o.style.color='var(--text-main)'; o.style.boxShadow='none'; }); 
    el.style.background='rgba(16,185,129,0.1)'; el.style.borderColor='var(--success)'; el.style.color='var(--success)'; el.style.boxShadow='0 0 15px rgba(16,185,129,0.2)';
    window.saveAuditDraft(); window.updateCumulativeScoreUI();
};

window.finishCurrentStep = function() {
    const k = currentAudit.stepsOrder[currentAudit.currentStepIndex]; const sd = AUDIT_DATA[k];
    
    // حماية صارمة: منع تجاوز الخطوة بدون إكمال التقييم
    if(Object.keys(currentStepSelections).length < sd.items.length) { 
        showToast('⚠️ يرجى تقييم جميع البنود بدون استثناء قبل حفظ المرحلة'); 
        return; 
    }
    
    let totalScore = 0, totalMax = 0; currentStepImprovements = [];
    for(let key in currentStepSelections) { 
        let itemData = currentStepSelections[key]; 
        totalScore += itemData.score; 
        totalMax += itemData.max; 
        
        // محرك استخراج فرص التحسين التلقائي
        if(itemData.score < itemData.max) { 
            let id = key.split('_')[1]; 
            let itm = sd.items.find(i=>i.id == id); 
            if(itm) {
                let maxLvl = itm.levels.find(l => l.score === itm.maxScore); 
                let targetAction = maxLvl ? maxLvl.desc : "الوصول للمعايير القياسية";
                currentStepImprovements.push(`[${itm.title}] 🎯 الإجراء التصحيحي: ${targetAction}`); 
            }
        }
    }
    
    currentAudit.results[k] = { skipped: false, score: totalScore, max: totalMax, improvements: currentStepImprovements, selections: currentStepSelections, images: currentStepImages };
    window.saveAuditDraft();
    
    const pct = Math.round((totalScore/totalMax)*100);
    const sumPctEl = document.getElementById('summaryPct'); 
    if(sumPctEl) { sumPctEl.innerText = pct + '%'; sumPctEl.style.color = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)'); }
    
    const sumScoreEl = document.getElementById('summaryScoreStr'); 
    if(sumScoreEl) sumScoreEl.innerText = `الدرجة المستحقة: ${totalScore} من أصل ${totalMax} نقطة`;
    
    const oppContainer = document.getElementById('opportunitiesContainer');
    if(oppContainer) {
        oppContainer.innerHTML = currentStepImprovements.length > 0 ? currentStepImprovements.map(i=>`<div style="background:var(--surface-inset); padding:15px; border-radius:12px; margin-bottom:10px; border-right:4px solid var(--warning); font-size:13px; text-align:right; color:var(--text-main);"><i class='bx bx-error-alt' style="color:var(--warning);"></i> ${i}</div>`).join('') : '<div style="color:var(--success); font-weight:bold; text-align:center; padding:20px; background:rgba(16,185,129,0.1); border-radius:12px;"><i class="bx bx-check-shield" style="font-size:40px; display:block; margin-bottom:10px;"></i> أداء مثالي في هذه الخطوة، لا توجد ملاحظات!</div>';
    }
    showScreen('stepSummaryScreen');
};

window.skipCurrentStep = function() {
    const step = currentAudit.stepsOrder[currentAudit.currentStepIndex];
    const reason = window.sanitizeInput(prompt('سبب تخطي المرحلة؟ يجب توثيق السبب في سجل التدقيق:') || '');
    if (!reason || reason.length < 5) return showToast('⚠️ لا يمكن تخطي المرحلة بدون سبب موثق لا يقل عن 5 أحرف.');
    currentAudit.results[step] = { skipped:true, skipReason:reason, score:0, max:0, improvements:[], selections:{}, images:{}, skippedBy:currentUser.name, skippedByUid:firebase.auth().currentUser?.uid || '', skippedAt:Date.now() };
    window.saveAuditDraft();
    window.goToNextStep();
};

window.goToNextStep = function() { 
    currentAudit.currentStepIndex++; 
    if(currentAudit.currentStepIndex < currentAudit.stepsOrder.length) {
        window.renderCurrentAuditStep(); 
    } else {
        window.generateFinalReport(); 
    }
};

window.generateFinalReport = function() {
    let s=0, m=0; 
    currentAudit.stepsOrder.forEach(k=>{
        if(!currentAudit.results[k].skipped){
            s+=currentAudit.results[k].score; 
            m+=currentAudit.results[k].max;
        }
    });
    let p=m===0?0:Math.round((s/m)*100); 
    currentAudit.totalPct = p;
    
    const finalPctEl = document.getElementById('finalTotalPct'); 
    if(finalPctEl) finalPctEl.innerText = p+'%'; 
    
    const finalDeptEl = document.getElementById('finalDeptName'); 
    if(finalDeptEl) finalDeptEl.innerText = currentAudit.dept;
    
    showScreen('finalReportScreen'); 
    window.initSignaturePad();
};

window.saveFinalAudit = async function() {
    if(!window.hasRole('auditor', 'admin')) return showToast('⚠️ غير مصرح لك باعتماد وحفظ المراجعات النهائية');
    if(!currentAudit) return showToast('⚠️ لا توجد مراجعة مفتوحة');
    if(!confirm("هل أنت متأكد من اعتماد وحفظ هذه المراجعة؟ سيتم إنشاء قائمة مهام تلقائية بالفجوات المكتشفة.")) return;

    try {
        showToast('جاري حفظ تقرير المراجعة وإنشاء الإجراءات… ⏳');
        if(sigCanvas) currentAudit.signature = sigCanvas.toDataURL('image/jpeg', 0.8);

        const now=Date.now();
        const authUser=firebase.auth().currentUser;
        currentAudit.updatedAt=now;
        currentAudit.completedAt=now;
        currentAudit.updatedByUid=authUser?.uid || '';
        currentAudit.updatedByName=currentUser?.name || '';
        currentAudit.status='approved';
        currentAudit.schemaVersion=2;

        const updates={};
        let allImprovements=[];
        currentAudit.stepsOrder.forEach(step=>{
            const result=currentAudit.results?.[step];
            if(Array.isArray(result?.improvements)) allImprovements.push(...result.improvements);
        });

        if(allImprovements.length>0){
            const fId=window.uniqueNumericId().toString();
            updates['tpm_system/tasks/'+fId]={
                id:fId,isFolder:true,dept:currentAudit.dept,date:currentAudit.date,machine:currentAudit.machine||'عام',
                task:`تحسينات تدقيق (${currentAudit.date})`,
                subTasks:allImprovements.map((imp,index)=>({id:`${fId}_${index+1}`,text:imp,status:'pending',createdAt:now})),
                status:'pending',createdAt:now,createdByUid:authUser?.uid||'',createdByName:currentUser?.name||'',
                sourceType:'jh_audit',sourceAuditId:currentAudit.id,schemaVersion:2
            };
        }

        updates['tpm_system/history/'+currentAudit.id]=currentAudit;
        await db.ref().update(updates);

        if(typeof window.awardPoints==='function') window.awardPoints(50,'إتمام مراجعة رسمية (Audit)');
        window.clearAuditDraft(currentAudit.dept);
        showToast('✅ تم اعتماد المراجعة وحفظها وتوليد الإجراءات بنجاح');
        setTimeout(()=>showScreen('historyScreen'),1000);
    } catch(error) {
        console.error('[JH Audit] final save failed',error);
        showToast('⚠️ فشل حفظ المراجعة. لم يتم حذف المسودة؛ أعد المحاولة.');
    }
};

// ==========================================
