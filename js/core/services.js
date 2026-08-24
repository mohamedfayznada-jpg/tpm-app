// مسار الملف: js/core/services.js
import { db } from './firebase-init.js';
import { UI } from '../utils/ui.js';

const assertAuthenticated = () => {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('سجّل الدخول أولاً قبل تنفيذ هذه العملية.');
    return user;
};

const normalizePath = path => {
    const value = String(path || '').replace(/^\/+|\/+$/g, '');
    if (!value || value.includes('..') || value.startsWith('api_keys')) throw new Error('مسار بيانات غير مسموح.');
    return value;
};

export const Services = {
    async syncRecord(path, data) {
        const user = assertAuthenticated();
        const safePath = normalizePath(path);
        await db.ref('tpm_system/' + safePath).set(data);
        return true;
    },

    async deleteRecord(path) {
        assertAuthenticated();
        const safePath = normalizePath(path);
        await db.ref('tpm_system/' + safePath).remove();
        return true;
    },

    logAction(act, currentUserName) {
        const user = firebase.auth().currentUser;
        if (!user || !currentUserName) return;
        const logObj = {
            id: UI.uniqueNumericId().toString(),
            uid: user.uid,
            user: String(currentUserName).slice(0, 120),
            action: String(act || '').slice(0, 300),
            time: new Date().toISOString()
        };
        this.syncRecord('logs/' + logObj.id, logObj).catch(error => console.error('Audit log error:', error));
    },

    async uploadImageToStorage(fileOrDataUrl, options = {}) {
        try {
            const user = assertAuthenticated();
            if (!firebase.storage) throw new Error('خدمة تخزين الصور غير محمّلة.');

            let blob;
            let contentType = '';
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

            const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[contentType] || 'jpg';
            const requestedFolder = String(options.folder || 'general').toLowerCase();
            const folder = requestedFolder.replace(/[^a-z0-9_-]/g, '').slice(0, 40) || 'general';
            const objectName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${extension}`;
            const reference = firebase.storage().ref(`factory-os/${folder}/${user.uid}/${objectName}`);
            const snapshot = await reference.put(blob, { contentType, cacheControl: 'public,max-age=31536000,immutable' });
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

    async fetchGeminiAPI(promptText, pdfBase64 = null) {
        let b64 = null;
        if (pdfBase64) b64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: String(promptText || '').slice(0, 12000), imageBase64: b64 })
        });
        const j = await response.json().catch(() => ({}));
        if (!response.ok || j.error) {
            const error = new Error(j.error || 'تعذر الاتصال بخدمة الشرح الذكي. حاول مرة أخرى.');
            error.code = j.code || 'AI_REQUEST_FAILED';
            error.help = j.help || '';
            throw error;
        }
        if (!j.candidates?.length || !j.candidates[0]?.content?.parts?.[0]?.text) throw new Error('لم تصل إجابة صالحة من الخدمة الذكية.');
        return j.candidates[0].content.parts[0].text.replace(/```[\s\S]*?```/g, '').replace(/```/g, '').replace(/<\/?[^>]+(>|$)/g, '').trim();
    }
};
