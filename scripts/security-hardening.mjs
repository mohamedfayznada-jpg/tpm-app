import fs from 'node:fs';

const file = 'app.js';
let s = fs.readFileSync(file, 'utf8');
const original = s;

s = s.replace(/\s*const kSnap = await db\.ref\('tpm_system\/api_keys'\)\.once\('value'\);\n\s*globalApiKeys = kSnap\.val\(\) \|\| \{ imgbb: "", gemini: "" \};\n\s*window\.globalApiKeys = globalApiKeys;\n/, '\n        // Secrets are server-managed; the browser never reads tpm_system/api_keys.\n        globalApiKeys = { imgbb: "", gemini: "" };\n        window.globalApiKeys = globalApiKeys;\n');

s = s.replace(/window\.saveApiKeys = async function\(\) \{[\s\S]*?\n\};\nwindow\.enableApiKeysEdit = function\(\) \{[\s\S]*?\n\};/, `window.saveApiKeys = async function() {
    showToast('🔐 مفاتيح الخدمة تُدار على الخادم فقط. استخدم Vercel Environment Variables.');
};
window.enableApiKeysEdit = function() {
    showToast('🔐 لا يتم عرض أو تخزين مفاتيح الخدمة داخل المتصفح.');
};`);

s = s.replace(/currentUser = \{ uid: user\.uid, name: savedName, username: finalUsername, role: role, status: status \};/, `role = window.normalizeTPMRole ? window.normalizeTPMRole(role) : role;
            currentUser = { uid: user.uid, name: savedName, username: finalUsername, role: role, status: status };`);

s = s.replace(/role: u\.requestedRole, permissions: finalPerms/, `role: (window.normalizeTPMRole ? window.normalizeTPMRole(u.requestedRole) : u.requestedRole), permissions: finalPerms`);

s = s.replace(/window\.skipCurrentStep = function\(\) \{\s*currentAudit\.results\[currentAudit\.stepsOrder\[currentAudit\.currentStepIndex\]\] = \{skipped:true, score:0, max:0, improvements:\[\], selections:\{\}, images:\{\}\};\s*window\.saveAuditDraft\(\);\s*window\.goToNextStep\(\);\s*\};/, `window.skipCurrentStep = function() {
    const step = currentAudit.stepsOrder[currentAudit.currentStepIndex];
    const reason = window.sanitizeInput(prompt('سبب تخطي المرحلة؟ يجب توثيق السبب في سجل التدقيق:') || '');
    if (!reason || reason.length < 5) return showToast('⚠️ لا يمكن تخطي المرحلة بدون سبب موثق لا يقل عن 5 أحرف.');
    currentAudit.results[step] = { skipped:true, skipReason:reason, score:0, max:0, improvements:[], selections:{}, images:{}, skippedBy:currentUser.name, skippedAt:Date.now() };
    window.saveAuditDraft();
    window.goToNextStep();
};`);

if (s === original) {
  console.error('No patch applied. Aborting.');
  process.exit(2);
}
fs.writeFileSync(file, s);
console.log('Patched app.js');

const rulesFile = 'firebase.rules.json';
const rules = JSON.parse(fs.readFileSync(rulesFile, 'utf8'));
const tpm = rules.rules.tpm_system;
delete tpm['.read'];

const readPaths = [
  'departments','maintenanceEngineers','history','abnormalities','tags','losses','rca',
  'countermeasures','verifications','standards','pdca','jh_kpis','jh_records','jh_main_team',
  'clit_executions','dept_goals','knowledgeBase','pdf_files','global_achievements',
  'notification_settings','kaizenComments','likes','users','points','logs','tasks'
];
for (const key of readPaths) {
  tpm[key] = tpm[key] || {};
  if (!tpm[key]['.read']) tpm[key]['.read'] = 'auth != null';
}

tpm.api_keys = tpm.api_keys || {};
tpm.api_keys['.read'] = "auth != null && root.child('tpm_system/users/' + auth.uid + '/role').val() === 'admin'";

tpm.tasks = {
  '.read': 'auth != null',
  '.indexOn': ['id','dept','status','priority','assignee','team','dueDate','createdAt'],
  '.write': "auth != null && (root.child('tpm_system/users/' + auth.uid + '/role').val() === 'admin' || root.child('tpm_system/users/' + auth.uid + '/role').val() === 'engineer' || root.child('tpm_system/users/' + auth.uid + '/role').val() === 'auditor' || root.child('tpm_system/users/' + auth.uid + '/role').val() === 'technician' || root.child('tpm_system/users/' + auth.uid + '/role').val() === 'operator')"
};

tpm.points = {
  '.read': 'auth != null',
  '$uid': {
    '.write': "auth != null && ($uid === auth.uid || root.child('tpm_system/users/' + auth.uid + '/role').val() === 'admin')",
    '.validate': 'newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000'
  }
};

tpm.logs = {
  '.read': "auth != null && (root.child('tpm_system/users/' + auth.uid + '/role').val() === 'admin' || root.child('tpm_system/users/' + auth.uid + '/role').val() === 'engineer' || root.child('tpm_system/users/' + auth.uid + '/role').val() === 'auditor')",
  '$logId': {
    '.write': "auth != null && (root.child('tpm_system/users/' + auth.uid + '/role').val() === 'admin' || newData.child('uid').val() === auth.uid)",
    '.validate': "newData.hasChildren(['id','uid','user','action','time']) && newData.child('uid').val() === auth.uid"
  }
};

let rulesText = JSON.stringify(rules, null, 2) + '\n';
rulesText = rulesText.replaceAll("=== 'technician'", "=== 'technician' || root.child('tpm_system/users/' + auth.uid + '/role').val() === 'operator'");
fs.writeFileSync(rulesFile, rulesText);
