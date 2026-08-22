import { TPMWorkflow } from './tpm-workflow.js';

export const TPMWorkflowUI = {
  statusLabel(status) {
    const labels = {
      detected: 'تم اكتشاف الانحراف', tagged: 'تم فتح Tag', root_cause_analysis: 'تحليل السبب الجذري',
      action_in_progress: 'الإجراء التصحيحي', verification: 'التحقق من الفاعلية', standardized: 'توحيد المعيار', closed: 'مغلق'
    };
    return labels[status] || status;
  },
  statusClass(status) {
    return `tpm-status tpm-status-${String(status || 'unknown').replace(/[^a-z0-9_-]/gi, '')}`;
  },
  renderProgress(status) {
    const steps = Object.values(TPMWorkflow.STATUSES);
    const index = Math.max(0, steps.indexOf(status));
    const percent = Math.round(((index + 1) / steps.length) * 100);
    return { percent, current: index + 1, total: steps.length, label: this.statusLabel(status) };
  },
  renderWorkflowSummary(record = {}) {
    const progress = this.renderProgress(record.status);
    const score = TPMWorkflow.calculateClosureScore(record);
    return {
      status: progress.label,
      percent: progress.percent,
      closureScore: score,
      isClosed: record.status === TPMWorkflow.STATUSES.CLOSED,
      needsAction: ![TPMWorkflow.STATUSES.STANDARDIZED, TPMWorkflow.STATUSES.CLOSED].includes(record.status)
    };
  }
};
