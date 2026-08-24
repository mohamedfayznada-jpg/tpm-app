// FACTORY OS — Canonical role policy
// Single source of truth for UI authorization and backward-compatible role aliases.

export const ROLE_POLICY = Object.freeze({
    aliases: Object.freeze({
        operator: 'technician',
        tech: 'technician',
        technician: 'technician',
        reviewer: 'auditor',
        audit: 'auditor',
        auditor: 'auditor',
        engineer: 'engineer',
        admin: 'admin',
        administrator: 'admin',
        viewer: 'viewer'
    }),
    labels: Object.freeze({
        admin: 'مدير المصنع',
        engineer: 'مهندس',
        technician: 'فني / مشغل',
        auditor: 'مراجع TPM',
        viewer: 'مشاهد'
    }),
    screenAccess: Object.freeze({
        technician: Object.freeze([
            'homeScreen','settingsScreen','tasksScreen','tagsScreen','fiveSScreen',
            'jhPortalScreen','jhDocumentScreen','clitChecklistScreen','tpmTeamsScreen',
            'kaizenScreen','kkScreen','pmScreen','etScreen','hseScreen'
        ]),
        auditor: Object.freeze([
            'homeScreen','settingsScreen','historyScreen','jhPortalScreen','jhDocumentScreen',
            'jhKPIsScreen','tpmTeamsScreen','kaizenScreen','kkScreen'
        ]),
        viewer: Object.freeze(['homeScreen','settingsScreen'])
    })
});

export function normalizeRole(role) {
    const key = String(role || 'viewer').trim().toLowerCase();
    return ROLE_POLICY.aliases[key] || 'viewer';
}

export function roleLabel(role) {
    return ROLE_POLICY.labels[normalizeRole(role)] || ROLE_POLICY.labels.viewer;
}

export function canAccessRole(role, screenId) {
    const canonical = normalizeRole(role);
    if (canonical === 'admin' || canonical === 'engineer') return true;
    return ROLE_POLICY.screenAccess[canonical]?.includes(screenId) || false;
}
