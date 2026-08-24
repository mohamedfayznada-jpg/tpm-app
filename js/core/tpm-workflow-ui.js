import { TPMWorkflow } from './tpm-workflow.js';

export const TPMWorkflowUI = {
  statusLabel(status) {
    const labels = {
      detected: 'تم اكتشاف الانحراف',
      tagged: 'تم فتح Tag',
      root_cause_analysis: 'تحليل السبب الجذري',
      action_in_progress: 'الإجراء التصحيحي',
      verification: 'التحقق من الفاعلية',
      standardized: 'توحيد المعيار',
      closed: 'مغلق'
    };
    return labels[status] || 'حالة غير معروفة';
  },

  statusClass(status) {
    return `tpm-status tpm-status-${String(status || 'unknown').replace(/[^a-z0-9_-]/gi, '')}`;
  },

  nextStatuses(status) {
    return Array.isArray(TPMWorkflow.TRANSITIONS[status]) ? TPMWorkflow.TRANSITIONS[status].slice() : [];
  },

  renderProgress(status) {
    const steps = Object.values(TPMWorkflow.STATUSES);
    const index = steps.indexOf(status);
    const current = index >= 0 ? index + 1 : 0;
    const percent = index >= 0 ? Math.round((current / steps.length) * 100) : 0;
    return { percent, current, total: steps.length, label: this.statusLabel(status) };
  },

  renderWorkflowSummary(record = {}) {
    const progress = this.renderProgress(record.status);
    const score = TPMWorkflow.calculateClosureScore(record);
    const nextStatuses = this.nextStatuses(record.status);
    return {
      status: progress.label,
      statusClass: this.statusClass(record.status),
      percent: progress.percent,
      closureScore: score,
      isClosed: record.status === TPMWorkflow.STATUSES.CLOSED,
      needsAction: ![TPMWorkflow.STATUSES.STANDARDIZED, TPMWorkflow.STATUSES.CLOSED].includes(record.status),
      nextStatuses,
      nextLabels: nextStatuses.map(status => this.statusLabel(status))
    };
  }
};
