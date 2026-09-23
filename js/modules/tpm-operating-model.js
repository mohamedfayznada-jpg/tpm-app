// 🌐 TPM OPERATING MODEL EXTENSIONS (V6)
// ==========================================
window.escapeTPM = function(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};
window.formatTPMDate = function(value) {
    if (!value) return 'غير محدد';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? window.escapeTPM(value) : date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
};
window.getTeamLabel = function(teamId) {
    const team = (window.TPM_TEAM_HUB || window.TPM_TEAM_CATALOG || []).find(item => item.id === teamId);
    return team ? `${team.code} — ${team.name}` : 'مسار عام';
};
window.getPriorityMeta = function(priority) {
    return {
        critical: { label: 'حرج', className: 'priority-critical' },
        high: { label: 'عالية', className: 'priority-high' },
        medium: { label: 'متوسطة', className: 'priority-medium' },
        low: { label: 'منخفضة', className: 'priority-low' }
    }[priority] || { label: 'متوسطة', className: 'priority-medium' };
};
window.isOverdue = function(item) {
    return Boolean(item && item.dueDate && item.status !== 'done' && new Date(`${item.dueDate}T23:59:59`).getTime() < Date.now());
};
window.getEngineer = function(name) {
    return maintenanceEngineers.find(engineer => engineer.name === name) || null;
};

// ---------- المهام ----------
window.renderTasks = function() {
    const cols = { pending: '', progress: '', done: '' }; const counts = { pending: 0, progress: 0, done: 0 };
    const scopedTasks = currentTaskDept ? tasksData.filter(task => task.dept === currentTaskDept) : [];
    let folders = '';
    scopedTasks.forEach(task => {
        if (task.isFolder) {
            const subtasks = task.subTasks || []; const done = subtasks.filter(item => item.status === 'done').length;
            folders += `<div class="audit-folder-card"><div class="folder-header"><b><i class='bx bx-folder'></i> ${window.escapeTPM(task.task)}</b><span>${done}/${subtasks.length}</span></div>${subtasks.map((subtask, index) => `<label class="folder-subtask ${subtask.status === 'done' ? 'is-done' : ''}"><input type="checkbox" ${subtask.status === 'done' ? 'checked' : ''} onclick="toggleFolderSubTask('${task.id}', ${index})"><span>${window.escapeTPM(subtask.text)}</span></label>`).join('')}</div>`;
            return;
        }
        const status = ['pending', 'progress', 'done'].includes(task.status) ? task.status : 'pending';
        counts[status] += 1;
        const priority = window.getPriorityMeta(task.priority); const overdue = window.isOverdue(task);
        const actions = status === 'pending' ? `<button class="btn btn-sm btn-warning flex-1" onclick="changeTaskStatus('${task.id}', 'progress')"><i class='bx bx-play'></i> بدء</button>` : status === 'progress' ? `<button class="btn btn-sm btn-success flex-1" onclick="changeTaskStatus('${task.id}', 'done')"><i class='bx bx-check'></i> إنجاز</button>` : `<button class="btn btn-sm btn-outline flex-1" onclick="changeTaskStatus('${task.id}', 'pending')"><i class='bx bx-reset'></i> إعادة</button>`;
        cols[status] += `<article class="kanban-item enriched-task-card ${overdue ? 'is-overdue' : ''}"><div class="task-card-top"><span class="priority-badge ${priority.className}">${priority.label}</span>${overdue ? '<span class="overdue-badge"><i class="bx bx-time-five"></i> متأخرة</span>' : ''}</div><h4>${window.escapeTPM(task.task)}</h4><div class="task-metadata"><span><i class='bx bx-buildings'></i> ${window.escapeTPM(task.dept || 'عام')}</span>${task.assignee ? `<span><i class='bx bx-user-check'></i> ${window.escapeTPM(task.assignee)}</span>` : ''}${task.team ? `<span><i class='bx bx-network-chart'></i> ${window.escapeTPM(window.getTeamLabel(task.team))}</span>` : ''}${task.dueDate ? `<span><i class='bx bx-calendar-event'></i> ${window.formatTPMDate(task.dueDate)}</span>` : ''}</div>${task.image ? `<img src="${window.escapeTPM(task.image)}" alt="مرفق المهمة" class="task-attachment" onclick="window.open('${window.escapeTPM(task.image)}')">` : ''}<div class="row-flex task-card-actions">${actions}${window.hasRole('admin') ? `<button class="btn btn-sm btn-danger" onclick="deleteTask('${task.id}')"><i class='bx bx-trash'></i></button>` : ''}</div></article>`;
    });
    ['pending', 'progress', 'done'].forEach(status => { const list = document.getElementById(`kanban_${status}`); const count = document.getElementById(`count_${status}`); if (list) list.innerHTML = cols[status] || '<div class="empty-kanban-state">لا توجد مهام في هذا المسار</div>'; if (count) count.textContent = counts[status]; });
    const folderContainer = document.getElementById('auditFoldersContainer'); if (folderContainer) folderContainer.innerHTML = folders || '<div class="empty-kanban-state">لا توجد حزم مراجعات حالياً</div>';
    window.updateTasksDeptGrid();
};
window.updateTasksDeptGrid = function() {
    let pending = 0, progress = 0, done = 0, overdue = 0;
    tasksData.forEach(task => { if (task.isFolder) return; const status = task.status || 'pending'; if (status === 'done') done++; else if (status === 'progress') progress++; else pending++; if (window.isOverdue(task)) overdue++; });
    [['kpiTasksPendingAll', pending], ['kpiTasksProgressAll', progress], ['kpiTasksDoneAll', done], ['kpiTasksOverdueAll', overdue]].forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value; });
    const summary = document.getElementById('tasksCommandSummary');
    const highPriority = tasksData.filter(task => !task.isFolder && task.status !== 'done' && ['critical', 'high'].includes(task.priority)).slice(0, 3);
    if (summary) summary.innerHTML = `<div class="tasks-command-card"><div><span class="eyebrow"><i class='bx bx-radar'></i> قراءة تنفيذية</span><h3>${overdue ? `هناك ${overdue} مهام تحتاج تدخلًا فوريًا` : 'المسارات تحت السيطرة'}</h3><p>${highPriority.length ? `أولوية الآن: ${highPriority.map(task => window.escapeTPM(task.task)).join(' • ')}` : 'لا توجد مهام عالية الأولوية مفتوحة حالياً.'}</p></div><button class="btn btn-outline btn-sm" onclick="showScreen('tpmTeamsScreen'); renderTPMTeams();"><i class='bx bx-network-chart'></i> عرض فرق TPM</button></div>`;
    const deptGrid = document.getElementById('tasksDeptGrid'); if (!deptGrid) return;
    deptGrid.innerHTML = departments.map(dept => { const items = tasksData.filter(task => task.dept === dept && !task.isFolder); const active = items.filter(task => task.status !== 'done'); const late = active.filter(task => window.isOverdue(task)).length; const topTeam = active.find(task => task.team); return `<article class="dept-task-station" onclick="openTasksDept('${window.escapeTPM(dept)}')"><div class="dept-station-icon"><i class='bx bx-buildings'></i></div><div><h4>${window.escapeTPM(dept)}</h4><p>${topTeam ? window.escapeTPM(window.getTeamLabel(topTeam.team)) : 'مسار تشغيلي عام'}</p></div><div class="dept-station-count"><b>${active.length}</b><span>مفتوحة</span></div>${late ? `<span class="dept-late-chip">${late} متأخرة</span>` : '<span class="dept-ok-chip">مستقر</span>'}</article>`; }).join('') || '<div class="empty-kanban-state">أضف الأقسام من الإعدادات لبدء توزيع المهام</div>';
};
window.openTasksDept = function(dept) { currentTaskDept = dept; const title = document.getElementById('tasksDeptTitle'); if(title) title.textContent = `محطة تنفيذ — ${dept}`; document.getElementById('tasksMainView').style.display = 'none'; document.getElementById('tasksDeptView').style.display = 'block'; window.updateOperationalSelects(); window.renderTasks(); };
window.closeTasksDept = function() { currentTaskDept = null; document.getElementById('tasksDeptView').style.display = 'none'; document.getElementById('tasksMainView').style.display = 'block'; window.renderTasks(); };
window.addManualTaskDept = async function() {
    const taskText = window.sanitizeInput(document.getElementById('newTaskInput')?.value || ''); if (!taskText) return showToast('⚠️ اكتب وصفاً واضحاً للمهمة'); if (!currentTaskDept) return showToast('⚠️ اختر القسم أولاً');
    const id = window.uniqueNumericId().toString();
    const assignee = document.getElementById('newTaskAssignee')?.value || ''; const team = document.getElementById('newTaskTeam')?.value || ''; const priority = document.getElementById('newTaskPriority')?.value || 'medium'; const dueDate = document.getElementById('newTaskDueDate')?.value || '';
    await window.syncRecord(`tasks/${id}`, { id, task: taskText, dept: currentTaskDept, assignee, team, priority, dueDate, status: 'pending', createdAt: Date.now(), createdBy: currentUser.name || '' });
    document.getElementById('newTaskInput').value = ''; showToast('تمت إضافة المهمة إلى مسار التنفيذ ✅');
};
window.changeTaskStatus = async function(id, status) { const task = tasksData.find(item => item.id == id); if (!task) return; task.status = status; if (status === 'done') task.completedAt = Date.now(); await window.syncRecord(`tasks/${id}`, task); };

// ---------- التاجات والإشعار ----------
window.addNewTag = async function() {
    const desc = window.sanitizeInput(document.getElementById('newTagDesc')?.value || ''); const color = document.getElementById('newTagColor')?.value || 'red'; const dept = document.getElementById('newTagDept')?.value || ''; const machine = window.sanitizeInput(document.getElementById('newTagMachine')?.value || ''); const spareParts = window.sanitizeInput(document.getElementById('newTagSpareParts')?.value || ''); const priority = document.getElementById('newTagPriority')?.value || 'high'; const team = document.getElementById('newTagTeam')?.value || ''; const engineerName = document.getElementById('newTagEngineer')?.value || '';
    if (!desc) return showToast('⚠️ أدخل وصف المشكلة قبل تسجيل التاج');
    if (!dept) return showToast('⚠️ اختر القسم التشغيلي الذي ظهر فيه التاج');
    let image = null; if (currentTagImg) { showToast('جاري حفظ التاج والصورة…'); image = await uploadImageToStorage(currentTagImg); if (!image) showToast('⚠️ تعذر رفع الصورة؛ سيُحفظ التاج من دونها.'); }
    const engineer = window.getEngineer(engineerName); const id = window.uniqueNumericId().toString();
    const record = { id, desc: spareParts ? `${desc} [قطع مطلوبة: ${spareParts}]` : desc, color, dept, machine, image, priority, team, engineer: engineerName, engineerPhone: engineer?.phone || '', status: 'open', auditor: currentUser.name || '', date: new Date().toLocaleDateString('ar-EG'), timestamp: Date.now(), notification: { requested: Boolean(engineer?.phone), status: engineer?.phone ? 'pending' : 'not_requested' } };
    await window.syncRecord(`tags/${id}`, record);
    document.getElementById('newTagDesc').value = ''; document.getElementById('newTagMachine').value = ''; document.getElementById('newTagSpareParts').value = ''; currentTagImg = null; const preview = document.getElementById('tagImagePreview'); if (preview) preview.innerHTML = '';
    window.awardPoints(10, 'إصدار تاج جديد'); showToast('تم تسجيل التاج بنجاح ✅');
    const shouldNotify = engineer?.phone && (notificationSettings.onTagAssigned || (priority === 'critical' && notificationSettings.onCriticalTag));
    if (shouldNotify) window.dispatchWhatsAppNotification(record, priority === 'critical' ? 'critical_tag' : 'tag_assigned');
};
window.renderTags = function() {
    const redContainer = document.getElementById('redTagsContainer'); const blueContainer = document.getElementById('blueTagsContainer'); if (!redContainer || !blueContainer) return;
    const deptFilter = document.getElementById('filterTagDept')?.value || 'الكل'; const statusFilter = document.getElementById('filterTagStatus')?.value || 'active'; const priorityFilter = document.getElementById('filterTagPriority')?.value || 'all'; const textFilter = (document.getElementById('filterTagMachine')?.value || '').trim().toLowerCase();
    const ageLimit = 3 * 24 * 60 * 60 * 1000; let red = '', blue = '';
    const commandView = window.activeTagCommandView || 'all'; const normalizedText = textFilter.startsWith('__TAG_') ? '' : textFilter;
    const visible = tagsData.filter(tag => { const closed = ['closed', 'verified'].includes(tag.status); const matchesText = !normalizedText || `${tag.machine || ''} ${tag.engineer || ''} ${tag.desc || ''}`.toLowerCase().includes(normalizedText); const sla = window.getTagSLA ? window.getTagSLA(tag) : { overdue: !closed && tag.timestamp && Date.now() - tag.timestamp > ageLimit }; const matchesCommand = commandView === 'all' || (commandView === 'critical' && (tag.priority || 'high') === 'critical') || (commandView === 'unassigned' && !tag.engineer) || (commandView === 'overdue' && sla.overdue) || (commandView === 'review' && tag.status === 'review'); return (deptFilter === 'الكل' || tag.dept === deptFilter) && (statusFilter !== 'active' || !closed) && (statusFilter !== 'closed' || closed) && (priorityFilter === 'all' || (tag.priority || 'high') === priorityFilter) && matchesText && matchesCommand; });
    visible.forEach(tag => {
        const closed = ['closed', 'verified'].includes(tag.status); const sla = window.getTagSLA(tag); const aged = sla.overdue; const priority = window.getPriorityMeta(tag.priority || 'high'); const canEdit = window.hasRole('admin', 'auditor') || currentUser.name === tag.auditor;
        const stateControl = `<select class="form-control flex-2 tag-state-select" onchange="updateTagState('${tag.id}', this.value)"><option value="open" ${tag.status === 'open' ? 'selected' : ''}>مفتوح</option><option value="progress" ${tag.status === 'progress' ? 'selected' : ''}>جاري التنفيذ</option><option value="review" ${tag.status === 'review' ? 'selected' : ''}>بانتظار مراجعة</option></select>`;
        const assignButton = window.hasRole('admin', 'auditor') ? `<button class="btn btn-sm btn-outline" onclick="assignTagOwner('${tag.id}')"><i class='bx bx-user-plus'></i> إسناد</button>` : '';
        const verifyButton = tag.status === 'review' && window.hasRole('admin', 'auditor') ? `<button class="btn btn-sm btn-success" onclick="verifyTagClosure('${tag.id}')"><i class='bx bx-check-shield'></i> تحقق</button>` : '';
        const control = canEdit ? `${stateControl}${assignButton}${verifyButton}<button class="btn btn-sm btn-outline" onclick="editTag('${tag.id}')"><i class='bx bx-edit'></i></button><button class="btn btn-sm btn-danger" onclick="deleteTag('${tag.id}')"><i class='bx bx-trash'></i></button>` : `<span class="tag-state-readonly">${window.escapeTPM(tag.status || 'open')}</span>`;
        const notificationButton = tag.engineerPhone && window.hasRole('admin', 'auditor') ? `<button class="btn btn-sm btn-outline" onclick="resendTagNotification('${tag.id}')"><i class='bx bxl-whatsapp'></i> تنبيه</button>` : '';
        const card = `<article class="tag-ticket ${tag.color === 'red' ? 'ticket-red' : 'ticket-blue'} ${aged ? 'tag-is-aged' : ''}"><div class="tag-ticket-head"><span class="priority-badge ${priority.className}">${priority.label}</span>${aged ? '<span class="overdue-badge">متأخر</span>' : ''}</div><h4>${window.escapeTPM(tag.desc)}</h4><div class="tag-context-row"><span><i class='bx bx-buildings'></i>${window.escapeTPM(tag.dept || 'غير محدد')}</span>${tag.machine ? `<span><i class='bx bx-cog'></i>${window.escapeTPM(tag.machine)}</span>` : ''}</div><div class="tag-ownership"><div><i class='bx bx-user-check'></i><span>المسؤول</span><b>${window.escapeTPM(tag.engineer || 'غير مُسند')}</b></div><div><i class='bx bx-network-chart'></i><span>المسار</span><b>${window.escapeTPM(window.getTeamLabel(tag.team))}</b></div></div><div class="tag-sla-row ${aged ? 'is-overdue' : ''}"><i class='bx bx-timer'></i><span>${window.formatTagSLA(tag)}</span>${tag.assignedAt ? `<small>أُسند ${window.formatTPMDate(tag.assignedAt)}</small>` : ''}</div>${tag.image ? `<img src="${window.escapeTPM(tag.image)}" alt="صورة التاج" class="tag-attachment" onclick="window.open('${window.escapeTPM(tag.image)}', '_blank')">` : ''}<div class="tag-footer"><small><i class='bx bx-calendar'></i> ${window.escapeTPM(tag.date || '')} · ${window.escapeTPM(tag.auditor || '')}</small><div class="row-flex tag-controls">${notificationButton}${control}</div></div></article>`;
        if (tag.color === 'red') red += card; else blue += card;
    });
    redContainer.innerHTML = red || '<div class="empty-kanban-state">لا توجد تاجات صيانة مطابقة للفلاتر</div>'; blueContainer.innerHTML = blue || '<div class="empty-kanban-state">لا توجد تاجات إنتاج مطابقة للفلاتر</div>';
    const stats = document.getElementById('tagCommandStats'); if (stats) { const open = tagsData.filter(tag => !['closed', 'verified'].includes(tag.status)); const critical = open.filter(tag => (tag.priority || 'high') === 'critical').length; const aged = open.filter(tag => window.getTagSLA(tag).overdue).length; const assigned = open.filter(tag => tag.engineer).length; stats.innerHTML = `<div class="tag-stat"><span>تاجات مفتوحة</span><b>${open.length}</b></div><div class="tag-stat critical"><span>حرجة</span><b>${critical}</b></div><div class="tag-stat"><span>تجاوزت SLA</span><b>${aged}</b></div><div class="tag-stat"><span>مُسندة</span><b>${assigned}</b></div>`; }
    window.renderTagCommandCenter?.();
};
window.updateTagState = async function(id, status) { const tag = tagsData.find(item => item.id == id); if (!tag) return; if (status === 'closed' || status === 'verified') return window.verifyTagClosure(id); const previousStatus = tag.status; tag.status = status; if (status === 'review' && previousStatus !== 'review') { tag.reviewRequestedAt = Date.now(); tag.reviewRequestedBy = currentUser.name || ''; } await window.syncRecord(`tags/${id}`, tag); if (status === 'review' && previousStatus !== 'review' && tag.engineerPhone && notificationSettings.onTagEscalation) window.dispatchWhatsAppNotification(tag, 'tag_escalated'); };
window.resendTagNotification = function(id) { const tag = tagsData.find(item => item.id == id); if (!tag?.engineerPhone) return showToast('⚠️ لا يوجد رقم WhatsApp صالح للمسؤول'); window.dispatchWhatsAppNotification(tag, 'tag_assigned', true); };
window.dispatchWhatsAppNotification = async function(tag, eventType = 'tag_assigned', manual = false) {
    try {
        const authToken = await auth.currentUser?.getIdToken();
        if (!authToken) throw new Error('سجّل الدخول بحساب إداري قبل إرسال الإشعار');
        const response = await fetch('/api/whatsapp-notify', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ eventType, tag: { id: tag.id, desc: tag.desc, dept: tag.dept, machine: tag.machine || '', priority: tag.priority || 'high', engineer: tag.engineer || '', engineerPhone: tag.engineerPhone || '', team: tag.team || '' }, manual }) });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || result.error || 'تعذر إرسال الإشعار');
        tag.notification = { ...(tag.notification || {}), status: 'sent', sentAt: Date.now() }; await window.syncRecord(`tags/${tag.id}`, tag); showToast('تم إرسال إشعار WhatsApp للمسؤول ✅');
    } catch (error) {
        tag.notification = { ...(tag.notification || {}), status: 'not_configured', lastError: String(error.message || '') }; await window.syncRecord(`tags/${tag.id}`, tag); if (manual) showToast('⚠️ تم تسجيل التاج، لكن إشعار WhatsApp غير مهيأ على الخادم بعد');
    }
};

// ---------- المكتبة ----------
window.filterKnowledgeLibrary = function(category, button) { knowledgeActiveFilter = category; document.querySelectorAll('.knowledge-filter').forEach(item => item.classList.remove('active')); if (button) button.classList.add('active'); window.renderKnowledgeBase(); };
window.renderKnowledgeBase = function() {
    const container = document.getElementById('knowledgeListContainer'); if (!container) return; const books = (Array.isArray(knowledgeBaseData) ? knowledgeBaseData : Object.values(knowledgeBaseData || {}));
    const filtered = knowledgeActiveFilter === 'all' ? books : books.filter(book => book.category === knowledgeActiveFilter);
    const stats = document.getElementById('knowledgeCommandStats'); if (stats) { const byCategory = category => books.filter(book => book.category === category).length; stats.innerHTML = `<div class="library-stat"><i class='bx bx-library'></i><b>${books.length}</b><span>مرجع</span></div><div class="library-stat"><i class='bx bx-book-open'></i><b>${byCategory('JH') + byCategory('PM')}</b><span>صيانة وتشغيل</span></div><div class="library-stat"><i class='bx bx-file'></i><b>${byCategory('OPL')}</b><span>دروس نقطة واحدة</span></div><div class="library-stat"><i class='bx bx-badge-check'></i><b>${byCategory('SOP')}</b><span>إجراءات معيارية</span></div>`; }
    if (!filtered.length) { container.innerHTML = `<div class="library-empty"><i class='bx bx-folder-open'></i><h3>لا توجد مراجع في هذا التصنيف بعد</h3><p>يمكن للإدارة رفع مرجع PDF ثم ربطه بمسار TPM مناسب.</p></div>`; return; }
    const appearance = { JH: ['var(--success)', 'bx-wrench', 'الصيانة الذاتية'], PM: ['var(--danger)', 'bx-cog', 'الصيانة المخططة'], OPL: ['var(--warning)', 'bx-bulb', 'درس نقطة واحدة'], SOP: ['var(--primary)', 'bx-list-check', 'إجراء معياري'] };
    container.innerHTML = filtered.map(book => { const [color, icon, label] = appearance[book.category] || ['var(--primary)', 'bx-book', 'مرجع']; return `<article class="knowledge-card" style="--book-color:${color}"><div class="book-icon"><i class='bx ${icon}'></i></div><span class="book-category">${label}</span><h4>${window.escapeTPM(book.title)}</h4><p>${book.hasPdf ? 'مرجع PDF متاح للقراءة' : 'مادة معرفية مسجلة داخل النظام'}</p><div class="knowledge-card-footer"><button class="btn btn-sm btn-primary" onclick="openBookDetail('${book.id}')"><i class='bx bx-book-open'></i> فتح</button>${currentUser?.role === 'admin' ? `<button class="btn btn-sm btn-outline" onclick="deleteKnowledgeBook('${book.id}')"><i class='bx bx-trash'></i></button>` : ''}</div></article>`; }).join('');
};

// ---------- إعدادات التنبيهات ----------
window.populateNotificationSettings = function() { ['notifyOnTagAssigned', 'notifyOnCriticalTag', 'notifyOnTagEscalation'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = notificationSettings[{ notifyOnTagAssigned: 'onTagAssigned', notifyOnCriticalTag: 'onCriticalTag', notifyOnTagEscalation: 'onTagEscalation' }[id]] !== false; }); };
window.saveNotificationSettings = async function() { if (!window.hasRole('admin')) return showToast('⚠️ إعدادات الإشعار متاحة للمدير فقط'); notificationSettings = { onTagAssigned: document.getElementById('notifyOnTagAssigned')?.checked !== false, onCriticalTag: document.getElementById('notifyOnCriticalTag')?.checked !== false, onTagEscalation: document.getElementById('notifyOnTagEscalation')?.checked !== false, updatedAt: Date.now(), updatedBy: currentUser.name || '' }; await window.syncRecord('notification_settings', notificationSettings); showToast('تم حفظ قواعد الإشعار. الإرسال الفعلي يبدأ بعد إعداد Meta على الخادم.'); };

// إعادة تهيئة عناصر التشغيل بعد اكتمال تحميل الصفحة.
document.addEventListener('DOMContentLoaded', () => { window.updateOperationalSelects?.(); });

// ===================== TPM Teams Gateway =====================
// The gateway deliberately lists the six teams and opens each existing workspace without injecting new content.
window.escapeTPMHub = function(value) {
    return window.escapeTPM ? window.escapeTPM(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
};
window.getTPMHubTeam = function(teamId) {
    return (window.TPM_TEAM_HUB || []).find(team => team.id === teamId) || null;
};
if (!window.renderTPMTeams?.isV3) {
window.renderTPMTeams = function() {
    const teams = window.TPM_TEAM_HUB || [];
    const grid = document.getElementById('tpmTeamsGrid');
    const kpis = document.getElementById('tpmTeamKpis');
    if (!grid || !kpis) return;

    kpis.innerHTML =         `<div class="tpm-kpi-card"><i class='bx bx-group'></i><b>${teams.length}</b><span>فرق TPM</span></div>         <div class="tpm-kpi-card"><i class='bx bx-window-open'></i><b>5</b><span>مساحات عمل قائمة</span></div>         <div class="tpm-kpi-card"><i class='bx bx-shield-quarter'></i><b>1</b><span>مساحة HSE</span></div>`;

    grid.innerHTML = teams.map(team =>         `<article class="tpm-team-card" style="--team-color:${team.color}" onclick="showTPMTeam('${team.id}')">            <div class="tpm-team-card-head"><div class="tpm-team-icon"><i class='bx ${team.icon}'></i></div><span class="tpm-team-code">${team.code}</span></div>            <h3>${window.escapeTPMHub(team.name)}</h3>            <p>${window.escapeTPMHub(team.description)}</p>            <div class="tpm-team-card-footer"><span class="tpm-formation-state"><i class='bx bx-window-open'></i> مساحة العمل</span><button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); showTPMTeam('${team.id}')">فتح الفريق <i class='bx bx-left-arrow-alt'></i></button></div>        </article>`
    ).join('');
};

}
window.showTPMTeam = function(teamId) {
    return window.openTPMExistingWorkspace(teamId);
};
window.openTPMExistingWorkspace = function(teamId) {
    const team = window.getTPMHubTeam(teamId);
    if (!team || !team.workspace) return showToast('⚠️ مساحة الفريق غير متاحة حاليًا');
    if (team.id === 'jh' && typeof window.showJHPortal === 'function') window.showJHPortal();
    else window.showScreen(team.workspace);
    if (team.id === 'kk' && typeof window.renderKKDashboard === 'function') window.renderKKDashboard();
};
// =================== End TPM Teams Gateway ===================


