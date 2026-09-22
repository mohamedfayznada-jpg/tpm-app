// 📚 عقل المصنع (Digital Datapads)
// ==========================================
let tempBase64Pdf = null;
window.handleMaterialUpload = function(event) {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert("⚠️ أقصى حجم للملف 5 ميجابايت.");
    document.getElementById('pdfExtractStatus').innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> جاري التجهيز...";
    const reader = new FileReader(); reader.onload = function(e) { tempBase64Pdf = e.target.result; document.getElementById('pdfExtractStatus').innerHTML = `<i class='bx bx-check-circle' style='color:var(--success);'></i> جاهز: <b style="color:var(--text-main);">${file.name}</b>`; }; reader.readAsDataURL(file);
};

window.saveNewBook = async function() {
    const title = document.getElementById('kbTitle').value; if (!title) return showToast("⚠️ يرجى إدخال عنوان المرجع.");
    let bookId = Date.now().toString(); let catEl = document.getElementById('kbCategory'); let cat = catEl ? catEl.value : 'JH'; let newBook = { id: bookId, title: title, category: cat, hasPdf: !!tempBase64Pdf };
    if(tempBase64Pdf) { showToast("جاري الرفع لقاعدة البيانات... ⏳"); try { await db.ref('tpm_system/pdf_files/' + bookId).set({ base64: tempBase64Pdf }); } catch(e) { return alert("⚠️ فشل رفع الملف."); } }
    let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {}); kbArray.push(newBook); knowledgeBaseData = kbArray; window.syncRecord('knowledgeBase', knowledgeBaseData);
    document.getElementById('addBookModal').style.display = 'none'; document.getElementById('kbTitle').value = ''; document.getElementById('pdfExtractStatus').innerHTML = "<i class='bx bxs-file-pdf'></i> اختر ملف PDF"; tempBase64Pdf = null; showToast("✅ تم حفظ المرجع بنجاح!"); window.renderKnowledgeBase();
};

window.renderKnowledgeBase = function() {
    const container = document.getElementById('knowledgeListContainer'); if(!container) return;
    let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {});
    if(kbArray.length === 0) { container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px 20px; background:var(--surface-inset); border-radius:var(--radius-lg); border:1px dashed var(--border-glass);"><i class='bx bx-ghost' style="font-size:60px; color:var(--text-muted); margin-bottom:15px; display:block;"></i><h3 style="color:var(--text-main); font-size:16px;">لا توجد مراجع أو كتالوجات في الأرشيف حالياً</h3></div>`; return; }
    
    container.innerHTML = kbArray.map(kb => {
        let badgeColor = 'var(--primary)'; let badgeBg = 'var(--primary-glow)';
        if(kb.category === 'JH') { badgeColor = 'var(--success)'; badgeBg = 'rgba(16, 185, 129, 0.1)'; } else if(kb.category === 'PM') { badgeColor = 'var(--danger)'; badgeBg = 'rgba(239, 68, 68, 0.1)'; } else if(kb.category === 'SOP') { badgeColor = 'var(--warning)'; badgeBg = 'rgba(249, 115, 22, 0.1)'; }
        return `
        <div class="card glass-card" style="display:flex; flex-direction:column; justify-content:space-between; height:100%; min-height:200px; padding:20px;">
            <div style="flex:1;">
                <span style="display:inline-block; padding:4px 12px; border-radius:8px; font-size:11px; font-weight:900; margin-bottom:15px; background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeColor};">${kb.category || 'عام'}</span>
                <h4 style="font-size:16px; color:var(--text-main); font-weight:800; line-height:1.4; margin-bottom:10px;">${kb.title}</h4>
                <div style="display:flex; align-items:center; gap:5px; color:var(--text-muted); font-size:11px;"><i class='bx bxs-file-pdf' style="color:var(--danger); font-size:16px;"></i> ملف PDF مؤرشف</div>
            </div>
            <div class="row-flex" style="border-top:1px solid var(--border-glass); padding-top:15px; margin-top:15px;">
                <button class="btn btn-sm btn-primary flex-2" onclick="openBookDetail('${kb.id}')"><i class='bx bx-book-open'></i> عرض المستند</button>
                ${(currentUser && currentUser.role === 'admin') ? `<button class="btn btn-sm btn-danger" style="width:40px; padding:0;" onclick="deleteKnowledgeBook('${kb.id}')"><i class='bx bx-trash'></i></button>` : ''}
            </div>
        </div>`;
    }).join('');
};

window.openBookDetail = async function(id) {
    let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {}); let kb = kbArray.find(x => x.id == id); if(!kb) return;
    if(kb.hasPdf) {
        document.getElementById('aiModal').style.display = 'flex'; document.getElementById('aiModalText').innerHTML = '<div style="padding:20px; text-align:center; color:var(--primary); font-weight:bold;"><i class="bx bx-loader-alt bx-spin"></i> جاري جلب الملف...</div>';
        try {
            let snap = await db.ref('tpm_system/pdf_files/' + id).once('value');
            if(snap.val() && snap.val().base64) {
                const b64 = snap.val().base64.split(',')[1] || snap.val().base64; const bin = atob(b64); const arr = new Uint8Array(bin.length); for(let i=0; i<bin.length; i++) arr[i] = bin.charCodeAt(i);
                const blob = new Blob([arr], {type: 'application/pdf'}); const url = URL.createObjectURL(blob); window.open(url, '_blank'); document.getElementById('aiModal').style.display = 'none';
            } else { alert("الملف غير متوفر حالياً على السيرفر."); document.getElementById('aiModal').style.display = 'none'; }
        } catch(e) { alert("خطأ في الاتصال بقاعدة البيانات."); document.getElementById('aiModal').style.display = 'none'; }
    }
};

window.deleteKnowledgeBook = async function(id) {
    if(confirm("⚠️ هل أنت متأكد من الحذف النهائي؟")) {
        let kbArray = Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {}); knowledgeBaseData = kbArray.filter(b => b.id != id); window.syncRecord('knowledgeBase', knowledgeBaseData);
        try { await db.ref('tpm_system/pdf_files/' + id).remove(); } catch(e){} window.renderKnowledgeBase(); showToast("تم الحذف 🗑️");
    }
};

window.updateDeptDropdown = function() {
    departments = window.getOperationalDepartments(departments);
    const options = departments.map(dept => `<option value="${window.escapeTPM(dept)}">${window.escapeTPM(dept)}</option>`).join('');
    document.querySelectorAll('select').forEach(select => {
        if (!select.id.includes('Dept')) return;
        const previous = select.value;
        const supportsAll = /filter|Global/.test(select.id);
        const requiresChoice = select.id === 'newTagDept';
        const prefix = supportsAll ? '<option value="الكل">كل الأقسام</option>' : (requiresChoice ? '<option value="" disabled>اختر القسم التشغيلي</option>' : '');
        select.innerHTML = prefix + options;
        if ([...select.options].some(option => option.value === previous)) select.value = previous;
        else if (requiresChoice) select.value = '';
    });
    window.updateOperationalSelects?.();
};
window.updateOperationalSelects = function() {
    const teamOptions = (window.TPM_TEAM_HUB || window.TPM_TEAM_CATALOG || []).map(team => `<option value="${team.id}">${team.code} — ${window.escapeTPM(team.name)}</option>`).join('');
    ['newTagTeam', 'newTaskTeam'].forEach(id => { const el = document.getElementById(id); if(el) { const previous = el.value; const placeholder = id === 'newTagTeam' ? 'لا يوجد فريق مرتبط' : 'فريق TPM (اختياري)'; el.innerHTML = `<option value="">${placeholder}</option>${teamOptions}`; if ([...el.options].some(option => option.value === previous)) el.value = previous; } });
    const engineerOptions = maintenanceEngineers.map(engineer => `<option value="${window.escapeTPM(engineer.name)}" data-phone="${window.escapeTPM(engineer.phone || '')}">${window.escapeTPM(engineer.name)}</option>`).join('');
    ['newTagEngineer', 'newTaskAssignee'].forEach(id => { const el = document.getElementById(id); if(el) { const previous = el.value; const placeholder = id === 'newTagEngineer' ? 'غير مُسند الآن' : 'مسؤول التنفيذ'; el.innerHTML = `<option value="">${placeholder}</option>${engineerOptions}`; if ([...el.options].some(option => option.value === previous)) el.value = previous; } });
};
window.addOrUpdateDept = function() {
    if (!window.hasRole('admin')) return showToast('⚠️ إدارة الأقسام متاحة للمدير فقط');
    const input = document.getElementById('newDeptInput'); const value = String(input?.value || '').trim();
    if (!value) return showToast('⚠️ اكتب اسم القسم المساند أولًا');
    departments = window.getOperationalDepartments([...departments, value]);
    window.syncRecord('departments', departments); window.updateDeptDropdown(); window.renderSettingsControlLists?.();
    if (input) input.value = ''; showToast('تم حفظ القسم وإتاحته في كل نماذج التشغيل');
};
window.addEngineer = function() {
    if (!window.hasRole('admin')) return showToast('⚠️ إدارة الإسناد متاحة للمدير فقط');
    const nameInput = document.getElementById('newEngName'); const phoneInput = document.getElementById('newEngPhone');
    const name = String(nameInput?.value || '').trim(); const phone = String(phoneInput?.value || '').trim();
    if (!name || !phone) return showToast('⚠️ اكتب الاسم ورقم الهاتف لإضافة المسؤول');
    if (maintenanceEngineers.some(engineer => engineer.name === name)) return showToast('⚠️ هذا المسؤول موجود بالفعل في قائمة الإسناد');
    maintenanceEngineers.push({ name, phone }); window.syncRecord('maintenanceEngineers', maintenanceEngineers); window.updateOperationalSelects(); window.renderSettingsControlLists?.();
    nameInput.value = ''; phoneInput.value = ''; showToast('تمت إضافة المسؤول وتحديث قوائم الإسناد');
};
window.removeSupportDepartment = function(dept) {
    if (!window.hasRole('admin')) return showToast('⚠️ إدارة الأقسام متاحة للمدير فقط');
    if (window.isCoreOperationalDepartment(dept)) return showToast('⚠️ لا يمكن إزالة قسم تشغيلي أساسي');
    if (!confirm(`إزالة «${dept}» من قائمة الأقسام المساندة؟ لن تتأثر السجلات القديمة المرتبطة به.`)) return;
    departments = window.getOperationalDepartments(departments.filter(item => item !== dept));
    window.syncRecord('departments', departments); window.updateDeptDropdown(); window.renderSettingsControlLists?.(); showToast('تمت إزالة القسم من قوائم الإدخال الجديدة');
};
window.removeEngineer = function(name) {
    if (!window.hasRole('admin')) return showToast('⚠️ إدارة الإسناد متاحة للمدير فقط');
    if (!confirm(`إزالة «${name}» من قائمة الإسناد؟ لن تتأثر التاجات أو المهام القديمة.`)) return;
    maintenanceEngineers = maintenanceEngineers.filter(engineer => engineer.name !== name);
    window.syncRecord('maintenanceEngineers', maintenanceEngineers); window.updateOperationalSelects(); window.renderSettingsControlLists?.(); showToast('تمت إزالة المسؤول من قائمة الإسناد الجديدة');
};
window.renderSettingsControlLists = function() {
    const departmentList = document.getElementById('managedDeptsList');
    if (departmentList) {
        const support = window.getOperationalDepartments(departments).filter(dept => !window.isCoreOperationalDepartment(dept));
        departmentList.innerHTML = support.length ? support.map(dept => `<div class="settings-list-row"><span><i class='bx bx-layer'></i>${window.escapeTPM(dept)}</span><button class="btn btn-sm btn-outline" onclick="removeSupportDepartment(decodeURIComponent('${window.encodeTPMArgument(dept)}'))"><i class='bx bx-x'></i> إزالة</button></div>`).join('') : '<p class="settings-empty-state">لا توجد أقسام مساندة مضافة. الأقسام الأساسية الأربعة تعمل تلقائيًا.</p>';
    }
    const engineerList = document.getElementById('managedEngsList');
    if (engineerList) engineerList.innerHTML = maintenanceEngineers.length ? maintenanceEngineers.map(engineer => `<div class="settings-list-row"><span><i class='bx bx-user'></i><b>${window.escapeTPM(engineer.name)}</b><small>${window.escapeTPM(engineer.phone || 'بدون رقم')}</small></span><button class="btn btn-sm btn-outline" onclick="removeEngineer(decodeURIComponent('${window.encodeTPMArgument(engineer.name)}'))"><i class='bx bx-x'></i> إزالة</button></div>`).join('') : '<p class="settings-empty-state">أضف مسؤولين ليظهروا عند إسناد التاجات والمهام.</p>';
};

// ==========================================
