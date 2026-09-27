// مسار الملف: js/utils/ui.js

export const UI = {
    screenHistory: ['homeScreen'],

    showScreen(screenId) {
        if (this.screenHistory[this.screenHistory.length - 1] !== screenId) {
            this.screenHistory.push(screenId);
        }

        document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            target.style.display = 'block';

            // TPM Teams is a first-class route. This module is the canonical
            // showScreen implementation after the modular shell boots, so the
            // route-specific visibility contract must live here (not only in
            // the legacy app.js implementation).
            if (screenId === 'tpmTeamsScreen') {
                target.style.setProperty('display', 'block', 'important');
                target.style.setProperty('visibility', 'visible', 'important');
                target.style.setProperty('opacity', '1', 'important');
                target.style.setProperty('transform', 'none', 'important');
                target.style.setProperty('animation', 'none', 'important');
                target.style.setProperty('position', 'relative', 'important');
                target.style.setProperty('z-index', '10', 'important');
                document.body.classList.add('tpm-teams-open');
                if (typeof window.renderTPMTeams === 'function') window.renderTPMTeams();
            } else {
                document.body.classList.remove('tpm-teams-open');
            }
        }

        document.querySelectorAll('.side-item[data-screen]').forEach(item => {
            item.classList.toggle('active', item.dataset.screen === screenId);
        });
        window.scrollTo(0, 0);
    },

    goBack() {
        if (this.screenHistory.length > 1) {
            this.screenHistory.pop();
            const lastScreen = this.screenHistory[this.screenHistory.length - 1];
            document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
            const target = document.getElementById(lastScreen);
            if (target) {
                target.classList.add('active');
                target.style.display = 'block';
                if (lastScreen === 'tpmTeamsScreen') {
                    target.style.setProperty('display', 'block', 'important');
                    target.style.setProperty('visibility', 'visible', 'important');
                    target.style.setProperty('opacity', '1', 'important');
                    target.style.setProperty('transform', 'none', 'important');
                    document.body.classList.add('tpm-teams-open');
                    if (typeof window.renderTPMTeams === 'function') window.renderTPMTeams();
                } else {
                    document.body.classList.remove('tpm-teams-open');
                }
            }
            document.querySelectorAll('.side-item[data-screen]').forEach(item => {
                item.classList.toggle('active', item.dataset.screen === lastScreen);
            });
            window.scrollTo(0, 0);
        } else {
            this.showScreen('homeScreen');
        }
    },

    showToast(msg) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        // Toast content can originate from user/database data: never interpret it as HTML.
        toast.textContent = String(msg ?? '');
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    toggleSidebar() {
        const sidebar = document.getElementById('mainSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (!sidebar) return;

        const open = sidebar.classList.toggle('open');
        sidebar.classList.toggle('active', open);
        if (overlay) overlay.classList.toggle('active', open);
    },

    toggleDarkMode() {
        const body = document.body;
        body.classList.toggle('light-theme');
        const isLight = body.classList.contains('light-theme');
        localStorage.setItem('tpm_theme', isLight ? 'light' : 'dark');
        this.showToast(isLight ? 'تم تفعيل وضع النهار ☀️' : 'تم تفعيل وضع الليل 🌙');
    },

    sanitizeInput(val) {
        if (!val) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(String(val)));
        return div.innerHTML.trim();
    },

    uniqueNumericId() {
        return (Date.now() * 1000) + Math.floor(Math.random() * 1000);
    }
};
