// مسار الملف: js/utils/ui.js

export const UI = {
    screenHistory: ['homeScreen'],

    showScreen(screenId) {
        // حماية الصلاحيات هتتنفذ من ملف الـ Auth
        if (this.screenHistory[this.screenHistory.length - 1] !== screenId) {
            this.screenHistory.push(screenId);
        }
        
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        let target = document.getElementById(screenId);
        if (target) target.classList.add('active');
        window.scrollTo(0, 0);
    },

    goBack() {
        if (this.screenHistory.length > 1) {
            this.screenHistory.pop(); 
            let lastScreen = this.screenHistory[this.screenHistory.length - 1];
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            let target = document.getElementById(lastScreen);
            if (target) target.classList.add('active');
            window.scrollTo(0, 0);
        } else {
            this.showScreen('homeScreen');
        }
    },

    showToast(msg) {
        let c = document.getElementById('toast-container');
        if (!c) { 
            c = document.createElement('div'); 
            c.id = 'toast-container'; 
            document.body.appendChild(c); 
        }
        let t = document.createElement('div'); 
        t.className = 'toast-msg'; 
        t.innerHTML = msg;
        c.appendChild(t);
        setTimeout(() => { 
            t.style.animation = 'fadeOut 0.3s ease-out forwards'; 
            setTimeout(() => t.remove(), 300); 
        }, 3000);
    },

    toggleSidebar() {
        const sb = document.getElementById('mainSidebar');
        const ov = document.getElementById('sidebarOverlay');
        if (!sb) return;
        if (sb.classList.contains('open')) {
            sb.classList.remove('open'); ov.style.display = 'none';
        } else {
            sb.classList.add('open'); ov.style.display = 'block';
        }
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
        div.appendChild(document.createTextNode(val));
        return div.innerHTML.trim();
    },

    uniqueNumericId() {
        return (Date.now() * 1000) + Math.floor(Math.random() * 1000);
    }
};
