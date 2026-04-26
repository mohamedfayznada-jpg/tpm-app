// js/core/router.js
import { globalStore } from './store.js';

class Router {
    constructor() {
        this.screens = {};
        this.history = [];
        this.backBtn = document.getElementById('globalBackBtn');
    }

    // تهيئة المحرك وجمع الشاشات من الـ DOM مرة واحدة (Performance Optimization)
    init() {
        document.querySelectorAll('.screen').forEach(screen => {
            this.screens[screen.id] = screen;
        });
        
        // مراقبة التغيرات في الشاشة الحالية
        globalStore.subscribe('currentScreen', (newScreenId) => this._render(newScreenId));
    }

    navigate(screenId, addToHistory = true) {
        if (!this.screens[screenId]) {
            console.error(`[Router] Screen ${screenId} not found!`);
            return;
        }

        const current = globalStore.get('currentScreen');
        if (addToHistory && current && current !== screenId) {
            this.history.push(current);
        }

        globalStore.set('currentScreen', screenId);
    }

    goBack() {
        if (this.history.length > 0) {
            const previousScreen = this.history.pop();
            this.navigate(previousScreen, false);
        } else {
            this.navigate('homeScreen', false);
        }
    }

    // الدالة الداخلية المسؤولة عن رسم الشاشة
    _render(screenId) {
        // إخفاء الشاشة الحالية
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        
        // إظهار الشاشة المطلوبة
        this.screens[screenId].classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // إدارة زر الرجوع
        if (this.backBtn) {
            this.backBtn.style.display = (screenId === 'homeScreen' || screenId === 'loginScreen') ? 'none' : 'block';
        }
    }
}

export const appRouter = new Router();