/* TPM Teams Gateway: the six established workspaces remain unchanged. */
window.TPM_TEAM_HUB = [
  { id: 'jh', code: 'JH', name: 'الصيانة الذاتية', icon: 'bx-wrench', color: '#10b981', workspace: 'jhPortalScreen', description: 'مساحة الصيانة الذاتية الأصلية.' },
  { id: 'et', code: 'E&T', name: 'التعليم والتدريب', icon: 'bxs-graduation', color: '#8b5cf6', workspace: 'etScreen', description: 'مساحة التعليم والتدريب الأصلية.' },
  { id: '5s', code: '5S', name: 'بيئة العمل', icon: 'bx-sparkles', color: '#06b6d4', workspace: 'fiveSScreen', description: 'مساحة 5S الأصلية.' },
  { id: 'kk', code: 'KK', name: 'التحسين المستمر', icon: 'bx-line-chart', color: '#f59e0b', workspace: 'kkScreen', description: 'مساحة التحسين المستمر الأصلية.' },
  { id: 'pm', code: 'PM', name: 'الصيانة المخططة', icon: 'bx-cog', color: '#ef4444', workspace: 'pmScreen', description: 'مساحة الصيانة المخططة الأصلية.' },
  { id: 'hse', code: 'HSE', name: 'الصحة والسلامة والبيئة', icon: 'bx-shield-quarter', color: '#22c55e', workspace: 'hseScreen', description: 'مساحة فريق HSE.' }
];

window.getTPMActivity = () => null;

// Bridge the new domain layer into the legacy application without removing existing screens.
(async function bootstrapTPMDomain() {
  try {
    const [{ TPMWorkflow }, { TPMFirebase }, { TPMKPI }, { TPMWorkflowUI }] = await Promise.all([
      import('./js/core/tpm-workflow.js'),
      import('./js/core/tpm-firebase.js'),
      import('./js/core/tpm-kpi.js'),
      import('./js/core/tpm-workflow-ui.js')
    ]);
    window.TPMWorkflow = TPMWorkflow;
    window.TPMFirebase = TPMFirebase;
    window.TPMKPI = TPMKPI;
    window.TPMWorkflowUI = TPMWorkflowUI;
    window.TPMDomainReady = true;
    window.dispatchEvent(new CustomEvent('tpm:domain-ready'));
    console.info('[TPM] Continuous Improvement domain connected.');
  } catch (error) {
    console.error('[TPM] Domain bootstrap failed:', error);
    window.TPMDomainReady = false;
    window.dispatchEvent(new CustomEvent('tpm:domain-error', { detail: error }));
  }
})();
