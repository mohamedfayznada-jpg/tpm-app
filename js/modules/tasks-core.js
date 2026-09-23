// 📋 إدارة المهام (Tasks Kanban)
// ==========================================
window.renderTasks = function() {
    let htmlFolders = ''; const cols = { pending: '', progress: '', done: '' }; const counts = { pending: 0, progress: 0, done: 0 };
    let currentDeptTasks = tasksData.filter(t => t.dept === currentTaskDept);

    currentDeptTasks.forEach(t => {
        let deleteBtnHTML = window.hasRole('admin') ? `<button class="btn btn-sm btn-danger" style="padding:4px 8px; margin:0;" onclick="deleteTask('${t.id}')"><i class='bx bx-trash'></i></button>` : '';
        if(t.isFolder) {
            let total = t.subTasks ? t.subTasks.length : 0; let done = t.subTasks ? t.subTasks.filter(s=>s.status==='done').length : 0;
            htmlFolders += `
                <div class="card glass-card task-folder-card">
                    <div class="task-folder-head">
                        <b class="task-folder-title"><i class='bx bx-folder'></i> ${t.task}</b>
                        <div class="task-folder-meta"><span class="task-folder-count">${done}/${total}</span>${deleteBtnHTML}</div>
                    </div>
                    ${t.subTasks ? t.subTasks.map((s,i)=>`<div class="task-folder-subtask"><label class="task-folder-check ${s.status==='done'?'is-done':''}"><input type="checkbox" class="task-folder-checkbox" ${s.status==='done'?'checked':''} onclick="toggleFolderSubTask('${t.id}', ${i})"> <span class="task-folder-text">${s.text}</span></label></div>`).join('') : ''}
                </div>`;
        } else {
            const status = t.status || 'pending'; counts[status]++;
            let actions = '';
            if(status === 'pending') actions = `<button class="btn btn-sm btn-warning flex-1" onclick="changeTaskStatus('${t.id}', 'progress')"><i class='bx bx-play'></i> بدء</button>`;
            else if(status === 'progress') actions = `<button class="btn btn-sm btn-success flex-1" onclick="changeTaskStatus('${t.id}', 'done')"><i class='bx bx-check'></i> إنجاز</button>`;
            else if(status === 'done') actions = `<button class="btn btn-sm btn-outline flex-1" onclick="changeTaskStatus('${t.id}', 'pending')"><i class='bx bx-undo'></i> إعادة</button>`;

            cols[status] += `
            <div class="kanban-item task-kanban-card">
                <div style="font-weight:bold; margin-bottom:10px; font-size:14px;">${t.task}</div>
                ${t.image ? `<img src="${t.image}" style="width:100%; border-radius:10px; margin-bottom:10px; border:1px solid var(--border-glass); cursor:pointer;" onclick="window.open('${t.image}')">` : ''}
                <div style="font-size:11px; color:var(--text-muted); margin-bottom:15px;"><i class='bx bx-buildings'></i> ${t.dept}</div>
                <div class="row-flex" style="gap:8px;">${actions}${window.hasRole('admin') ? `<button class="btn btn-sm btn-danger" style="width:40px; padding:0;" onclick="deleteTask('${t.id}')"><i class='bx bx-trash'></i></button>` : ''}</div>
            </div>`;
        }
    });

    ['pending', 'progress', 'done'].forEach(s => {
        const listEl = document.getElementById('kanban_' + s); const countEl = document.getElementById('count_' + s);
        if(listEl) listEl.innerHTML = cols[s] || '<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:15px;">لا توجد مهام</div>';
        if(countEl) countEl.innerText = counts[s];
    });

    let fC = document.getElementById('auditFoldersContainer'); 
    if(fC) fC.innerHTML = htmlFolders || '<div style="font-size:13px; color:var(--text-muted); text-align:center; width:100%; padding:20px;">لا توجد مجلدات تحسين</div>';
    window.updateTasksDeptGrid();
};

window.deleteTask = function(id) { if(confirm('⚠️ تأكيد الحذف نهائياً؟')) { window.deleteRecord('tasks/' + id); showToast('تم الحذف 🗑️'); } };

window.updateTasksDeptGrid = function() {
    let deptStats = {}; departments.forEach(d => deptStats[d] = { p:0 }); let pendAll=0, progAll=0, doneAll=0;
    tasksData.forEach(t => {
        let isDone = t.isFolder ? (t.subTasks && t.subTasks.every(s=>s.status==='done') && t.subTasks.length>0) : (t.status==='done');
        let isProg = t.isFolder ? (t.subTasks && t.subTasks.some(s=>s.status==='done') && !isDone) : (t.status==='progress');
        if(isDone) doneAll++; else if(isProg) progAll++; else pendAll++;
        if(!isDone && t.dept && deptStats[t.dept]) deptStats[t.dept].p++;
    });
    
    let paEl = document.getElementById('kpiTasksPendingAll'); if(paEl) paEl.innerText = pendAll;
    let prEl = document.getElementById('kpiTasksProgressAll'); if(prEl) prEl.innerText = progAll;
    let daEl = document.getElementById('kpiTasksDoneAll'); if(daEl) daEl.innerText = doneAll;
    
    let dG = document.getElementById('tasksDeptGrid');
    if(dG) dG.innerHTML = departments.map(d => `<div class="card glass-card" style="padding:20px; text-align:center; cursor:pointer; border-bottom:3px solid ${deptStats[d].p>0?'var(--danger)':'var(--success)'};" onclick="openTasksDept('${d}')"><h4 style="color:var(--text-main); font-size:16px; margin:0 0 10px;"><i class='bx bx-buildings'></i> ${d}</h4><div style="font-size:12px; color:var(--text-muted);">مهام نشطة: <b style="color:var(--danger); font-size:16px;">${deptStats[d].p}</b></div></div>`).join('');
};

window.openTasksDept = function(dept) { currentTaskDept = dept; document.getElementById('tasksDeptTitle').innerText = `مهام ${dept}`; document.getElementById('tasksMainView').style.display='none'; document.getElementById('tasksDeptView').style.display='block'; window.renderTasks(); };
window.closeTasksDept = function() { currentTaskDept = null; document.getElementById('tasksDeptView').style.display='none'; document.getElementById('tasksMainView').style.display='block'; window.renderTasks(); };
window.toggleFolderSubTask = function(fId, sIdx) { let f = tasksData.find(x=>x.id==fId); if(f) { f.subTasks[sIdx].status = f.subTasks[sIdx].status==='done'?'pending':'done'; window.syncRecord('tasks/' + fId, f); } };
window.changeTaskStatus = function(id, st) { let t=tasksData.find(x=>x.id==id); if(t) {t.status=st; window.syncRecord('tasks/' + id, t);} };
window.addManualTaskDept = function() { let v=document.getElementById('newTaskInput').value; if(v){ let id = window.uniqueNumericId().toString(); window.syncRecord('tasks/' + id, {id:id, task:v, dept:currentTaskDept, status:'pending'}); document.getElementById('newTaskInput').value=''; showToast('تمت الإضافة'); } };

// ==========================================
