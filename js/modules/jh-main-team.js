// 👷‍♂️ هيكل فريق الصيانة الذاتية الرئيسي (JH)
// ==========================================
let jhMainTeam = null;
let jhMainTeamRoleFiles = {};
const jhMainTeamListeners = {};
let jhMainTeamDraftMembers = [];

function jhTeamEmptyRole() {
    return { name: '', photo: '' };
}

function jhTeamDefaultData() {
    return {
        leader: jhTeamEmptyRole(),
        facilitator: jhTeamEmptyRole(),
        recorder: jhTeamEmptyRole(),
        members: []
    };
}

function jhTeamSafePhoto(url) {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    return /^https:\/\//i.test(trimmed) ? trimmed : '';
}

function jhTeamSafeName(name) {
    return window.sanitizeInput ? window.sanitizeInput(String(name || '').trim()) : String(name || '').trim();
}

function jhTeamInitials(name) {
    const clean = String(name || '').trim();
    if (!clean) return '<i class="bx bx-user"></i>';
    return jhTeamSafeName(clean.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join(''));
}

function jhTeamPhotoMarkup(person, className = '') {
    const photo = jhTeamSafePhoto(person?.photo);
    const name = jhTeamSafeName(person?.name);
    if (photo) {
        return `<img class="jh-person-photo ${className}" src="${photo}" alt="صورة ${name || 'عضو الفريق'}" loading="lazy" referrerpolicy="no-referrer">`;
    }
    return `<div class="jh-person-photo jh-person-initials ${className}" aria-label="صورة افتراضية لـ ${name || 'عضو الفريق'}">${jhTeamInitials(name)}</div>`;
}

function jhTeamNode(role, person, variant = '') {
    const name = jhTeamSafeName(person?.name);
    if (!name) return '';
    return `<article class="jh-tree-person ${variant}">
        ${jhTeamPhotoMarkup(person)}
        <div class="jh-tree-person-copy"><span>${role}</span><strong>${name}</strong></div>
    </article>`;
}

window.renderJHMainTeam = function() {
    const mount = document.getElementById('jhMainTeamTree');
    if (!mount) return;

    const team = { ...jhTeamDefaultData(), ...(jhMainTeam || {}) };
    const leader = team.leader || jhTeamEmptyRole();
    const facilitator = team.facilitator || jhTeamEmptyRole();
    const recorder = team.recorder || jhTeamEmptyRole();
    const members = Array.isArray(team.members) ? team.members.filter(member => member && jhTeamSafeName(member.name)) : [];
    const hasPeople = [leader, facilitator, recorder].some(person => jhTeamSafeName(person.name)) || members.length > 0;

    if (!hasPeople) {
        mount.innerHTML = `<div class="jh-team-empty"><i class='bx bx-network-chart'></i><strong>هيكل فريق JH جاهز للتعبئة</strong><span>أضف قائد الفريق والميّسر والمقرر والأعضاء من زر «إدارة أسماء وصور الفريق».</span></div>`;
        return;
    }

    const supportNodes = [
        jhTeamNode('ميّسر الفريق', facilitator, 'jh-tree-support'),
        jhTeamNode('مقرر الفريق', recorder, 'jh-tree-support')
    ].filter(Boolean).join('');
    const memberNodes = members.map(member => jhTeamNode('عضو الفريق', member, 'jh-tree-member')).join('');

    mount.innerHTML = `<div class="jh-team-ladder">
        <div class="jh-team-level jh-team-level-lead">${jhTeamNode('قائد فريق الصيانة الذاتية', leader, 'jh-tree-leader') || `<div class="jh-tree-placeholder">قائد الفريق غير محدد</div>`}</div>
        <div class="jh-team-connector" aria-hidden="true"></div>
        <div class="jh-team-level jh-team-level-support">${supportNodes || `<div class="jh-tree-placeholder">أضف ميّسر الفريق ومقرره</div>`}</div>
        <div class="jh-team-connector" aria-hidden="true"></div>
        <div class="jh-team-level jh-team-level-members">${memberNodes || `<div class="jh-tree-placeholder">أضف أعضاء الفريق</div>`}</div>
    </div>`;
};

window.loadJHMainTeam = function() {
    if (!firebase.auth().currentUser) return;
    if (jhMainTeamListeners.jhMainTeam) db.ref('tpm_system/jh_main_team').off('value', jhMainTeamListeners.jhMainTeam);
    jhMainTeamListeners.jhMainTeam = db.ref('tpm_system/jh_main_team').on('value', snap => {
        jhMainTeam = { ...jhTeamDefaultData(), ...(snap.val() || {}) };
        window.renderJHMainTeam();
    });
};

function jhMainTeamPhotoStatus(role, message, isReady = false) {
    const status = document.getElementById(`jhTeam${role.charAt(0).toUpperCase() + role.slice(1)}PhotoStatus`);
    if (status) status.innerHTML = message ? `<i class='bx ${isReady ? 'bx-check-circle' : 'bx-image'}'></i> ${jhTeamSafeName(message)}` : '';
}

window.cacheJHMainTeamPhoto = function(role, input) {
    const file = input?.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        input.value = '';
        return showToast('⚠️ استخدم صورة بصيغة JPG أو PNG أو WEBP فقط');
    }
    if (file.size > 4 * 1024 * 1024) {
        input.value = '';
        return showToast('⚠️ أقصى حجم لصورة الفريق هو 4 ميجابايت');
    }
    jhMainTeamRoleFiles[role] = file;
    jhMainTeamPhotoStatus(role, `الصورة جاهزة: ${file.name}`, true);
};

window.renderJHMainTeamMembersDraft = function() {
    const mount = document.getElementById('jhMainTeamMembersDraft');
    if (!mount) return;
    if (!jhMainTeamDraftMembers.length) {
        mount.innerHTML = `<div class="jh-members-draft-empty">لم تُضف أعضاء بعد.</div>`;
        return;
    }
    mount.innerHTML = jhMainTeamDraftMembers.map((member, index) => {
        const photo = jhTeamSafePhoto(member.photo);
        const preview = member.preview || photo;
        const avatar = preview
            ? `<img class="jh-draft-avatar" src="${preview}" alt="صورة ${jhTeamSafeName(member.name)}">`
            : `<div class="jh-draft-avatar jh-person-initials">${jhTeamInitials(member.name)}</div>`;
        return `<div class="jh-member-draft-item">${avatar}<strong>${jhTeamSafeName(member.name)}</strong><span>${member.localFile ? 'صورة جديدة جاهزة للرفع' : (photo ? 'صورة محفوظة' : 'دون صورة')}</span><button type="button" class="icon-btn" onclick="removeJHMainTeamMember(${index})" aria-label="حذف العضو ${jhTeamSafeName(member.name)}"><i class='bx bx-trash'></i></button></div>`;
    }).join('');
};

window.addJHMainTeamMember = function() {
    const nameInput = document.getElementById('jhNewMemberName');
    const photoInput = document.getElementById('jhNewMemberPhoto');
    const name = jhTeamSafeName(nameInput?.value);
    const file = photoInput?.files?.[0] || null;
    if (!name) return showToast('⚠️ اكتب اسم عضو الفريق أولاً');
    if (file && !/^image\/(jpeg|png|webp)$/i.test(file.type)) return showToast('⚠️ استخدم صورة بصيغة JPG أو PNG أو WEBP فقط');
    if (file && file.size > 4 * 1024 * 1024) return showToast('⚠️ أقصى حجم لصورة العضو هو 4 ميجابايت');

    jhMainTeamDraftMembers.push({
        id: `member_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name,
        photo: '',
        localFile: file,
        preview: file ? URL.createObjectURL(file) : ''
    });
    if (nameInput) nameInput.value = '';
    if (photoInput) photoInput.value = '';
    window.renderJHMainTeamMembersDraft();
};

window.removeJHMainTeamMember = function(index) {
    const member = jhMainTeamDraftMembers[index];
    if (member?.preview?.startsWith('blob:')) URL.revokeObjectURL(member.preview);
    jhMainTeamDraftMembers.splice(index, 1);
    window.renderJHMainTeamMembersDraft();
};

window.openJHMainTeamEditor = function() {
    if (currentUser?.role !== 'admin') return showToast('⚠️ تعديل هيكل الفريق متاح لمدير المصنع فقط');
    const editor = document.getElementById('jhMainTeamEditor');
    if (!editor) return;
    const team = { ...jhTeamDefaultData(), ...(jhMainTeam || {}) };
    const roleMap = {
        leader: 'jhTeamLeaderName',
        facilitator: 'jhTeamFacilitatorName',
        recorder: 'jhTeamRecorderName'
    };
    jhMainTeamRoleFiles = {};
    Object.entries(roleMap).forEach(([role, inputId]) => {
        const input = document.getElementById(inputId);
        if (input) input.value = team[role]?.name || '';
        jhMainTeamPhotoStatus(role, team[role]?.photo ? 'توجد صورة محفوظة حاليًا' : 'لم تُرفع صورة بعد');
        const photoInput = document.getElementById(`jhTeam${role.charAt(0).toUpperCase() + role.slice(1)}Photo`);
        if (photoInput) photoInput.value = '';
    });
    jhMainTeamDraftMembers = (Array.isArray(team.members) ? team.members : []).filter(member => member && jhTeamSafeName(member.name)).map(member => ({ ...member, localFile: null, preview: '' }));
    const newMemberName = document.getElementById('jhNewMemberName');
    const newMemberPhoto = document.getElementById('jhNewMemberPhoto');
    if (newMemberName) newMemberName.value = '';
    if (newMemberPhoto) newMemberPhoto.value = '';
    window.renderJHMainTeamMembersDraft();
    editor.hidden = false;
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.closeJHMainTeamEditor = function() {
    const editor = document.getElementById('jhMainTeamEditor');
    if (editor) editor.hidden = true;
    jhMainTeamDraftMembers.forEach(member => { if (member?.preview?.startsWith('blob:')) URL.revokeObjectURL(member.preview); });
    jhMainTeamDraftMembers = [];
    jhMainTeamRoleFiles = {};
};

window.saveJHMainTeam = async function() {
    if (currentUser?.role !== 'admin') return showToast('⚠️ تعديل هيكل الفريق متاح لمدير المصنع فقط');
    const roleConfig = {
        leader: { inputId: 'jhTeamLeaderName', label: 'قائد الفريق' },
        facilitator: { inputId: 'jhTeamFacilitatorName', label: 'ميّسر الفريق' },
        recorder: { inputId: 'jhTeamRecorderName', label: 'مقرر الفريق' }
    };
    const existing = { ...jhTeamDefaultData(), ...(jhMainTeam || {}) };
    const saved = { members: [] };

    try {
        showToast('جاري حفظ هيكل الفريق وصوره…');
        for (const [role, config] of Object.entries(roleConfig)) {
            const name = jhTeamSafeName(document.getElementById(config.inputId)?.value);
            const existingRole = existing[role] || jhTeamEmptyRole();
            let photo = jhTeamSafePhoto(existingRole.photo);
            if (jhMainTeamRoleFiles[role]) photo = await window.uploadImageToStorage(jhMainTeamRoleFiles[role], { folder: 'jh-team' });
            if (jhMainTeamRoleFiles[role] && !photo) throw new Error(`تعذر رفع صورة ${config.label}`);
            saved[role] = { name, photo };
        }

        for (const member of jhMainTeamDraftMembers) {
            let photo = jhTeamSafePhoto(member.photo);
            if (member.localFile) photo = await window.uploadImageToStorage(member.localFile, { folder: 'jh-team' });
            if (member.localFile && !photo) throw new Error(`تعذر رفع صورة ${member.name}`);
            saved.members.push({ id: member.id || `member_${Date.now()}`, name: jhTeamSafeName(member.name), photo });
        }

        saved.updatedAt = Date.now();
        saved.updatedBy = currentUser?.name || '';
        await db.ref('tpm_system/jh_main_team').set(saved);
        showToast('تم حفظ هيكل فريق الصيانة الذاتية بنجاح ✅');
        window.closeJHMainTeamEditor();
    } catch (error) {
        console.error('JH main team save failed:', error);
        showToast(`⚠️ ${error.message || 'تعذر حفظ هيكل الفريق'}`);
    }
};


// تحميل شجرة فريق JH للقراءة فقط بعد توثيق المستخدم.
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        window.loadJHMainTeam();
    } else if (jhMainTeamListeners.jhMainTeam) {
        db.ref('tpm_system/jh_main_team').off('value', jhMainTeamListeners.jhMainTeam);
        delete jhMainTeamListeners.jhMainTeam;
        jhMainTeam = null;
        window.renderJHMainTeam();
    }
});


// ==========================================