// KPI helpers for the closed-loop TPM workflow.
// These functions are deterministic and do not replace plant-specific KPI definitions.
export const TPMKPI = {
  closureRate(records = []) {
    if (!records.length) return 0;
    return Math.round((records.filter(r => r.status === 'closed').length / records.length) * 100);
  },
  overdueRate(records = [], now = new Date()) {
    if (!records.length) return 0;
    const overdue = records.filter(r => r.dueDate && new Date(r.dueDate) < now && r.status !== 'closed').length;
    return Math.round((overdue / records.length) * 100);
  },
  averageClosureDays(records = []) {
    const closed = records.filter(r => r.detectedAt && r.closedAt);
    if (!closed.length) return 0;
    const ms = closed.reduce((sum, r) => sum + (new Date(r.closedAt) - new Date(r.detectedAt)), 0);
    return Math.round((ms / closed.length / 86400000) * 10) / 10;
  },
  lossMinutes(records = []) {
    return records.reduce((sum, r) => sum + Math.max(0, Number(r.durationMinutes) || 0), 0);
  },
  verifiedCountermeasures(records = []) {
    if (!records.length) return 0;
    return Math.round((records.filter(r => r.verificationId || r.status === 'standardized' || r.status === 'closed').length / records.length) * 100);
  }
};
