/* TPM Teams Gateway: the five established workspaces remain unchanged; HSE is a separate placeholder workspace. */
window.TPM_TEAM_HUB = [
  {
    id: 'jh', code: 'JH', name: 'الصيانة الذاتية', icon: 'bx-wrench', color: '#10b981', workspace: 'jhPortalScreen',
    description: 'مساحة الصيانة الذاتية الأصلية.'
  },
  {
    id: 'et', code: 'E&T', name: 'التعليم والتدريب', icon: 'bxs-graduation', color: '#8b5cf6', workspace: 'etScreen',
    description: 'مساحة التعليم والتدريب الأصلية.'
  },
  {
    id: '5s', code: '5S', name: 'بيئة العمل', icon: 'bx-sparkles', color: '#06b6d4', workspace: 'fiveSScreen',
    description: 'مساحة 5S الأصلية.'
  },
  {
    id: 'kk', code: 'KK', name: 'التحسين المستمر', icon: 'bx-line-chart', color: '#f59e0b', workspace: 'kkScreen',
    description: 'مساحة التحسين المستمر الأصلية.'
  },
  {
    id: 'pm', code: 'PM', name: 'الصيانة المخططة', icon: 'bx-cog', color: '#ef4444', workspace: 'pmScreen',
    description: 'مساحة الصيانة المخططة الأصلية.'
  },
  {
    id: 'hse', code: 'HSE', name: 'الصحة والسلامة والبيئة', icon: 'bx-shield-quarter', color: '#22c55e', workspace: 'hseScreen',
    description: 'مساحة فريق HSE.'
  }
];

window.getTPMActivity = () => null;
