import { db, auth } from './firebase-init.js';
import { TPMWorkflow } from './tpm-workflow.js';

const root = 'tpm_system';

function requireUser() {
  if (!auth.currentUser) throw new Error('سجّل الدخول أولاً.');
  return auth.currentUser;
}

export const TPMFirebase = {
  async createAbnormality(input = {}, user = {}) {
    const current = requireUser();
    const record = TPMWorkflow.createAbnormality(input, { uid: current.uid, ...user });
    await db.ref(`${root}/abnormalities/${record.id}`).set(record);
    return record;
  },

  async createTagFromAbnormality(abnormality, user = {}) {
    const current = requireUser();
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
    await db.ref(`${root}/losses/${loss.id}`).set(loss);
    return loss;
  },

  async createRCA(input = {}, user = {}) {
    const current = requireUser();
    const rca = TPMWorkflow.createRCA(input, { uid: current.uid, ...user });
    await db.ref(`${root}/rca/${rca.id}`).set(rca);
    if (rca.abnormalityId) {
      await db.ref(`${root}/abnormalities/${rca.abnormalityId}`).update({ rcaId: rca.id, status: rca.status, updatedAt: Date.now() });
    }
    return rca;
  },

  async createAction(input = {}, user = {}) {
    const current = requireUser();
    const action = TPMWorkflow.createAction(input, { uid: current.uid, ...user });
    await db.ref(`${root}/countermeasures/${action.id}`).set(action);
    if (action.abnormalityId) await db.ref(`${root}/abnormalities/${action.abnormalityId}`).update({ actionId: action.id, status: action.status, updatedAt: Date.now() });
    return action;
  },

  async advanceAbnormality(id, status, metadata = {}) {
    requireUser();
    const ref = db.ref(`${root}/abnormalities/${id}`);
    const snap = await ref.once('value');
    if (!snap.exists()) throw new Error('سجل الانحراف غير موجود.');
    const updated = TPMWorkflow.advance(snap.val(), status, metadata);
    await ref.set(updated);
    return updated;
  },

  watchAbnormalities(callback, limit = 200) {
    const query = db.ref(`${root}/abnormalities`).limitToLast(limit);
    const handler = snap => {
      const value = snap.val() || {};
      callback(Object.values(value).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))));
    };
    query.on('value', handler);
    return () => query.off('value', handler);
  },

  async getKpiSnapshot() {
    requireUser();
    const snap = await db.ref(`${root}/abnormalities`).once('value');
    return Object.values(snap.val() || {});
  }
};
