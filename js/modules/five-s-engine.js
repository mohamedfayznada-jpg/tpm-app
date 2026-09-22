// ✨ محرك المطابقة لبيئة العمل (5S Visual Engine)
// ==========================================
window.load5SImage = function(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const processImage = (dataUrl) => window.save5SImage(dataUrl, type);
    showToast('جاري تجهيز الصورة ورفعها إلى التخزين السحابي…');

    if (typeof processAndEnhanceImage === 'function') {
        processAndEnhanceImage(file, processImage);
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => processImage(e.target.result);
    reader.onerror = () => showToast('⚠️ تعذر قراءة ملف الصورة.');
    reader.readAsDataURL(file);
};

window.save5SImage = async function(dataUrl, type) {
    const previewTarget = document.getElementById(type === 'standard' ? 'imgStandard' : 'imgCurrent');
    if (!previewTarget) return;

    // تُعرض المعاينة فورًا، ثم يُستبدل مصدرها برابط Firebase الدائم بعد نجاح الرفع.
    previewTarget.src = dataUrl;
    fiveSImages[type] = { previewUrl: dataUrl, storageUrl: null };
    window.finalize5SImage(dataUrl, type, false);

    const storageUrl = await window.uploadImageToStorage(dataUrl, { folder: '5s' });
    if (!storageUrl) {
        showToast('⚠️ لم تُحفظ صورة 5S في التخزين. أعد اختيار الصورة قبل تسجيل عدم المطابقة.');
        return;
    }

    fiveSImages[type] = { previewUrl: dataUrl, storageUrl };
    previewTarget.src = storageUrl;
    window.finalize5SImage(storageUrl, type, true);
    showToast('✅ تم حفظ صورة 5S في Firebase Storage.');
};

window.finalize5SImage = function(sourceUrl, type, isStored = true) {
    const target = document.getElementById(type === 'standard' ? 'imgStandard' : 'imgCurrent');
    if (target) target.src = sourceUrl;

    const stdSrc = document.getElementById('imgStandard')?.src;
    const curSrc = document.getElementById('imgCurrent')?.src;
    if (stdSrc && curSrc && stdSrc !== window.location.href && curSrc !== window.location.href) {
        document.getElementById('fiveSSliderContainer').style.display = 'block';
        window.init5SSlider();
    }

    if (!isStored) showToast('تم تجهيز المعاينة، جارٍ حفظ الصورة في التخزين…');
};

window.init5SSlider = function() {
    const container = document.getElementById('fiveSSliderContainer');
    const overlay = document.getElementById('sliderOverlay');
    const handle = document.getElementById('sliderHandle');
    let isSliding = false;

    const slide = (e) => {
        if(!isSliding) return;
        let rect = container.getBoundingClientRect();
        let clientX = e.type.includes('mouse') ? e.clientX : (e.touches ? e.touches[0].clientX : 0);
        let x = clientX - rect.left;
        if(x < 0) x = 0; if(x > rect.width) x = rect.width;
        let pct = (x / rect.width) * 100;
        overlay.style.width = pct + '%';
        handle.style.left = pct + '%';
    };

    handle.onmousedown = () => isSliding = true;
    container.onmouseup = () => isSliding = false;
    container.onmouseleave = () => isSliding = false;
    container.onmousemove = slide;

    handle.ontouchstart = () => isSliding = true;
    container.ontouchend = () => isSliding = false;
    container.ontouchmove = slide;
};

window.generate5STask = async function() {
    if (!departments || departments.length === 0) return showToast('لا توجد أقسام مسجلة');
    if (!fiveSImages.standard?.storageUrl || !fiveSImages.current?.storageUrl) {
        return showToast('⚠️ انتظر اكتمال رفع صورتي 5S إلى التخزين قبل تسجيل عدم المطابقة.');
    }

    const dept = prompt('لأي قسم تريد تسجيل عدم المطابقة؟\n' + departments.join(' - '), departments[0]);
    if (!dept || !departments.includes(dept)) return showToast('قسم غير صالح');
    const desc = prompt('اكتب وصف المشكلة (عدم المطابقة في 5S):');
    if (!desc) return;

    const id = window.uniqueNumericId().toString();
    const record = {
        id,
        task: '[5S] ' + window.sanitizeInput(desc),
        dept,
        status: 'pending',
        source: '5S',
        createdAt: Date.now(),
        createdBy: currentUser.name || 'مستخدم',
        images: {
            standard: fiveSImages.standard.storageUrl,
            current: fiveSImages.current.storageUrl
        }
    };

    try {
        await window.syncRecord('tasks/' + id, record);
        window.awardPoints(10, 'تسجيل عدم مطابقة 5S');
        showToast('✅ تم حفظ عدم المطابقة وصورتي 5S في المهمة.');
    } catch (error) {
        console.error('5S task save error:', error);
        showToast('⚠️ رُفعت الصور لكن تعذر حفظ المهمة. لم تُمنح نقاط ولم يُعتمد السجل.');
    }
};


// ==========================================
