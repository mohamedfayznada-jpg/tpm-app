// js/core/store.js
class Store {
    constructor() {
        this.state = {
            currentUser: null,
            departments: [],
            isOnline: false,
            apiKeys: { imgbb: "", gemini: "" },
            currentScreen: 'loginScreen'
        };
        this.listeners = {};
    }

    // جلب البيانات بشكل آمن
    get(key) {
        return this.state[key];
    }

    // تحديث البيانات وإرسال إشعارات للمشتركين
    set(key, value) {
        this.state[key] = value;
        this.notify(key, value);
    }

    // الاشتراك في تغييرات متغير معين (Subscribe)
    subscribe(key, callback) {
        if (!this.listeners[key]) {
            this.listeners[key] = [];
        }
        this.listeners[key].push(callback);
    }

    // إشعار المكونات بالتغيير
    notify(key, value) {
        if (this.listeners[key]) {
            this.listeners[key].forEach(callback => callback(value));
        }
    }
}

// تصدير نسخة واحدة (Singleton) لضمان مركزية البيانات
export const globalStore = new Store();