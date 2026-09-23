// 🛰️ Tag Command Center — ownership, SLA & verification
// ==========================================
window.getTagSLA = function(tag) {
    const priority = tag?.priority || (tag?.color === 'red' ? 'high' : 'medium');
    const hours = { critical: 4, high: 24, medium: 72, low: 168 }[priority] || 72;
    const openedAt = Number(tag?.timestamp || Date.now()); const deadline = openedAt + hours * 60 * 60 * 1000;
    const closed = ['closed', 'verified'].includes(tag?.status);
    const remaining = deadline - Date.now();
    return { priority, hours, deadline, closed, overdue: !closed && remaining < 0, approaching: !closed && remaining >= 0 && remaining < Math.min(hours * 0.25 * 60 * 60 * 1000, 8 * 60 * 60 * 1000), remaining };
};
window.formatTagSLA = function(tag) {
    const sla = window.getTagSLA(tag); if (sla.closed) return 'تم الإغلاق';
    const absoluteHours = Math.ceil(Math.abs(sla.remaining) / 3600000);
    if (sla.overdue) return `متجاوز للمهلة بـ ${absoluteHours} س`;
    return `متبقي ${Math.max(1, absoluteHours)} س`;
};
window.renderTagCommandCenter = function() {
    const open = tagsData.filter(tag => !['closed', 'verified'].includes(tag.status));
    const critical = open.filter(tag => (tag.priority || (tag.color === 'red' ? 'high' : 'medium')) === 'critical');
    const unassigned = open.filter(tag => !tag.engineer);
    const overdue = open.filter(tag => window.getTagSLA(tag).overdue);
    const review = open.filter(tag => tag.status === 'review');
    const closed = tagsData.filter(tag => ['closed', 'verified'].includes(tag.status));
    const counters = {
        tagQuickCritical: critical.length,
        tagQuickUnassigned: unassigned.length,
        tagQuickOverdue: overdue.length,
        tagQuickReview: review.length,
        tagStatTotal: tagsData.length,
        tagStatOpen: open.length,
        tagStatCritical: critical.length,
        tagStatOverdue: overdue.length,
        tagStatClosed: closed.length,
        tagsHeroOpenCount: open.length,
        tagsHeroCriticalCount: critical.length,
        tagsHeroOverdueCount: overdue.length
    };
    Object.entries(counters).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });

    const redCount = tagsData.filter(tag => tag.color === 'red').length;
    const blueCount = tagsData.filter(tag => tag.color === 'blue').length;
    const redEl = document.getElementById('redTagsCount');
    const blueEl = document.getElementById('blueTagsCount');
    if (redEl) redEl.textContent = redCount;
    if (blueEl) blueEl.textContent = blueCount;
    const queue = document.getElementById('tagEscalationQueue'); if (!queue) return;
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const actionList = [...overdue, ...critical.filter(tag => !overdue.includes(tag)), ...unassigned.filter(tag => !overdue.includes(tag) && !critical.includes(tag))]
        .sort((a, b) => (priorityOrder[a.priority || 'medium'] ?? 2) - (priorityOrder[b.priority || 'medium'] ?? 2) || Number(a.timestamp || 0) - Number(b.timestamp || 0))
        .slice(0, 5);
    queue.innerHTML = actionList.length ? actionList.map(tag => {
        const sla = window.getTagSLA(tag); const needsOwner = !tag.engineer;
        return `<div class="tag-escalation-item ${sla.overdue ? 'overdue' : ''}"><i class='bx ${sla.overdue ? 'bx-alarm-exclamation' : needsOwner ? 'bx-user-x' : 'bx-error-circle'}'></i><div><b>${window.escapeTPM(tag.desc || 'تاج بلا وصف')}</b><small>${window.escapeTPM(tag.dept || 'قسم غير محدد')} · ${window.formatTagSLA(tag)}${needsOwner ? ' · يحتاج إسنادًا' : ''}</small></div><button class="btn btn-sm btn-outline" onclick="focusTagFromCommand('${tag.id}')">فتح</button></div>`;
    }).join('') : '<div class="tag-escalation-item"><i class="bx bx-check-shield"></i><div><b>لا توجد استثناءات حرجة حاليًا</b><small>كل التاجات المفتوحة لها مسار متابعة ضمن المهلة.</small></div></div>';
};
window.applyTagQuickView = function(view) {
    const status = document.getElementById('filterTagStatus'); const priority = document.getElementById('filterTagPriority'); const search = document.getElementById('filterTagMachine');
    if (status) status.value = 'active'; if (priority) priority.value = 'all'; if (search) search.value = '';
    window.activeTagCommandView = view;
    if (view === 'critical' && priority) priority.value = 'critical';
    if (view === 'review' && search) search.value = '__TAG_REVIEW__';
    if (view === 'unassigned' && search) search.value = '__TAG_UNASSIGNED__';
    if (view === 'overdue' && search) search.value = '__TAG_OVERDUE__';
    window.renderTags();
};
window.focusTagFromCommand = function(id) {
    const tag = tagsData.find(item => item.id == id); if (!tag) return;
    const dept = document.getElementById('filterTagDept'); const status = document.getElementById('filterTagStatus'); const search = document.getElementById('filterTagMachine');
    if (dept) dept.value = tag.dept || 'الكل'; if (status) status.value = 'active'; if (search) search.value = tag.machine || tag.desc || '';
    window.activeTagCommandView = 'all'; window.renderTags(); document.getElementById('redTagsContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
window.assignTagOwner = async function(id) {
    const tag = tagsData.find(item => item.id == id); if (!tag) return;
    const choices = maintenanceEngineers.map(engineer => engineer.name).filter(Boolean);
    if (!choices.length) return showToast('⚠️ أضف مسؤولي الصيانة من الإعدادات أولًا');
    const selected = prompt(`اكتب اسم المسؤول كما يظهر في القائمة:\n${choices.join(' • ')}`, tag.engineer || '');
    if (selected === null) return; const engineer = window.getEngineer(selected.trim());
    if (!engineer) return showToast('⚠️ اختر اسمًا مطابقًا لمسؤولي الصيانة في الإعدادات');
    tag.engineer = engineer.name; tag.engineerPhone = engineer.phone || ''; tag.assignedAt = Date.now(); tag.assignedBy = currentUser.name || '';
    await window.syncRecord(`tags/${tag.id}`, tag); showToast(`تم إسناد التاج إلى ${engineer.name} ✅`);
    if (engineer.phone && notificationSettings.onTagAssigned) window.dispatchWhatsAppNotification(tag, 'tag_assigned');
};
window.verifyTagClosure = async function(id) {
    const tag = tagsData.find(item => item.id == id); if (!tag) return;
    if (!window.hasRole('admin', 'auditor')) return showToast('⚠️ التحقق من الإغلاق متاح للمراجع أو المدير فقط');
    if (tag.status !== 'review') return showToast('⚠️ انقل التاج إلى «بانتظار مراجعة» قبل التحقق');
    const note = prompt('ملاحظة التحقق (اختياري):', tag.verificationNote || ''); if (note === null) return;
    tag.status = 'closed'; tag.verifiedAt = Date.now(); tag.verifiedBy = currentUser.name || ''; tag.verificationNote = window.sanitizeInput(note); tag.closedAt = Date.now();
    await window.syncRecord(`tags/${tag.id}`, tag); window.awardPoints(20, 'إغلاق تاج بعد التحقق'); showToast('تم التحقق من الإغلاق وتوثيقه ✅');
};

