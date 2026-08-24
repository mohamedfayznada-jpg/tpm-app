// مسار الملف: js/modules/settings.js
import { db, auth } from '../core/firebase-init.js';
import { UI } from '../utils/ui.js';
import { Services } from '../core/services.js';
import { normalizeRole, roleLabel } from '../core/role-policy.js';

export const Settings = {
    async renderProfileAndSettings() {
        UI.showScreen('settingsScreen');
        const user = auth.currentUser;
        if (!user) return;
        const snap = await db.ref(`tpm_system/users/${user.uid}`).once('value');
        let u = snap.val() || {};
        if (window.currentUser) {
            u.name = u.name || window.currentUser.name || localStorage.getItem('tpm_user') || 'مستخدم';
            if (normalizeRole(window.currentUser.role) === 'admin') u.role = 'admin';
        }
        const canonicalRole = normalizeRole(u.role);
        const nameEl = document.getElementById('profileName');
        if (nameEl) nameEl.innerText = u.name;
        const roleEl = document.getElementById('profileRoleBadge');
        if (roleEl) roleEl.innerText = `الرتبة: ${roleLabel(canonicalRole)}`;
        const avatarEl = document.getElementById('profileAvatar');
        if (avatarEl) avatarEl.src = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=1E3A8A&color=ffffff`;

        const histData = window.historyData || [];
        const tgData = window.tagsData || [];
        const myAuditsCount = histData.filter(h => h.auditor === u.name && !h.stepsOrder.includes('ManualKaizen')).length;
        const myTagsCount = tgData.filter(t => t.auditor === u.name).length;
        const myKaizensCount = histData.filter(h => h.auditor === u.name && h.stepsOrder.includes('ManualKaizen')).length;
        if (document.getElementById('myAudits')) document.getElementById('myAudits').innerText = myAuditsCount;
        if (document.getElementById('myTags')) document.getElementById('myTags').innerText = myTagsCount;
        if (document.getElementById('myKaizens')) document.getElementById('myKaizens').innerText = myKaizensCount;
        document.querySelectorAll('.btn-role-admin').forEach(el => { el.style.display = canonicalRole === 'admin' ? '' : 'none'; });
        this.switchSettingsTab('overview');
        window.renderSettingsControlLists?.();
        window.populateNotificationSettings?.();
        this.renderServerSecurityState(canonicalRole);
    },

    renderServerSecurityState(role) {
        document.querySelectorAll('[data-server-secret-settings]').forEach(el => { el.style.display = role === 'admin' ? '' : 'none'; });
        const status = document.getElementById('apiKeysSecurityStatus');
        if (status) status.innerHTML = role === 'admin'
            ? '<i class="bx bx-shield-check"></i> مفاتيح الذكاء الاصطناعي تُدار على الخادم ولا تُعرض داخل المتصفح.'
            : '<i class="bx bx-lock-alt"></i> إعدادات مفاتيح الخادم متاحة لمسؤول النظام فقط.';
    },

    switchSettingsTab(tabId, button) {
        document.querySelectorAll('.settings-tab-content').forEach(content => { content.classList.remove('active'); content.style.display = 'none'; });
        document.querySelectorAll('#settingsScreen .settings-navigation .btn').forEach(item => item.classList.remove('active'));
        const targetTab = document.getElementById('tab-' + tabId);
        if (targetTab) { targetTab.classList.add('active'); targetTab.style.display = 'block'; }
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
        if (!file) return;
        UI.showToast('جاري تحديث الصورة... ⏳');
        Services.processAndEnhanceImage(file, async dataUrl => {
            const url = await Services.uploadImageToStorage(dataUrl, { folder: 'profiles' });
            if (!url) return UI.showToast('⚠️ فشل رفع الصورة');
            const uid = auth.currentUser.uid;
            await db.ref(`tpm_system/users/${uid}`).update({ avatar: url, updatedAt: Date.now() });
            const avatar = document.getElementById('profileAvatar');
            if (avatar) avatar.src = url;
            UI.showToast('تم تحديث الصورة ✅');
        });
    },

    saveApiKeys() {
        // Enterprise rule: secrets are server-managed, never persisted by the browser.
        this.renderServerSecurityState('admin');
        UI.showToast('🔐 مفاتيح الخدمة مؤمنة على الخادم. استخدم Vercel Environment Variables لإدارتها.');
    },

    enableApiKeysEdit() {
        this.saveApiKeys();
    }
};
