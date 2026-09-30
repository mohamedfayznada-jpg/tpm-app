// ==========================================
// 📝 محرك التقييم والمراجعات الصارم (Full Audit Engine)
// ==========================================

// Canonical audit-state layer: currentAudit.results is the persisted source of truth.
// Legacy step globals remain as a UI editing buffer for backward compatibility.
window.AuditState = window.AuditState || {
    ensureStep(stepKey) {
        if (!currentAudit) return null;
        currentAudit.results = currentAudit.results || {};
        currentAudit.results[stepKey] = currentAudit.results[stepKey] || { skipped:false, score:0, max:0, improvements:[], selections:{}, images:{} };
        const step = currentAudit.results[stepKey];
        step.selections = step.selections && typeof step.selections === 'object' ? step.selections : {};
        step.images = step.images && typeof step.images === 'object' ? step.images : {};
        step.improvements = Array.isArray(step.improvements) ? step.improvements : [];
        return step;
    },
    calculateStep(stepKey, selections = null) {
        const definition = typeof AUDIT_DATA !== 'undefined' ? AUDIT_DATA?.[stepKey] : null;
        const step = this.ensureStep(stepKey);
        const selected = selections || step?.selections || {};
        let score = 0, max = 0; const improvements = [];
        if (!definition) return { score, max, pct:0, improvements };
        definition.items.forEach(item => {
            const value = selected['item_' + item.id];
            if (!value) return;
            const itemScore = Number(value.score) || 0;
            const itemMax = Number(value.max ?? item.maxScore) || 0;
            score += itemScore; max += itemMax;
            if (itemScore < itemMax) {
                const maxLevel = item.levels?.find(level => Number(level.score) === Number(item.maxScore));
                improvements.push({
                    itemId:item.id, title:item.title,
                    action:maxLevel?.desc || 'الوصول للمعايير القياسية',
                    text:'[' + item.title + '] 🎯 الإجراء التصحيحي: ' + (maxLevel?.desc || 'الوصول للمعايير القياسية')
                });
            }
        });
        return { score, max, pct:max ? Math.round((score/max)*100) : 0, improvements };
    },
    calculateTotal() {
        if (!currentAudit?.stepsOrder) return { score:0, max:0, pct:0, improvements:[] };
        let score=0, max=0; const improvements=[];
        currentAudit.stepsOrder.forEach(stepKey => {
            const result=this.ensureStep(stepKey);
            if (!result || result.skipped) return;
            const calc=this.calculateStep(stepKey,result.selections);
            result.score=calc.score; result.max=calc.max; result.improvements=calc.improvements.map(item=>item.text);
            score+=calc.score; max+=calc.max; improvements.push(...result.improvements);
        });
        return {score,max,pct:max ? Math.round((score/max)*100) : 0,improvements};
    },
    syncCurrentStepBuffer() {
        if (!currentAudit?.stepsOrder) return null;
        const key=currentAudit.stepsOrder[currentAudit.currentStepIndex];
        const step=this.ensureStep(key);
        if (!step) return null;
        step.selections=currentStepSelections || {};
        step.images=currentStepImages || {};
        return step;
    }
};

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
        templateVersion: 'JH-0..6-v1',
        schemaVersion: 2,
        stepsOrder: ['JH-0','JH-1','JH-2','JH-3','JH-4','JH-5','JH-6'],
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
    const stepState = window.AuditState.ensureStep(k);
    currentStepSelections = stepState.selections;
    currentStepImages = stepState.images;

    const titleEl = document.getElementById('auditStepTitle'); 
    if(titleEl) titleEl.innerText = `${k}: ${sd.name}`;
    
    const countEl = document.getElementById('stepCounter'); 
    if(countEl) countEl.innerText = `خطوة ${currentAudit.currentStepIndex + 1} من 7`;
    
    const barEl = document.getElementById('auditProgressBar'); 
    if(barEl) barEl.style.width = `${((currentAudit.currentStepIndex + 1) / 7) * 100}%`;

    const container = document.getElementById('auditItemsContainer');
    if(container) {
        // رسم البنود بالكامل وبدون أي اختصار
        container.innerHTML = sd.items.map(item => {
            let hasImage = currentStepImages['img_' + item.id] ? `<div style="margin-top:15px; display:flex; align-items:center; gap:10px;"><img src="${currentStepImages['img_' + item.id].data}" style="height:60px; width:60px; object-fit:cover; border-radius:10px; border:2px solid var(--primary); cursor:pointer;" onclick="window.open('${currentStepImages['img_' + item.id].data}')"><button class="btn btn-outline btn-sm" onclick="runAIVision(${item.id}, '${item.title.replace(/'/g, "\\'")}')"><i class='bx bx-bot'></i> تحليل الذكاء الاصطناعي</button></div>` : '';
            
            return `
            <div class="card glass-card" style="padding:20px; border-right:4px solid var(--primary);">
                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px; border-bottom:1px solid var(--border-glass); padding-bottom:15px;">
                    <div style="display:flex; align-items:flex-start; gap:12px; width:100%;">
                        <div style="background:var(--primary); color:white; width:35px; height:35px; display:flex; align-items:center; justify-content:center; border-radius:10px; font-weight:900; flex-shrink:0; font-size:16px;">${item.id}</div>
                        <div style="flex:1; font-weight:bold; font-size:15px; color:var(--text-main); line-height:1.4;">${item.title}</div>
                        <span style="font-size:11px; background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:20px; white-space:nowrap; font-weight:bold; color:var(--gold);">الدرجة القصوى: ${item.maxScore}</span>
                    </div>
                    <div class="row-flex" style="justify-content:flex-end;">
                        <button class="btn btn-sm btn-outline" style="border-radius:20px; font-size:11px;" onclick="explainItem('${item.title}')"><i class='bx bx-info-circle'></i> شرح البند للفني</button>
                        <button class="btn btn-sm btn-outline" style="border-radius:20px; font-size:11px; color:var(--primary); border-color:var(--primary);" onclick="openImageSourcePicker(${item.id}, '${item.title.replace(/'/g, "\\'")}')"><i class='bx bx-camera'></i> إرفاق دليل مرئي</button>
                    </div>
                </div>
                <div id="preview_img_${item.id}">${hasImage}</div>
                <div style="margin-top:15px;">
                    ${item.levels.map(lvl => {
                        let isSel = (currentStepSelections['item_'+item.id] && currentStepSelections['item_'+item.id].score === lvl.score) ? 'selected' : '';
                        let selStyle = isSel ? 'background:rgba(16,185,129,0.1); border-color:var(--success); color:var(--success); box-shadow:0 0 15px rgba(16,185,129,0.2);' : 'background:var(--surface-inset); border-color:transparent; color:var(--text-main);';
                        return `<div style="padding:15px; border-radius:12px; margin-bottom:10px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:0.3s; border:1px solid var(--border-glass); ${selStyle}" onclick="selectLevel(${item.id}, ${lvl.score}, ${item.maxScore}, this)"><div style="background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:8px; font-weight:bold; font-size:12px; white-space:nowrap;">${lvl.score} ن</div><div style="flex:1; font-size:13px; line-height:1.5;">${lvl.desc}</div></div>`;
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
    
    window.AuditState.syncCurrentStepBuffer();
    const calculated = window.AuditState.calculateStep(k, currentStepSelections);
    const totalScore = calculated.score;
    const totalMax = calculated.max;
    currentStepImprovements = calculated.improvements.map(item => item.text);
    const stepState = window.AuditState.ensureStep(k);
    currentAudit.results[k] = { ...stepState, skipped:false, score:totalScore, max:totalMax, improvements:currentStepImprovements, selections:currentStepSelections, images:currentStepImages };
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
    if(currentAudit.currentStepIndex < 7) {
        window.renderCurrentAuditStep(); 
    } else {
        window.generateFinalReport(); 
    }
};

window.generateFinalReport = function() {
    const total = window.AuditState.calculateTotal();
    const s = total.score, m = total.max, p = total.pct;
    currentAudit.totalScore = s;
    currentAudit.totalMax = m;
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
        const total = window.AuditState.calculateTotal();
        currentAudit.totalScore = total.score;
        currentAudit.totalMax = total.max;
        currentAudit.totalPct = total.pct;
        let allImprovements = total.improvements.map(item => typeof item === 'string' ? item : item.text).filter(Boolean);

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
