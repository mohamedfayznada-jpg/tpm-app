// 💡 مجتمع كايزن (Kaizen Engine)
// ==========================================
window.handleKaizenImage = function(e, type) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const preview = document.getElementById(type === 'before' ? 'kaizenBeforePreview' : 'kaizenAfterPreview');
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        if (preview) preview.innerHTML = '<span class="kaizen-upload-error">اختر JPG أو PNG أو WEBP فقط.</span>';
        e.target.value = '';
        return;
    }
    if (file.size > 8 * 1024 * 1024) {
        if (preview) preview.innerHTML = '<span class="kaizen-upload-error">الصورة أكبر من 8MB.</span>';
        e.target.value = '';
        return;
    }
    showToast('جاري تجهيز الصورة…');
    const reader = new FileReader();
    reader.onload = event => {
        const source = event.target.result;
        const img = new Image();
        img.onload = () => {
            const max = 1200;
            const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
            const ctx = canvas.getContext('2d', { alpha: false });
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            kaizenImgs[type] = dataUrl;
            if (preview) preview.innerHTML = `
                <div class="kaizen-upload-preview">
                    <img src="${dataUrl}" alt="${type === 'before' ? 'قبل' : 'بعد'}">
                    <div><i class='bx bx-check-circle'></i> تم تجهيز الصورة</div>
                </div>`;
        };
        img.onerror = () => {
            kaizenImgs[type] = null;
            if (preview) preview.innerHTML = '<span class="kaizen-upload-error">تعذر قراءة الصورة. جرّب ملفًا آخر.</span>';
        };
        img.src = source;
    };
    reader.onerror = () => {
        if (preview) preview.innerHTML = '<span class="kaizen-upload-error">تعذر قراءة الملف.</span>';
    };
    reader.readAsDataURL(file);
};

window.submitManualKaizen = async function() {
    const authUser = firebase?.auth?.().currentUser;
    if (!authUser) return showToast('⚠️ سجّل الدخول أولًا قبل مشاركة كايزن.');
    const title = document.getElementById('newKaizenTitle')?.value.trim() || '';
    const dept = document.getElementById('newKaizenDept')?.value || '';
    const a3 = {
        impact: document.getElementById('newKaizenImpact')?.value || 'Q',
        owner: window.sanitizeInput(document.getElementById('newKaizenOwner')?.value.trim() || currentUser.name || 'مستخدم'),
        problem: window.sanitizeInput(document.getElementById('newKaizenProblem')?.value.trim() || ''),
        rootCause: window.sanitizeInput(document.getElementById('newKaizenRootCause')?.value.trim() || ''),
        countermeasure: window.sanitizeInput(document.getElementById('newKaizenCountermeasure')?.value.trim() || ''),
        expectedBenefit: window.sanitizeInput(document.getElementById('newKaizenExpectedBenefit')?.value.trim() || ''),
        verification: window.sanitizeInput(document.getElementById('newKaizenVerification')?.value.trim() || ''),
        standardization: window.sanitizeInput(document.getElementById('newKaizenStandardization')?.value.trim() || ''),
        stage: 'plan',
        stageHistory: [{ stage: 'plan', by: currentUser.name || 'مستخدم', at: Date.now(), note: 'تم تسجيل بطاقة A3' }]
    };
    if (!title || !a3.problem || !a3.rootCause || !a3.countermeasure || (!kaizenEditId && (!kaizenImgs.before || !kaizenImgs.after))) return showToast('⚠️ أكمل عنوان التحسين والمشكلة والسبب الجذري والإجراء المضاد وأرفق الصورتين');

    if (kaizenEditId) {
        const existing = historyData.find(x => String(x.id) === String(kaizenEditId));
        if (!existing) return showToast('⚠️ لم يتم العثور على السجل المراد تعديله.');
        const btn = document.getElementById('submitKaizenBtn');
        const originalLabel = btn?.innerHTML || '';
        if (btn) { btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري حفظ كل التعديلات…"; btn.disabled = true; }
        try {
            existing.dept = window.sanitizeInput(dept);
            existing.a3 = { ...existing.a3, ...a3 };
            existing.results = existing.results || {};
            existing.results.ManualKaizen = existing.results.ManualKaizen || { images: {} };
            existing.results.ManualKaizen.images = existing.results.ManualKaizen.images || {};
            existing.results.ManualKaizen.images.img_1 = { ...(existing.results.ManualKaizen.images.img_1 || {}), title: window.sanitizeInput(title) };
            if (kaizenImgs.before && /^data:image\//i.test(kaizenImgs.before)) {
                if (btn) btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري رفع صورة قبل…";
                existing.results.ManualKaizen.images.before = { data: await uploadImageToStorage(kaizenImgs.before,{folder:'kaizen/before'}) };
            }
            if (kaizenImgs.after && /^data:image\//i.test(kaizenImgs.after)) {
                if (btn) btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري رفع صورة بعد…";
                existing.results.ManualKaizen.images.after = { data: await uploadImageToStorage(kaizenImgs.after,{folder:'kaizen/after'}) };
            }
            if (btn) btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري تحديث السجل…";
            await window.syncRecord('history/' + existing.id, existing);
            kaizenEditId = null;
            closeKaizenA3Modal();
            window.renderKaizenFeed?.();
            showToast('✅ تم تحديث بطاقة كايزن بكل تفاصيلها.');
        } catch(error) {
            console.error('Kaizen edit error:',error);
            showToast(`⚠️ تعذر حفظ التعديلات: ${error.message || 'خطأ في قاعدة البيانات'}`);
        } finally {
            if (btn) { btn.innerHTML = originalLabel || "<i class='bx bx-send'></i> إرسال بطاقة كايزن للمراجعة"; btn.disabled = false; }
        }
        return;
    }

    const btn = document.getElementById('submitKaizenBtn');
    const originalLabel = btn.innerHTML;
    btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري دمج الصور…";
    btn.disabled = true;

    let uploadedUrl = null;
    let uploadedBeforeUrl = null;
    let uploadedAfterUrl = null;
    try {
        const kId = 'kaizen_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
        const [imgBefore, imgAfter] = await Promise.all([
            window.loadImageForCanvas(kaizenImgs.before),
            window.loadImageForCanvas(kaizenImgs.after)
        ]);

        // Upload the original before/after assets separately so the UI can render
        // the same two large panels shown in the reference design.
        if (btn) btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري رفع صورة قبل…";
        uploadedBeforeUrl = await uploadImageToStorage(kaizenImgs.before,{folder:'kaizen/before'});
        if (btn) btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري رفع صورة بعد…";
        uploadedAfterUrl = await uploadImageToStorage(kaizenImgs.after,{folder:'kaizen/after'});
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 900; canvas.height = 420;
        ctx.fillStyle = '#f6f2e9'; ctx.fillRect(0, 0, 900, 420);
        // RTL visual order: BEFORE on the right → AFTER on the left.
        ctx.drawImage(imgAfter, 460, 55, 420, 310);
        ctx.drawImage(imgBefore, 20, 55, 420, 310);
        ctx.fillStyle = 'rgba(239,68,68,0.96)'; ctx.fillRect(765, 18, 105, 38);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Cairo'; ctx.fillText('قبل', 800, 44);
        ctx.fillStyle = 'rgba(16,185,129,0.96)'; ctx.fillRect(30, 18, 105, 38);
        ctx.fillStyle = '#fff'; ctx.fillText('بعد', 65, 44);
        // Premium arrow points from BEFORE (right) toward AFTER (left).
        ctx.save();
        ctx.translate(450, 210);
        ctx.fillStyle = '#f59e0b'; ctx.strokeStyle = '#fff7df'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(105,-28); ctx.lineTo(-35,-28); ctx.lineTo(-35,-62); ctx.lineTo(-115,0); ctx.lineTo(-35,62); ctx.lineTo(-35,28); ctx.lineTo(105,28); ctx.closePath();
        ctx.fill(); ctx.stroke(); ctx.restore();

        btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري رفع بطاقة المقارنة…";
        uploadedUrl = await uploadImageToStorage(canvas.toDataURL('image/jpeg',0.88),{folder:'kaizen/combined'});

        const record = {
            id: kId,
            type: 'kaizen',
            authorUid: authUser.uid,
            authorName: currentUser.name || 'مستخدم',
            auditor: currentUser.name || 'مستخدم',
            dept: window.sanitizeInput(dept),
            createdAt: Date.now(),
            date: new Date().toLocaleString('ar-EG'),
            stepsOrder: ['ManualKaizen'],
            a3,
            results: {
                ManualKaizen: {
                    images: {
                        img_1: { title: window.sanitizeInput(title), data: uploadedUrl },
                        before: { data: uploadedBeforeUrl },
                        after: { data: uploadedAfterUrl }
                    }
                }
            }
        };

        btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري اعتماد السجل…";
        await window.syncRecord('history/' + kId, record);

        ['newKaizenTitle', 'newKaizenOwner', 'newKaizenProblem', 'newKaizenRootCause', 'newKaizenCountermeasure', 'newKaizenExpectedBenefit', 'newKaizenVerification', 'newKaizenStandardization'].forEach(id => { const field = document.getElementById(id); if (field) field.value = ''; });
        document.getElementById('kaizenBeforePreview').innerHTML = '';
        document.getElementById('kaizenAfterPreview').innerHTML = '';
        kaizenImgs = { before: null, after: null };
        document.getElementById('kaizenUploadModal').style.display = 'none';
        if (typeof window.awardPoints === 'function') window.awardPoints(40, 'مشاركة كايزن');
        window.renderKaizenFeed?.();
        window.renderKaizenA3CommandStats?.();
        showToast('✅ تم حفظ بطاقة A3 كايزن وصورتها؛ وهي الآن في مرحلة التخطيط.');
    } catch (error) {
        console.error('Manual Kaizen save error:', error);
        for (const assetUrl of [uploadedUrl, uploadedBeforeUrl, uploadedAfterUrl]) {
            if (assetUrl) {
                try { await window.deleteStorageImage(assetUrl); } catch (cleanupError) { console.error('Kaizen image cleanup error:', cleanupError); }
            }
        }
        showToast(`⚠️ لم يُعتمد كايزن: ${error.message || 'تعذر حفظ السجل في قاعدة البيانات.'}`);
    } finally {
        btn.innerHTML = originalLabel;
        btn.disabled = false;
    }
};

window.loadImageForCanvas = function(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('تعذر تجهيز إحدى صور كايزن للدمج.'));
        image.src = source;
    });
};

window.kaizenStageFilter = 'all';
window.renderKaizenFeed = function() {
    window.renderKaizenCommunity?.();
    let c = document.getElementById('kaizenFeedContainer'); if(!c) return;
    let selectedDept = document.getElementById('kaizenDeptSelect')?.value || 'الكل';
    const activeStage = window.kaizenStageFilter || 'all';
    const safe = (value, fallback = '—') => window.escapeTPM(String(value ?? fallback));
    const records = Array.isArray(historyData) ? historyData : [];
    
    let html = records.filter(h => {
        const stageKey = window.getKaizenStage?.(h)?.key || 'plan';
        return Array.isArray(h?.stepsOrder) && h.stepsOrder.includes('ManualKaizen') && (selectedDept === 'الكل' || h.dept === selectedDept) && (activeStage === 'all' || stageKey === activeStage);
    }).slice().reverse().map(k=> {
        const manual = k?.results?.ManualKaizen;
        const image = manual?.images?.img_1 ? { ...manual.images.img_1, before: manual.images.before, after: manual.images.after } : null;
        if (!image?.data || !image?.title) return '';
        let lId = String(k.id || ''); let liked = Array.isArray(likesData[lId]) && likesData[lId].includes(currentUser.name); let canEdit = window.hasRole('admin') || window.hasRole('auditor') || (!!currentUser.uid && currentUser.uid === k.authorUid);
        const stage = window.getKaizenStage?.(k) || { key: 'plan', label: 'PLAN · تخطيط', className: 'plan', nextLabel: 'بدء التنفيذ' };
        const owner = k.a3?.owner || k.auditor || 'غير محدد';
        const imageSrc = /^(data:image\/|https?:\/\/)/i.test(String(image.data)) ? safe(image.data, '') : '';
        if (!imageSrc) return '';
        const canProgress = window.canAdvanceKaizenPDCA?.(k) && stage.key !== 'standardized';
        const progressControl = canProgress ? `<button class="btn btn-sm btn-success flex-1" onclick="advanceKaizenPDCA('${safe(k.id)}')"><i class='bx bx-right-arrow-alt'></i> ${safe(stage.nextLabel)}</button>` : '';
        const a3Summary = k.a3 ? `<div class="kaizen-a3-summary"><div><span>المشكلة</span><b>${safe(k.a3.problem)}</b></div><div><span>السبب الجذري</span><b>${safe(k.a3.rootCause)}</b></div><div><span>الإجراء</span><b>${safe(k.a3.countermeasure)}</b></div></div>` : `<div class="kaizen-a3-summary legacy"><div><span>بطاقة كايزن سابقة</span><b>يمكن اعتمادها في دورة A3 من خلال مرحلة التخطيط.</b></div></div>`;
        let controls = canEdit ? `<button class="btn btn-sm btn-outline flex-1" onclick="editKaizen('${safe(k.id)}')"><i class='bx bx-edit'></i> تعديل</button><button class="btn btn-sm btn-danger flex-1" onclick="deleteKaizen('${safe(k.id)}')"><i class='bx bx-trash'></i> حذف</button>` : '';
        let comments = Array.isArray(kaizenComments[lId]) ? kaizenComments[lId] : []; let commentsHtml = comments.map(cm => `<div style="background:var(--surface-inset); padding:10px 15px; border-radius:10px; margin-bottom:8px; border-right:3px solid var(--primary); font-size:13px;"><b style="color:var(--primary); display:block; margin-bottom:3px;">${safe(cm?.user)}</b> ${safe(cm?.text, '')} <span style="font-size:10px; color:var(--text-muted); float:left;">${safe(cm?.date)}</span></div>`).join('');

        const description = k.description || k.summary || k.a3?.expectedBenefit || 'تم توثيق المشكلة وتحليل السبب الجذري وتنفيذ إجراء تحسيني بهدف تحقيق نتيجة قابلة للقياس.';
        const dateText = k.createdAt ? new Date(k.createdAt).toLocaleString('ar-EG',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : safe(k.date);
        const author = safe(k.auditor || k.authorName || 'مستخدم');
        const commentsCount = comments.length;
        const beforeUrl = image?.before?.data ? safe(image.before.data,'') : '';
        const afterUrl = image?.after?.data ? safe(image.after.data,'') : '';
        const comparisonMarkup = beforeUrl && afterUrl ? `
                    <div class="kaizen-compare-panel after"><div class="kaizen-compare-label">بعد</div><img src="${afterUrl}" alt="بعد" loading="lazy"><small>نتائج مستقرة ضمن الحدود</small></div>
                    <div class="kaizen-improvement-arrow"><i class='bx bx-left-arrow-alt'></i><span>من المشكلة<br>إلى التحسين</span></div>
                    <div class="kaizen-compare-panel before"><div class="kaizen-compare-label">قبل</div><img src="${beforeUrl}" alt="قبل" loading="lazy"><small>تذبذب كبير في النتائج</small></div>` : `
                    <div class="kaizen-compare-panel after legacy-crop"><div class="kaizen-compare-label">بعد</div><img src="${imageSrc}" alt="بعد" loading="lazy"></div>
                    <div class="kaizen-improvement-arrow"><i class='bx bx-left-arrow-alt'></i><span>من المشكلة<br>إلى التحسين</span></div>
                    <div class="kaizen-compare-panel before legacy-crop"><div class="kaizen-compare-label">قبل</div><img src="${imageSrc}" alt="قبل" loading="lazy"></div>`;
        return `<article class="kaizen-post">
            <header class="kaizen-post-head">
                <div class="kaizen-author">
                    <div class="kaizen-avatar"><i class='bx bx-user'></i></div>
                    <div><b>${author}</b><span>${dateText}</span></div>
                </div>
                <div class="kaizen-post-meta">
                    <span class="kaizen-standard-chip"><i class='bx bx-check-circle'></i> معياري • STANDARD</span>
                    <span class="kaizen-post-date"><i class='bx bx-calendar'></i> حق كايزن</span>
                </div>
            </header>
            <div class="kaizen-post-body">
                <h2>${safe(image.title)}</h2>
                <p class="kaizen-post-description">${safe(description)}</p>
                <div class="kaizen-problem-grid">
                    <div><span>المشكلة</span><b>${safe(k.a3?.problem || '—')}</b></div>
                    <div><span>السبب الجذري</span><b>${safe(k.a3?.rootCause || '—')}</b></div>
                    <div><span>الإجراء</span><b>${safe(k.a3?.countermeasure || '—')}</b></div>
                </div>
                <div class="kaizen-visual-compare">
                    ${comparisonMarkup}
                </div>
                <div class="kaizen-post-actions">
                    <div class="kaizen-actions-left">
                        <button class="kaizen-action-btn ${liked?'liked':''}" onclick="toggleKaizenLike('${lId}')"><i class='bx ${liked?'bxs-heart':'bx-heart'}'></i><span>أعجبني</span> <b>${likesData[lId]?likesData[lId].length:0}</b></button>
                        <button class="kaizen-action-btn" onclick="document.getElementById('comment_input_${lId}')?.focus()"><i class='bx bx-message-rounded'></i><span>تعليق</span> <b>${commentsCount}</b></button>
                        <button class="kaizen-action-btn" onclick="navigator.clipboard?.writeText(location.href);showToast('تم نسخ رابط المشاركة')"><i class='bx bx-share-alt'></i><span>مشاركة</span></button>
                    </div>
                    <div class="kaizen-actions-right">
                        ${canEdit ? `<button class="kaizen-edit-btn" onclick="editKaizen('${safe(k.id)}')"><i class='bx bx-edit'></i> تعديل</button>` : ''}
                        ${canProgress ? progressControl : ''}
                        ${canEdit ? `<button class="kaizen-delete-btn" onclick="deleteKaizen('${safe(k.id)}')"><i class='bx bx-trash'></i> حذف</button>` : ''}
                    </div>
                </div>
                <section class="kaizen-comments">
                    <h3>التعليقات (${commentsCount})</h3>
                    <div class="kaizen-comment-list">${commentsHtml || '<div class="kaizen-empty-comment">ابدأ النقاش حول التحسين...</div>'}</div>
                    <div class="kaizen-comment-compose">
                        <input type="text" id="comment_input_${lId}" placeholder="اكتب تعليقك هنا...">
                        <button onclick="addKaizenComment('${lId}')"><i class='bx bx-send'></i> إرسال</button>
                    </div>
                </section>
            </div>
        </article>`;
    }).join('');
    c.innerHTML = html || '<div style="text-align:center; color:var(--text-muted); padding:40px; width:100%;"><i class="bx bx-bulb" style="font-size:50px; display:block; margin-bottom:10px; opacity:0.5;"></i>لا توجد مشاركات مسجلة</div>';
};

window.toggleKaizenLike = async function(id) {
    if(!currentUser?.name) return showToast('⚠️ سجّل الدخول أولًا.');
    if(!likesData[id]) likesData[id]=[];
    const i=likesData[id].indexOf(currentUser.name);
    if(i>-1) likesData[id].splice(i,1); else likesData[id].push(currentUser.name);
    try { await window.syncRecord('likes/' + id, likesData[id]); window.renderKaizenFeed?.(); }
    catch(error){ showToast('⚠️ تعذر حفظ الإعجاب.'); console.error(error); }
};
window.deleteKaizen = function(id) { if(confirm('تأكيد مسح الكايزن؟')) { window.deleteRecord('history/' + id); showToast('تم الحذف'); } };
window.editKaizen = function(id) {
    const k=historyData.find(x=>String(x.id)===String(id));
    if(!k) return showToast('⚠️ لم يتم العثور على بطاقة كايزن.');
    const a3=k.a3||{};
    kaizenEditId=String(id);
    const set=(fid,val)=>{const el=document.getElementById(fid);if(el)el.value=val||'';};
    set('newKaizenTitle',k.results?.ManualKaizen?.images?.img_1?.title);
    set('newKaizenDept',k.dept); set('newKaizenImpact',a3.impact); set('newKaizenOwner',a3.owner);
    set('newKaizenProblem',a3.problem); set('newKaizenRootCause',a3.rootCause);
    set('newKaizenCountermeasure',a3.countermeasure); set('newKaizenExpectedBenefit',a3.expectedBenefit);
    set('newKaizenVerification',a3.verification); set('newKaizenStandardization',a3.standardization);
    kaizenImgs={
        before:a3.beforeImage||k.results?.ManualKaizen?.images?.before?.data||null,
        after:a3.afterImage||k.results?.ManualKaizen?.images?.after?.data||null
    };
    const bp=document.getElementById('kaizenBeforePreview'), ap=document.getElementById('kaizenAfterPreview');
    if(bp && kaizenImgs.before) bp.innerHTML=`<div class="kaizen-upload-preview"><img src="${kaizenImgs.before}" alt="قبل"><div>الصورة الحالية — قبل</div></div>`;
    if(ap && kaizenImgs.after) ap.innerHTML=`<div class="kaizen-upload-preview"><img src="${kaizenImgs.after}" alt="بعد"><div>الصورة الحالية — بعد</div></div>`;
    const modal=document.getElementById('kaizenUploadModal'); if(modal) modal.style.display='flex';
    const btn=document.getElementById('submitKaizenBtn'); if(btn) btn.innerHTML="<i class='bx bx-save'></i> حفظ تعديلات كايزن";
};
window.addKaizenComment = async function(id) {
    const el=document.getElementById(`comment_input_${id}`);
    const txt=window.sanitizeInput(el?.value || '');
    if(!txt) return showToast('⚠️ اكتب تعليقًا أولًا.');
    if(!kaizenComments[id]) kaizenComments[id]=[];
    const comment={user:currentUser.name,text:txt,date:new Date().toLocaleTimeString('ar-EG')};
    kaizenComments[id].push(comment);
    try{
        await window.syncRecord('kaizenComments/' + id, kaizenComments[id]);
        if(el) el.value='';
        if(typeof window.awardPoints==='function') window.awardPoints(2,'تعليق');
        window.renderKaizenFeed?.();
    }catch(error){
        kaizenComments[id].pop();
        showToast(`⚠️ تعذر حفظ التعليق: ${error.message || 'خطأ في قاعدة البيانات'}`);
    }
};

window.closeKaizenA3Modal = function() {
    kaizenEditId=null;
    const modal = document.getElementById('kaizenUploadModal');
    if (modal) modal.style.display = 'none';
    ['newKaizenTitle','newKaizenOwner','newKaizenProblem','newKaizenRootCause','newKaizenCountermeasure','newKaizenExpectedBenefit','newKaizenVerification','newKaizenStandardization'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    ['newKaizenDept','newKaizenImpact'].forEach(id => { const el=document.getElementById(id); if(el) el.selectedIndex=0; });
    ['kaizenBeforePreview','kaizenAfterPreview'].forEach(id => { const el=document.getElementById(id); if(el) el.innerHTML=''; });
    document.querySelectorAll('#kaizenUploadModal input[type="file"]').forEach(input => { input.value=''; });
    kaizenImgs = { before: null, after: null };
};

window.openKaizenCommunity = function() {
    window.kaizenStageFilter = 'all';
    window.renderKaizenCommunity?.();
    window.renderKaizenFeed?.();
};

window.renderKaizenCommunity = function() {
    const stats = document.getElementById('kaizenCommunityStats');
    const board = document.getElementById('kaizenLeaderboard');
    const records = (Array.isArray(historyData) ? historyData : []).filter(k => Array.isArray(k?.stepsOrder) && k.stepsOrder.includes('ManualKaizen'));
    const stageCount = key => records.filter(k => window.getKaizenStage?.(k)?.key === key).length;
    const contributors = {};
    records.forEach(k => {
        const name = k.authorName || k.auditor || k.a3?.owner || 'مستخدم';
        contributors[name] = (contributors[name] || 0) + 1;
    });
    const ranked = Object.entries(contributors).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if (stats) stats.innerHTML = `
        <div class="kaizen-community-stat"><span>مشاركات المجتمع</span><b>${records.length}</b><i class='bx bx-bulb'></i></div>
        <div class="kaizen-community-stat"><span>قيد التنفيذ</span><b>${stageCount('do') + stageCount('check')}</b><i class='bx bx-loader-circle'></i></div>
        <div class="kaizen-community-stat"><span>تحسينات مثبتة</span><b>${stageCount('standardized')}</b><i class='bx bx-badge-check'></i></div>
        <div class="kaizen-community-stat"><span>مساهمون</span><b>${Object.keys(contributors).length}</b><i class='bx bx-group'></i></div>`;
    if (board) board.innerHTML = ranked.length ? ranked.map((entry,index)=>`
        <div class="kaizen-rank-row"><b>0${index+1}</b><span><i class='bx bx-user-circle'></i>${window.escapeTPM(entry[0])}</span><strong>${entry[1]}</strong></div>`).join('') : '<div class="kaizen-empty-mini">لسه مفيش مساهمات. كن أول واحد.</div>';
};

// A3 / PDCA Kaizen workflow. Legacy cards default to PLAN and remain readable.
window.KAIZEN_PDCA_STAGES = [
    { key: 'plan', label: 'PLAN · تخطيط', className: 'plan', next: 'do', nextLabel: 'بدء التنفيذ' },
    { key: 'do', label: 'DO · تنفيذ', className: 'do', next: 'check', nextLabel: 'إرسال للتحقق' },
    { key: 'check', label: 'CHECK · تحقق', className: 'check', next: 'act', nextLabel: 'اعتماد النتيجة' },
    { key: 'act', label: 'ACT · تثبيت', className: 'act', next: 'standardized', nextLabel: 'تثبيت كمعيار' },
    { key: 'standardized', label: 'STANDARD · معياري', className: 'standardized', next: null, nextLabel: 'تم التثبيت' }
];
window.getKaizenStage = function(kaizen) {
    const key = kaizen?.a3?.stage || kaizen?.improvementStatus || 'plan';
    return window.KAIZEN_PDCA_STAGES.find(stage => stage.key === key) || window.KAIZEN_PDCA_STAGES[0];
};
window.canAdvanceKaizenPDCA = function(kaizen) {
    const stage = window.getKaizenStage(kaizen);
    if (stage.key === 'standardized') return false;
    const isAdmin = window.hasRole?.('admin');
    const isOwner = [kaizen?.auditor, kaizen?.a3?.owner].filter(Boolean).includes(currentUser?.name);
    return ['check', 'act'].includes(stage.key) ? isAdmin : (isAdmin || isOwner);
};
window.advanceKaizenPDCA = async function(id) {
    const kaizen = historyData.find(item => item.id == id);
    if (!kaizen) return showToast('⚠️ تعذر العثور على بطاقة كايزن');
    const stage = window.getKaizenStage(kaizen);
    if (!window.canAdvanceKaizenPDCA(kaizen)) return showToast('⚠️ لا تملك صلاحية نقل هذه البطاقة في الدورة الحالية');
    if (!stage.next) return showToast('✅ هذا التحسين مثبت بالفعل كمعيار');
    kaizen.a3 = kaizen.a3 || { owner: kaizen.auditor || currentUser.name || 'مستخدم', stageHistory: [] };
    if (stage.key === 'check' && !kaizen.a3.verification) return showToast('⚠️ أضف طريقة التحقق قبل اعتماد النتيجة');
    if (stage.key === 'act' && !kaizen.a3.standardization) return showToast('⚠️ أضف إجراء التثبيت أو OPL قبل تحويل التحسين إلى معيار');
    const nextStage = window.KAIZEN_PDCA_STAGES.find(item => item.key === stage.next);
    kaizen.a3.stage = nextStage.key;
    kaizen.improvementStatus = nextStage.key;
    kaizen.a3.stageHistory = Array.isArray(kaizen.a3.stageHistory) ? kaizen.a3.stageHistory : [];
    kaizen.a3.stageHistory.push({ stage: nextStage.key, by: currentUser.name || 'مستخدم', at: Date.now(), note: `انتقال إلى ${nextStage.label}` });
    if (nextStage.key === 'standardized') { kaizen.standardizedAt = Date.now(); kaizen.standardizedBy = currentUser.name || 'مدير'; }
    try {
        await window.syncRecord('history/' + id, kaizen);
        if (nextStage.key === 'standardized' && typeof window.awardPoints === 'function') window.awardPoints(25, 'تثبيت كايزن كمعيار');
        window.renderKaizenFeed?.();
        window.renderKaizenA3CommandStats?.();
        showToast(`✅ تم نقل بطاقة كايزن إلى مرحلة: ${nextStage.label}`);
    } catch (error) {
        showToast(`⚠️ تعذر تحديث مرحلة كايزن: ${error.message || 'خطأ في قاعدة البيانات'}`);
    }
};
window.applyKaizenStageFilter = function(stage) {
    window.kaizenStageFilter = stage || 'all';
    document.querySelectorAll('.kaizen-stage-steps button').forEach(button => button.classList.toggle('active', button.getAttribute('onclick')?.includes(`'${window.kaizenStageFilter}'`)));
    window.renderKaizenFeed?.();
};
window.renderKaizenA3CommandStats = function() {
    const container = document.getElementById('kaizenA3CommandStats');
    if (!container) return;
    const kaizens = historyData.filter(item => item.stepsOrder?.includes('ManualKaizen'));
    const count = key => kaizens.filter(item => window.getKaizenStage(item).key === key).length;
    container.innerHTML = `<div class="kaizen-a3-stat plan"><span>تخطيط</span><b>${count('plan')}</b></div><div class="kaizen-a3-stat do"><span>تنفيذ</span><b>${count('do')}</b></div><div class="kaizen-a3-stat check"><span>تحقق</span><b>${count('check')}</b></div><div class="kaizen-a3-stat act"><span>تثبيت</span><b>${count('act')}</b></div><div class="kaizen-a3-stat standardized"><span>مثبّت كمعيار</span><b>${count('standardized')}</b></div>`;
};

// ==========================================
