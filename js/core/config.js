// js/core/config.js
// جلب الإعدادات المحمية (إن وجدت) أو تعيين قيم افتراضية
const envConfig = window.__TPM_CONFIG__ || { geminiApiKey: "", imgbbApiKey: "" };

const firebaseConfig = {
    apiKey: "AIzaSyADr-QEzWt6xeT8oeF7wXfNySvXiKXMEy4", // سيتم تحسين الأمان لاحقاً
    authDomain: "tpm-audit-system.firebaseapp.com",
    databaseURL: "https://tpm-audit-system-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "tpm-audit-system",
    storageBucket: "tpm-audit-system.firebasestorage.app",
    messagingSenderId: "1047922099229",
    appId: "1:1047922099229:web:5e3d6fd5fa4c23ab2772f4"
};

// تهيئة النظام
const initFirebase = () => {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    return {
        db: firebase.database(),
        auth: firebase.auth()
    };
};

export const { db, auth } = initFirebase();
export const API_KEYS = envConfig;