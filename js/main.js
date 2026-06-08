// js/main.js
import { ENV } from './config/env.js';
import { db, auth } from './core/firebase-init.js';

console.log(`🚀 FACTORY OS - V${ENV.APP_VERSION} INITIALIZED`);

// مراقبة حالة الاتصال بالسيرفر
db.ref('.info/connected').on('value', snap => {
    const isOnline = snap.val() === true;
    const cloudStatusEl = document.getElementById('cloudStatus');
    if (cloudStatusEl) {
        cloudStatusEl.innerHTML = isOnline ? "متصل بقاعدة البيانات" : "غير متصل بالسيرفر";
        cloudStatusEl.style.color = isOnline ? "var(--success)" : "var(--danger)";
    }
});

// إتاحة بعض المتغيرات مؤقتاً للـ window عشان app.js القديم ميضربش مرة واحدة
window.db = db;