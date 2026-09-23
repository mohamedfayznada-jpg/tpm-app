/* TPM Teams Gateway: the six established workspaces remain unchanged. */
window.TPM_TEAM_HUB = [
  { id: 'jh', code: 'JH', name: 'الصيانة الذاتية', icon: 'bx-wrench', color: '#10b981', workspace: 'jhPortalScreen', description: 'مساحة الصيانة الذاتية الأصلية.' },
  { id: 'et', code: 'E&T', name: 'التعليم والتدريب', icon: 'bxs-graduation', color: '#8b5cf6', workspace: 'etScreen', description: 'مساحة التعليم والتدريب الأصلية.' },
  { id: '5s', code: '5S', name: 'بيئة العمل', icon: 'bx-sparkles', color: '#06b6d4', workspace: 'fiveSScreen', description: 'مساحة 5S الأصلية.' },
  { id: 'kk', code: 'KK', name: 'التحسين المستمر', icon: 'bx-line-chart', color: '#f59e0b', workspace: 'kkScreen', description: 'مساحة التحسين المستمر الأصلية.' },
  { id: 'pm', code: 'PM', name: 'الصيانة المخططة', icon: 'bx-cog', color: '#ef4444', workspace: 'pmScreen', description: 'مساحة الصيانة المخططة الأصلية.' },
  { id: 'hse', code: 'HSE', name: 'الصحة والسلامة والبيئة', icon: 'bx-shield-quarter', color: '#22c55e', workspace: 'hseScreen', description: 'مساحة فريق HSE.' }
];

/* ---------------------------------------------------------\n   TPM TEAMS COMMAND HUB — fast, data-driven renderer\n   --------------------------------------------------------- */\nwindow.renderTPMTeams = function() {\n    const grid = document.getElementById('tpmTeamsGrid');\n    const ribbon = document.getElementById('tpmTeamKpis');\n    if (!grid || !ribbon) return;\n\n    const teams = Array.isArray(window.TPM_TEAM_HUB) ? window.TPM_TEAM_HUB : [];\n    const tasks = Array.isArray(window.tasksData) ? window.tasksData : [];\n    const tags = Array.isArray(window.tagsData) ? window.tagsData : [];\n    const taskStats = Object.create(null);\n    const tagStats = Object.create(null);\n    let activeTasks = 0, overdueTasks = 0, linkedTags = 0;\n\n    const isLate = task => {\n        if (!task || task.status === 'done' || !task.dueDate) return false;\n        const due = new Date(String(task.dueDate) + 'T23:59:59').getTime();\n        return Number.isFinite(due) && due < Date.now();\n    };\n\n    for (const task of tasks) {\n        const teamId = task && task.team;\n        if (!teamId) continue;\n        const s = taskStats[teamId] || (taskStats[teamId] = { total:0, active:0, done:0, overdue:0 });\n        s.total++;\n        if (task.status === 'done') s.done++;\n        else {\n            s.active++; activeTasks++;\n            if (isLate(task)) { s.overdue++; overdueTasks++; }\n        }\n    }\n\n    for (const tag of tags) {\n        const teamId = tag && tag.team;\n        if (!teamId) continue;\n        const s = tagStats[teamId] || (tagStats[teamId] = { open:0, closed:0 });\n        if (['closed','verified'].includes(tag.status)) s.closed++;\n        else { s.open++; linkedTags++; }\n    }\n\n    const totalTeamWork = teams.reduce((sum, team) => sum + (taskStats[team.id] ? taskStats[team.id].total : 0), 0);\n    const readyTeams = teams.filter(team => document.getElementById(team.workspace)).length;\n\n    const kpis = [\n        { icon:'bx-group', value:teams.length, label:'فرق TPM', note: readyTeams + ' مساحات جاهزة' },\n        { icon:'bx-task', value:activeTasks, label:'مهام مفتوحة', note:'ضمن مسارات الفرق' },\n        { icon:'bx-time-five', value:overdueTasks, label:'مهام متأخرة', note: overdueTasks ? 'تحتاج متابعة' : 'لا توجد متأخرات' },\n        { icon:'bx-purchase-tag-alt', value:linkedTags, label:'تاجات مفتوحة', note: totalTeamWork + ' مهمة مرتبطة إجمالاً' }\n    ];\n    ribbon.innerHTML = kpis.map(k => '<article class="tpm-kpi-chip"><i class="bx ' + k.icon + '"></i><div><span>' + k.label + '</span><b>' + k.value + '</b><small>' + k.note + '</small></div></article>').join('');\n\n    grid.innerHTML = teams.map(team => {\n        const ts = taskStats[team.id] || { total:0, active:0, done:0, overdue:0 };\n        const zs = tagStats[team.id] || { open:0, closed:0 };\n        const progress = ts.total ? Math.round((ts.done / ts.total) * 100) : 0;\n        const ready = !!document.getElementById(team.workspace);\n        return '<article class="tpm-team-card" style="--team-color:' + team.color + '" data-team-id="' + team.id + '" tabindex="0" onclick="openTPMTeamWorkspace(\'' + team.id + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openTPMTeamWorkspace(\'' + team.id + '\')}">' +\n          '<div class="tpm-team-card-head"><div class="tpm-team-icon"><i class="bx ' + team.icon + '"></i></div><span class="tpm-team-code">' + window.escapeTPM(team.code) + '</span></div>' +\n          '<div class="tpm-team-card-copy"><h3>' + window.escapeTPM(team.name) + '</h3><p>' + window.escapeTPM(team.description || 'مساحة تشغيل ومتابعة لفريق TPM.') + '</p></div>' +\n          '<div class="tpm-team-progress"><div class="tpm-progress-meta"><span>إنجاز المهام</span><b>' + progress + '%</b></div><div class="tpm-progress-track"><span style="width:' + progress + '%"></span></div></div>' +\n          '<div class="tpm-team-metrics"><span><i class="bx bx-task"></i><b>' + ts.active + '</b> مفتوحة</span><span><i class="bx bx-purchase-tag-alt"></i><b>' + zs.open + '</b> تاج</span>' + (ts.overdue ? '<span class="is-alert"><i class="bx bx-alarm-exclamation"></i><b>' + ts.overdue + '</b> متأخرة</span>' : '') + '</div>' +\n          '<div class="tpm-team-card-footer"><span class="tpm-formation-state ' + (ready ? 'is-ready' : '') + '"><i class="bx ' + (ready ? 'bx-check-circle' : 'bx-error-circle') + '"></i> ' + (ready ? 'المساحة متاحة' : 'المساحة غير مُهيأة') + '</span><button type="button" class="tpm-team-open-btn" onclick="event.stopPropagation();openTPMTeamWorkspace(\'' + team.id + '\')">فتح المساحة <i class="bx bx-left-arrow-alt"></i></button></div>' +\n        '</article>';\n    }).join('') || '<div class="teams-empty-state"><i class="bx bx-group"></i><h3>لا توجد فرق TPM</h3><p>لم يتم تحميل هيكل الفرق بعد.</p></div>';\n};\n\nwindow.openTPMTeamWorkspace = function(teamId) {\n    const team = (window.TPM_TEAM_HUB || []).find(item => item.id === teamId);\n    if (!team) return window.showToast?.('⚠️ الفريق غير موجود');\n    const target = document.getElementById(team.workspace);\n    if (!target) return window.showToast?.('⚠️ مساحة الفريق غير متاحة حاليًا');\n    window.showScreen(team.workspace);\n};\n\nwindow.getTPMActivity = () => null;

// Bridge the new domain layer into the legacy application without removing existing screens.
(function bootstrapTPMDomainAfterAuth() {
  const start = () => {
    if (!window.firebase?.auth || !firebase.auth().currentUser) return;
    if (window.TPMDomainBootstrapStarted) return;
    window.TPMDomainBootstrapStarted = true;

    (async function bootstrapTPMDomain() {
      try {
        const [{ TPMWorkflow }, { TPMFirebase }, { TPMKPI }, { TPMWorkflowUI }] = await Promise.all([
          import('./js/core/tpm-workflow.js'),
          import('./js/core/tpm-firebase.js'),
          import('./js/core/tpm-kpi.js'),
          import('./js/core/tpm-workflow-ui.js')
        ]);
        window.TPMWorkflow = TPMWorkflow;
        window.TPMFirebase = TPMFirebase;
        window.TPMKPI = TPMKPI;
        window.TPMWorkflowUI = TPMWorkflowUI;
        window.TPMDomainReady = true;
        window.dispatchEvent(new CustomEvent('tpm:domain-ready'));
        console.info('[TPM] Continuous Improvement domain connected.');
      } catch (error) {
        console.error('[TPM] Domain bootstrap failed:', error);
        window.TPMDomainReady = false;
        window.dispatchEvent(new CustomEvent('tpm:domain-error', { detail: error }));
      }
    })();
  };

  if (window.firebase?.auth) {
    firebase.auth().onAuthStateChanged(user => {
      if (user) start();
    });
  } else {
    window.addEventListener('load', start, { once: true });
  }
})();
