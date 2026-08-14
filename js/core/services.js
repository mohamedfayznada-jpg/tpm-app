// مسار الملف: js/core/services.js
import { db } from './firebase-init.js';
import { UI } from '../utils/ui.js';

export const Services = {
    // 1. محرك المزامنة مع قاعدة البيانات
    async syncRecord(path, data) {
        if (!firebase.auth().currentUser) throw new Error('سجّل الدخول أولاً قبل حفظ البيانات.');
        await db.ref('tpm_system/' + path).set(data);
        return true;
    },
    
    async deleteRecord(path) {
        if (!firebase.auth().currentUser) throw new Error('سجّل الدخول أولاً قبل حذف البيانات.');
        await db.ref('tpm_system/' + path).remove();
        return true;
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

   // 2. محرك رفع الصور الموحد — Firebase Storage
    // يدعم File أو Data URL حتى تبقى جميع النماذج الحالية (5S، الكايزن، التاجات، الملف الشخصي) متوافقة.
    async uploadImageToStorage(fileOrDataUrl, options = {}) {
        try {
            const user = firebase.auth().currentUser;
            if (!user) throw new Error('سجّل الدخول أولاً قبل رفع صورة.');
            if (!firebase.storage) throw new Error('خدمة تخزين الصور غير محمّلة.');

            let blob;
            let contentType = '';
            let extension = 'jpg';
            if (typeof fileOrDataUrl === 'string') {
                if (!fileOrDataUrl.startsWith('data:image/')) throw new Error('صيغة الصورة غير صالحة.');
                const parts = fileOrDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
                if (!parts) throw new Error('تعذر قراءة بيانات الصورة.');
                contentType = parts[1].toLowerCase();
                const binary = atob(parts[2]);
                const bytes = new Uint8Array(binary.length);
                for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
                blob = new Blob([bytes], { type: contentType });
            } else if (fileOrDataUrl instanceof Blob) {
                blob = fileOrDataUrl;
                contentType = (fileOrDataUrl.type || '').toLowerCase();
            } else {
                throw new Error('اختر ملف صورة صالحًا.');
            }

            if (!/^image\/(jpeg|png|webp|gif)$/i.test(contentType)) throw new Error('يرجى اختيار صورة JPG أو PNG أو WEBP أو GIF.');
            if (blob.size > 8 * 1024 * 1024) throw new Error('حجم الصورة يتجاوز الحد المسموح: 8 ميجابايت.');

            extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[contentType] || 'jpg';
            const requestedFolder = String(options.folder || 'general').toLowerCase();
            const folder = requestedFolder.replace(/[^a-z0-9_-]/g, '').slice(0, 40) || 'general';
            const objectName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${extension}`;
            const reference = firebase.storage().ref(`factory-os/${folder}/${user.uid}/${objectName}`);
            const snapshot = await reference.put(blob, {
                contentType,
                cacheControl: 'public,max-age=31536000,immutable'
            });
            return await snapshot.ref.getDownloadURL();
        } catch (error) {
            console.error('Firebase Storage upload error:', error);
            UI.showToast(`⚠️ فشل رفع الصورة: ${error.message || 'تحقق من تفعيل Firebase Storage وقواعد الوصول.'}`);
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
