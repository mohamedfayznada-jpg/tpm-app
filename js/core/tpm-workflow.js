// TPM Continuous Improvement Workflow Engine
// JH -> Abnormality -> Tag -> Loss -> RCA -> Action -> Verification -> Standardization -> KPI

export const TPMWorkflow = {
  STATUSES: Object.freeze({
    DETECTED: 'detected',
    TAGGED: 'tagged',
    RCA: 'root_cause_analysis',
    ACTION: 'action_in_progress',
    VERIFICATION: 'verification',
    STANDARDIZED: 'standardized',
    CLOSED: 'closed'
  }),

  TRANSITIONS: Object.freeze({
    detected: Object.freeze(['tagged']),
    tagged: Object.freeze(['root_cause_analysis']),
    root_cause_analysis: Object.freeze(['action_in_progress']),
    action_in_progress: Object.freeze(['verification']),
    verification: Object.freeze(['standardized']),
    standardized: Object.freeze(['closed']),
    closed: Object.freeze([])
  }),

  LOSSES: Object.freeze(['breakdown','minor_stop','speed_loss','defect','setup_adjustment','waiting','material','other']),
  RCA_METHODS: Object.freeze(['5_why','fishbone','pareto','a3']),

  isValidStatus(status) {
    return Object.prototype.hasOwnProperty.call(this.TRANSITIONS, status);
  },

  canAdvance(currentStatus, nextStatus) {
    if (!this.isValidStatus(currentStatus) || !this.isValidStatus(nextStatus)) return false;
    if (currentStatus === nextStatus) return true;
    return this.TRANSITIONS[currentStatus].includes(nextStatus);
  },

  createAbnormality(input = {}, user = {}) {
    const now = new Date().toISOString();
    return {
      id: input.id || `ABN-${Date.now()}`,
      type: 'abnormality',
      status: this.STATUSES.DETECTED,
      machineId: String(input.machineId || '').trim(),
      area: String(input.area || '').trim(),
      description: String(input.description || '').trim(),
      category: input.category || 'other',
      severity: input.severity || 'medium',
      detectedBy: user.uid || input.detectedBy || '',
      detectedByName: user.name || input.detectedByName || '',
      detectedAt: input.detectedAt || now,
      ownerUid: input.ownerUid || '',
      dueDate: input.dueDate || '',
      evidence: Array.isArray(input.evidence) ? input.evidence : [],
      tagId: input.tagId || '',
      lossId: input.lossId || '',
      rcaId: input.rcaId || '',
      actionId: input.actionId || '',
      verificationId: input.verificationId || '',
      standardId: input.standardId || '',
      closedAt: null,
      updatedAt: now
    };
  },

  createTag(abnormality, user = {}) {
    if (!abnormality?.id) throw new Error('لا يمكن إنشاء Tag بدون Abnormality.');
    const now = new Date().toISOString();
    return {
      id: `TAG-${Date.now()}`,
      type: 'tpm_tag',
      abnormalityId: abnormality.id,
      machineId: abnormality.machineId || '',
      area: abnormality.area || '',
      problem: abnormality.description || '',
      category: abnormality.category || 'other',
      severity: abnormality.severity || 'medium',
      status: this.STATUSES.TAGGED,
      ownerUid: abnormality.ownerUid || user.uid || '',
      raisedBy: user.uid || abnormality.detectedBy || '',
      raisedAt: now,
      dueDate: abnormality.dueDate || '',
      closureEvidence: [],
      updatedAt: now
    };
  },

  createLoss(input = {}, user = {}) {
    const type = this.LOSSES.includes(input.lossType) ? input.lossType : 'other';
    return {
      id: input.id || `LOSS-${Date.now()}`,
      type: 'loss',
      abnormalityId: input.abnormalityId || '',
      machineId: input.machineId || '',
      department: input.department || '',
      lossType: type,
      durationMinutes: Math.max(0, Number(input.durationMinutes) || 0),
      quantity: Math.max(0, Number(input.quantity) || 0),
      cost: Math.max(0, Number(input.cost) || 0),
      reason: String(input.reason || '').trim(),
      recordedBy: user.uid || input.recordedBy || '',
      recordedAt: input.recordedAt || new Date().toISOString()
    };
  },

  createRCA(input = {}, user = {}) {
    const method = this.RCA_METHODS.includes(input.method) ? input.method : '5_why';
    return {
      id: input.id || `RCA-${Date.now()}`,
      type: 'root_cause_analysis',
      abnormalityId: input.abnormalityId || '',
      method,
      problemStatement: String(input.problemStatement || '').trim(),
      whyChain: Array.isArray(input.whyChain) ? input.whyChain.slice(0, 5) : [],
      fishbone: input.fishbone || {},
      paretoRank: Math.max(0, Number(input.paretoRank) || 0),
      rootCause: String(input.rootCause || '').trim(),
      evidence: Array.isArray(input.evidence) ? input.evidence : [],
      preparedBy: user.uid || input.preparedBy || '',
      preparedAt: input.preparedAt || new Date().toISOString(),
      status: this.STATUSES.RCA
    };
  },

  createAction(input = {}, user = {}) {
    return {
      id: input.id || `ACT-${Date.now()}`,
      type: 'countermeasure',
      abnormalityId: input.abnormalityId || '',
      rcaId: input.rcaId || '',
      action: String(input.action || '').trim(),
      ownerUid: input.ownerUid || '',
      dueDate: input.dueDate || '',
      priority: input.priority || 'medium',
      status: this.STATUSES.ACTION,
      expectedResult: String(input.expectedResult || '').trim(),
      actualResult: String(input.actualResult || '').trim(),
      createdBy: user.uid || input.createdBy || '',
      createdAt: input.createdAt || new Date().toISOString(),
      completedAt: null
    };
  },

  createVerification(input = {}, user = {}) {
    return {
      id: input.id || `VER-${Date.now()}`,
      type: 'verification',
      abnormalityId: input.abnormalityId || '',
      actionId: input.actionId || '',
      criteria: String(input.criteria || '').trim(),
      actualResult: String(input.actualResult || '').trim(),
      effective: Boolean(input.effective),
      evidence: Array.isArray(input.evidence) ? input.evidence : [],
      verifiedBy: user.uid || input.verifiedBy || '',
      verifiedAt: input.verifiedAt || new Date().toISOString(),
      status: this.STATUSES.VERIFICATION
    };
  },

  createStandardization(input = {}, user = {}) {
    return {
      id: input.id || `STD-${Date.now()}`,
      type: 'standardization',
      abnormalityId: input.abnormalityId || '',
      verificationId: input.verificationId || '',
      standard: String(input.standard || '').trim(),
      documentRef: String(input.documentRef || '').trim(),
      trainingRequired: Boolean(input.trainingRequired),
      standardizedBy: user.uid || input.standardizedBy || '',
      standardizedAt: input.standardizedAt || new Date().toISOString(),
      status: this.STATUSES.STANDARDIZED
    };
  },

  advance(entity, nextStatus, metadata = {}) {
    if (!entity || typeof entity !== 'object') throw new Error('سجل TPM غير صالح.');
    if (!this.isValidStatus(nextStatus)) throw new Error(`Invalid TPM workflow status: ${nextStatus}`);
    if (!this.canAdvance(entity.status, nextStatus)) {
      throw new Error(`Invalid TPM transition: ${entity.status} -> ${nextStatus}`);
    }
    const updated = { ...entity, status: nextStatus, updatedAt: new Date().toISOString(), ...metadata };
    if (nextStatus === this.STATUSES.CLOSED) updated.closedAt = updated.closedAt || new Date().toISOString();
    return updated;
  },

  calculateClosureScore(record = {}) {
    const checks = [
      Boolean(record.rootCause || record.rcaId),
      Boolean(record.actionId),
      Boolean(record.verificationId),
      Boolean(record.standardId),
      Array.isArray(record.evidence) && record.evidence.length > 0
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }
};
