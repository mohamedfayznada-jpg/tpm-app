import { db, auth } from './firebase-init.js';
import { TPMWorkflow } from './tpm-workflow.js';

const root = 'tpm_system';

function requireUser() {
  if (!auth.currentUser) throw new Error('سجّل الدخول أولاً.');
  return auth.currentUser;
}

async function writeWorkflowRecord(path, record) {
  await db.ref(`${root}/${path}/${record.id}`).set(record);
  return record;
}

export const TPMFirebase = {
  async createAbnormality(input = {}, user = {}) {
    const current = requireUser();
    const record = TPMWorkflow.createAbnormality(input, { uid: current.uid, ...user });
    return writeWorkflowRecord('abnormalities', record);
  },

  async createTagFromAbnormality(abnormality, user = {}) {
    const current = requireUser();
    if (!abnormality?.id) throw new Error('سجل الانحراف غير صالح.');
    const tag = TPMWorkflow.createTag(abnormality, { uid: current.uid, ...user });
    const updates = {};
    updates[`${root}/tags/${tag.id}`] = tag;
    updates[`${root}/abnormalities/${abnormality.id}/tagId`] = tag.id;
    updates[`${root}/abnormalities/${abnormality.id}/status`] = TPMWorkflow.STATUSES.TAGGED;
    updates[`${root}/abnormalities/${abnormality.id}/updatedAt`] = new Date().toISOString();
    await db.ref().update(updates);
    return tag;
  },

  async createLoss(input = {}, user = {}) {
    const current = requireUser();
    const loss = TPMWorkflow.createLoss(input, { uid: current.uid, ...user });
    return writeWorkflowRecord('losses', loss);
  },

  async createRCA(input = {}, user = {}) {
    const current = requireUser();
    const rca = TPMWorkflow.createRCA(input, { uid: current.uid, ...user });
    const updates = { [`${root}/rca/${rca.id}`]: rca };
    if (rca.abnormalityId) {
      updates[`${root}/abnormalities/${rca.abnormalityId}/rcaId`] = rca.id;
      updates[`${root}/abnormalities/${rca.abnormalityId}/status`] = rca.status;
      updates[`${root}/abnormalities/${rca.abnormalityId}/updatedAt`] = Date.now();
    }
    await db.ref().update(updates);
    return rca;
  },

  async createAction(input = {}, user = {}) {
    const current = requireUser();
    const action = TPMWorkflow.createAction(input, { uid: current.uid, ...user });
    const updates = { [`${root}/countermeasures/${action.id}`]: action };
    if (action.abnormalityId) {
      updates[`${root}/abnormalities/${action.abnormalityId}/actionId`] = action.id;
      updates[`${root}/abnormalities/${action.abnormalityId}/status`] = action.status;
      updates[`${root}/abnormalities/${action.abnormalityId}/updatedAt`] = Date.now();
    }
    await db.ref().update(updates);
    return action;
  },

  async createVerification(input = {}, user = {}) {
    const current = requireUser();
    const verification = TPMWorkflow.createVerification(input, { uid: current.uid, ...user });
    const updates = { [`${root}/verifications/${verification.id}`]: verification };
    if (verification.abnormalityId) {
      updates[`${root}/abnormalities/${verification.abnormalityId}/verificationId`] = verification.id;
      updates[`${root}/abnormalities/${verification.abnormalityId}/status`] = verification.status;
      updates[`${root}/abnormalities/${verification.abnormalityId}/updatedAt`] = Date.now();
    }
    await db.ref().update(updates);
    return verification;
  },

  async createStandardization(input = {}, user = {}) {
    const current = requireUser();
    const standard = TPMWorkflow.createStandardization(input, { uid: current.uid, ...user });
    const updates = { [`${root}/standards/${standard.id}`]: standard };
    if (standard.abnormalityId) {
      updates[`${root}/abnormalities/${standard.abnormalityId}/standardId`] = standard.id;
      updates[`${root}/abnormalities/${standard.abnormalityId}/status`] = standard.status;
      updates[`${root}/abnormalities/${standard.abnormalityId}/updatedAt`] = Date.now();
    }
    await db.ref().update(updates);
    return standard;
  },

  async advanceAbnormality(id, status, metadata = {}) {
    const current = requireUser();
    const ref = db.ref(`${root}/abnormalities/${id}`);
    const snap = await ref.once('value');
    if (!snap.exists()) throw new Error('سجل الانحراف غير موجود.');
    const updated = TPMWorkflow.advance(snap.val(), status, metadata);
    updated.updatedBy = current.uid;
    await ref.set(updated);
    return updated;
  },

  watchAbnormalities(callback, limit = 200) {
    const query = db.ref(`${root}/abnormalities`).limitToLast(Math.max(1, Math.min(500, Number(limit) || 200)));
    const handler = snap => {
      const value = snap.val() || {};
      callback(Object.values(value).filter(Boolean).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))));
    };
    query.on('value', handler);
    return () => query.off('value', handler);
  },

  async getKpiSnapshot() {
    requireUser();
    const snap = await db.ref(`${root}/abnormalities`).once('value');
    return Object.values(snap.val() || {}).filter(Boolean);
  }
};
