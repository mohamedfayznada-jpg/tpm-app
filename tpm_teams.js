/* TPM Teams Gateway: the six established workspaces remain unchanged. */
window.TPM_TEAM_HUB = [
  { id: 'jh', code: 'JH', name: 'الصيانة الذاتية', icon: 'bx-wrench', color: '#10b981', workspace: 'jhPortalScreen', description: 'رفع حالة المعدة وتمكين المشغل من الفحص والتنظيف والمعالجة المبكرة.', mission:'استقرار المعدة من مصدر المشكلة' },
  { id: 'et', code: 'E&T', name: 'التعليم والتدريب', icon: 'bxs-graduation', color: '#8b5cf6', workspace: 'etScreen', description: 'بناء المهارة، متابعة التأهيل، وربط التدريب بالأداء الفعلي في الميدان.', mission:'تحويل المعرفة إلى مهارة تشغيلية' },
  { id: '5s', code: '5S', name: 'بيئة العمل', icon: 'bx-sparkles', color: '#06b6d4', workspace: 'fiveSScreen', description: 'تنظيم بيئة العمل، تثبيت المعايير البصرية، وإغلاق مصادر الفوضى والانحراف.', mission:'بيئة عمل آمنة ومنضبطة' },
  { id: 'kk', code: 'KK', name: 'التحسين المستمر', icon: 'bx-line-chart', color: '#f59e0b', workspace: 'kkScreen', description: 'تحليل الخسائر، حل المشكلات، وإدارة مشاريع التحسين بأسلوب PDCA.', mission:'تحويل الخسارة إلى فرصة تحسين' },
  { id: 'pm', code: 'PM', name: 'الصيانة المخططة', icon: 'bx-cog', color: '#ef4444', workspace: 'pmScreen', description: 'إدارة الصيانة الوقائية، خطط الأعطال، ومتابعة موثوقية المعدات.', mission:'رفع الاعتمادية وتقليل التوقف' },
  { id: 'hse', code: 'HSE', name: 'الصحة والسلامة والبيئة', icon: 'bx-shield-quarter', color: '#22c55e', workspace: 'hseScreen', description: 'إدارة المخاطر، متابعة الإجراءات الوقائية، ودعم بيئة العمل الآمنة.', mission:'منع الحوادث قبل وقوعها' }
];

/* ---------------------------------------------------------
   TPM TEAMS COMMAND HUB — fast, data-driven renderer
   --------------------------------------------------------- */
window.ensureTPMTeamsGateway = function() {
    const screen = document.getElementById('tpmTeamsScreen');
    if (!screen) return;
    if (screen.querySelector('.tpm-hub-hero')) return;
    screen.innerHTML = `
      <section class="tpm-hub-hero">
        <div class="tpm-hub-hero-copy">
          <div class="tpm-hub-breadcrumb"><span>TPM</span><i class="bx bx-chevron-left"></i><b>TEAM OS</b></div>
          <span class="tpm-hub-eyebrow"><i class="bx bx-radar"></i> TPM MISSION CONTROL</span>
          <h1>مركز فرق المصنع</h1>
          <p>ستة مسارات تشغيلية، مساحة عمل واحدة. اختر الفريق وانتقل مباشرةً إلى أدواته وسجلاته ومؤشراته.</p>
          <div class="tpm-hub-hero-meta"><span><i class="bx bx-grid-alt"></i> 06 Workspaces</span><span><i class="bx bx-link"></i> Live-linked</span><span><i class="bx bx-shape-polygon"></i> Factory OS</span></div>
        </div>
        <div class="tpm-hub-command-visual" aria-hidden="true">
          <div class="tpm-hub-core"><span>TPM</span><b>OS</b><i class="bx bx-command"></i></div>
          <span class="tpm-orbit orbit-1">JH</span><span class="tpm-orbit orbit-2">E&amp;T</span><span class="tpm-orbit orbit-3">5S</span><span class="tpm-orbit orbit-4">KK</span><span class="tpm-orbit orbit-5">PM</span><span class="tpm-orbit orbit-6">HSE</span>
        </div>
      </section>
      <section class="tpm-hub-directory">
        <div class="tpm-teams-directory-head"><div><span class="eyebrow"><i class="bx bx-network-chart"></i> OPERATING NETWORK</span><h3>مساحات الفرق</h3><p>كل بطاقة هي بوابة مباشرة إلى مساحة الفريق. اضغط في أي مكان داخلها للفتح.</p></div></div>
        <div id="tpmTeamsGrid" class="tpm-team-grid"></div>
      </section>`;
};

window.renderTPMTeams = function() {
    const grid = document.getElementById('tpmTeamsGrid');
    const ribbon = document.getElementById('tpmTeamKpis');
    window.ensureTPMTeamsGateway?.();
    const liveGrid = document.getElementById('tpmTeamsGrid');
    if (!liveGrid) return;

    const teams = Array.isArray(window.TPM_TEAM_HUB) ? window.TPM_TEAM_HUB : [];
    // The gateway must be self-contained: it cannot fail just because another
    // legacy module has not exposed a helper yet.
    const esc = typeof window.escapeTPM === 'function'
        ? window.escapeTPM
        : value => String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[ch]));
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
    if (ribbon) {
        ribbon.innerHTML = kpis.map(k =>
            '<article class="tpm-kpi-chip">' +
              '<div class="tpm-kpi-icon"><i class="bx ' + k.icon + '"></i></div>' +
              '<div class="tpm-kpi-copy"><span>' + k.label + '</span><b>' + k.value + '</b><small>' + k.note + '</small></div>' +
            '</article>'
        ).join('');
    }

    try {
    liveGrid.innerHTML = teams.map(team => {
        const ts = taskStats[team.id] || { total:0, active:0, done:0, overdue:0 };
        const zs = tagStats[team.id] || { open:0, closed:0 };
        const progress = ts.total ? Math.round((ts.done / ts.total) * 100) : 0;
        const ready = !!document.getElementById(team.workspace);
        const dataState = ts.overdue ? 'alert' : (ts.active ? 'active' : 'quiet');
        return '<article class="tpm-team-card tpm-team-card-v5" style="--team-color:' + team.color + '" data-state="' + dataState + '" data-team-id="' + team.id + '" tabindex="0" role="button" aria-label="فتح فريق ' + esc(team.name) + '" onclick="openTPMTeamWorkspace(\'' + team.id + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openTPMTeamWorkspace(\'' + team.id + '\')}">' +
          '<div class="tpm-v5-topline"><span class="tpm-v5-code">' + esc(team.code) + '</span><span class="tpm-v5-status ' + (ready ? 'ready' : 'muted') + '"><i class="bx ' + (ready ? 'bx-check-circle' : 'bx-error-circle') + '"></i>' + (ready ? 'جاهز للعمل' : 'غير مهيأ') + '</span></div>' +
          '<div class="tpm-v5-icon"><i class="bx ' + team.icon + '"></i></div>' +
          '<div class="tpm-v5-body"><h3>' + window.escapeTPM(team.name) + '</h3><p>' + esc(team.description || 'مساحة تشغيل لفريق TPM.') + '</p></div>' +
          '<div class="tpm-v5-bottom">' +
            '<div class="tpm-v5-metrics"><span><b>' + ts.active + '</b><small>مهام</small></span><span><b>' + zs.open + '</b><small>تاجات</small></span><span><b>' + progress + '%</b><small>إغلاق</small></span></div>' +
            '<button type="button" class="tpm-v5-open" onclick="event.stopPropagation();openTPMTeamWorkspace(\'' + team.id + '\')"><span>دخول مساحة الفريق</span><i class="bx bx-left-arrow-alt"></i></button>' +
          '</div>' +
        '</article>';
    }).join('') || '<div class="teams-empty-state"><i class="bx bx-group"></i><h3>لا توجد فرق TPM</h3><p>لم يتم تحميل هيكل الفرق بعد.</p></div>';
    } catch (error) {
        console.error('[TPM Teams] render failed:', error);
        // Never leave the gateway blank. Preserve a useful recovery state.
        liveGrid.innerHTML = '<div class="teams-empty-state tpm-render-error"><i class="bx bx-error-circle"></i><h3>تعذر تحميل بطاقات الفرق</h3><p>حدث خطأ أثناء تجهيز بيانات البوابة.</p><button type="button" class="btn btn-primary" onclick="renderTPMTeams()">إعادة المحاولة</button></div>';
    }
};
window.renderTPMTeams.isV4 = true;

window.openTPMTeamWorkspace = function(teamId) {
    const team = (window.TPM_TEAM_HUB || []).find(item => item.id === teamId);
    if (!team) return window.showToast?.('⚠️ الفريق غير موجود');
    const target = document.getElementById(team.workspace);
    if (!target) return window.showToast?.('⚠️ مساحة الفريق غير متاحة حاليًا');
    if (teamId === 'jh' && typeof window.showJHPortal === 'function') {
        window.showJHPortal();
        return;
    }
    window.showScreen(team.workspace);
};

window.getTPMActivity = () => null;

/* Render the gateway once the deferred script has a live DOM target.
   Team definitions are static, so the gallery must not depend on KPI/data hydration. */
document.addEventListener('DOMContentLoaded', () => {
    window.renderTPMTeams?.();
});

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
