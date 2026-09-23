/* TPM Teams Gateway: the six established workspaces remain unchanged. */
window.TPM_TEAM_HUB = [
  { id: 'jh', code: 'JH', name: 'الصيانة الذاتية', icon: 'bx-wrench', color: '#10b981', workspace: 'jhPortalScreen', description: 'رفع حالة المعدة وتمكين المشغل من الفحص والتنظيف والمعالجة المبكرة.', mission:'استقرار المعدة من مصدر المشكلة' },
  { id: 'et', code: 'E&T', name: 'التعليم والتدريب', icon: 'bxs-graduation', color: '#8b5cf6', workspace: 'etScreen', description: 'بناء المهارة، متابعة التأهيل، وربط التدريب بالأداء الفعلي في الميدان.', mission:'تحويل المعرفة إلى مهارة تشغيلية' },
  { id: '5s', code: '5S', name: 'بيئة العمل', icon: 'bx-sparkles', color: '#06b6d4', workspace: 'fiveSScreen', description: 'تنظيم بيئة العمل، تثبيت المعايير البصرية، وإغلاق مصادر الفوضى والانحراف.', mission:'بيئة عمل آمنة ومنضبطة' },
  { id: 'kk', code: 'KK', name: 'التحسين المستمر', icon: 'bx-line-chart', color: '#f59e0b', workspace: 'kkScreen', description: 'تحليل الخسائر، حل المشكلات، وإدارة مشاريع التحسين بأسلوب PDCA.', mission:'تحويل الخسارة إلى فرصة تحسين' },
  { id: 'pm', code: 'PM', name: 'الصيانة المخططة', icon: 'bx-cog', color: '#ef4444', workspace: 'pmScreen', description: 'إدارة الصيانة الوقائية، خطط الأعطال، ومتابعة موثوقية المعدات.', mission:'رفع الاعتمادية وتقليل التوقف' },
  { id: 'hse', code: 'HSE', name: 'الصحة والسلامة والبيئة', icon: 'bx-shield-quarter', color: '#22c55e', workspace: 'hseScreen', description: 'إدارة المخاطر، متابعة الإجراءات الوقائية، ودعم بيئة العمل الآمنة.', mission:'منع الحوادث قبل وقوعها' }
];

/* ---------------------------------------------------------\n   TPM TEAMS COMMAND HUB — fast, data-driven renderer\n   --------------------------------------------------------- */\nwindow.renderTPMTeams = function() {
    const grid = document.getElementById('tpmTeamsGrid');
    const ribbon = document.getElementById('tpmTeamKpis');
    if (!grid || !ribbon) return;

    const teams = Array.isArray(window.TPM_TEAM_HUB) ? window.TPM_TEAM_HUB : [];
    const tasks = Array.isArray(window.tasksData) ? window.tasksData : [];
    const tags = Array.isArray(window.tagsData) ? window.tagsData : [];
    const taskStats = Object.create(null);
    const tagStats = Object.create(null);
    let activeTasks = 0, overdueTasks = 0, linkedTags = 0;

    const isLate = task => {
        if (!task || task.status === 'done' || !task.dueDate) return false;
        const due = new Date(String(task.dueDate) + 'T23:59:59').getTime();
        return Number.isFinite(due) && due < Date.now();
    };

    tasks.forEach(task => {
        const teamId = task && task.team;
        if (!teamId) return;
        const s = taskStats[teamId] || (taskStats[teamId] = { total:0, active:0, done:0, overdue:0 });
        s.total++;
        if (task.status === 'done') s.done++;
        else {
            s.active++; activeTasks++;
            if (isLate(task)) { s.overdue++; overdueTasks++; }
        }
    });

    tags.forEach(tag => {
        const teamId = tag && tag.team;
        if (!teamId) return;
        const s = tagStats[teamId] || (tagStats[teamId] = { open:0, closed:0 });
        if (['closed','verified','done'].includes(tag.status)) s.closed++;
        else { s.open++; linkedTags++; }
    });

    const readyTeams = teams.filter(team => document.getElementById(team.workspace)).length;
    const kpis = [
        { icon:'bx-group', value:teams.length, label:'فرق TPM', note: readyTeams + ' مساحات تشغيل متاحة' },
        { icon:'bx-task', value:activeTasks, label:'مهام مفتوحة', note:'مرتبطة بفرق محددة' },
        { icon:'bx-alarm-exclamation', value:overdueTasks, label:'مهام متأخرة', note: overdueTasks ? 'تحتاج تصعيدًا' : 'لا توجد متأخرات' },
        { icon:'bx-purchase-tag-alt', value:linkedTags, label:'تاجات مفتوحة', note:'مرتبطة بمسارات الفريق' }
    ];
    ribbon.innerHTML = kpis.map(k =>
        '<article class="tpm-kpi-chip">' +
          '<div class="tpm-kpi-icon"><i class="bx ' + k.icon + '"></i></div>' +
          '<div class="tpm-kpi-copy"><span>' + k.label + '</span><b>' + k.value + '</b><small>' + k.note + '</small></div>' +
        '</article>'
    ).join('');

    grid.innerHTML = teams.map(team => {
        const ts = taskStats[team.id] || { total:0, active:0, done:0, overdue:0 };
        const zs = tagStats[team.id] || { open:0, closed:0 };
        const progress = ts.total ? Math.round((ts.done / ts.total) * 100) : 0;
        const ready = !!document.getElementById(team.workspace);
        const dataState = ts.overdue ? 'alert' : (ts.active ? 'active' : 'quiet');
        return '<article class="tpm-team-card tpm-team-card-v4" style="--team-color:' + team.color + '" data-state="' + dataState + '" data-team-id="' + team.id + '" tabindex="0" onclick="openTPMTeamWorkspace(\'' + team.id + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openTPMTeamWorkspace(\'' + team.id + '\')}">' +
          '<div class="tpm-team-accent"></div>' +
          '<div class="tpm-team-card-head">' +
            '<div class="tpm-team-icon"><i class="bx ' + team.icon + '"></i></div>' +
            '<div class="tpm-team-card-head-copy"><span class="tpm-team-code">' + window.escapeTPM(team.code) + '</span><span class="tpm-team-status ' + (ready ? 'ready' : 'muted') + '"><i class="bx ' + (ready ? 'bx-check-circle' : 'bx-error-circle') + '"></i>' + (ready ? 'متاحة الآن' : 'غير مهيأة') + '</span></div>' +
          '</div>' +
          '<div class="tpm-team-card-copy"><h3>' + window.escapeTPM(team.name) + '</h3><p>' + window.escapeTPM(team.description || 'مساحة تشغيل لفريق TPM.') + '</p></div>' +
          '<div class="tpm-team-mission"><span>المهمة الأساسية</span><b>' + window.escapeTPM(team.mission || 'تحسين الأداء التشغيلي') + '</b></div>' +
          '<div class="tpm-team-data-row">' +
            '<div><span>مهام مفتوحة</span><b>' + ts.active + '</b></div>' +
            '<div><span>تاجات</span><b>' + zs.open + '</b></div>' +
            '<div><span>إغلاق المهام</span><b>' + progress + '%</b></div>' +
          '</div>' +
          '<div class="tpm-team-progress"><span style="width:' + progress + '%"></span></div>' +
          '<div class="tpm-team-card-footer"><span class="tpm-team-health ' + (ts.overdue ? 'alert' : 'good') + '"><i class="bx ' + (ts.overdue ? 'bx-alarm-exclamation' : 'bx-check-circle') + '"></i>' + (ts.overdue ? ts.overdue + ' متأخرة' : 'المسار تحت المتابعة') + '</span><button type="button" class="tpm-team-open-btn" onclick="event.stopPropagation();openTPMTeamWorkspace(\'' + team.id + '\')">فتح الفريق <i class="bx bx-left-arrow-alt"></i></button></div>' +
        '</article>';
    }).join('') || '<div class="teams-empty-state"><i class="bx bx-group"></i><h3>لا توجد فرق TPM</h3><p>لم يتم تحميل هيكل الفرق بعد.</p></div>';
};
window.renderTPMTeams.isV4 = true;\n\nwindow.openTPMTeamWorkspace = function(teamId) {\n    const team = (window.TPM_TEAM_HUB || []).find(item => item.id === teamId);\n    if (!team) return window.showToast?.('⚠️ الفريق غير موجود');\n    const target = document.getElementById(team.workspace);\n    if (!target) return window.showToast?.('⚠️ مساحة الفريق غير متاحة حاليًا');\n    window.showScreen(team.workspace);\n};\n\nwindow.getTPMActivity = () => null;

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
