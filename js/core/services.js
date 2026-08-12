// مسار الملف: js/core/services.js
import { db } from './firebase-init.js';
import { UI } from '../utils/ui.js';

export const Services = {
    // 1. محرك المزامنة مع قاعدة البيانات
    syncRecord(path, data) { 
        if (firebase.auth().currentUser) {
            db.ref('tpm_system/' + path).set(data); 
        }
    },
    
    deleteRecord(path) { 
        if (firebase.auth().currentUser) {
            db.ref('tpm_system/' + path).remove(); 
        }
    },

    logAction(act, currentUserName) { 
        if (!currentUserName) return;
        let logObj = {
            id: UI.uniqueNumericId().toString(), 
            user: currentUserName, 
            action: act, 
            time: new Date().toLocaleTimeString('ar-EG')
        };
        this.syncRecord('logs/' + logObj.id, logObj);
    },

   // 2. محرك رفع الصور (ImgBB) مع الدعم الاحتياطي الذكي
    async uploadImageToStorage(fileOrDataUrl) {
        try {
            let base64Data = fileOrDataUrl;
            if (typeof fileOrDataUrl !== 'string') {
                const reader = new FileReader();
                base64Data = await new Promise((resolve) => {
                    reader.readAsDataURL(fileOrDataUrl);
                    reader.onload = () => resolve(reader.result);
                });
            }
            const b64 = base64Data.split(',')[1];
            
            // المحاولة الأولى: عبر السيرفر الآمن (Vercel)
            try {
                const response = await fetch('/api/imgbb', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: b64 }) 
                });
                const data = await response.json();
                if(data && data.success) return data.data.url;
            } catch (err) {
                console.warn("Vercel ImgBB Failed, switching to Client Fallback...");
            }

            // المحاولة الثانية: الاحتياطية (لو السيرفر فشل، نسحب المفتاح من إعدادات السيستم)
            if (window.globalApiKeys && window.globalApiKeys.imgbb) {
                const formData = new URLSearchParams();
                formData.append('image', b64);
                const fbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${window.globalApiKeys.imgbb}`, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                const fbData = await fbResponse.json();
                if(fbData.success) return fbData.data.url;
            }

            throw new Error("لا يوجد مفتاح صالح للرفع.");
        } catch(e) {
            console.error("ImgBB Error:", e);
            UI.showToast('⚠️ فشل الرفع: تأكد من مفتاح ImgBB في الإعدادات');
            return null;
        }
    },
    processAndEnhanceImage(file, callback) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas'); 
                const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 800; 
                let width = img.width; 
                let height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                callback(canvas.toDataURL('image/jpeg', 0.8));
            }; 
            img.src = e.target.result;
        }; 
        reader.readAsDataURL(file);
    },

    // 3. محرك الذكاء الاصطناعي (Gemini)
    async fetchGeminiAPI(promptText, pdfBase64 = null) {
        let b64 = null;
        if (pdfBase64) {
            b64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
        }

        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText, imageBase64: b64 })
            });
            
            const j = await response.json().catch(() => ({}));
            if (!response.ok || j.error) {
                const error = new Error(j.error || 'تعذر الاتصال بخدمة الشرح الذكي. حاول مرة أخرى.');
                error.code = j.code || 'AI_REQUEST_FAILED';
                error.help = j.help || '';
                throw error;
            }
            if(!j.candidates || j.candidates.length === 0 || !j.candidates[0].content) {
                throw new Error("لم تصل إجابة صالحة من الخدمة الذكية. حاول بصياغة أخرى.");
            }
            
            const text = j.candidates[0].content.parts[0].text;
            return text.replace(/```[\s\S]*?```/g, "").replace(/```/g, "").replace(/<\/?[^>]+(>|$)/g, "").trim();
        } catch (e) {
            throw e;
        }
    }
};
