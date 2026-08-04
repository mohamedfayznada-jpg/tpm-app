// مسار الملف: js/modules/settings.js
import { db, auth } from '../core/firebase-init.js';
import { UI } from '../utils/ui.js';
import { Services } from '../core/services.js';

export const Settings = {
    renderProfileAndSettings() {
        UI.showScreen('settingsScreen');
        
        const uid = auth.currentUser ? auth.currentUser.uid : null;
        if (!uid) return;

        // سحب البيانات من المتغيرات العامة (مؤقتاً لحين استكمال النقل)
        let u = window.usersData[uid] || window.currentUser;

        const nameEl = document.getElementById('profileName');
        if(nameEl) nameEl.innerText = u.name || 'مستخدم مجهول';
        
        const roleEl = document.getElementById('profileRoleBadge');
        if(roleEl) {
            let roleName = u.role === 'admin' ? 'مدير المصنع (Admin)' : (u.role === 'auditor' ? 'مراجع TPM' : 'فني صيانة');
            roleEl.innerText = `الرتبة: ${roleName}`;
        }
        
        const avatarEl = document.getElementById('profileAvatar');
        if(avatarEl) avatarEl.src = u.avatar || `https://ui-avatars.com/api/?name=${u.name || 'User'}&background=1E3A8A&color=ffffff`;

        // حساب التفاعلات
        let myAuditsCount = window.historyData.filter(h => h.auditor === u.name && !h.stepsOrder.includes('ManualKaizen')).length;
        let myTagsCount = window.tagsData.filter(t => t.auditor === u.name).length;
        let myKaizensCount = window.historyData.filter(h => h.auditor === u.name && h.stepsOrder.includes('ManualKaizen')).length;

        if(document.getElementById('myAudits')) document.getElementById('myAudits').innerText = myAuditsCount;
        if(document.getElementById('myTags')) document.getElementById('myTags').innerText = myTagsCount;
        if(document.getElementById('myKaizens')) document.getElementById('myKaizens').innerText = myKaizensCount;

        // 🔐 حماية الصلاحيات (إخفاء التابات عن غير المديرين)
        document.querySelectorAll('.btn-role-admin').forEach(el => {
            el.style.display = u.role === 'admin' ? 'inline-block' : 'none';
        });

        this.switchSettingsTab('my-activity');
    },

    switchSettingsTab(tabId) {
        document.querySelectorAll('.settings-tab-content').forEach(c => {
            c.classList.remove('active');
            c.style.display = 'none';
        });
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        
        const targetTab = document.getElementById('tab-' + tabId);
        if(targetTab) {
            targetTab.classList.add('active');
            targetTab.style.display = 'block';
        }
        
        if(window.event && window.event.currentTarget) {
            window.event.currentTarget.classList.add('active');
        }
    },

    openMyFullProfile() {
        this.renderProfileAndSettings();
        UI.showToast('تم فتح مركز القيادة بنجاح 🛡️');
    },

    updateProfilePic(event) {
        const file = event.target.files[0];
        if(!file) return;
        
        UI.showToast('جاري تحديث الصورة... ⏳');
        try {
            Services.processAndEnhanceImage(file, async function(dataUrl) {
                const url = await Services.uploadImageToStorage(dataUrl); 
                if(url) {
                    const uid = auth.currentUser.uid;
                    await db.ref(`tpm_system/users/${uid}`).update({ avatar: url });
                    document.getElementById('profileAvatar').src = url;
                    UI.showToast('تم تحديث الصورة ✅');
                } else {
                    UI.showToast('⚠️ فشل رفع الصورة');
                }
            });
        } catch(e) {
            console.error(e);
            UI.showToast('حدث خطأ أثناء الرفع');
        }
    },

    // دوال المفاتيح (API Keys)
    saveApiKeys() {
        window.globalApiKeys.imgbb = document.getElementById('imgbbKeyInput').value.trim();
        window.globalApiKeys.gemini = document.getElementById('geminiKeyInput').value.trim();
        document.getElementById('imgbbKeyInput').disabled = true; 
        document.getElementById('geminiKeyInput').disabled = true;
        Services.syncRecord('api_keys', window.globalApiKeys); 
        UI.showToast('تم حفظ وتأمين المفاتيح المركزية');
    },

    enableApiKeysEdit() { 
        document.getElementById('imgbbKeyInput').disabled = false; 
        document.getElementById('geminiKeyInput').disabled = false; 
        UI.showToast('الحقول جاهزة للتعديل'); 
    }
};
