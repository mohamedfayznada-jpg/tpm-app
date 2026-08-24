// Deterministic KPI helpers for the closed-loop TPM workflow.
// These helpers intentionally do not redefine plant-specific OEE/MTBF/MTTR formulas.

function validDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function percent(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

export const TPMKPI = {
  closureRate(records = []) {
    const list = Array.isArray(records) ? records.filter(Boolean) : [];
    return percent(list.filter(r => r.status === 'closed').length, list.length);
  },

  overdueRate(records = [], now = new Date()) {
    const list = Array.isArray(records) ? records.filter(Boolean) : [];
    const reference = validDate(now) || new Date();
    const overdue = list.filter(r => {
      const due = validDate(r.dueDate);
      return due && due.getTime() < reference.getTime() && r.status !== 'closed';
    }).length;
    return percent(overdue, list.length);
  },

  averageClosureDays(records = []) {
    const list = Array.isArray(records) ? records.filter(Boolean) : [];
    const closed = list
      .map(r => ({ start: validDate(r.detectedAt), end: validDate(r.closedAt) }))
      .filter(r => r.start && r.end && r.end >= r.start);
    if (!closed.length) return 0;
    const ms = closed.reduce((sum, r) => sum + (r.end.getTime() - r.start.getTime()), 0);
    return Math.round((ms / closed.length / 86400000) * 10) / 10;
  },

  lossMinutes(records = []) {
    const list = Array.isArray(records) ? records : [];
    return list.reduce((sum, r) => sum + Math.max(0, Number(r?.durationMinutes) || 0), 0);
  },

  verifiedCountermeasures(records = []) {
    const list = Array.isArray(records) ? records.filter(Boolean) : [];
    return percent(
      list.filter(r => r.verificationId || r.status === 'standardized' || r.status === 'closed').length,
      list.length
    );
  },

  openCount(records = []) {
    const list = Array.isArray(records) ? records.filter(Boolean) : [];
    return list.filter(r => !['standardized', 'closed'].includes(r.status)).length;
  },

  statusBreakdown(records = []) {
    const list = Array.isArray(records) ? records.filter(Boolean) : [];
    return list.reduce((acc, record) => {
      const key = String(record.status || 'unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
};
