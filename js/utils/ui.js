// مسار الملف: js/utils/ui.js

export const UI = {
    screenHistory: ['homeScreen'],

    showScreen(screenId) {
        if (this.screenHistory[this.screenHistory.length - 1] !== screenId) {
            this.screenHistory.push(screenId);
        }

        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
        window.scrollTo(0, 0);
    },

    goBack() {
        if (this.screenHistory.length > 1) {
            this.screenHistory.pop();
            const lastScreen = this.screenHistory[this.screenHistory.length - 1];
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            const target = document.getElementById(lastScreen);
            if (target) target.classList.add('active');
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
