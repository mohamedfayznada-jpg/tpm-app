// مسار الملف: js/modules/settings.js
import { db, auth } from '../core/firebase-init.js';
import { UI } from '../utils/ui.js';
import { Services } from '../core/services.js';

export const Settings = {
    async renderProfileAndSettings() {
        UI.showScreen('settingsScreen');
        
        const user = auth.currentUser;
        if (!user) return;

        // 1. سحب بياناتك فوراً ومباشرة من قاعدة البيانات
        const snap = await db.ref(`tpm_system/users/${user.uid}`).once('value');
        let u = snap.val() || {};
        
        // 🚀 السر هنا: دمج بيانات القاعدة مع صلاحية الجلسة الحالية (عشان المدير العام)
        if (window.currentUser) {
            u.name = u.name || window.currentUser.name || localStorage.getItem('tpm_user') || 'مستخدم مجهول';
            // لو الجلسة بتقول إنك أدمن (Master Admin)، يبقى إنت أدمن غصب عن أي حاجة في الداتا بيز
            if (window.currentUser.role === 'admin') u.role = 'admin';
        }

        const nameEl = document.getElementById('profileName');
        if(nameEl) nameEl.innerText = u.name;
        
        const roleEl = document.getElementById('profileRoleBadge');
        if(roleEl) {
            let roleName = u.role === 'admin' ? 'مدير المصنع (Admin)' : (u.role === 'auditor' ? 'مراجع TPM' : 'فني صيانة');
            roleEl.innerText = `الرتبة: ${roleName}`;
        }
        
        const avatarEl = document.getElementById('profileAvatar');
        if(avatarEl) avatarEl.src = u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=1E3A8A&color=ffffff`;

        // 2. تحديث إحصائياتك بأمان
        const histData = window.historyData || [];
        const tgData = window.tagsData || [];

        let myAuditsCount = histData.filter(h => h.auditor === u.name && !h.stepsOrder.includes('ManualKaizen')).length;
        let myTagsCount = tgData.filter(t => t.auditor === u.name).length;
        let myKaizensCount = histData.filter(h => h.auditor === u.name && h.stepsOrder.includes('ManualKaizen')).length;

        if(document.getElementById('myAudits')) document.getElementById('myAudits').innerText = myAuditsCount;
        if(document.getElementById('myTags')) document.getElementById('myTags').innerText = myTagsCount;
        if(document.getElementById('myKaizens')) document.getElementById('myKaizens').innerText = myKaizensCount;

        // 3. حماية التابات الإدارية (تظهر ليك كمدير فقط)
        document.querySelectorAll('.btn-role-admin').forEach(el => {
            // شلنا inline-block عشان التابات تفضل واخدة شكلها الطبيعي (Flexbox) 
            el.style.display = u.role === 'admin' ? '' : 'none';
        });

        // 4. إظهار النظرة العامة المطابقة للتبويبات الحالية.
        this.switchSettingsTab('overview');
        window.renderSettingsControlLists?.();
        window.populateNotificationSettings?.();
    },

    switchSettingsTab(tabId, button) {
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        document.querySelectorAll('#settingsScreen .settings-navigation .btn').forEach(item => item.classList.remove('active'));

        const targetTab = document.getElementById('tab-' + tabId);
        if (targetTab) {
            targetTab.classList.add('active');
            targetTab.style.display = 'block';
        }

        const activeButton = button || document.querySelector(`#settingsScreen .settings-navigation .btn[onclick*="'${tabId}'"]`);
        if (activeButton) activeButton.classList.add('active');
        window.renderSettingsControlLists?.();
        window.populateNotificationSettings?.();
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

    saveApiKeys() {
        if(!window.globalApiKeys) window.globalApiKeys = {};
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
