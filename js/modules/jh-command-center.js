/* JH Command Center — Re-architecture Orchestrator
 * Visual/interaction shell around the existing JH features.
 * Does not replace or remove existing screens, records, or workflows.
 */
(() => {
    'use strict';

    const JH_SCREENS = new Set(['jhPortalScreen', 'jhDocumentScreen', 'clitChecklistScreen', 'jhKPIsScreen']);
    const state = {
        originalShowJHPortal: null,
        originalSelectJHDept: null,
        originalShowScreen: null,
        originalOpenJHDocument: null,
        originalOpenJHKPIsScreen: null,
        structured: false
    };

    const esc = value => window.escapeTPM ? window.escapeTPM(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const deptList = () => Array.isArray(window.departments) ? window.departments : (typeof departments !== 'undefined' && Array.isArray(departments) ? departments : []);
    const currentDept = () => {
        try { return typeof currentJHDept !== 'undefined' ? currentJHDept : (window.currentJHDept || ''); } catch (_) { return window.currentJHDept || ''; }
    };

    function getJHStats() {
        const depts = deptList();
        const audits = Array.isArray(window.historyData) ? window.historyData.filter(h => h && h.dept && Array.isArray(h.stepsOrder) && !h.stepsOrder.includes('ManualKaizen')) : (typeof historyData !== 'undefined' && Array.isArray(historyData) ? historyData.filter(h => h && h.dept && Array.isArray(h.stepsOrder) && !h.stepsOrder.includes('ManualKaizen')) : []);
        const tags = Array.isArray(window.tagsData) ? window.tagsData : (typeof tagsData !== 'undefined' && Array.isArray(tagsData) ? tagsData : []);
        const openTags = tags.filter(t => t && !['closed','done','verified'].includes(String(t.status || '').toLowerCase())).length;
        const covered = new Set(audits.map(a => a.dept)).size;
        return { depts, audits, tags, openTags, covered };
    }

    function buildShell() {
        const portal = document.getElementById('jhPortalScreen');
        if (!portal || state.structured) return;
        const hero = portal.querySelector('.jh-portal-hero');
        const commandHead = portal.querySelector('.jh-dept-command-head');
        const tabs = document.getElementById('jhDeptTabs');
        const gridLabel = portal.querySelector('.jh-dept-grid-label');
        const grid = document.getElementById('jhDeptGrid');
        const team = document.getElementById('jhMainTeamSection');
        const toolbox = document.getElementById('jhToolbox');
        if (!hero || !commandHead || !tabs || !grid || !team || !toolbox) return;

        const legacyTopbar = portal.querySelector(':scope > .legacy-inline-47');

        const shell = document.createElement('div');
        shell.id = 'jhRearchitectureShell';
        shell.className = 'jh-rearch-shell';

        const nav = document.createElement('nav');
        nav.className = 'jh-rearch-nav';
        nav.setAttribute('aria-label', 'تنقل مركز قيادة JH');
        nav.innerHTML = `
            <div class="jh-rearch-nav-brand">
                <span class="jh-rearch-nav-mark"><i class="bx bx-radar"></i></span>
                <div><b>JH OPERATING SYSTEM</b><small>Autonomous Maintenance Control</small></div>
            </div>
            <div class="jh-rearch-nav-links">
                <button type="button" data-jh-nav="overview" class="is-active"><i class="bx bx-grid-alt"></i><span>نظرة عامة</span></button>
                <button type="button" data-jh-nav="department"><i class="bx bx-buildings"></i><span>تشغيل الأقسام</span></button>
                <button type="button" data-jh-nav="standards"><i class="bx bx-list-check"></i><span>المعايير والسجلات</span></button>
                <button type="button" data-jh-nav="governance"><i class="bx bx-git-branch"></i><span>الحوكمة والفريق</span></button>
            </div>
            <div class="jh-rearch-nav-current"><span>القسم الحالي</span><strong id="jhRearchCurrentDept">لم يتم الاختيار</strong></div>
        `;

        const overview = document.createElement('section');
        overview.id = 'jhRearchOverview';
        overview.className = 'jh-rearch-section jh-rearch-overview';
        overview.appendChild(hero);

        const overviewBand = document.createElement('div');
        overviewBand.className = 'jh-rearch-overview-band';
        overviewBand.innerHTML = `
            <div class="jh-rearch-section-label"><span>OPERATING PULSE</span><h3>صورة التشغيل قبل الدخول للميدان</h3><small>البيانات المعروضة هنا من سجلات JH الحالية فقط — بدون مؤشرات مصطنعة.</small></div>
            <div class="jh-rearch-pulse-grid">
                <article><span>الأقسام المعرفة</span><strong id="jhRearchDeptCount">0</strong><small>نطاق التشغيل</small></article>
                <article><span>أقسام لها مراجعات</span><strong id="jhRearchCoveredCount">0</strong><small>تغطية Audit</small></article>
                <article><span>تاجات مفتوحة</span><strong id="jhRearchOpenTags">0</strong><small>تحتاج متابعة</small></article>
                <article><span>اختيار التشغيل</span><strong id="jhRearchSelectedState">Overview</strong><small>الحالة الحالية</small></article>
            </div>
        `;
        overview.appendChild(overviewBand);

        const lifecycle = document.createElement('section');
        lifecycle.className = 'jh-rearch-lifecycle';
        lifecycle.innerHTML = `
            <div class="jh-rearch-section-label"><span>JH CONTROL LOOP</span><h3>منهج التشغيل داخل الفريق</h3><small>نحافظ على كل الأدوات الحالية، لكن نرتب استخدامها حول دورة تشغيل واحدة.</small></div>
            <div class="jh-rearch-lifecycle-grid">
                <article><b>01</b><i class="bx bx-radar"></i><strong>Diagnose</strong><span>Audit + abnormalities</span></article>
                <article><b>02</b><i class="bx bx-list-check"></i><strong>Standardize</strong><span>CLIT + contamination + SOC</span></article>
                <article><b>03</b><i class="bx bx-play-circle"></i><strong>Execute</strong><span>Field checklist + actions</span></article>
                <article><b>04</b><i class="bx bx-check-shield"></i><strong>Verify</strong><span>Tags + evidence + review</span></article>
                <article><b>05</b><i class="bx bx-refresh"></i><strong>Sustain</strong><span>Team + KPI/KAI + follow-up</span></article>
            </div>
        `;

        const departments = document.createElement('section');
        departments.id = 'jhRearchDepartments';
        departments.className = 'jh-rearch-section jh-rearch-departments';
        departments.append(commandHead, tabs);
        if (gridLabel) departments.appendChild(gridLabel);
        departments.appendChild(grid);

        const cockpit = document.createElement('section');
        cockpit.id = 'jhRearchCockpit';
        cockpit.className = 'jh-rearch-section jh-rearch-cockpit';
        const cockpitHeader = document.createElement('div');
        cockpitHeader.className = 'jh-rearch-section-head';
        cockpitHeader.innerHTML = `
            <div><span>DEPARTMENT CONTROL ROOM</span><h3>غرفة تشغيل القسم المختار</h3><small>كل الوظائف الحالية موجودة هنا: Audit، CLIT، السجلات، التاجات، التحليل، والتشغيل الميداني.</small></div>
            <div class="jh-rearch-context"><i class="bx bx-link"></i><span id="jhRearchContextText">اختر قسمًا من الأعلى</span></div>
        `;
        cockpit.append(cockpitHeader, toolbox);

        const governance = document.createElement('section');
        governance.id = 'jhRearchGovernance';
        governance.className = 'jh-rearch-section jh-rearch-governance';
        governance.appendChild(team);

        const quick = document.createElement('div');
        quick.className = 'jh-rearch-quick-actions';
        quick.innerHTML = `
            <button type="button" class="jh-rearch-quick-primary" onclick="startNewAuditFlowFromPortal()"><i class="bx bx-edit-alt"></i><span><small>FIELD EXECUTION</small>ابدأ Audit جديد</span><i class="bx bx-left-arrow-alt"></i></button>
            <button type="button" onclick="openJHDocument('CLIT')"><i class="bx bx-list-check"></i><span>CLIT</span></button>
            <button type="button" onclick="openJHDocument('Contamination')"><i class="bx bx-water"></i><span>التلوث</span></button>
            <button type="button" onclick="openJHDocument('SOC')"><i class="bx bx-map-pin"></i><span>SOC</span></button>
            <button type="button" onclick="openJHDocument('Anatomy')"><i class="bx bx-cog"></i><span>Anatomy</span></button>
            <button type="button" onclick="openJHDocument('Safety')"><i class="bx bx-shield-quarter"></i><span>Safety</span></button>
            <button type="button" onclick="openJHKPIsScreen()"><i class="bx bx-radar"></i><span>KPI Center</span></button>
        `;

        const standards = document.createElement('div');
        standards.id = 'jhRearchStandards';
        standards.className = 'jh-rearch-standards-anchor';
        standards.appendChild(quick);

        shell.appendChild(nav);
        shell.appendChild(overview);
        shell.appendChild(lifecycle);
        shell.appendChild(departments);
        shell.appendChild(standards);
        shell.appendChild(cockpit);
        shell.appendChild(governance);

        if (legacyTopbar) legacyTopbar.insertAdjacentElement('afterend', shell);
        else portal.insertBefore(shell, portal.firstChild);

        nav.querySelectorAll('[data-jh-nav]').forEach(button => {
            button.addEventListener('click', () => {
                const key = button.dataset.jhNav;
                const target = {
                    overview: 'jhRearchOverview',
                    department: 'jhRearchDepartments',
                    standards: 'jhRearchStandards',
                    governance: 'jhRearchGovernance'
                }[key];
                document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                nav.querySelectorAll('[data-jh-nav]').forEach(b => b.classList.toggle('is-active', b === button));
            });
        });

        state.structured = true;
        portal.classList.add('jh-rearchitected');
    }

    function refreshState() {
        buildShell();
        const stats = getJHStats();
        const dept = currentDept();
        const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = String(value); };
        set('jhRearchDeptCount', stats.depts.length);
        set('jhRearchCoveredCount', stats.covered);
        set('jhRearchOpenTags', stats.openTags);
        set('jhRearchSelectedState', dept || 'Overview');
        set('jhRearchCurrentDept', dept || 'لم يتم الاختيار');
        set('jhRearchContextText', dept ? `تشغيل قسم: ${dept}` : 'اختر قسمًا من الأعلى');

        const portal = document.getElementById('jhPortalScreen');
        if (portal) {
            const heroCount = portal.querySelector('.jh-hero-side>div:first-child b');
            if (heroCount) heroCount.textContent = String(stats.depts.length).padStart(2, '0');
        }
        const context = document.getElementById('jhRearchContextText');
        if (context) context.classList.toggle('is-ready', !!dept);
    }

    function cleanupExecutionListener() {
        if (window.__jhExecutionRef) {
            try { window.__jhExecutionRef.off(); } catch (_) {}
            window.__jhExecutionRef = null;
            window.__jhExecutionRefDept = null;
        }
    }

    function installWrappers() {
        if (state.originalShowJHPortal) return;
        state.originalShowJHPortal = window.showJHPortal;
        state.originalSelectJHDept = window.selectJHDept;
        state.originalShowScreen = window.showScreen;
        state.originalOpenJHDocument = window.openJHDocument;
        state.originalOpenJHKPIsScreen = window.openJHKPIsScreen;

        if (typeof state.originalShowJHPortal === 'function') {
            window.showJHPortal = function() {
                const result = state.originalShowJHPortal.apply(this, arguments);
                requestAnimationFrame(() => {
                    buildShell();
                    refreshState();
                    window.renderJHMainTeam?.();
                });
                return result;
            };
        }

        if (typeof state.originalSelectJHDept === 'function') {
            window.selectJHDept = function(dept) {
                cleanupExecutionListener();
                const result = state.originalSelectJHDept.apply(this, arguments);
                requestAnimationFrame(() => refreshState());
                return result;
            };
        }

        if (typeof state.originalShowScreen === 'function') {
            window.showScreen = function(screenId) {
                if (!JH_SCREENS.has(screenId)) cleanupExecutionListener();
                const result = state.originalShowScreen.apply(this, arguments);
                if (screenId === 'jhPortalScreen') requestAnimationFrame(() => refreshState());
                return result;
            };
        }

        if (typeof state.originalOpenJHDocument === 'function') {
            window.openJHDocument = async function(type) {
                if (!currentDept()) return window.showToast?.('⚠️ اختر قسم JH أولاً');
                const result = await state.originalOpenJHDocument.apply(this, arguments);
                requestAnimationFrame(() => enhanceInternalScreen('jhDocumentScreen', type));
                return result;
            };
        }

        if (typeof state.originalOpenJHKPIsScreen === 'function') {
            window.openJHKPIsScreen = function() {
                const dept = currentDept();
                if (dept && typeof window.currentKPIDept !== 'undefined') window.currentKPIDept = dept;
                else if (dept) window.currentKPIDept = dept;
                const result = state.originalOpenJHKPIsScreen.apply(this, arguments);
                requestAnimationFrame(() => enhanceInternalScreen('jhKPIsScreen'));
                return result;
            };
        }
    }

    function enhanceInternalScreen(screenId, type) {
        const screen = document.getElementById(screenId);
        if (!screen) return;
        let bar = screen.querySelector('.jh-rearch-internal-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'jh-rearch-internal-bar';
            screen.insertBefore(bar, screen.firstChild);
        }
        const labels = {
            jhDocumentScreen: ['JH FIELD LIBRARY', type === 'CLIT' ? 'معايير CLIT والتنفيذ' : 'سجل JH التشغيلي'],
            jhKPIsScreen: ['JH PERFORMANCE', 'مركز مؤشرات ونتائج JH']
        };
        const meta = labels[screenId] || ['JH', ''];
        bar.innerHTML = `
            <div><span>${esc(meta[0])}</span><strong>${esc(meta[1])}</strong><small>${currentDept() ? 'القسم: ' + esc(currentDept()) : 'نطاق المصنع'}</small></div>
            <div class="jh-rearch-internal-actions">
                <button type="button" onclick="showScreen('jhPortalScreen'); if(window.currentJHDept) window.selectJHDept(window.currentJHDept);"><i class="bx bx-arrow-back"></i> العودة لغرفة القسم</button>
            </div>
        `;
    }

    function boot() {
        installWrappers();
        if (document.getElementById('jhPortalScreen')?.classList.contains('active')) refreshState();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();

    window.JH_COMMAND_CENTER = Object.freeze({
        version: 'rearchitecture-v1',
        refresh: refreshState,
        cleanup: cleanupExecutionListener
    });
})();
