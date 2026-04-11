// ==========================================
// FIREBASE CONFIG & GLOBAL VARIABLES
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyADr-QEzWt6xeT8oeF7wXfNySvXiKXMEy4",
    authDomain: "tpm-audit-system.firebaseapp.com",
    databaseURL: "https://tpm-audit-system-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "tpm-audit-system",
    storageBucket: "tpm-audit-system.firebasestorage.app",
    messagingSenderId: "1047922099229",
    appId: "1:1047922099229:web:5e3d6fd5fa4c23ab2772f4"
};
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

let globalApiKeys = { imgbb: "", gemini: "" };

let departments = []; let historyData = []; let tasksData = [];
let usersData = {}; let logsData = []; let likesData = {};
let currentUser = { name: '', username: '', role: '' };
let radarChartInstance = null; let trendChartInstance = null;
let factoryBarChartInstance = null;
let isInitialLoad = true; let currentOplImg = null;
let currentUploadItemId = null; let currentUploadItemTitle = '';
let voiceAuditActive = false; 
let tagsData = []; 
let kaizenComments = {};
let userPoints = {}; 
let currentTagImg = null;
let currentViewedDept = null;
let isDataLoaded = false;
let currentAudit = null; let currentStepSelections = {}; let currentStepImages = {}; let currentStepImprovements = []; let currentTaskDept = null;
let deptPhones = {}; 
let maintenanceEngineers = [];
let isOnline = false; 
let tpmSystemRef = null;
let tpmSystemListener = null;

function hasRole(...allowed) {
    return allowed.includes(currentUser.role);
}

function sanitizeInput(value) {
    return String(value || '').replace(/[<>]/g, '').trim();
}

function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, (ch) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

function nl2brSafe(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
}

function safeUrl(url) {
    const value = String(url || '').trim();
    if (!value) return '';
    if (value.startsWith('https://') || value.startsWith('http://') || value.startsWith('data:image/')) return value;
    return '';
}

function toCsvCell(value) {
    const str = String(value ?? '');
    return `"${str.replace(/"/g, '""')}"`;
}

function uniqueNumericId() {
    return (Date.now() * 1000) + Math.floor(Math.random() * 1000);
}

// مراقبة حالة الاتصال بسيرفرات فايربيز لحظة بلحظة
db.ref('.info/connected').on('value', function(snap) {
    isOnline = snap.val() === true;
    let cloudStatus = document.getElementById('cloudStatus');
    if(cloudStatus) {
        if(isOnline) {
            cloudStatus.innerHTML = "☁️ متصل ومزامن";
            cloudStatus.style.backgroundColor = "rgba(46, 125, 50, 0.9)"; // أخضر
        } else {
            cloudStatus.innerHTML = "📴 أوفلاين (شغلك محفوظ مؤقتاً)";
            cloudStatus.style.backgroundColor = "#F57F17"; // برتقالي تحذيري
        }
    }
});


// ==========================================
// FIREBASE STORAGE UPLOAD FUNCTION
// ==========================================
// ==========================================
// IMGBB IMAGE UPLOAD FUNCTION (الخطة ج - رفع الصور الخارجي)
// =========================ك=================
// ⚠️ حط المفتاح اللي جبته من موقع ImgBB بين علامتين التنصيص هنا ⚠️
const IMGBB_API_KEY = (
    (window.__TPM_CONFIG__ && window.__TPM_CONFIG__.imgbbApiKey) ||
    localStorage.getItem('tpm_imgbb_api_key') ||
    ''
).trim();

// احتفظنا بنفس اسم الدالة القديمة عشان منعدلش الكود كله!
async function uploadImageToStorage(dataUrl, folderName) {
    if (!globalApiKeys.imgbb) {
        alert('⚠️ مفتاح ImgBB غير موجود بالسيرفر. برجاء تواصل مع المدير لإضافته.');
        return null;
    }
    const IMGBB_API_KEY = globalApiKeys.imgbb;
    // ... وكمل باقي الدالة زي ما هي (try / catch) ...
    try {
        // ImgBB بيحتاج الصورة Base64 صافي من غير الديباجة اللي في الأول
        const base64Data = dataUrl.split(',')[1]; 
        
        const formData = new FormData();
        formData.append('image', base64Data);

        // إرسال الصورة لسيرفرات ImgBB
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            // لو الرفع نجح، السيرفر هيرجعلنا الرابط المباشر السريع للصورة
            return result.data.url; 
        } else {
            console.error("ImgBB Error:", result);
            alert("❌ السيرفر رفض استقبال الصورة، حاول تاني.");
            return null;
        }
    } catch (error) {
        console.error("Network Error:", error);
        alert("⚠️ حدث خطأ في شبكة الإنترنت أثناء رفع الصورة.");
        return null;
    }
}


// ==========================================
// DRAFT MANAGEMENT (المسودة)
// ==========================================
function saveAuditDraft() {
    if(currentAudit) {
        localStorage.setItem('tpm_audit_draft', JSON.stringify(currentAudit));
    }
}

function loadAuditDraft() {
    const draft = localStorage.getItem('tpm_audit_draft');
    if(draft) {
        currentAudit = JSON.parse(draft);
        renderCurrentAuditStep();
    }
}

function clearAuditDraft() {
    localStorage.removeItem('tpm_audit_draft');
}

// ==========================================
// SYSTEM INITIALIZATION & PWA
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SW Registered!', reg)).catch(err => console.error('SW Error', err));
    });
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('tpm_dark_mode', isDark);
    if(currentUser.role) { updateHomeDashboard(); if(currentViewedDept) updateDeptDashboard(); }
}
if(localStorage.getItem('tpm_dark_mode') === 'true') document.body.classList.add('dark-mode');

// ==========================================
// AUTO-LOGIN & SAFE DATA FETCHING
// ==========================================
firebase.auth().onAuthStateChanged((user) => {
    if (tpmSystemRef && tpmSystemListener) {
        tpmSystemRef.off('value', tpmSystemListener);
        tpmSystemRef = null;
        tpmSystemListener = null;
    }

    if (user) {
        tpmSystemRef = db.ref('tpm_system');
        tpmSystemListener = (snapshot) => {
            try {
                const data = snapshot.val() || {};
                departments = data.departments || ['قسم الإنتاج', 'قسم الصيانة'];
                historyData = data.history ? Object.values(data.history).filter(x => x && x.id).sort((a,b) => Number(a.id) - Number(b.id)) : [];
                tasksData = data.tasks ? Object.values(data.tasks).filter(x => x && x.id).sort((a,b) => Number(a.id) - Number(b.id)) : [];
                let fallbackLogId = Date.now();
                logsData = data.logs ? Object.values(data.logs).filter(x => x).map(l => { if(!l.id) l.id = fallbackLogId++; return l; }).sort((a,b) => Number(a.id) - Number(b.id)) : [];
                usersData = data.users || {};
// سحب المفاتيح لجميع العمال
                globalApiKeys = data.api_keys || { imgbb: "", gemini: "" };
                if(document.getElementById('imgbbKeyInput')) document.getElementById('imgbbKeyInput').value = globalApiKeys.imgbb;
                if(document.getElementById('geminiKeyInput')) document.getElementById('geminiKeyInput').value = globalApiKeys.gemini;
                likesData = data.likes || {}; 
                tagsData = data.tags ? Object.values(data.tags).filter(x => x && x.id).sort((a,b) => Number(b.id) - Number(a.id)) : [];
                userPoints = data.points || {};
                deptPhones = data.deptPhones || {};
maintenanceEngineers = data.maintenanceEngineers || [];
kaizenComments = data.kaizenComments || {};
                isDataLoaded = true; // 🛡️ تم تحميل الداتا بنجاح

                if (isInitialLoad) {
                    isInitialLoad = false;
                    const savedName = localStorage.getItem('tpm_user') || user.email.split('@')[0];
                    const savedUsername = localStorage.getItem('tpm_username') || user.email.split('@')[0];
                    
                    let role = 'viewer';
                    let userEmail = (user && user.email) ? user.email.toLowerCase() : '';
                    if (userEmail.includes('mfayez') || savedUsername.toLowerCase() === 'mfayez') {
                        role = 'admin';
                        if (user && usersData[user.uid] !== 'admin') {
                            db.ref('tpm_system/users/' + user.uid).set('admin');
                            usersData[user.uid] = 'admin';
                        }
                    } else if (user && usersData[user.uid]) {
                        role = usersData[user.uid];
                    } else if (usersData[savedUsername]) {
                        role = usersData[savedUsername];
                    }
                    currentUser = { name: savedName, username: savedUsername, role: role };
                    let greetingEl = document.getElementById('userGreeting');
                    if(greetingEl) greetingEl.innerText = `👤 ${currentUser.name} (${role === 'admin' ? 'مدير' : role === 'auditor' ? 'مراجع' : 'مشاهد'})`;
                    
                    document.querySelectorAll('.btn-role-admin').forEach(el => el.style.display = role === 'admin' ? 'block' : 'none');
                    document.querySelectorAll('.btn-role-auditor').forEach(el => el.style.display = (role === 'admin' || role === 'auditor') ? 'block' : 'none');
                    
                    let navBar = document.getElementById('bottomNav');
                    if(navBar) navBar.style.display = 'flex';
                    showScreen('homeScreen');
                }

                updateDeptDropdown(); updateDeptListUI(); renderHistory(); renderTasks();
                
                // تحديث الداشبورد محمي بـ Try Catch عشان لو مفيش إنترنت أو في إيرور الأبلكيشن ميتصلبش
                try {
                    if(currentUser.role) {
                        updateHomeDashboard();
                        if(currentViewedDept && document.getElementById('deptDashboardScreen').classList.contains('active')){
                            updateDeptDashboard();
                        }
                    }
                } catch(dashErr) { console.error("Error updating dashboards:", dashErr); }
                
                if(currentUser.role === 'admin') { renderUsersPanel(); renderLogsPanel(); }
                if(document.getElementById('kaizenScreen') && document.getElementById('kaizenScreen').classList.contains('active')) renderKaizenFeed();
                if(document.getElementById('tagsScreen') && document.getElementById('tagsScreen').classList.contains('active')) renderTags();
                
             
            } catch(e) { 
                console.error("خطأ في قراءة البيانات:", e); 
                let cloudStatus = document.getElementById('cloudStatus');
                if(cloudStatus) { cloudStatus.innerHTML = "❌ متصل (يوجد خطأ بالبيانات)"; cloudStatus.style.backgroundColor = "#C62828"; }
            }
        };
        tpmSystemRef.on('value', tpmSystemListener);
    } else {
        isInitialLoad = false; showScreen('loginScreen');
    }
});

// ==========================================
// SYNC TO SERVER (دالة الحفظ المباشر - ضد التهنيج)
// ==========================================
function syncToServer() {
    if (!isDataLoaded || !firebase.auth().currentUser) return;
    
    let cloudStatus = document.getElementById('cloudStatus');
    if(cloudStatus) {
        cloudStatus.innerHTML = isOnline ? "⏳ جاري الحفظ..." : "📴 بالانتظار...";
        cloudStatus.style.backgroundColor = isOnline ? "rgba(46, 125, 50, 0.9)" : "#F57F17";
    }
    
    try {
        let safeHistory = {}; if(historyData) historyData.forEach(h => { if(h && h.id) safeHistory[h.id] = h; }); 
        let safeTasks = {}; if(tasksData) tasksData.forEach(t => { if(t && t.id) safeTasks[t.id] = t; }); 
        let safeTags = {}; if(tagsData) tagsData.forEach(t => { if(t && t.id) safeTags[t.id] = t; }); 
        let safeLogs = {}; if(logsData) logsData.forEach(l => { if(l && l.id) safeLogs[l.id] = l; }); 

        // 🚀 الحفظ الصاروخي: الحفظ لكل ملف لوحده عشان نتفادى رفض وكراش الفايربيز
        db.ref('tpm_system/history').set(safeHistory);
        db.ref('tpm_system/tasks').set(safeTasks);
        db.ref('tpm_system/tags').set(safeTags);
        db.ref('tpm_system/kaizenComments').set(kaizenComments || {});
        db.ref('tpm_system/likes').set(likesData || {});
        db.ref('tpm_system/points').set(userPoints || {});
        db.ref('tpm_system/logs').set(safeLogs);

        // إعدادات المدير
        if (hasRole('admin')) {
            db.ref('tpm_system/departments').set(departments || []);
            db.ref('tpm_system/users').set(usersData || {});
            db.ref('tpm_system/deptPhones').set(deptPhones || {});
            db.ref('tpm_system/maintenanceEngineers').set(maintenanceEngineers || []);
            if (globalApiKeys && globalApiKeys.imgbb) {
                db.ref('tpm_system/api_keys').set(globalApiKeys);
            }
        }

        if(cloudStatus && isOnline) { 
            setTimeout(() => {
                cloudStatus.innerHTML = "☁️ متصل ومزامن"; 
                cloudStatus.style.backgroundColor = "rgba(46, 125, 50, 0.9)"; 
            }, 1000);
        }
    } catch(e) {
        console.error("Sync Data Error:", e);
        if(cloudStatus) { cloudStatus.innerHTML = "❌ خطأ برمجي"; cloudStatus.style.backgroundColor = "#C62828"; }
    }
}
// ==========================================
// AUTHENTICATION & LOGS
// ==========================================
async function login() {
    const username = sanitizeInput(document.getElementById('loginUsername').value).toLowerCase();
    const password = document.getElementById('loginPassword').value.trim();
    const name = sanitizeInput(document.getElementById('displayName').value);

    if(!username || !password || !name) return alert('برجاء إدخال اسم المستخدم وكلمة المرور والاسم');
    
    let cloudStatus = document.getElementById('cloudStatus');
    if(cloudStatus) cloudStatus.innerHTML = "⏳ جاري تسجيل الدخول...";
    
    const fakeEmail = username.toLowerCase() + "@tpm.app";

    try {
        let rememberMeBox = document.getElementById('rememberMe');
        if(rememberMeBox && rememberMeBox.checked) {
            localStorage.setItem('tpm_user', name); localStorage.setItem('tpm_username', username);
        } else {
            localStorage.removeItem('tpm_user'); localStorage.removeItem('tpm_username');
        }
        isInitialLoad = true;
        await firebase.auth().signInWithEmailAndPassword(fakeEmail, password);
        
        // 🛡️ تأخير كتابة اللوج لحد ما الداتا تحمل
        setTimeout(() => { if(isDataLoaded) { logAction('تسجيل دخول للنظام'); syncToServer(); } }, 3000); 
    } catch (error) {
        if(cloudStatus) cloudStatus.innerHTML = "❌ متصل (بدون مزامنة)";
        if(error.code) alert('اسم المستخدم أو كلمة المرور غير صحيحة!');
    }
}

async function biometricLogin() {
    const savedUser = localStorage.getItem('tpm_user');
    const savedUsername = localStorage.getItem('tpm_username');
    if (!savedUser || !savedUsername) return alert('عفواً، يجب تسجيل الدخول يدوياً أول مرة مع تفعيل (تذكرني).');

    const fpBtn = document.getElementById('fingerprintBtn');
    fpBtn.classList.add('scanning');
    document.getElementById('cloudStatus').innerHTML = "⏳ جاري مطابقة البصمة...";

    setTimeout(() => {
        fpBtn.classList.remove('scanning');
        document.getElementById('loginUsername').value = savedUsername;
        document.getElementById('displayName').value = savedUser;
        document.getElementById('loginPassword').value = ""; 
        isInitialLoad = true;
        if(firebase.auth().currentUser) {
            if(isDataLoaded) { logAction('تسجيل دخول سريع بالبصمة'); syncToServer(); }
            showScreen('homeScreen');
        } else {
            alert('انتهت الجلسة. برجاء إدخال كلمة المرور لتجديد التوثيق (الدخول بالبصمة يعمل بعد تسجيل يدوي ناجح).');
        }
    }, 1500);
}

function logout() {
    if(isDataLoaded) { logAction('تسجيل خروج من النظام'); syncToServer(); }
    setTimeout(() => {
        firebase.auth().signOut().then(() => {
            localStorage.removeItem('tpm_user'); localStorage.removeItem('tpm_username');
            currentUser = { name: '', role: '' };
            isDataLoaded = false;
            document.getElementById('bottomNav').style.display = 'none';
            document.getElementById('loginUsername').value = ''; document.getElementById('loginPassword').value = '';
            showScreen('loginScreen');
        });
    }, 1000);
}

function logAction(actionDesc) {
    if(!currentUser.name) return;
    const now = new Date();
    const timeStr = now.toLocaleDateString('ar-EG') + ' ' + now.toLocaleTimeString('ar-EG');
    logsData.push({ id: uniqueNumericId(), user: currentUser.name, action: actionDesc, time: timeStr });
    if(logsData.length > 50) logsData.shift(); 
}

function renderUsersPanel() {
    const c = document.getElementById('usersListContainer'); if(!c) return;
    let html = '';
    for(let uName in usersData) {
        let currentRole = usersData[uName];
        html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border);"><b>${uName}</b><select class="form-control" style="width:auto; padding:5px;" onchange="changeUserRole('${uName}', this.value)"><option value="viewer" ${currentRole === 'viewer' ? 'selected' : ''}>مشاهد</option><option value="auditor" ${currentRole === 'auditor' ? 'selected' : ''}>مراجع</option><option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>مدير</option></select></div>`;
    }
    c.innerHTML = html || '<div style="color:gray;">لا يوجد مستخدمين آخرين</div>';
}

function renderLogsPanel() {
    const c = document.getElementById('logsContainer'); if(!c) return;
    c.innerHTML = logsData.length === 0 ? '<div style="color:gray; font-size: 11px;">لا توجد سجلات حالياً</div>' : [...logsData].reverse().map(l => `<div class="log-item"><span style="font-weight:bold; color:var(--primary);">${l.user}</span><span>${l.action}</span><span style="color:var(--gray);">${l.time}</span></div>`).join('');
}

function changeUserRole(userName, newRole) {
    if(!hasRole('admin')) return alert('عفواً، هذه الصلاحية للمدير فقط.');
    usersData[userName] = newRole; logAction(`تعديل صلاحية (${userName}) إلى ${newRole}`); syncToServer(); alert(`تم التعديل بنجاح!`);
}

function addNewUserRole() {
    if(!hasRole('admin')) return alert('عفواً، هذه الصلاحية للمدير فقط.');
    const uname = document.getElementById('newUsernameRole').value.trim();
    const role = document.getElementById('newRoleSelect').value;
    
    if(!uname) return alert('برجاء كتابة الـ UID أو اسم المستخدم أولاً!');
    
    usersData[uname] = role;
    syncToServer();
    logAction(`تعيين صلاحية (${role}) للمستخدم: ${uname}`);
    document.getElementById('newUsernameRole').value = '';
    alert(`تمت الإضافة بنجاح!`);
    renderUsersPanel();
}

// ==========================================
// VOICE ASSISTANT (DICTATION & READING)
// ==========================================
function startVoiceDictation() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('عفواً، متصفحك الحالي لا يدعم الإدخال الصوتي.');
    const recognition = new SpeechRecognition(); recognition.lang = 'ar-EG'; recognition.start();
    const micBtn = document.getElementById('micBtn'); micBtn.classList.add('recording'); micBtn.innerText = '🔴';
    recognition.onresult = (e) => { document.getElementById('newTaskInput').value += " " + e.results[0][0].transcript; micBtn.classList.remove('recording'); micBtn.innerText = '🎤'; };
    recognition.onerror = () => { micBtn.classList.remove('recording'); micBtn.innerText = '🎤'; };
    recognition.onend = () => { micBtn.classList.remove('recording'); micBtn.innerText = '🎤'; };
}

function toggleVoiceAudit() {
    const btn = document.getElementById('voiceAuditBtn');
    if(!voiceAuditActive) { voiceAuditActive = true; btn.classList.add('recording'); runVoiceAuditLoop(); } 
    else { voiceAuditActive = false; btn.classList.remove('recording'); window.speechSynthesis.cancel(); }
}

function speakText(text) {
    return new Promise(resolve => {
        if(!voiceAuditActive) return resolve();
        let u = new SpeechSynthesisUtterance(text); u.lang = 'ar-SA';
        u.onend = resolve; u.onerror = resolve; window.speechSynthesis.speak(u);
    });
}

function listenForNumber() {
    return new Promise(resolve => {
        if(!voiceAuditActive) return resolve(null);
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return resolve(null);
        const rec = new SpeechRecognition(); rec.lang = 'ar-EG'; rec.start();
        rec.onresult = (e) => {
            let t = e.results[0][0].transcript.trim();
            const map = {'واحد':1,'١':1,'1':1, 'اثنين':2,'اتنين':2,'٢':2,'2':2, 'ثلاثه':3,'ثلاثة':3,'تلاته':3,'٣':3,'3':3, 'اربعة':4,'أربعة':4,'اربع':4,'٤':4,'4':4, 'خمسة':5,'خمسه':5,'خمس':5,'٥':5,'5':5, 'ستة':6,'سته':6,'ست':6,'٦':6,'6':6};
            resolve(map[t] || parseInt(t) || null);
        };
        rec.onerror = () => resolve(null); rec.onend = () => resolve(null);
    });
}

async function runVoiceAuditLoop() {
    const stepKey = currentAudit.stepsOrder[currentAudit.currentStepIndex];
    const items = AUDIT_DATA[stepKey].items;

    for(let i=0; i<items.length; i++) {
        if(!voiceAuditActive) break;
        const item = items[i]; const safeKey = 'item_' + item.id;
        if(currentStepSelections[safeKey]) continue;

        await speakText(`البند ${item.id}. ${item.title}. قيم من واحد إلى ستة.`);
        let num = await listenForNumber();
        if(!voiceAuditActive) break;

        if(num >= 1 && num <= 6) {
            let lvlObj = item.levels.find(l => l.level == num);
            if(lvlObj) {
                currentStepSelections[safeKey] = { score: lvlObj.score, max: item.maxScore };
                renderCurrentAuditStep(); await speakText(`تم. الدرجة ${num}.`);
            }
        } else { await speakText("لم أفهم التقييم. يمكنك اختياره يدوياً."); }
    }
    if(voiceAuditActive) {
        await speakText("تم المرور على جميع البنود. يرجى الضغط على حفظ الخطوة.");
        voiceAuditActive = false; document.getElementById('voiceAuditBtn').classList.remove('recording');
    }
}

// ==========================================
// EXPORT EXCEL & PDF & OPL
// ==========================================
function exportToCSV() {
    if(currentUser.role !== 'admin') return alert('عفواً، للمدير فقط');
    if(historyData.length === 0) return alert('لا توجد تقارير.');
    let csvContent = "data:text/csv;charset=utf-8,%EF%BB%BF"; 
    csvContent += "ID,القسم,المراجع,التاريخ,النتيجة,JH-0,JH-1,JH-2,JH-3,JH-4,JH-5,JH-6\n";
    historyData.forEach(a => {
        let row = [ a.id, a.dept, a.auditor, a.date, a.totalPct + "%", getStepPct(a, 'JH-0'), getStepPct(a, 'JH-1'), getStepPct(a, 'JH-2'), getStepPct(a, 'JH-3'), getStepPct(a, 'JH-4'), getStepPct(a, 'JH-5'), getStepPct(a, 'JH-6') ];
        csvContent += row.join(",") + "\n";
    });
    const link = document.createElement("a"); link.href = encodeURI(csvContent); link.download = `TPM_Reports_${new Date().toLocaleDateString('ar-EG').replace(/\//g,'-')}.csv`; link.click();
    logAction('استخراج التقارير إلى Excel'); syncToServer();
}

function exportSystemBackupJSON() {
    if(!hasRole('admin')) return alert('عفواً، للمدير فقط');
    const safeHistory = {}; if(historyData) historyData.forEach(h => { if(h && h.id) safeHistory[h.id] = h; });
    const safeTasks = {}; if(tasksData) tasksData.forEach(t => { if(t && t.id) safeTasks[t.id] = t; });
    const safeLogs = {}; if(logsData) logsData.forEach(l => { if(l && l.id) safeLogs[l.id] = l; });
    const safeTags = {}; if(tagsData) tagsData.forEach(t => { if(t && t.id) safeTags[t.id] = t; });

    const backupData = {
        exportedAt: new Date().toISOString(),
        source: 'TPM App',
        tpm_system: {
            departments: departments || [],
            history: safeHistory,
            tasks: safeTasks,
            users: usersData || {},
            logs: safeLogs,
            likes: likesData || {},
            tags: safeTags,
            points: userPoints || {},
            deptPhones: deptPhones || {},
            maintenanceEngineers: maintenanceEngineers || [],
            kaizenComments: kaizenComments || {}
        }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TPM_Backup_${new Date().toLocaleDateString('ar-EG').replace(/\//g,'-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function triggerBackupImport() {
    if(!hasRole('admin')) return alert('عفواً، للمدير فقط');
    const input = document.getElementById('backupImportInput');
    if(input) input.click();
}

function importSystemBackupJSON(event) {
    if(!hasRole('admin')) return alert('عفواً، للمدير فقط');
    const file = event.target.files && event.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const raw = JSON.parse(e.target.result);
            const payload = raw.tpm_system || raw;
            if(!payload || typeof payload !== 'object') throw new Error('ملف النسخة غير صالح.');
            if(!confirm('⚠️ سيتم استبدال بيانات التطبيق الحالية بهذه النسخة. هل أنت متأكد؟')) return;

            departments = Array.isArray(payload.departments) ? payload.departments : departments;
            historyData = payload.history ? Object.values(payload.history).filter(x => x && x.id).sort((a,b) => Number(a.id) - Number(b.id)) : [];
            tasksData = payload.tasks ? Object.values(payload.tasks).filter(x => x && x.id).sort((a,b) => Number(a.id) - Number(b.id)) : [];
            logsData = payload.logs ? Object.values(payload.logs).filter(x => x) : [];
            usersData = payload.users || {};
            likesData = payload.likes || {};
            tagsData = payload.tags ? Object.values(payload.tags).filter(x => x && x.id).sort((a,b) => Number(b.id) - Number(a.id)) : [];
            userPoints = payload.points || {};
            deptPhones = payload.deptPhones || {};
            maintenanceEngineers = payload.maintenanceEngineers || [];
            kaizenComments = payload.kaizenComments || {};

            updateDeptDropdown();
            updateDeptListUI();
            renderHistory();
            renderTasks();
            renderTags();
            if(document.getElementById('kaizenScreen') && document.getElementById('kaizenScreen').classList.contains('active')) renderKaizenFeed();
            syncToServer();
            alert('✅ تم استرجاع النسخة وحفظها على Firebase.');
        } catch(err) {
            alert('❌ فشل قراءة النسخة: ' + err.message);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

function getStepPct(audit, step) {
    if(!audit.results || !audit.results[step] || audit.results[step].skipped || audit.results[step].max === 0) return 'N/A';
    return Math.round((audit.results[step].score / audit.results[step].max) * 100) + "%";
}

function uploadOplImage(event) {
    const file = event.target.files[0]; if(!file) return;
    processAndEnhanceImage(file, function(dataUrl) { currentOplImg = dataUrl; document.getElementById('oplImgPreview').innerHTML = `<img src="${dataUrl}" style="height:100px; border-radius:8px; border:1px solid #ccc;">`; });
}

function generateOPLPDF() {
    const title = document.getElementById('oplTitle').value.trim(); const desc = document.getElementById('oplDesc').value.trim();
    if(!title || !desc || !currentOplImg) return alert('برجاء كتابة العنوان، رفع الصورة، وكتابة الشرح.');
    const oplDiv = document.createElement('div'); oplDiv.style.padding = '20px'; oplDiv.style.fontFamily = 'Arial';
    oplDiv.innerHTML = `<div style="border: 3px solid #0D47A1; border-radius:10px; padding:20px; text-align:center;"><h1 style="color:#0D47A1; border-bottom:2px solid #ccc; padding-bottom:10px;">درس النقطة الواحدة (One Point Lesson)</h1><h2 style="margin:20px 0;">${title}</h2><img src="${currentOplImg}" style="max-height:300px; max-width:100%; border-radius:8px; border:2px solid #ccc; margin-bottom:20px;"><div style="text-align:right; background:#f9f9f9; padding:15px; border-radius:8px; font-size:18px; line-height:1.6;"><b>شرح الخطوات:</b><br>${desc.replace(/\n/g, '<br>')}</div><div style="margin-top:40px; display:flex; justify-content:space-between; font-weight:bold;"><span>إعداد: ${currentUser.name}</span><span>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</span></div></div>`;
    html2pdf().set({ margin: 0.5, filename: `OPL_${title}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).from(oplDiv).save();
    awardPoints(30, 'إنشاء درس OPL');   
    document.getElementById('oplModal').style.display = 'none';
}

// ==========================================
// TRUE AI VISION INSPECTOR & AI CAPA
// ==========================================
async function runAIVision(itemId, itemTitle) {
    const apiKey = globalApiKeys.gemini;
    if(!apiKey) return alert('⚠️ مفتاح Gemini غير موجود بالسيرفر. تواصل مع المدير.');
    if(!apiKey || apiKey.includes("حط_المفتاح")) return alert('برجاء زرع مفتاح Gemini في الكود أولاً.');

    let previewBox = document.getElementById(`img_preview_elem_${itemId}`);
    if(previewBox) previewBox.innerHTML += `<div class="ai-scan-line" style="display:block;"></div>`;
    
    document.getElementById('aiModalText').textContent = "⏳ جاري فحص الصورة ومطابقتها بمعايير البند...";
    document.getElementById('aiModal').style.display = 'flex';

    try {
        const imgObj = currentStepImages['img_' + itemId];
        if(!imgObj) throw new Error("الصورة غير موجودة.");
        const base64Data = imgObj.data.split(',')[1];
        const promptText = `أنت مهندس ومفتش صيانة (TPM) وخبير في معايير 5S. قم بتحليل الصورة المرفقة بناءً على متطلبات البند: "${itemTitle}". هل تثبت تطبيق البند؟ ابحث عن تسريبات، أتربة، فوضى، أو مطابقة للمعايير. رد بالعربية بصيغة HTML: ✅ <b>تحليل AI للصورة:</b> (التحليل) <br><br> 💡 <b>نصيحة للوصول لـ 100%:</b> (النصيحة العملية)`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: "image/jpeg", data: base64Data } }] }] })
        });
        const result = await response.json();
        if(result.error) throw new Error(result.error.message);
        
        let aiText = result.candidates[0].content.parts[0].text;
        aiText = aiText.replace(/```html/g, '').replace(/```/g, '');
        document.getElementById('aiModalText').innerHTML = nl2brSafe(aiText);
        logAction('فحص صورة حقيقي بـ AI');
    } catch(e) { 
        console.error("AI Error:", e);
        document.getElementById('aiModalText').textContent = `❌ حدث خطأ من جوجل: ${e.message}`; 
    } 
    finally { if(previewBox){ let s = previewBox.querySelector('.ai-scan-line'); if(s) s.remove(); } }
}

async function autoGenerateCAPA() {
    if(currentStepImprovements.length === 0) return alert('لا توجد فرص تحسين لتوليد مهام لها.');
   const apiKey = globalApiKeys.gemini;
    if(!apiKey) return alert('⚠️ مفتاح Gemini غير موجود بالسيرفر. تواصل مع المدير.');
    if(!apiKey || apiKey.includes("حط_المفتاح")) return alert('برجاء زرع مفتاح Gemini في الكود لتفعيل التوليد الآلي.');
    
    document.getElementById('aiCapaBtn').innerText = "⏳ جاري التوليد...";
    document.getElementById('aiCapaBtn').disabled = true;

    try {
        const issues = currentStepImprovements.map(i => i.title).join("، ");
        const promptText = `بصفتك مدير صيانة TPM، قم بتحويل المشاكل التالية إلى مهام عمل تصحيحية (CAPA) قابلة للتنفيذ: [${issues}]. 
        رد بصيغة JSON Array فقط، كل عنصر عبارة عن Object كالتالي:
        [{"task": "نص المهمة", "type": "نظافة أو أمن وسلامة أو ميكانيكا", "time": "الوقت المتوقع للإصلاح (مثال: 15 دقيقة)"}] ولا تكتب أي شيء آخر.`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        const result = await response.json();
        if(result.error) throw new Error(result.error.message);
        
        let jsonStr = result.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
        let tasksArr = JSON.parse(jsonStr);
        
        const dept = currentAudit.dept;
        tasksArr.forEach(item => { 
            let safeUniqueId = uniqueNumericId();
            tasksData.push({ id: safeUniqueId, dept: dept, task: item.task, type: item.type, time: item.time, status: 'pending', date: new Date().toLocaleDateString('ar-EG'), phone: '' }); 
        });
        
        renderTasks(); syncToServer(); logAction(`توليد خطط عمل AI لقسم ${dept}`);
        alert('تم توليد المهام الاحترافية بنجاح!');
    } catch(e) {
        console.error("AI Error:", e);
        alert('عطل من جوجل: ' + e.message);
    } finally {
        document.getElementById('aiCapaBtn').innerText = "✨ توليد خطط AI";
        document.getElementById('aiCapaBtn').disabled = false;
    }
}

async function predictMachineFailures() {
    const apiKey = globalApiKeys.gemini;
    if(!apiKey) return alert('⚠️ مفتاح Gemini غير موجود بالسيرفر. تواصل مع المدير.');
    if(!apiKey || apiKey.includes("حط_المفتاح")) return alert('برجاء زرع مفتاح Gemini في الكود.');
    
    const resultBox = document.getElementById('aiPredictionResult');
    resultBox.style.display = 'block';
    resultBox.textContent = "⏳ جاري تحليل ملايين البيانات والتاجات...";

    let openTagsData = tagsData.filter(t => t.status === 'open').map(t => `${t.machine || 'عام'} في قسم ${t.dept}: ${t.desc} (تاج ${t.color === 'red' ? 'أحمر' : 'أزرق'})`).join(" | ");
    let latestAudits = historyData.slice(-5).map(a => `${a.machine || 'عام'} (${a.dept}): نتيجته ${a.totalPct}%`).join(" | ");

    if(!openTagsData) openTagsData = "لا توجد تاجات مفتوحة حالياً.";

    const promptText = `أنت مهندس صيانة تنبؤية (Predictive Maintenance Expert) في مصنع. 
    قم بتحليل هذه البيانات الحالية للمصنع:
    التاجات المفتوحة: [${openTagsData}]
    نتائج آخر مراجعات: [${latestAudits}]
    
    المطلوب:
    1. استنتج الماكينة الأكثر عُرضة للتوقف (Breakdown) خلال الـ 7 أيام القادمة بناءً على نوع التاجات.
    2. اكتب رسالة تحذيرية قصيرة ومباشرة (في 3 أسطر كحد أقصى) للإدارة، موضحاً السبب التقني المتوقع والإجراء الاستباقي المطلوب.
    رد بالعربية وبدون أي مقدمات، واستخدم علامات الـ Emoji المناسبة للتحذير (🚨, ⚠️, 🔧).`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        const result = await response.json();
        if(result.error) throw new Error(result.error.message);
        
        let aiText = result.candidates[0].content.parts[0].text;
        resultBox.innerHTML = nl2brSafe(aiText);
        logAction('استخدام مستشار الصيانة التنبؤية AI');
        awardPoints(25, 'تحليل تنبؤي للمصنع');
    } catch(e) { 
        resultBox.textContent = `❌ حدث خطأ: ${e.message}`; 
    }
}

function explainItem(title) {
    let expl = "📌 المطلوب توفير أدلة موثقة (سجلات، صور، لوحات) تدعم التطبيق.";
    if (title.includes('خطة')) expl = "💡 **يُقترح:** جدول زمني (Gantt) بأسماء وتواريخ، معلق على الماكينة.";
    else if (title.includes('تدريب') || title.includes('مهارات') || title.includes('فهم')) expl = "💡 **يُقترح:** مصفوفة مهارات (Skill Matrix) وسجلات OPL موقعة.";
    else if (title.includes('خطر') || title.includes('سلامة')) expl = "💡 **يُقترح:** خريطة للسلامة وعلامات تحذيرية مرئية.";
    else if (title.includes('خرائط') || title.includes('معايير')) expl = "💡 **يُقترح:** إدارة مرئية (تلوين العدادات، علامات تزييت CLIT).";
    else if (title.includes('تاجات') || title.includes('مصفوفة')) expl = "💡 **يُقترح:** نظام تاجات (أحمر/أزرق) وسجل כايزن للإغلاق.";
    else if (title.includes('تلوث')) expl = "💡 **يُقترح:** تحليل 5Whys وعمل تغطية (Covers) لتقليل وقت التنظيف.";
    document.getElementById('aiModalText').innerHTML = nl2brSafe(expl);
    document.getElementById('aiModal').style.display = 'flex';
}

function openImageSourcePicker(itemId, itemTitle) {
    currentUploadItemId = itemId; currentUploadItemTitle = itemTitle;
    document.getElementById('imageSourceModal').style.display = 'flex';
}
function triggerCamera() { document.getElementById('cameraInput').click(); document.getElementById('imageSourceModal').style.display = 'none'; }
function triggerGallery() { document.getElementById('galleryInput').click(); document.getElementById('imageSourceModal').style.display = 'none'; }

async function handleImageSelection(event) {
    const file = event.target.files[0]; 
    if(!file || !currentUploadItemId) return;
    
    const itemId = currentUploadItemId; 
    const itemTitle = currentUploadItemTitle;
    let previewBox = document.getElementById(`preview_img_${itemId}`);
    
    // إظهار رسالة تحميل للمستخدم
    previewBox.innerHTML = "<span style='font-size:11px; color:var(--primary); font-weight:bold;'>⏳ جاري رفع الصورة للسيرفر...</span>";
    
    // معالجة وضغط الصورة كالمعتاد
    processAndEnhanceImage(file, async function(enhancedDataUrl) {
        // بدلاً من الحفظ المباشر، هنرفع الصورة أولاً للـ Storage
        const downloadURL = await uploadImageToStorage(enhancedDataUrl, `audit_images/${currentAudit.dept}`);
        
        if (downloadURL) {
            // حفظ الرابط النظيف بدلاً من الـ Base64
            currentStepImages['img_' + itemId] = { title: itemTitle, data: downloadURL };
            
            // تحديث الواجهة
            previewBox.innerHTML = `
                <div id="img_preview_elem_${itemId}" style="position:relative; display:inline-block;">
                    <img src="${downloadURL}" style="height:40px; border-radius:4px; margin-right:10px; border:1px solid var(--border); vertical-align:middle;">
                </div>
                <button class="btn btn-outline btn-sm" style="display:inline-block; vertical-align:middle; padding:4px 8px; margin-right:5px;" onclick="runAIVision(${itemId}, '${itemTitle.replace(/'/g, "\\'")}')">👁️ فحص AI</button>
                <button class="btn btn-danger btn-sm" style="display:inline-block; vertical-align:middle; padding:4px 8px;" onclick="removeAuditImage(${itemId})">🗑️ مسح</button>
            `;
            // الحفظ التلقائي عشان لو النت فصل
            saveAuditDraft(); 
        } else {
            previewBox.innerHTML = "<span style='font-size:11px; color:red;'>❌ فشل الرفع</span>";
        }
    });
    
    document.getElementById('cameraInput').value = ''; 
    document.getElementById('galleryInput').value = '';
}

function removeAuditImage(itemId) {
    if(confirm('متأكد من مسح هذه الصورة؟')) {
        // (اختياري لاحقاً: إضافة كود لمسح الصورة من السيرفر نفسه لتوفير المساحة)
        delete currentStepImages['img_' + itemId];
        let previewDiv = document.getElementById(`preview_img_${itemId}`);
        if(previewDiv) previewDiv.innerHTML = '';
        saveAuditDraft();
    }
}
function processAndEnhanceImage(file, callback) {
    const reader = new FileReader(); reader.onload = function(e) {
        const img = new Image(); img.onload = function() {
            const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
            const MAX_WIDTH = 800; let width = img.width; let height = img.height;
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            ctx.filter = 'contrast(1.1) saturate(1.1)'; ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.8));
        }; img.src = e.target.result;
    }; reader.readAsDataURL(file);
}

// ==========================================
// FULL AUDIT DATA
// ==========================================
const AUDIT_DATA = {
    "JH-0": { name: "الخطوة التحضيرية", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوه التحضيرية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي وجود خطة عمل لتنفيذ انشطة الخطوه التحضيرية لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه التحضيرية لكل قسم ، ولكن توجد أدلة ضعيفة علي إستخدامها في الواقع"},{level:3,score:2,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه التحضيرية لكل قسم ، وتوجد بعض الأدلة علي إستخدامها ، كما أن الخطة غير مثبتة علي لوحة أنشطة الـ TPM لكل قسم"},{level:4,score:3,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه التحضيرية لكل قسم وتغطي كثير من أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وكثير من مشغلي الماكينات على دراية بها"},{level:5,score:4,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه التحضيرية لكل قسم وتغطي معظم أنشطة الخطوة، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم ومعظم مشغلي الماكينات بالقسم علي دراية كاملة بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه التحضيرية للقسم وتغطي كافة أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وجميع مشغلي الماكينات بالقسم علي دراية بتفاصيلها"}] },
        { id: 2, title: "وجود ماده علمية متكامله لشرح خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي وجود ماده علمية لشرح خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:2,score:1,desc:"توجد ماده علمية بسيطة تغطي قليل من أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:3,score:2,desc:"توجد ماده علمية تغطي بعض أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:4,score:3,desc:"توجد ماده علمية تغطي كثير من أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:5,score:4,desc:"توجد ماده علمية تغطي معظم أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:6,score:5,desc:"توجد ماده علمية متكامله لشرح خطوات الصيانة الذاتية تغطي كافة أنشطتها تفصيليا ، وموضح بها أهداف الصيانة الذاتية والغرض من تطبيقها"}] },
        { id: 3, title: "قياس مدى فهم مشغلي الماكينات لأنشطة خطوات الصيانه الذاتيه", maxScore: 15, levels: [{level:1,score:0,desc:"مشغلي الماكينات ليس لديهم وعي بأنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:2,score:3,desc:"مشغلي الماكينات لديهم معرفة بسيطه بأنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:3,score:6,desc:"مشغلي الماكينات لديهم معرفة ببعض أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:4,score:9,desc:"مشغلي الماكينات لديهم معرفة بكثير من أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:5,score:12,desc:"مشغلي الماكينات لديهم وعي بمعظم أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"},{level:6,score:15,desc:"جميع مشغلي الماكينات بالقسم لديهم وعي كامل بكافة أنشطة خطوات الصيانة الذاتية وأهدافها والغرض من تطبيقها"}] },
        { id: 4, title: "إعداد وإصدار قائمة بجميع أماكن الخطر بالماكينات وبيئة العمل المحيطة بها", maxScore: 10, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي إعداد قائمة بمخاطر الماكينات وبيئة العمل المحيطة بها"},{level:2,score:2,desc:"تم إعداد وإصدار قائمة لعدد بسيط من أماكن الخطر بالماكينات وبيئة العمل المحيطة بها ، ولم يتم شرحها لجميع العاملين بالقسم أو وضع جدول زمني للقضاء عليها"},{level:3,score:4,desc:"تم إعداد وإصدار قائمة معتمده لبعض أماكن الخطر بالماكينات وبيئة العمل المحيطة بها ، وتم شرحها لبعض العاملين بالقسم، وتم وضع جدول زمني للقضاء عليها"},{level:4,score:6,desc:"تم إعداد وإصدار قائمة معتمده لكثير من أماكن الخطر بالماكينات وبيئة العمل المحيطة بها ، وتم شرحها لمعظم العاملين بالقسم، وتم وضع جدول زمني للقضاء عليها"},{level:5,score:8,desc:"تم إعداد وإصدار قائمة معتمده لمعظم أماكن الخطر بالماكينات وبيئة العمل المحيطة بها ، ومثبتة على لوحة الإعلان بالقسم ، وتم شرحها لجميع العاملين بالقسم ووضع خطة عمل للقضاء عليها"},{level:6,score:10,desc:"تم إعداد وإصدار قائمة بجميع أماكن الخطر بالماكينات وبيئة العمل المحيطة بها ، ومثبتة على لوحة الإعلان بالقسم ، وتم شرحها لجميع العاملين بالقسم ووضع خطة عمل للقضاء عليها"}] },
        { id: 5, title: "تدريب عملي لمشغلي الماكينات (OJT) يتضمن شرح للظواهر السبع الغير طبيعية", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد أي دلائل علي إعداد برنامج تدريبي لشرح الظواهر السبع الغير طبيعية"},{level:2,score:4,desc:"تم إعداد برنامج تدريبي مبسط لشرح الظواهر السبع الغير طبيعية بالماكينات ، لا يتضمن التدريب أمثلة عملية علي الماكينة لكل ظاهرة من الظواهر السبع ، وعدد قليل من مشغلي الماكينات لديهم معرفة أو فهم كامل لتلك الظواهر"},{level:3,score:8,desc:"تم إعداد برنامج تدريبي متكامل لشرح الظواهر السبع الغير طبيعية بالماكينات ، يتضمن التدريب أمثلة عملية علي الماكينة لكل ظاهرة من الظواهر السبع ، و بعض مشغلي الماكينات لديهم معرفة أو فهم كامل لتلك الظواهر"},{level:4,score:12,desc:"تم إعداد برنامج تدريبي متكامل لشرح الظواهر السبع الغير طبيعية بالماكينات ، يتضمن التدريب أمثلة عملية على الماكينة لكل ظاهرة من الظواهر السبع ، وكثير من مشغلي الماكينات لديهم معرفة أو فهم كامل لتلك الظواهر"},{level:5,score:16,desc:"تم إعداد برنامج تدريبي متكامل لشرح الظواهر السبع الغير طبيعية بالماكينات ، يتضمن التدريب أمثلة عملية علي الماكينة لكل ظاهرة من الظواهر السبع ، و معظم مشغلي الماكينات لديهم معرفة أو فهم كامل لتلك الظواهر"},{level:6,score:20,desc:"تم إعداد برنامج تدريبي متكامل يغطي شرح الظواهر السبع الغير طبيعية بالماكينات ، يتضمن التدريب أمثلة عملية متعددة علي الماكينة لكل ظاهرة من الظواهر السبع ، وجميع مشغلي الماكينات لديهم معرفة وفهم كامل لتلك الظواهر"}] },
        { id: 6, title: "تدريب عملي لشرح الـ Structure Diagram لأجزاء الماكينات", maxScore: 25, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي إعداد برنامج تدريبي لشرح الـ Structure Diagram لأجزاء الماكينات"},{level:2,score:5,desc:"تم إعداد برنامج تدريبي مبسط لشرح الـ Structure Diagram لأجزاء الماكينات ، لا يتضمن التدريب أمثلة عملية علي أجزاء الماكينات ، وعدد قليل من العاملين لديهم معرفة أو فهم كامل لعناصر البرنامج التدريبي"},{level:3,score:10,desc:"تم إعداد برنامج تدريبي متكامل لشرح الـ Structure Diagram لأجزاء الماكينات ، يتضمن التدريب أمثلة عملية على أجزاء الماكينات ، وبعض العاملين لديهم معرفة أو فهم كامل لعناصر البرنامج التدريبي"},{level:4,score:15,desc:"تم إعداد برنامج تدريبي متكامل لشرح الـ Structure Diagram لأجزاء الماكينات ، يتضمن التدريب أمثلة عملية على أجزاء الماكينات ، وكثير من العاملين لديهم معرفة أو فهم كامل لعناصر البرنامج التدريبي"},{level:5,score:20,desc:"تم إعداد برنامج تدريبي متكامل لشرح الـ Structure diagram الأجزاء الماكينات ، يتضمن التدريب أمثلة عملية على أجزاء الماكينات، ومعظم العاملين لديهم معرفة أو فهم كامل العناصر البرنامج التدريبي"},{level:6,score:25,desc:"تم إعداد برنامج تدريبي عملي متكامل يغطي شرح الـ Structure Diagram لجميع أجزاء الماكينات، وجميع العاملين لديهم معرفة وفهم كامل لها"}] },
        { id: 7, title: "إعداد نماذج الـ OPL الخاصة بأنشطة الصيانة الذاتية", maxScore: 15, levels: [{level:1,score:0,desc:"لا توجد دلائل واضحة علي إعداد وتنفيذ مخطط نماذج الـ OPL الخاصه بانشطة الصيانة الذاتيه"},{level:2,score:3,desc:"تم إعداد وتنفيذ عدد قليل نماذج الـ OPL الخاصه بانشطة الصيانة الذاتيه ، وعدد قليل من مشغلي الماكينات علي وعي وفهم بمحتواها"},{level:3,score:6,desc:"تم إعداد وتنفيذ بعض نماذج الـ OPL الخاصه بانشطة الصيانة الذاتيه ، وبعض مشغلي الماكينات علي وعي وفهم بمحتواها"},{level:4,score:9,desc:"تم إعداد وتنفيذ كثير من النماذج المخططة للـ OPL الخاصه بانشطة الصيانة الذاتيه ، وكثير من مشغلي الماكينات علي وعي وفهم بمحتواها"},{level:5,score:12,desc:"تم إعداد وتنفيذ معظم النماذج المخططة للـ OPL الخاصه بانشطة الصيانة الذاتيه ، ومعظم مشغلي الماكينات علي وعي وفهم بمحتواها"},{level:6,score:15,desc:"توجد دلائل واضحة علي إعداد وتنفيذ مخطط نماذج الـ OPL الخاصه بجميع انشطة الصيانة الذاتيه ، وجميع مشغلي الماكينات علي وعي وفهم كامل بمحتوي هذه النماذج"}] },
        { id: 8, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل على تنفيذ المراجعة الذاتية علي أنشطة الخطوة التحضيريه"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة التحضيريه"},{level:3,score:2,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة التحضيريه ، ولا يتم نشر النتائج ونقاط القوة وفرص التحسين بالقسم"},{level:4,score:3,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة التحضيريه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لكثير من العاملين بالقسم"},{level:5,score:4,desc:"يتم تنفيذ المراجعة الداخلية الدورية على أنشطة الخطوة التحضيريه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين المعظم العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"},{level:6,score:5,desc:"يتم تنفيذ المراجعة الداخلية الدورية على أنشطة الخطوة التحضيريه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لجميع العاملين بالقسم ، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"}] }
    ]},
    "JH-1": { name: "الخطوة الأولى - التنظيف المبدئي والفحص", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوه الأولى", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي وجود خطة عمل لتنفيذ انشطة الخطوه الأولى لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الأولى لكل قسم ، ولكن توجد أدلة ضعيفة علي إستخدامها في الواقع"},{level:3,score:2,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الأولى لكل قسم ، وتوجد بعض الأدلة على إستخدامها ، كما أن الخطة غير مثبتة على لوحة أنشطة الـ TPM لكل قسم"},{level:4,score:3,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الأولى لكل قسم وتغطي كثير من أنشطة الخطوة ، والخطة متاحة ومعتمدة و مثبتة علي لوحة أنشطة الـ TPM لكل قسم وكثير من مشغلي الماكينات علي دراية بها"},{level:5,score:4,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الأولى لكل قسم وتغطي معظم أنشطة الخطوة، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم ومعظم مشغلي الماكينات بالقسم علي دراية كاملة بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل لتنفيذ انشطة الخطوة الأولى للقسم وتغطي كافة أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وجميع مشغلي الماكينات بالقسم علي دراية بتفاصيلها"}] },
        { id: 2, title: "إعداد وإصدار خرائط الصيانة الذاتية (CLIT MAP)", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد أي دلائل علي إعداد خرائط الصيانة الذاتية لماكينات القسم"},{level:2,score:4,desc:"تم إعداد وإصدار خرائط تغطى قليل من انشطة الصيانة الذاتية لبعض ماكينات القسم موضح عليها رقم وتاريخ الإصدار ، ولكنها تغطي عدد قليل من أجزاء ماكينات القسم"},{level:3,score:8,desc:"تم إعداد وإصدار خرائط بعض انشطة الصيانة الذاتية لبعض من ماكينات القسم موضح عليها رقم وتاريخ الإصدار ، ولكنها تغطي بعض أجزاء ماكينات القسم"},{level:4,score:12,desc:"تم إعداد وإصدار خرائط تغطى كثير من انشطة الصيانة الذاتية لكثير من ماكينات القسم موضح عليها رقم وتاريخ الإصدار ، والخرائط تغطي كثير من أجزاء ماكينات القسم"},{level:5,score:16,desc:"تم إعداد وإصدار خرائط تغطى معظم انشطة الصيانة الذاتية لمعظم ماكينات القسم موضح عليها رقم وتاريخ الإصدار، والخرائط تغطي معظم أجزاء ماكينات القسم"},{level:6,score:20,desc:"تم إعداد وإصدار خرائط تغطى جميع انشطة الصيانة الذاتية المفصلة لماكينات القسم ، وأزمنة ودورية تنفيذها، وموضح عليها رقم وتاريخ الإصدار ، والخرائط تغطي جميع أجزاء ماكينات القسم"}] },
        { id: 3, title: "استخدام التاجات لرصد الظواهر السبع ومصفوفة التاجات", maxScore: 10, levels: [{level:1,score:0,desc:"لا توجد دلائل علي استخدام التاجات بشكل دوري، ولا يتم تسجيل أعدادها في نموذج مصفوفة التاجات"},{level:2,score:2,desc:"توجد أدلة ضعيفة علي استخدام التاجات لرصد الظواهر السبع الغير طبيعية ولم يتم تسجيلها بإنتظام في مصفوفة التاجات"},{level:3,score:4,desc:"توجد عدد قليل من الأدلة علي استخدام تاجات الظواهر السبع الغير طبيعية ولم يتم تسجيلها بانتظام في مصفوفة التاجات"},{level:4,score:6,desc:"توجد كثير من الأدلة علي استخدام تاجات الظواهر السبع الغير طبيعية وأعدادها بإنتظام في مصفوفة التاجات"},{level:5,score:8,desc:"توجد دلائل واضحة على حصر وتصنيف معظم تاجات الظواهر السبع الغير طبيعية بشكل دوري، وتسجيل أعدادها في نموذج مصفوفة التاجات بدقة والمصفوفة تتضمن قوائم مفصلة بالظواهر الغير طبيعية المكتشفة"},{level:6,score:10,desc:"يتم حصر وتصنيف تاجات الظواهر السبع الغير طبيعية بشكل دوري، وتسجيل أعدادها في نموذج مصفوفة التاجات بدقة والمصفوفة تتضمن قوائم مفصلة بالظواهر الغير طبيعية المكتشفة وأهمها الأماكن الصعبة ومصادر التلوث والنفايات والتسريبات"}] },
        { id: 4, title: "رصد الأماكن التي يصعب الوصول إليها", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي إعداد قائمة مفصلة بجميع الأماكن التي يصعب الوصول إليها لتنفيذ أنشطة الصيانة الذاتية"},{level:2,score:1,desc:"تم رصد عدد قليل من الأماكن التي يصعب الوصول إليها لتنفيذ أنشطة الصيانة الذاتية . ولم يتم فتح تاجات لهذه الأماكن"},{level:3,score:2,desc:"تم رصد بعض الأماكن التي يصعب الوصول إليها لتنفيذ أنشطة الصيانة الذاتية وتم فتح تاجات لهذه الأماكن"},{level:4,score:3,desc:"تم رصد كثير من الأماكن التي يصعب الوصول إليها لتنفيذ أنشطة الصيانة الذاتية وتم فتح تاجات لهذه الأماكن"},{level:5,score:4,desc:"تم رصد معظم الأماكن التي يصعب الوصول إليها لتنفيذ أنشطة الصيانة الذاتية . وتم فتح تاجات لهذة الأماكن"},{level:6,score:5,desc:"تم إعداد قائمة مفصلة لرصد جميع الأماكن التي يصعب الوصول إليها لتنفيذ أنشطة الصيانة الذاتية . وتم فتح تاجات لهذه الأماكن ، وإدارة الصيانة قامت بوضع خطة عمل للتعامل معها موضح بها الاجراء الذى تم والتاكد من فاعليه هذة الاجراء وتوثيقه"}] },
        { id: 5, title: "تفعيل إستخدام نماذج ( إعرف - لماذا ) لشرح أسباب المشكلات", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي إستخدام نماذج ( إعرف - لماذا ( الشرح أسباب حدوث المشكلات والظواهر الغير طبيعية التي يتم إكتشافها بماكينات القسم"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي إستخدام نماذج ( إعرف - لماذا ) لشرح أسباب حدوث المشكلات والظواهر الغير طبيعية التي يتم إكتشافها بماكينات القسم"},{level:3,score:2,desc:"يوجد عدد قليل من نماذج ( إعرف - لماذا ) لشرح بعض أسباب حدوث المشكلات والظواهر الغير طبيعية التي يتم إكتشافها بماكينات القسم"},{level:4,score:3,desc:"توجد كثير من الأدلة علي استخدام نماذج ( إعرف - لماذا ) بشكل دوري لشرح كثير من أسباب حدوث المشكلات والظواهر الغير طبيعية التي يتم إكتشافها بماكينات القسم والتعرف علي إجراءات تصحيحها و تم عرض أمثلة النماذج المحدثة بشكل دوري، وتم شرحها لكثير مشغلي الماكينات بالقسم"},{level:5,score:4,desc:"توجد أدلة واضحة وقوية علي إستخدام نماذج ( إعرف - لماذا ) بشكل دوري لشرح معظم أسباب حدوث المشكلات والظواهر الغير طبيعية التي يتم إكتشافها بماكينات القسم والتعرف علي إجراءات تصحيحها و تم عرض أمثلة لمعظم النماذج المحدثة بشكل دوري ، وتم شرحها لمعظم مشغلي الماكينات"},{level:6,score:5,desc:"توجد أدلة واضحة وقوية علي إستخدام نماذج ( إعرف - لماذا ) بشكل دوري لشرح جميع أسباب حدوث المشكلات والظواهر الغير طبيعية التي يتم إكتشافها بماكينات القسم والتعرف علي إجراءات تصحيحها. و تم عرض أمثلة لجميع النماذج المحدثة بشكل دوري، وتم شرحها لجميع مشغلي الماكينات بالقسم"}] },
        { id: 6, title: "خطة عمل لتصحيح المشكلات المسجلة في التاجات ( الإجراءات التصحيحية )", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أي دلائل على وجود خطة عمل مفصلة لتصحيح المشكلات المسجلة في التاجات لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل مبدئية لتصحيح عدد قليل من المشكلات المسجلة في التاجات لكل قسم ، والخطة غير مثبتة علي لوحة أنشطة الـ TPM لكل قسم ، ومشغلي الماكينات بالقسم ليس لديهم وعي بكافة بتفاصيلها"},{level:3,score:2,desc:"توجد خطة عمل مبدئية لتصحيح بعض المشكلات المسجلة في التاجات لكل قسم ، والخطة غير مثبتة علي لوحة أنشطة الـ TPM لكل قسم ، ومشغلي الماكينات بالقسم ليس لديهم وعي بكافة بتفاصيلها"},{level:4,score:3,desc:"توجد خطة عمل مفصلة لتصحيح كثير من المشكلات المسجلة في التاجات لكل قسم ، والخطة مثبتة علي لوحة أنشطة الـ TPM لكل قسم ، وكثير من مشغلي الماكينات بالقسم لديهم وعي بكافة تفاصيلها"},{level:5,score:4,desc:"توجد خطة عمل مفصلة لتصحيح معظم المشكلات المسجلة في التاجات لكل قسم، والخطة مثبتة علي لوحة أنشطة الـ TPM لكل قسم ، ومعظم مشغلي الماكينات بالقسم لديهم وعي بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل مفصلة لتصحيح جميع المشكلات المسجلة في التاجات لكل قسم ، والخطة مثبتة علي لوحة أنشطة الـ TPM لكل قسم ، وجميع مشغلي الماكينات بالقسم لديهم وعي بكافة تفاصيلها"}] },
        { id: 7, title: "التحقق من فعالية التحسين المرتبطة بالقضاء على الظواهر السبع المرصودة بالتاجات", maxScore: 25, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تحليل أسباب الظواهر الغير طبيعية المرصودة بالتاجات وصولا للأسباب الجذرية لها"},{level:2,score:5,desc:"تم تحليل عدد قليل من اسباب الظواهر الغير طبيعية المرصودة بالتاجات وصولا للأسباب الجذرية لها"},{level:3,score:10,desc:"تم تحليل بعض أسباب الظواهر الغير طبيعية المرصودة بالتاجات وصولاً للأسباب الجذرية لها ، وتم تنفيذ بعض التحسينات للقضاء عليها"},{level:4,score:15,desc:"تم تحليل كثير من أسباب الظواهر الغير طبيعية المرصودة بالتاجات وصولا للأسباب الجذرية لها ، وتم تنفيذ بعض التحسينات الملموسة للقضاء عليها ، ويتضح تأثيرها بشكل واضح علي إنخفاض نسب الفواقد ، وتم عرض نماذج الكايزن الموثقة"},{level:5,score:20,desc:"تم تحليل أسباب معظم الظواهر الغير طبيعية المرصودة بالتاجات وصولا للأسباب الجذرية لها ، وتم تنفيذ كثير من التحسينات المطلوبة للقضاء عليها ، والتي يتضح تأثيرها بشكل واضح علي إنخفاض نسب الفواقد ، وتم عرض نماذج الكايزن الموثقة"},{level:6,score:25,desc:"تم تحليل أسباب جميع الظواهر الغير طبيعية المرصودة بالتاجات وصولا للأسباب الجذرية لها ، تم تنفيذ جميع التحسينات المطلوبة للقضاء عليها ويتضح ذلك من تأثيرها علي إنخفاض نسب الفواقد وتم التحقق من إغلاق التاجات وتثبيتها على شجرة التاجات"}] },
        { id: 8, title: "التحقق من فعالية التحسين المرتبطة بتقليل أزمنة الصيانة الذاتية", maxScore: 25, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تحليل أسباب زيادة أزمنة الصيانة الذاتية"},{level:2,score:5,desc:"توجد دلائل ضعيفه على تحليل أسباب زيادة أزمنة الصيانة الذاتية"},{level:3,score:10,desc:"تم تحليل بعض أسباب زيادة أزمنة أنشطة الصيانة الذاتية وتوجد بعض الدلائل علي تنفيذ التحسينات المطلوبة لتقليلها ولكن لم يتضح تأثيرها بشكل واضح"},{level:4,score:15,desc:"تم تحليل كثير من أسباب زيادة أزمنة أنشطة الصيانة الذاتية وتم تنفيذ عدد من التحسينات الملموسة لتقليلها ، ويتضح تأثيرها بشكل واضح علي إنخفاض تلك الأزمنة ، وتم عرض نماذج الكايزن الموثقة لتلك التحسينات"},{level:5,score:20,desc:"تم تحليل معظم أسباب زيادة أزمنة أنشطة الصيانة الذاتية وتم تنفيذ عدد من التحسينات الملموسة لتقليلها ، ويتضح تأثيرها بشكل واضح علي إنخفاض تلك الأزمنة ، وتم عرض نماذج الكايزن الموثقة لتلك التحسينات"},{level:6,score:25,desc:"تم تحليل جميع أسباب زيادة أزمنة أنشطة الصيانة الذاتية وتم تنفيذ جميع التحسينات المخططة والملموسة لتقليلها وتعميمها في الأماكن المشابهة، وهناك أدلة متعددة توضح تأثيرها الكبير على إنخفاض تلك الأزمنة ، وتم عرض نماذج الكايزن الموثقة"} ] },
        { id: 9, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الأولى"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الأولى"},{level:3,score:2,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الأولى ، ولا يتم نشر النتائج ونقاط القوة وفرص التحسين بالقسم"},{level:4,score:3,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الأولى ، ويتم نشر النتائج ونقاط القوة وفرص التحسين كثير العاملين بالقسم"},{level:5,score:4,desc:"يتم تنفيذ المراجعة الداخلية الدورية على أنشطة الخطوة الأولى ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لمعظم العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"},{level:6,score:5,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الأولى ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لجميع العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"}] }
    ]},
    "JH-2": { name: "الخطوة الثانية - القضاء على مصادر التلوث", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوه الثانية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أي دلائل علي وجود خطة عمل لتنفيذ انشطة الخطوه الثانيه لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثانيه لكل قسم ، ولكن توجد أدلة ضعيفة علي إستخدامها في الواقع"},{level:3,score:2,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثانيه لكل قسم ، وتوجد بعض الأدلة على إستخدامها ، كما أن الخطة غير مثبتة على لوحة أنشطة الـ TPM لكل قسم"},{level:4,score:3,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثانيه لكل قسم وتغطي كثير من أنشطة الخطوة ، والخطة متاحة ومعتمدة و مثبتة علي لوحة أنشطة الـ TPM لكل قسم وكثير من مشغلي الماكينات علي دراية بها"},{level:5,score:4,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثانيه لكل قسم وتغطي معظم أنشطة الخطوة، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم ومعظم مشغلي الماكينات بالقسم علي دراية كاملة بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثانيه للقسم وتغطي كافة أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وجميع مشغلي الماكينات بالقسم علي دراية بتفاصيلها"}] },
        { id: 2, title: "الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى", maxScore: 10, levels: [{level:1,score:0,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها أقل من 20%"},{level:2,score:2,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها أقل من 40%"},{level:3,score:4,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها اقل من 60%"},{level:4,score:6,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها اكثر من 70%"},{level:5,score:8,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها اكثر من 80%"},{level:6,score:10,desc:"يتم الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها بنسبة 100%"}] },
        { id: 3, title: "وعي العاملين بمصادر التلوث والتسريبات والنفايات", maxScore: 20, levels: [{level:1,score:0,desc:"مشغلي الماكينات ليس لديهم وعي بأى من مصادر التلوث والتسريبات والنفايات"},{level:2,score:4,desc:"مشغلي الماكينات لديهم معرفة بسيطه بمصادر التلوث والتسريبات والنفايات"},{level:3,score:8,desc:"مشغلي الماكينات لديهم معرفة ببعض مصادر التلوث والتسريبات والنفايات والغرض من القضاء عليها"},{level:4,score:12,desc:"مشغلي الماكينات لديهم معرفة بكثير من مصادر التلوث والتسريبات والنفايات والغرض من القضاء عليها"},{level:5,score:16,desc:"مشغلى الماكينات لديهم وعى بمعظم مصادر التلوث والتسريبات ( هواء / غاز / مياه / شحوم / زيوت ) والنفايات والغرض من القضاء عليها"},{level:6,score:20,desc:"جميع مشغلي الماكينات بالقسم لديهم وعي كامل بكافة مصادر والتلوث والتسريبات ( هواء / غاز / مياه / شحوم / زيوت ) والنفايات والغرض من القضاء عليها"}] },
        { id: 4, title: "رصد مصادر التلوث والتسريبات والنفايات", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي رصد مصادر التلوث"},{level:2,score:4,desc:"توجد ادلة ضعيفة على رصد مصادر التلوث"},{level:3,score:8,desc:"توجد نماذج لرصد بعض مصادر التلوث"},{level:4,score:12,desc:"توجد خرائط لرصد كثير من المصادر المولدة ومسجلة بنماذج موضح بها المكان والكمية وتم ربطها بتاجات مصادر التلوث ، والنماذج مثبتة على لوحة أنشطة الصيانة الذاتية ، ومشغلي الماكينات ليس لديهم وعي بها"},{level:5,score:16,desc:"توجد خرائط مفصلة لرصد معظم المصادر المولدة ومسجلة بنماذج موضح بها المكان والكمية وتم ربطها بتاجات مصادر التلوث، والنماذج مثبتة على لوحة أنشطة الصيانة الذاتية .. ومعظم مشغلى الماكينات لديهم وعى بها"},{level:6,score:20,desc:"توجد خرائط مفصلة لرصد جميع المصادر المولدة ومسجلة بنماذج موضح بها المكان والكمية وتم ربطها بتاجات مصادر التلوث ، والنماذج مثبتة علي لوحة أنشطة الصيانة الذاتية ، وجميع مشغلي الماكينات لديهم وعي بها"}] },
        { id: 5, title: "رصد الأماكن التي يصعب الوصول إليها", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أي دلائل علي رصد الأماكن التي يصعب الوصول إليها"},{level:2,score:1,desc:"توجد ادلة ضعيفة على رصد الأماكن التي يصعب الوصول إليها"},{level:3,score:2,desc:"توجد نماذج لرصد بعض الأماكن التي يصعب الوصول إليها"},{level:4,score:3,desc:"توجد خرائط لرصد كثير من الأماكن صعبة الوصول ومسجلة بنماذج موضح بها الأماكن وتصنيفها وربطها بتاجات الاماكن الصعبة الوصول"},{level:5,score:4,desc:"توجد خرائط مفصلة لرصد معظم الأماكن صعبة الوصول ومسجلة بنماذج موضح بها المكان وتصنيفها وتم ربطها بتاجات الأماكن الصعبة الوصول، والنماذج مثبتة علي لوحة انشطة الصيانة الذاتية ، ومعظم مشغلي الماكينات لديهم وعى بها"},{level:6,score:5,desc:"توجد خرائط مفصلة لرصد جميع الأماكن الصعبة الوصول ومسجلة بنماذج موضح بها المكان وتصنيفها وتم ربطها بتاجات الأماكن الصعبة الوصول، والنماذج مثبتة علي لوحة أنشطة الصيانة الذاتية ، وجميع مشغلي الماكينات لديهم وعى بها"}] },
        { id: 6, title: "تنفيذ الإجراءات التصحيحية والمانعة للقضاء علي مصادر التلوث", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد دلائل توضح اتخاذ أي اجراءات تصحيحية للقضاء على المصادر المولدة"},{level:2,score:4,desc:"توجد أدلة ضعيفة على اتخاذ اجراءات تصحيحية للقضاء على المصادر المولدة"},{level:3,score:8,desc:"توجد بعض الأدلة على اتخاذ اجراءات تصحيحية للقضاء على المصادر المولدة"},{level:4,score:12,desc:"تم تنفيذ كثير من الإجراءات التصحيحية والمانعة للقضاء علي المصادر المولدة ، وتم توثيق تلك الاجراءات بنماذج الكايزن"},{level:5,score:16,desc:"تم تنفيذ معظم الإجراءات التصحيحية والمانعة للقضاء علي المصادر المولدة ، وتم توثيق تلك الاجراءات بنماذج الكايزن وعرض أثر النتائج الاجمالية للتحسينات المنفذة على تخفيض المصادر المولدة، ونشرها على معظم مشغلي الماكينات"},{level:6,score:20,desc:"توجد دلائل قوية على تنفيذ الإجراءات التصحيحية والمانعة للقضاء علي المصادر المولدة ، وجميع الاجراءات تم توثيقها بنماذج الكايزن وعرض أثر النتائج الاجمالية للتحسينات المنفذة على تخفيض المصادر المولدة ونشرها على جميع مشغلى الماكينات"}] },
        { id: 7, title: "تنفيذ الإجراءات التصحيحية والمانعة للقضاء علي الأماكن الصعبة", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد دلائل توضح اتخاذ أي اجراءات تصحيحية للقضاء علي الأماكن التي يصعب الوصول إليها"},{level:2,score:4,desc:"توجد أدلة ضعيفة صفة على اتخاذ إجراءات تصحيحية للقضاء علي الأماكن التي يصعب الوصول إليها"},{level:3,score:8,desc:"توجد بعض الأدلة على ى اتخاذ اجراءات التصحيحية والمانعة للقضاء علي الأماكن التي يصعب الوصول إليها"},{level:4,score:12,desc:"تم تنفيذ كثير من الإجراءات التصحيحية والمانعة للقضاء علي الأماكن التي يصعب الوصول إليها ، وتم توثيق تلك الاجراءات بنماذج الكايزن"},{level:5,score:16,desc:"تم تنفيذ معظم الإجراءات التصحيحية والمانعة للقضاء علي الأماكن صعبة الوصول ، وتم توثيق تلك الاجراءات بنماذج الكايزن وعرض أثر النتائج الاجمالية للتحسينات المنفذة على تخفيض معظم أزمنة الصيانة الذاتية ونشرها لمعظم مشغلى الماكينات"},{level:6,score:20,desc:"تم تنفيذ جميع الإجراءات التصحيحية والمانعة للقضاء علي الأماكن صعبة الوصول والأسلاك والمواسير التي تمثل عقبة في التنظيف، وجميع الاجراءات تم توثيقها بنماذج الكايزن وعرض أثر النتائج الاجمالية للتحسينات لى تخفيض أزمنة الصيانة الذاتية، ونشرها لجميع مشغلى الماكينات"}] },
        { id: 8, title: "تقسيم موضوعات التحسين المطلوبة (PDCA)", maxScore: 10, levels: [{level:1,score:0,desc:"لم يتم تقسيم موضوعات التحسين المطلوبة للقضاء على الظواهر السبع الغير طبيعية"},{level:2,score:2,desc:"تم تقسيم عدد قليل من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية"},{level:3,score:4,desc:"تم تقسيم بعض موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية ، ولا يتم إستخدام أى من منهجيات التحسين المختلفة"},{level:4,score:6,desc:"تم تقسيم كثير من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية ، ويتم إستخدام منهجيات التحسين المختلفة مثل نموذج الـ ( PDCA )"},{level:5,score:8,desc:"تم تقسيم معظم موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية ، ويتم استخدام منهجيات التحسين المختلفة مثل نموذج الـ (PDCA ) مدعم بمنحنى بياني يوضح فعالية منهجيات التحسين"},{level:6,score:10,desc:"تم تقسيم جميع موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية ، ويتم إستخدام منهجيات التحسين المختلفة مثل نموذج الـ (DCA) مدعم بمنحنى بياني يوضح فعالية منهجيات التحسين"}] },
        { id: 9, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الثانيه"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الثانيه"},{level:3,score:2,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثانيه ، ولا يتم نشر النتائج ونقاط القوة وفرص التحسين بالقسم"},{level:4,score:3,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثانيه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين كثير العاملين بالقسم"},{level:5,score:4,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثانيه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لمعظم العاملين بالقسم ، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"},{level:6,score:5,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثانيه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لجميع العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"}] }
    ]},
    "JH-3": { name: "الخطوة الثالثة - معايير التنظيف والتزييت", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوه الثالثة", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي وجود خطة عمل لتنفيذ انشطة الخطوه الثالثه لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثالثه لكل قسم ، ولكن توجد أدلة ضعيفة علي إستخدامها في الواقع"},{level:3,score:2,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثالثه لكل قسم ، وتوجد بعض الأدلة على إستخدامها ، كما أن الخطة غير مثبتة على لوحة أنشطة الـ TPM لكل قسم"},{level:4,score:3,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثالثه لكل قسم وتغطى كثير من أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وكثير من مشغلي الماكينات علي دراية بها"},{level:5,score:4,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثالثه لكل قسم وتغطي معظم أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم ومعظم مشغلي الماكينات بالقسم علي دراية كاملة بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الثالثه للقسم وتغطي كافة أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وجميع مشغلي الماكينات بالقسم على دراية بتفاصيلها"}] },
        { id: 2, title: "مدى تحسن الشروط بعد اتمام خطوة التنظيف المبدئى", maxScore: 5, levels: [{level:1,score:0,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها أقل من 20 %"},{level:2,score:1,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها أقل من 40 %"},{level:3,score:2,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها اقل من 60%"},{level:4,score:3,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها اكثر من 70%"},{level:5,score:4,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها اكثر من 80 %"},{level:6,score:5,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الأولى وشروط اجتيازها بنسبة 100 %"}] },
        { id: 3, title: "الحفاظ على مستوى الخطوة الثانية", maxScore: 5, levels: [{level:1,score:0,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الثانيه وشروط اجتيازها أقل من 20 %"},{level:2,score:1,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الثانيه وشروط اجتيازها أقل من 40 %"},{level:3,score:2,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الثانيه وشروط اجتيازها اقل من 60%"},{level:4,score:3,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الثانيه وشروط اجتيازها اكثر من 70%"},{level:5,score:4,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوة الثانيه وشروط اجتيازها اكثر من 80 %"},{level:6,score:5,desc:"يتم الحفاظ على مستوى تطبيق أنشطة الخطوة الثانيه وشروط اجتيازها بنسبة 100 %"}] },
        { id: 4, title: "معايير التنظيف في خرائط الصيانة الذاتية", maxScore: 15, levels: [{level:1,score:0,desc:"لم يتم تحديد معايير التنظيف في خرائط الصيانة الذاتية"},{level:2,score:3,desc:"تم تحديد عدد قليل من معايير التنظيف ، ولم يتم عمل Foot Map ، ولم يتم استخدام علامات الإدارة المرئية، وأدوات ومواد التنظيف غير متوفرة"},{level:3,score:6,desc:"تم تحديد بعض من معايير التنظيف ، ولم يتم عمل Foot Map ويتم استخدام بعض علامات الإدارة المرئية، وأدوات ومواد التنظيف غير متوفرة"},{level:4,score:9,desc:"تم تحديد كثير من معايير التنظيف ، ولم يتم عمل Foot Map ويتم استخدام بعض علامات الإدارة المرئية، وأدوات ومواد التنظيف متوفرة"},{level:5,score:12,desc:"تم تحديد معظم معايير التنظيف ، وتم عمل Foot Map ويتم استخدام معظم علامات الإدارة المرئية، وأدوات ومواد التنظيف متوفرة بالقرب من موقع العمل"},{level:6,score:15,desc:"تم تحديد جميع معايير التنظيف ، وتم عمل Foot Map ويتم استخدام جميع علامات الإدارة المرئية، وأدوات ومواد التنظيف متوفرة بالقرب من موقع العمل"}] },
        { id: 5, title: "معايير التزييت والتشحيم فى خرائط الصيانة الذاتية", maxScore: 15, levels: [{level:1,score:0,desc:"لم يتم تحديد معايير التزييت والتشحيم فى خرائط الصيانة الذاتية"},{level:2,score:3,desc:"تم تحديد عدد قليل من معايير التزييت والتشحيم ، ولم يتم عمل Foot Map ، ولم يتم استخدام علامات الإدارة المرئية، وأدوات التزييت والتشحيم غير متوفرة"},{level:3,score:6,desc:"تم تحديد بعض من معايير التزييت والتشحيم ، ولم يتم عمل Foot Map ، ويتم استخدام بعض علامات الإدارة المرئية، وأدوات التزييت والتشحيم متوفرة"},{level:4,score:9,desc:"تم تحديد كثير من معايير التزيت والتشحيم ، وتم عمل Foot Map ، ويتم استخدام كثير من علامات الإدارة المرئية، وأدوات ومواد التشحيم والتزيت متوفرة ، وتم التأكد من سلامة ونظافة معدات التزييت والتشحيم ، ولكن لا يوجد وسائل حماية مبتكرة لمنع تلوثها"},{level:5,score:12,desc:"تم تحديد معظم معايير التزيت والتشحيم ، وتم عمل Foot Map ويتم استخدام معظم علامات الإدارة المرئية، وأدوات ومواد التشحيم والتزييت متوفرة بالقرب من موقع العمل، ويتم التأكد من سلامة ونظافة معدات التزييت والتشحيم ، ويوجد وسائل حماية مبتكرة لمنع تلوثها"},{level:6,score:15,desc:"تم تحديد جميع معايير التزيت والتشحيم ، وتم عمل Foot Map ، ويتم استخدام جميع علامات الإدارة المرئية، وأدوات ومواد التشحيم والتزييت متوفرة بالقرب من موقع العمل ، ويتم التأكد من سلامة ونظافة معدات التزييت والتشحيم ، ويوجد وسائل حماية مبتكرة لمنع تلوثها ، ويتم التأكد من وضوح مبينات الزيت والحد الأدنى والأقصى لمستويات الزيوت"}] },
        { id: 6, title: "معايير الفحص في خرائط الصيانة الذاتية", maxScore: 15, levels: [{level:1,score:0,desc:"لم يتم تحديد معايير الفحص في خرائط الصيانة الذاتية"},{level:2,score:3,desc:"تم تحديد عدد قليل من معايير الفحص ، ولم يتم عمل Foot Map ، ولم يتم استخدام علامات الإدارة المرئية، وأدوات الفحص غير متوفرة"},{level:3,score:6,desc:"تم تحديد بعض من معايير الفحص ، ولم يتم عمل Foot Map ويتم استخدام بعض علامات الإدارة المرئية، وأدوات الفحص غير متوفرة"},{level:4,score:9,desc:"تم تحديد كثير من معايير الفحص ، ولم يتم عمل Foot Map ويتم استخدام بعض علامات الإدارة المرئية، وأدوات الفحص متوفرة"},{level:5,score:12,desc:"تم تحديد معظم معايير الفحص ، وتم عمل Foot Map ، ويتم استخدام معظم علامات الإدارة المرئية، وأدوات الفحص متوفرة بالقرب من موقع العمل"},{level:6,score:15,desc:"تم تحديد جميع معايير الفحص ، وتم عمل Foot Map ويتم استخدام جميع علامات الإدارة المرئية، وأدوات الفحص متوفرة بالقرب من موقع العمل"}] },
        { id: 7, title: "معايير التربيط فى خرائط الصيانة الذاتية", maxScore: 15, levels: [{level:1,score:0,desc:"لم يتم تحديد معايير التربيط فى خرائط الصيانة الذاتية"},{level:2,score:3,desc:"تم تحديد عدد قليل من معايير التربيط ، ولم يتم عمل Foot Map ، ولم يتم استخدام علامات الإدارة المرئية، وأدوات التربيط غير متوفرة"},{level:3,score:6,desc:"تم تحديد بعض من معايير التربيط ، ولم يتم عمل Foot Map ، ويتم استخدام بعض علامات الإدارة المرئية، وأدوات التربيط غير متوفرة"},{level:4,score:9,desc:"تم تحديد كثير من معايير التربيط ، ولم يتم عمل Foot Map ، ويتم استخدام بعض علامات الإدارة المرئية، وأدوات التربيط متوفرة"},{level:5,score:12,desc:"تم تحديد معظم معايير التربيط ، وتم عمل Foot Map ، ويتم استخدام معظم علامات الإدارة المرئية، وأدوات التربيط متوفرة بالقرب من موقع العمل"},{level:6,score:15,desc:"تم تحديد جميع معايير التربيط ، وتم عمل Foot Map ، ويتم استخدام جميع علامات الإدارة المرئية، وأدوات التربيط متوفرة بالقرب من موقع العمل"}] },
        { id: 8, title: "تفعيل إستخدام نماذج الفحص الدوري", maxScore: 25, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي قيام مشغلي الماكينات باستخدام نماذج الفحص الدورية"},{level:2,score:5,desc:"توجد أدلة ضعيفة علي قيام مشغلي الماكينات باستخدام نماذج الفحص الدورية لقليل من انشطة الصيانه الذاتيه"},{level:3,score:10,desc:"يقوم بعض المشغلين بالقسم باستخدام نماذج الفحص الدورية بإنتظام وفاعلية وتعكس الحاله الفعليه للماكينه ولا يتم تسجيل الوقت الفعلى للبنود"},{level:4,score:15,desc:"يقوم كثير من المشغلين بالقسم بإستخدام نماذج الفحص الدورية بإنتظام وفاعلية وتعكس الحاله الفعليه للماكينه ويتم تسجيل الوقت الفعلى للبنود"},{level:5,score:20,desc:"يقوم معظم المشغلين بالقسم باستخدام نماذج الفحص الدورية بإنتظام وفاعلية وتعكس الحاله الفعليه للماكينه ويتم تسجيل الوقت الفعلى للبنود ، ويوجد اعتماد المشرف الانتاج والصيانه ومهندس الصيانه على النماذج"},{level:6,score:25,desc:"يقوم جميع المشغلين بالقسم باستخدام نماذج الفحص الدورية بإنتظام وفاعلية وتعكس الحاله الفعليه للماكينه ويتم تسجيل الوقت الفعلى للبنود ، ويوجد اعتماد المشرف الانتاج والصيانه ومهندس الصيانه على النماذج"}] },
        { id: 9, title: "رصد فواقد التسريبات وتحديث الخرائط", maxScore: 10, levels: [{level:1,score:0,desc:"لم يتم تقسيم موضوعات التحسين المطلوبة"},{level:2,score:2,desc:"تم تقسيم عدد قليل من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية"},{level:3,score:4,desc:"تم تقسيم بعض موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية"},{level:4,score:6,desc:"تم تقسيم كثير من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( رصد كثير من فواقد التسريبات واستهلاكات الزيوت والشحوم - موقف تحديث كثير من اصدارات الخرائط )"},{level:5,score:8,desc:"تم تقسيم معظم موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج رصد معظم فواقد التسريبات واستهلاكات الزيوت والشحوم - موقف تحديث معظم اصدارات الخرائط"},{level:6,score:10,desc:"تم تقسيم جميع موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( رصد جميع فواقد التسريبات واستهلاكات الزيوت والشحوم - وموقف تحديث جميع اصدارات الخرائط ) . مع وجود منحنيات توضح الموقف قبل وبعد التطبيق"}] },
        { id: 10, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الثالثة"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الثالثه"},{level:3,score:2,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثالثه ، ولا يتم نشر النتائج ونقاط القوة وفرص التحسين بالقسم"},{level:4,score:3,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثالثه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين كثير العاملين بالقسم"},{level:5,score:4,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثالثه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لمعظم العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"},{level:6,score:5,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الثالثه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لجميع العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"}] }
    ]},
    "JH-4": { name: "الخطوة الرابعة - الفحص العام", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوة الرابعة", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أى دلائل علي وجود خطة عمل لتنفيذ انشطة الخطوه الرابعه لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الرابعه لكل قسم ، ولكن توجد أدلة ضعيفة علي إستخدامها في الواقع"},{level:3,score:2,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الرابعه لكل قسم ، وتوجد بعض الأدلة على إستخدامها ، كما أن الخطة غير مثبتة على لوحة أنشطة الـ TPM لكل قسم"},{level:4,score:3,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الرابعه لكل قسم وتغطي كثير من أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وكثير من مشغلي الماكينات على دراية بها"},{level:5,score:4,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الرابعه لكل قسم وتغطي معظم أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم ومعظم مشغلي الماكينات بالقسم علي دراية كاملة بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الرابعه للقسم وتغطي كافة أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وجميع مشغلي الماكينات بالقسم علي دراية بتفاصيلها"}] },
        { id: 2, title: "الحفاظ على مستوى الخطوات السابقة", maxScore: 5, levels: [{level:1,score:0,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-3 وشروط اجتيازهم أقل من 20 %"},{level:2,score:1,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-3 وشروط اجتيازهم أقل من 40 %"},{level:3,score:2,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-3 وشروط اجتيازهم اقل من 60%"},{level:4,score:3,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-3 وشروط اجتيازهم اكثر من 70%"},{level:5,score:4,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-3 وشروط اجتيازهم اكثر من 80 %"},{level:6,score:5,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-3 وشروط اجتيازهم بنسبة 100 %"}] },
        { id: 3, title: "اعداد مصفوفة المهارات (Skill Matrix)", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد أدلة على انه تم ربط المواد العلمية ب SKILL MATRIX"},{level:2,score:4,desc:"توجد أدلة ضعيفه على ربط المواد العلميه لبعض المهارات الخاصه بفنى و مشرف الصيانة بمشغلى الماكينة"},{level:3,score:8,desc:"يتم الاطلاع علي مصفوفة بعض مهارات فني ومشرف الصيانة و إعداد المهارات المطلوبه لمشغلي الماكينات ، و يتم تنفيذ البرامج التدريبية تدريجيا"},{level:4,score:12,desc:"يتم الإطلاع علي مصفوفة كثير من مهارات فني ومشرف الصيانة و إعداد المهارات المطلوبه لمشغلي الماكينات ، و يتم تنفيذ البرامج التدريبية تدريجيا، ويتم تقسيم زمن البرامج التدريبية بحيث يكون 25% من الزمن تدريب أكاديمي و 75% من الزمن تدريب في موقع العمل بغرفة التدريب"},{level:5,score:16,desc:"يتم الاطلاع على مصفوفة معظم مهارات فني ومشرف الصيانة و إعداد المهارات المطلوبه لمشغلي الماكينات ، و يتم تنفيذ البرامج التدريبية تدريجيا، ويتم تقسيم زمن البرامج التدريبية بحيث يكون 25% من الزمن تدريب أكاديمي و 75% من الزمن تدريب في موقع العمل بغرفة التدريب"},{level:6,score:20,desc:"يتم الاطلاع علي مصفوفة جميع مهارات فني ومشرف الصيانة و إعداد المهارات المطلوبه لمشغلي الماكينات ، و يتم تنفيذ البرامج التدريبية تدريجيا، ويتم تقسيم زمن البرامج التدريبية بحيث يكون 25% من الزمن تدريب أكاديمي و 75% من الزمن تدريب في موقع العمل بغرفة التدريب"}] },
        { id: 4, title: "تعلم مهارات الفحص العام للتزييت والتشحيم", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد اى دلائل على اعداد المواد العلميه للتزييت والتشحيم"},{level:2,score:1,desc:"توجد دلائل ضعيفة على اعداد القليل من المواد العلميه للتزييت والتشحيم"},{level:3,score:2,desc:"تم الانتهاء من اعداد بعض من المواد العلميه للتزييت والتشحيم و بعض من العاملين اتقنوا هذة المهاره"},{level:4,score:3,desc:"تم الانتهاء من اعداد كثير من المواد العلميه للتزييت والتشحيم وكثير من العاملين اتقنوا هذة المهارة وكثير من المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:5,score:4,desc:"تم الانتهاء من اعداد معظم المواد العلميه للتزييت والتشحيم و معظم العاملين اتقنوا هذة المهاره معظم المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:6,score:5,desc:"تم الانتهاء من اعداد جميع المواد العلميه للتزييت والتشحيم و جميع العاملين اتقنوا هذة المهاره وجميع المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"}] },
        { id: 5, title: "تقييم الموقع ( التزييت والتشحيم )", maxScore: 10, levels: [{level:1,score:0,desc:"تم تقييم الموقع ولا توجد دلائل في الواقع على تطبيق المهارات المكتسبة من دورة التزييت والتشحيم على الماكينات و الادوات"},{level:2,score:2,desc:"تم تقييم الموقع وتوجد أدلة ضعيفة على تطبيق المهارات المكتسبة من دورة التزييت والتشحيم على الماكينات و الادوات"},{level:3,score:4,desc:"تم تقييم الموقع وتوجد بعض الأدلة على تطبيق المهارات المكتسبة من دورة التزييت والتشحيم على الماكينات و الادوات"},{level:4,score:6,desc:"تم تقييم الموقع وتوجد الكثير من الأدلة على تطبيق المهارات المكتسبة من دورة التزييت والتشحيم على الماكينات والادوات"},{level:5,score:8,desc:"تم تقييم الموقع وتم التأكد من تطبيق معظم المهارات المكتسبة من دورة التزييت والتشحيم على الماكينات و الادوات"},{level:6,score:10,desc:"اتضح من تقييم الموقع لأنشطة الفحص العام للتزييت والتشحيم انه يتم تطبيق الخرائط ويوجد أعادة تدوير للزيوت ويتم تنميط انواع الزيوت ويتم المحافظه عليها من التلوث ويلتزم المكان الذي يصرف منه الزيت بالنوع ولا توجد اتربة ملتصقة على عبوات الزيوت"}] },
        { id: 6, title: "تعلم مهارات الفحص العام وسائل نقل الحركة", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد اى دلائل على اعداد المواد العلميه لوسائل نقل الحركه"},{level:2,score:1,desc:"توجد دلائل ضعيفة على اعداد القليل من المواد العلميه لوسائل نقل الحركه"},{level:3,score:2,desc:"تم الانتهاء من اعداد بعض من المواد العلميه لوسائل نقل الحركه و بعض من العاملين اتقنوا هذة المهاره"},{level:4,score:3,desc:"تم الانتهاء من اعداد كثير من المواد العلمية لوسائل نقل الحركه وكثير من العاملين اتقنوا هذه المهارة وكثير من المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة لحل المشكلة"},{level:5,score:4,desc:"تم الانتهاء من اعداد معظم المواد العلميه لوسائل نقل الحركه و معظم العاملين اتقنوا هذة المهاره معظم المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:6,score:5,desc:"تم الانتهاء من اعداد جميع المواد العلميه لوسائل نقل الحركه و جميع العاملين اتقنوا هذة المهاره وجميع المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"}] },
        { id: 7, title: "تقييم الموقع ( وسائل نقل الحركة Drives )", maxScore: 10, levels: [{level:1,score:0,desc:"تم تقييم الموقع ولا توجد دلائل في الواقع على تطبيق المهارات المكتسبة من دورة وسائل نقل الحركة على الماكينات و الادوات"},{level:2,score:2,desc:"تم تقييم الموقع وتوجد أدلة ضعيفة على تطبيق المهارات المكتسبة من دورة وسائل نقل الحركة على الماكينات و الادوات"},{level:3,score:4,desc:"تم تقييم الموقع وتوجد بعض الأدلة على تطبيق المهارات المكتسبة من دورة وسائل نقل الحركة على الماكينات و الادوات"},{level:4,score:6,desc:"تم تقييم الموقع وتوجد الكثير من الأدلة على تطبيق المهارات المكتسبة من دورة وسائل نقل الحركة على الماكينات والادوات"},{level:5,score:8,desc:"تم تقييم الموقع وتم التأكد من تطبيق معظم المهارات المكتسبة من دورة وسائل نقل الحركة على الماكينات و الادوات"},{level:6,score:10,desc:"اتضح من تقييم الموقع لأنشطة الفحص العام لوسائل نقل الحركة انه يتم تطبيق الخرائط وفحص جميع وسائل نقل الحركه وفحص كل من ( الاستقامه والاستطاله والحاله ودرجة الحراره الاهتزاز والضوضاء وسهوله الفحص بصريا )"}] },
        { id: 8, title: "تعلم مهارات الفحص العام هيدروليك و نيوماتيك", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد اى دلائل على اعداد المواد العلميه للهيدروليك والنيوماتيك"},{level:2,score:1,desc:"توجد دلائل ضعيفة على اعداد القليل من المواد العلميه للهيدروليك والنيوماتيك"},{level:3,score:2,desc:"تم الانتهاء من اعداد بعض من المواد العلميه للهيدروليك والنيوماتيك و بعض من العاملين اتقنوا هذه المهاره"},{level:4,score:3,desc:"تم الانتهاء من اعداد كثير من المواد العلميه للهيدروليك والنيوماتيك وكثير من العاملين اتقنوا هذة المهارة وكثير من المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:5,score:4,desc:"تم الانتهاء من اعداد معظم المواد العلميه للهيدروليك والنيوماتيك و معظم العاملين اتقنوا هذة المهاره معظم المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:6,score:5,desc:"تم الانتهاء من اعداد جميع المواد العلميه للهيدروليك والنيوماتيك و جميع العاملين اتقنوا هذة المهاره وجميع المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"}] },
        { id: 9, title: "تقييم الموقع ( هيدروليك ونيوماتيك )", maxScore: 10, levels: [{level:1,score:0,desc:"تم تقييم الموقع ولا توجد دلائل في الواقع على تطبيق المهارات المكتسبة من دورة الهيدروليك والنيوماتيك على الماكينات و الادوات"},{level:2,score:2,desc:"تم تقييم الموقع وتوجد أدلة ضعيفة على تطبيق المهارات المكتسبة من دورة الهيدروليك والنيوماتيك على الماكينات و الادوات"},{level:3,score:4,desc:"تم تقييم الموقع وتوجد بعض الأدلة على تطبيق المهارات المكتسبة من دورة الهيدروليك والنيوماتيك على الماكينات و الادوات"},{level:4,score:6,desc:"تم تقييم الموقع وتوجد الكثير من الأدلة على تطبيق المهارات المكتسبة من دورة الهيدروليك والنيوماتيك على الماكينات والادوات"},{level:5,score:8,desc:"تم تقييم الموقع وتم التأكد من تطبيق معظم المهارات المكتسبة من دورة الهيدروليك والنيوماتيك على الماكينات و الادوات"},{level:6,score:10,desc:"اتضح من تقييم الموقع لأنشطة الفحص العام للهيدروليك والنيوماتيك انه يتم تطبيق الخرائط وفحص جميع معدات الهيدروليك والنيوماتيك كل من ( التسريبات - الضوضاء - الاهتزازات - الحاله - الروائح - الفلاتر - سهوله الفحص وقراءة الضغوط )"}] },
        { id: 10, title: "تعلم المهارات الفحص العام أساسيات الكهرباء", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد اى دلائل على اعداد المواد العلمية الخاصه بالكهرباء"},{level:2,score:1,desc:"توجد دلائل ضعيفة على اعداد القليل من المواد العلميه الخاصه بالكهرباء"},{level:3,score:2,desc:"تم الانتهاء من اعداد بعض من المواد العلميه الخاصه بالكهرباء و بعض من العاملين اتقنوا هذه المهاره"},{level:4,score:3,desc:"تم الانتهاء من اعداد كثير من المواد العلمية الخاصه بالكهرباء وكثير من العاملين اتقنوا هذه المهارة وكثير من المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:5,score:4,desc:"تم الانتهاء من اعداد معظم المواد العلميه الخاصه بالكهرباء ومعظم العاملين اتقنوا هذة المهاره معظم المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:6,score:5,desc:"تم الانتهاء من اعداد جميع المواد العلميه الخاصه بالكهرباء و جميع العاملين اتقنوا هذة المهاره وجميع المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"}] },
        { id: 11, title: "تقييم الموقع ( كهرباء )", maxScore: 10, levels: [{level:1,score:0,desc:"تم تقييم الموقع ولا توجد دلائل في الواقع على تطبيق المهارات المكتسبة من دورة أساسيات الكهرباء على الماكينات و الادوات"},{level:2,score:2,desc:"تم تقييم الموقع وتوجد أدلة ضعيفة على تطبيق المهارات المكتسبة من دورة أساسيات الكهرباء على الماكينات و الادوات"},{level:3,score:4,desc:"تم تقييم الموقع وتوجد بعض الأدلة على تطبيق المهارات المكتسبة من دورة أساسيات الكهرباء على الماكينات و الادوات"},{level:4,score:6,desc:"تم تقييم الموقع وتوجد الكثير من الأدلة على تطبيق المهارات المكتسبة من دورة أساسيات الكهرباء على الماكينات والادوات"},{level:5,score:8,desc:"تم تقييم الموقع وتم التأكد من تطبيق معظم المهارات المكتسبة من دورة أساسيات الكهرباء على الماكينات و الادوات"},{level:6,score:10,desc:"اتضح من تقييم الموقع الفحص العام الأساسيات الكهرباء انه يتم تطبيق الخرائط التنظيف وفحص جميع المعدات الكهربائيه ( التوزيع الكهربي و التحكم - درجات الحرارة - حاله الحساسات وحامل الاسلاك )"}] },
        { id: 12, title: "تعلم المهارات الفحص العام المسامير والصواميل", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد اى دلائل على اعداد المواد العلميه للمسامير والصواميل"},{level:2,score:1,desc:"توجد دلائل ضعيفة على اعداد القليل من المواد العلميه للمسامير والصواميل"},{level:3,score:2,desc:"تم الانتهاء من اعداد بعض من المواد العلميه للمسامير والصواميل و بعض من العاملين اتقنوا هذه المهاره"},{level:4,score:3,desc:"تم الانتهاء من أعداد كثير من المواد العلميه للمسامير والصواميل وكثير من العاملين اتقنوا هذه المهارة وكثير من المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة لحل المشكلة"},{level:5,score:4,desc:"تم الانتهاء من اعداد معظم المواد العلميه للمسامير والصواميل و معظم العاملين اتقنوا هذة المهاره معظم المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"},{level:6,score:5,desc:"تم الانتهاء من اعداد جميع المواد العلميه الخاصه بالمسامير والصواميل و جميع العاملين اتقنوا هذة المهاره وجميع المشغلين يمكنهم التعرف على أماكن تواجد المشكلة من خلال الفحص ويتم اتخاذ الاجراءات المانعة اللازمة لحل المشكلة"}] },
        { id: 13, title: "تقييم الموقع ( المسامير والصواميل )", maxScore: 10, levels: [{level:1,score:0,desc:"تم تقييم الموقع ولا توجد دلائل في الواقع على تطبيق المهارات المكتسبة من دورة المسامير والصواميل على الماكينات و الادوات"},{level:2,score:2,desc:"تم تقييم الموقع وتوجد أدلة ضعيفة على تطبيق المهارات المكتسبة من دورة المسامير والصواميل على الماكينات و الادوات"},{level:3,score:4,desc:"تم تقييم الموقع وتوجد بعض الأدلة على تطبيق المهارات المكتسبة من دورة المسامير والصواميل على الماكينات و الادوات"},{level:4,score:6,desc:"تم تقييم الموقع وتوجد الكثير من الأدلة على تطبيق المهارات المكتسبة من دورة المسامير والصواميل على الماكينات والادوات"},{level:5,score:8,desc:"تم تقييم الموقع وتم التأكد من تطبيق معظم المهارات المكتسبة من دورة المسامير والصواميل على الماكينات و الادوات"},{level:6,score:10,desc:"اتضح من تقييم الموقع الفحص العام للمسامير والصواميل انه يتم تطبيق خرائط التربيط والفحص ( والتحقق من أن أطوال المسامير المستخدمة - مناسب الحاله - سهوله الفحص والاهتزاز )"}] },
        { id: 14, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الرابعه"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الرابعه"},{level:3,score:2,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الرابعه ، ولا يتم نشر النتائج ونقاط القوة وفرص التحسين بالقسم"},{level:4,score:3,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الرابعه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين كثير العاملين بالقسم"},{level:5,score:4,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الرابعه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لمعظم العاملين بالقسم ، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"},{level:6,score:5,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الرابعه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لجميع العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"}] }
    ]},
    "JH-5": { name: "الخطوة الخامسة - الفحص الذاتي", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوة الخامسة", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أي دلائل علي وجود خطة عمل لتنفيذ انشطة الخطوه الخامسه لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الخامسه لكل قسم ، ولكن توجد أدلة ضعيفة علي استخدامها في الواقع"},{level:3,score:2,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الخامسه لكل قسم ، وتوجد بعض الأدلة على إستخدامها ، كما أن الخطة غير مثبتة على لوحة أنشطة الـ TPM لكل قسم"},{level:4,score:3,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الخامسه لكل قسم وتغطي كثير من أنشطة الخطوة ، والخطة متاحة ومعتمدة و مثبتة علي لوحة أنشطة الـ TPM لكل قسم وكثير من مشغلي الماكينات على دراية بها"},{level:5,score:4,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الخامسة لكل قسم وتغطي معظم أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم ومعظم مشغلي الماكينات بالقسم علي دراية كاملة بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه الخامسه للقسم وتغطي كافة أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وجميع مشغلي الماكينات بالقسم علي دراية بتفاصيلها"}] },
        { id: 2, title: "الحفاظ على مستوى الخطوات من 1-4 والإجراءات", maxScore: 10, levels: [{level:1,score:0,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-4 وشروط اجتيازهم أقل من 20 %"},{level:2,score:2,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-4 وشروط اجتيازهم أقل من 40 %"},{level:3,score:4,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-4 وشروط اجتيازهم اقل من 60%"},{level:4,score:6,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-4 وشروط اجتيازهم اكثر من 70%"},{level:5,score:8,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-4 وشروط اجتيازهم اكثر من 80 %"},{level:6,score:10,desc:"يتم الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-4 وشروط اجتيازهم بنسبة 100 % ، وتم تطبيق الإجراءات المانعة لتوليد المصادر وتحسنت مستويات الفحص"}] },
        { id: 3, title: "عدم اغفال بنود الفحص الضرورية التي ينتج عنها اعطال", maxScore: 25, levels: [{level:1,score:0,desc:"لا توجد دلائل على تحديد معايير الفحص وتحديث الخرائط لتفادي اغفال البنود"},{level:2,score:5,desc:"تم تحديد عدد قليل من معايير الفحص ، كما أنه تم تحديث القليل من الخرائط"},{level:3,score:10,desc:"تم تحديد بعض معايير الفحص كما أنه تم تحديث بعض الخرائط ، وإعادة إصدارها بحيث لا يتم اغفال اى من بنود الفحص الضروريه ، مشاركة الصيانه ويتم استخدام بعض علامات الإدارة المرئية"},{level:4,score:15,desc:"تم تحديد كثير من معايير الفحص ، كما أنه تم تحديث كثير من الخرائط ، وإعادة إصدارها بحيث لا يتم اغفال اى من بنود الفحص الضروريه ، بمشاركة الصيانه ، ويتم استخدام كثير من علامات الإدارة المرئية"},{level:5,score:20,desc:"تم تحديد معظم معايير الفحص ، كما أنه تم تحديث معظم الخرائط ، وإعادة إصدارها بحيث لا يتم اغفال اى من بنود الفحص الضروريه ، بمشاركة الصيانه، ويتم استخدام معظم علامات الإدارة المرئية، وأدوات الفحص متوفرة بالقرب من موقع العمل"},{level:6,score:25,desc:"تم تحديد جميع معايير الفحص ، كما أنه تم تحديث جميع الخرائط ، وإعادة إصدارها بحيث لا يتم اغفال اى من بنود الفحص الضروريه ، بمشاركة الصيانه ويتم استخدام جميع علامات الإدارة المرئية، وأدوات الفحص متوفرة بالقرب من موقع العمل"}] },
        { id: 4, title: "سهولة الفحص وتقسيم البنود", maxScore: 20, levels: [{level:1,score:0,desc:"لم يتم تحديث Foot Map ، ولم يتم تقسيم البنود لتسهيل الفحص"},{level:2,score:4,desc:"تم تحديث Foot Map وتقسيم قليل من البنود لجعل التنفيذ سهل ، ويتم استخدام قليل من علامات الإدارة المرئية لسهوله الفحص"},{level:3,score:8,desc:"تم تحديث Foot Map وتقسيم بعض من البنود لجعل التنفيذ سهل ، ويتم استخدام بعض علامات الإدارة المرئية لسهوله الفحص ، وأدوات الفحص متوفرة بالقرب من موقع العمل"},{level:4,score:12,desc:"تم تحديث Foot Map وتقسيم كثير من البنود لجعل التنفيذ سهل ، ويقوم كثير من المشغلين بالوصول الى الوقت المعياري المحدد في الخرائط ويتم تمييز كثير من البنود الجديده والبنود التي تم نقلها من الصيانه واظهارها فى نموذج رصد المشكلات"},{level:5,score:16,desc:"تم تحديث Foot Map وتقسيم معظم البنود لجعل التنفيذ سهل ، ويقوم معظم المشغلين بالوصول الى الوقت المعياري المحدد في الخرائط ويتم تمييز معظم البنود الجديده والبنود التي تم نقلها من الصيانه واظهارها فى نموذج رصد المشكلات"},{level:6,score:20,desc:"تم تحديث Foot Map وتقسيم جميع البنود لجعل التنفيذ سهل ، ويقوم جميع المشغلين بالوصول الى الوقت المعياري المحدد في الخرائط ويتم تمييز جميع البنود الجديده والبنود التى تم نقلها من الصيانه واظهارها فى نموذج رصد المشكلات"}] },
        { id: 5, title: "الفحص الذاتي عناصر متعلقة بالجودة", maxScore: 20, levels: [{level:1,score:0,desc:"لا يوجد دليل على انه تم ادراج الفحص مع الجودة ولا يتم متابعة ومراجعة معدات الوزن والقياس والكشف والوقاية من سوء التشغيل"},{level:2,score:4,desc:"توجد أدلة ضعيفة على انه تم ادراج الفحص مع الجودة ويتم متابعة ومراجعة بعض من معدات التحقق من العمليات"},{level:3,score:8,desc:"تم ادراج الفحص مع الجودة ويتم متابعة ومراجعة معدات الوزن والقياس والكشف والوقاية من سوء التشغيل ويتم تنفيذ فحص لدقة بعض من المعدات والادوات المستخدمة في العمليات وتم مقارنة بعض من نتائج الفحص بالمعايير"},{level:4,score:12,desc:"تم ادراج الفحص مع الجودة ويتم متابعة ومراجعة معدات الوزن والقياس والكشف والوقاية من سوء التشغيل ويتم تنفيذ فحص لدقة كثير من المعدات والادوات المستخدمة في مقارنة كثير من نتائج الفحص بالمعايير الخاصة بالمعدات وتم توثيق نتائج الفحص"},{level:5,score:16,desc:"تم ادراج الفحص مع الجودة ويتم متابعة ومراجعة معدات الوزن والقياس والكشف والوقاية من سوء التشغيل ويتم تنفيذ فحص لدقة معظم المعدات والادوات المستخدمة في مقارنة معظم نتائج الفحص بالمعايير الخاصة بالمعدات وتم توثيق نتائج الفحص"},{level:6,score:20,desc:"تم ادراج الفحص مع الجودة ويتم متابعة ومراجعة معدات الوزن والقياس والكشف والوقاية من سوء التشغيل ويتم تنفيذ فحص لدقة جميع المعدات والادوات المستخدمة في مقارنة جميع نتائج الفحص بالمعايير الخاصة بالمعدات وتم توثيق نتائج الفحص"}] },
        { id: 6, title: "رفع مستوى مهارات الفحص", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد أي دلائل علي وجود خطة عمل للتدريب والتعليم لرفع مهارات الفحص لدى المشغلين"},{level:2,score:4,desc:"توجد دلائل ضعيفة علي وجود خطة عمل للتدريب والتعليم لرفع مهارات الفحص لدى المشغلين"},{level:3,score:8,desc:"توجد خطة عمل للتدريب والتعليم لرفع مهارات الفحص لدى بعض من المشغلين تغطي بعض من أنشطة الفحص الذاتي"},{level:4,score:12,desc:"توجد خطة عمل للتدريب والتعليم لرفع مهارات الفحص لدى كثير من المشغلين تغطي كثير من أنشطة الفحص الذاتي"},{level:5,score:16,desc:"توجد خطة عمل للتدريب والتعليم لرفع مهارات الفحص لدى معظم المشغلين تغطي معظم أنشطة الفحص الذاتي"},{level:6,score:20,desc:"توجد خطة عمل للتدريب والتعليم لرفع مهارات الفحص لدى جميع المشغلين تغطي جميع أنشطة الفحص الذاتي"}] },
        { id: 7, title: "موضوعات التحسين وتحديث الفواقد", maxScore: 10, levels: [{level:1,score:0,desc:"لم يتم تقسيم موضوعات التحسين المطلوبة"},{level:2,score:2,desc:"تم تقسيم عدد قليل من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية"},{level:3,score:4,desc:"تم تقسيم بعض موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية"},{level:4,score:6,desc:"تم تقسيم كثير من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( رصد كثير من فواقد التسريبات واستهلاكات الزيوت والشحوم - موقف تحديث كثير من اصدارات الخرائط )"},{level:5,score:8,desc:"تم تقسيم معظم موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( رصد معظم فواقد التسريبات واستهلاكات الزيوت والشحوم - موقف تحديث معظم اصدارات الخرائط )"},{level:6,score:10,desc:"تم تقسيم جميع موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( رصد جميع فواقد التسريبات واستهلاكات الزيوت والشحوم - وموقف تحديث جميع اصدارات الخرائط ) . مع وجود منحنيات توضح الموقف قبل وبعد التطبيق"}] },
        { id: 8, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الخامسه"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة الخامسه"},{level:3,score:2,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الخامسه ، ولا يتم نشر النتائج ونقاط القوة وفرص التحسين بالقسم"},{level:4,score:3,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الخامسه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين كثير العاملين بالقسم"},{level:5,score:4,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الخامسه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لمعظم العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"},{level:6,score:5,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة الخامسه ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لجميع العاملين بالقسم، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"}] }
    ]},
    "JH-6": { name: "الخطوة السادسة - التنظيم والترتيب (Standardization)", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوه السادسة", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد أي دلائل علي وجود خطة عمل لتنفيذ انشطة الخطوه السادسة لكل قسم"},{level:2,score:1,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه السادسة لكل قسم ، ولكن توجد أدلة ضعيفة علي إستخدامها في الواقع"},{level:3,score:2,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه السادسة لكل قسم ، وتوجد بعض الأدلة علي إستخدامها ، كما أن الخطة غير مثبتة علي لوحة أنشطة الـ TPM لكل قسم"},{level:4,score:3,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه السادسة لكل قسم وتغطي كثير من أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وكثير من مشغلي الماكينات علي دراية بها"},{level:5,score:4,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه السادسة لكل قسم وتغطي معظم أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم ومعظم مشغلي الماكينات بالقسم علي دراية كاملة بكافة تفاصيلها"},{level:6,score:5,desc:"توجد خطة عمل لتنفيذ انشطة الخطوه السادسة للقسم وتغطي كافة أنشطة الخطوة ، والخطة متاحة ومعتمدة ومثبتة علي لوحة أنشطة الـ TPM لكل قسم وجميع مشغلي الماكينات بالقسم علي دراية بتفاصيلها"}] },
        { id: 2, title: "الحفاظ على مستوى الخطوات السابقة (1-5)", maxScore: 10, levels: [{level:1,score:0,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-5 وشروط اجتيازهم أقل من 20 %"},{level:2,score:2,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-5 وشروط اجتيازهم أقل من 40 %"},{level:3,score:4,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-5 وشروط اجتيازهم اقل من 60%"},{level:4,score:6,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-5 وشروط اجتيازهم اكثر من 70%"},{level:5,score:8,desc:"نسبة الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-5 وشروط اجتيازهم اكثر من 80 %"},{level:6,score:10,desc:"يتم الحفاظ على مستوى تطبيق أنشطة الخطوات من 1-5 وشروط اجتيازهم بنسبة 100 % و اتخاذ تحسينات وإجراءات على البنود المذكورة سلفاً"}] },
        { id: 3, title: "استخدام نماذج الفحص بشكل ثابت ودمج الجودة", maxScore: 40, levels: [{level:1,score:0,desc:"لا توجد دلائل على استخدام نماذج الفحص ، ولم يتم دمج عناصر مراقبة الجودة في بنود الفحص"},{level:2,score:8,desc:"توجد أدلة ضعيفة على استخدام نماذج الفحص ، ولم تتم أعمال الفحص بشكل ثابت"},{level:3,score:16,desc:"توجد بعض الأدلة على استخدام نماذج الفحص ، و تجري أعمال الفحص بشكل ثابت ولم يتم دمج عناصر مراقبة الجودة في بنود الفحص، ولم يؤدي ذلك إلى تقليل العيوب"},{level:4,score:24,desc:"يتم استخدام كثير من نماذج الفحص بشكل ثابت وكثير من عناصر مراقبة الجودة مدمجة في بنود الفحص مما أدي إلى تقليل العيوب وتتم معالجة مشاكل المعدات بسرعة وبشكل موثوق و تم تنفيذ الإدارة المرئية بدقة"},{level:5,score:32,desc:"يتم استخدام معظم نماذج الفحص بشكل ثابت و معظم عناصر مراقبة الجودة مدمجة في بنود الفحص مما أدي إلى تقليل العيوب وتتم معالجة مشاكل المعدات بسرعة وبشكل موثوق و تم تنفيذ الإدارة المرئية بدقة ، ومعظم المشغلين يمكنهم إكتشاف ما إذا كانت هناك مشكلة ما و يتم تقليل عدد بنود الفحص"},{level:6,score:40,desc:"يتم استخدام جميع نماذج الفحص بشكل ثابت و جميع عناصر مراقبة الجودة مدمجة في بنود الفحص مما أدي إلى تقليل العيوب وتتم معالجة مشاكل المعدات بسرعة وبشكل موثوق و تم تنفيذ الإدارة المرئية بدقة ، وجميع المشغلين يمكنهم إكتشاف ما إذا كانت هناك مشكلة ما و يتم تقليل عدد بنود الفحص ، ويوجد تقدم ملموس نتيجة ادخال الصيانة التنبؤية وتم وضع معايير للفحص الروتيني"}] },
        { id: 4, title: "ترتيب وتنظيم مواقع التخزين بدقة", maxScore: 25, levels: [{level:1,score:0,desc:"لم يتم تحديد البنود التفصيلية لأنشطة ترتيب وتنظيم الأشياء في مكان العمل"},{level:2,score:5,desc:"تم تحديد عدد قليل من البنود التفصيلية لأنشطة ترتيب و تنظيم الأشياء في مكان العمل"},{level:3,score:10,desc:"تم تحديد بعض من البنود التفصيلية لأنشطة ترتيب و تنظيم الأشياء في مكان العمل"},{level:4,score:15,desc:"تم تحديد كثير من البنود التفصيلية لأنشطة ترتيب و تنظيم الأشياء في مكان العمل"},{level:5,score:20,desc:"تم تحديد معظم البنود التفصيلية لأنشطة ترتيب و تنظيم الأشياء في مكان العمل"},{level:6,score:25,desc:"تم تحديد جميع البنود التفصيلية لأنشطة ترتيب و تنظيم الأشياء في مكان العمل (توضيح مواقع التخزين وكميات المواد الخام والمنتجات والأدوات)"}] },
        { id: 5, title: "تقييم المعايير وإجراءات العمل", maxScore: 20, levels: [{level:1,score:0,desc:"لا يوجد دليل على أنه يتم اعادة تقييم المعايير وترتيبها بشكل صحيح ولم يتم تحديد اجراءات ومتطلبات العمل بشكل صحيح"},{level:2,score:4,desc:"توجد أدلة ضعيفة على أنه يتم اعادة تقييم المعايير وترتيبها بشكل صحيح ولم يتم تحديد اجراءات ومتطلبات العمل بشكل صحيح"},{level:3,score:8,desc:"يتم إعادة تقييم بعض من المعايير وترتيبها بشكل صحيح ويتم انشاء بعض من إجراءات ومتطلبات العمل بشكل سليم"},{level:4,score:12,desc:"يتم إعادة تقييم كثير من المعايير وترتيبها بشكل صحيح ويتم انشاء كثير من إجراءات ومتطلبات العمل بشكل سليم و يتم إجراء التعليم والتدريب للبنود ذات الأولوية المتعلقة بإجراءات التشغيل وجودته وتقييم المهارات"},{level:5,score:16,desc:"يتم إعادة تقييم معظم المعايير وترتيبها بشكل صحيح ويتم انشاء معظم إجراءات ومتطلبات العمل بشكل سليم ويتم إجراء التعليم والتدريب للبنود ذات الأولوية المتعلقة بإجراءات التشغيل وجودته وتقييم المهارات وتوجد منهجية واضحة للتعامل مع المشاكل"},{level:6,score:20,desc:"يتم إعادة تقييم جميع المعايير وترتيبها بشكل صحيح ويتم انشاء جميع إجراءات ومتطلبات العمل بشكل سليم و يتم إجراء التعليم والتدريب للبنود ذات الأولوية المتعلقة بإجراءات التشغيل وجودته وتقييم المهارات وتوجد منهجية واضحة للتعامل مع المشاكل"}] },
        { id: 6, title: "أنشطة المجموعة وتطبيق 5S", maxScore: 10, levels: [{level:1,score:0,desc:"لم يتم تقسيم موضوعات التحسين المطلوبة لتنفيذ 5S وأنشطة المجموعة"},{level:2,score:2,desc:"تم تقسيم عدد قليل من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية والـ 5S"},{level:3,score:4,desc:"تم تقسيم بعض موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية والـ 5S"},{level:4,score:6,desc:"تم تقسيم كثير من موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( تقليل المشكلات، تنفيذ جميع المعايير وتطبيق ال 5S )"},{level:5,score:8,desc:"تم تقسيم معظم موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( تقليل المشكلات, تنفيذ جميع المعايير وتطبيق ال 5S )"},{level:6,score:10,desc:"تم تقسيم جميع موضوعات التحسين المطلوبة لتنفيذ أنشطة الصيانة الذاتية من خلال نماذج ( تقليل المشكلات تنفيذ جميع المعايير وتطبيق ال 5S . مع وجود منحنيات توضح الموقف قبل وبعد التطبيق"}] },
        { id: 7, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة السادسة"},{level:2,score:1,desc:"توجد أدلة ضعيفة علي تنفيذ المراجعة الذاتية علي أنشطة الخطوة السادسة"},{level:3,score:2,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة السادسة ، ولا يتم نشر النتائج ونقاط القوة وفرص التحسين بالقسم"},{level:4,score:3,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة السادسة ، ويتم نشر النتائج ونقاط القوة وفرص التحسين كثير العاملين بالقسم"},{level:5,score:4,desc:"يتم تنفيذ المراجعة الداخلية الدورية علي أنشطة الخطوة السادسة ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لمعظم العاملين بالقسم ، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"},{level:6,score:5,desc:"يتم تنفيذ المراجعة الداخلية الدورية على أنشطة الخطوة السادسة ، ويتم نشر النتائج ونقاط القوة وفرص التحسين لجميع العاملين بالقسم ، ويوجد خطة عمل تصحيحية لتغطية ملاحظات المراجعة"}] }
    ]}
};

// ==========================================
// APP LOGIC & DASHBOARD
// ==========================================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(id === 'homeScreen') document.querySelectorAll('.nav-item')[0].classList.add('active');
    else if(id === 'setupScreen') document.querySelectorAll('.nav-item')[1].classList.add('active');
    else if(id === 'tasksScreen') document.querySelectorAll('.nav-item')[2].classList.add('active');
    else if(id === 'historyScreen' || id === 'detailedReportScreen') document.querySelectorAll('.nav-item')[3].classList.add('active');
    else if(id === 'kaizenScreen') document.querySelectorAll('.nav-item')[4].classList.add('active');
    else if(id === 'tagsScreen') document.querySelectorAll('.nav-item')[5].classList.add('active');
    else if(id === 'settingsScreen') document.querySelectorAll('.nav-item')[6].classList.add('active');
    window.scrollTo(0,0);
}
function updateDeptDropdown() {
    const opts = departments.map(d => `<option value="${d}">${d}</option>`).join('');
    if(document.getElementById('selectDept')) document.getElementById('selectDept').innerHTML = opts;
    if(document.getElementById('dashDeptSelect')) document.getElementById('dashDeptSelect').innerHTML = opts;
    if(document.getElementById('newTaskDept')) document.getElementById('newTaskDept').innerHTML = opts;
    if(document.getElementById('newTagDept')) document.getElementById('newTagDept').innerHTML = opts; 
    
    const strictOpts = departments.map(d => `<option value="${d}">${d}</option>`).join('');
    if(document.getElementById('newKaizenDept')) document.getElementById('newKaizenDept').innerHTML = strictOpts;
    if(document.getElementById('qrDeptSelect')) document.getElementById('qrDeptSelect').innerHTML = strictOpts;
}

function updateDeptListUI_legacy() {
    if(!document.getElementById('deptListContainer')) return;
    document.getElementById('deptListContainer').innerHTML = departments.map((d, i) => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid var(--border);">
            <span>${d}</span><button class="btn btn-danger btn-sm" onclick="delDept(${i})">حذف</button>
        </div>`).join('');
}

function addDept() {
    const val = document.getElementById('newDeptInput').value.trim();
    if(val && !departments.includes(val)) { 
        departments.push(val); updateDeptDropdown(); updateDeptListUI();
        logAction(`إضافة قسم: ${val}`); syncToServer(); document.getElementById('newDeptInput').value = ''; 
    }
}

function delDept_legacy(i) {
    if(departments.length > 1 && confirm('حذف القسم؟')) { 
        logAction(`حذف قسم: ${departments[i]}`); departments.splice(i, 1); 
        updateDeptDropdown(); updateDeptListUI(); syncToServer(); 
    }
}

function updateUsersLeaderboard() {
    const c = document.getElementById('usersLeaderboardContainer'); if(!c) return;
    let sortable = [];
    for (let user in userPoints) { sortable.push({ user: user, points: userPoints[user] }); }
    sortable.sort((a, b) => b.points - a.points);
    
    c.innerHTML = sortable.length === 0 ? '<div style="color:gray; font-size:12px;">لا يوجد نقاط مسجلة حتى الآن</div>' : sortable.slice(0, 5).map((item, index) => {
        let medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : '🏅'));
        return `<div style="display:flex; justify-content:space-between; align-items:center; background:var(--light-gray); padding:8px 15px; border-radius:8px; border:1px solid var(--border);">
            <div><span style="font-size:18px; margin-right:8px;">${medal}</span> <b style="color:var(--primary-dark);">${item.user}</b></div>
            <div style="font-weight:bold; color:var(--success);">${item.points} نقطة</div>
        </div>`;
    }).join('');
}

// 1. تحديث لوحة المصنع الرئيسية
function updateHomeDashboard() {
    let totalScore = 0, auditCount = 0;
    let totalOpen = tagsData.filter(t => t.status === 'open').length;
    let totalClosed = tagsData.filter(t => t.status === 'closed').length;
    
    let deptScores = [];
    let deptLabels = [];
    let bestDept = { name: 'لا يوجد', score: -1, openTags: 999 };

    departments.forEach(d => {
        let dAudits = historyData.filter(h => h.dept === d);
        let latestPct = 0;
        if(dAudits.length > 0) {
            latestPct = dAudits[dAudits.length - 1].totalPct;
            totalScore += latestPct; auditCount++;
        }
        deptLabels.push(d);
        deptScores.push(latestPct);

        let dOpenTags = tagsData.filter(t => t.dept === d && t.status === 'open').length;
        
        let calcScore = latestPct - (dOpenTags * 2);
        if(calcScore > bestDept.score && dAudits.length > 0) {
            bestDept = { name: d, score: calcScore, actualPct: latestPct, openTags: dOpenTags };
        }
    });

    document.getElementById('homeAvgScore').innerText = auditCount > 0 ? Math.round(totalScore/auditCount) + '%' : '0%';
    document.getElementById('homeOpenTags').innerText = totalOpen;
    document.getElementById('homeClosedTags').innerText = totalClosed;

    if(bestDept.score !== -1) {
        document.getElementById('homeBestDept').innerText = bestDept.name;
        document.getElementById('homeBestReason').innerText = `بتقييم ${bestDept.actualPct}% و (${bestDept.openTags}) تاجات مفتوحة فقط.`;
    } else {
        document.getElementById('homeBestDept').innerText = "لا توجد تقييمات";
        document.getElementById('homeBestReason').innerText = "";
    }

    if (typeof Chart !== 'undefined') {
        const ctxBar = document.getElementById('factoryBarChart');
        if(ctxBar) {
            if(factoryBarChartInstance) factoryBarChartInstance.destroy();
            const isDark = document.body.classList.contains('dark-mode');
            const textColor = isDark ? '#e0e0e0' : '#666';
            
            factoryBarChartInstance = new Chart(ctxBar.getContext('2d'), {
                type: 'bar',
                data: { labels: deptLabels, datasets: [{ label: 'آخر تقييم %', data: deptScores, backgroundColor: '#1565C0', borderRadius: 4 }] },
                options: { scales: { y: { min: 0, max: 100, ticks: { color: textColor } }, x: { ticks: { color: textColor } } }, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }
    }

    let gridHtml = departments.map(d => {
       let dAudits = historyData.filter(h => h.dept === d && !(h.stepsOrder && h.stepsOrder.includes('ManualKaizen')));
        let sc = dAudits.length > 0 ? dAudits[dAudits.length - 1].totalPct : 0;
        let col = sc >= 80 ? 'var(--success)' : (sc >= 50 ? 'var(--warning)' : 'var(--danger)');
        let tagsNum = tagsData.filter(t => t.dept === d && t.status === 'open').length;
        
        return `<div style="background:var(--white); border:1px solid var(--border); border-right:4px solid ${col}; padding:15px; border-radius:8px; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.05); transition:0.2s;" onclick="openDeptDashboard('${d}')">
            <b style="display:block; font-size:14px; margin-bottom:5px;">${d}</b>
            <div style="font-size:22px; font-weight:bold; color:${col};">${sc}%</div>
            <div style="font-size:11px; color:var(--danger); margin-top:5px;">🔴 ${tagsNum} تاجات مفتوحة</div>
        </div>`;
    }).join('');
    document.getElementById('homeDeptGrid').innerHTML = gridHtml;

    updateUsersLeaderboard();
}

// 2. فتح شاشة تفاصيل القسم
function openDeptDashboard(dept) {
    currentViewedDept = dept;
    document.getElementById('deptDashTitle').innerText = dept;
    document.getElementById('selectDept').value = dept; 
    showScreen('deptDashboardScreen');
    updateDeptDashboard();
}

// 3. تحديث رسومات وإحصائيات القسم من الداخل
function updateDeptDashboard() {
    if(!currentViewedDept) return;
    
    const machine = document.getElementById('dashMachineFilter').value.trim().toLowerCase();
    const filter = document.getElementById('dashTimeFilter').value;
    
    let dTags = tagsData.filter(t => t.dept === currentViewedDept && t.status !== 'closed' && (machine === '' || (t.machine && t.machine.toLowerCase().includes(machine))));
    let dTasks = tasksData.filter(t => t.dept === currentViewedDept && (machine === '' || (t.machine && t.machine.toLowerCase().includes(machine))));
    
    let pendingTasks = dTasks.filter(t => t.status === 'pending').length;
    let doneTasks = dTasks.filter(t => t.status === 'done').length;
    let compRate = dTasks.length === 0 ? 0 : Math.round((doneTasks / dTasks.length) * 100);

    document.getElementById('deptKpiOpenTags').innerText = dTags.length;
    document.getElementById('deptKpiTasks').innerText = pendingTasks;
    document.getElementById('deptKpiComp').innerText = `${compRate}%`;

 let audits = historyData.filter(h => h.dept === currentViewedDept && !(h.stepsOrder && h.stepsOrder.includes('ManualKaizen')) && (machine === '' || (h.machine && h.machine.toLowerCase().includes(machine))));
    let scores = [0,0,0,0,0,0,0];
    
    if(audits.length > 0) {
        if(filter === 'latest') {
            const last = audits[audits.length - 1];
            ['JH-0', 'JH-1', 'JH-2', 'JH-3', 'JH-4', 'JH-5', 'JH-6'].forEach((k, i) => {
                if(last.results && last.results[k] && !last.results[k].skipped && last.results[k].max > 0) { scores[i] = Math.round((last.results[k].score / last.results[k].max) * 100); }
            });
        } else if(filter === 'avg3') {
            let last3 = audits.slice(-3);
            ['JH-0', 'JH-1', 'JH-2', 'JH-3', 'JH-4', 'JH-5', 'JH-6'].forEach((k, i) => {
                let tS = 0, tM = 0;
                last3.forEach(a => { if(a.results && a.results[k] && !a.results[k].skipped) { tS += a.results[k].score; tM += a.results[k].max; } });
                scores[i] = tM > 0 ? Math.round((tS / tM) * 100) : 0;
            });
        }
    }

    if (typeof Chart !== 'undefined') {
        const ctxRadar = document.getElementById('radarChart');
        if(ctxRadar) {
            if(radarChartInstance) radarChartInstance.destroy();
            const isDark = document.body.classList.contains('dark-mode');
            radarChartInstance = new Chart(ctxRadar.getContext('2d'), {
                type: 'radar',
                data: { labels: ['JH-0', 'JH-1', 'JH-2', 'JH-3', 'JH-4', 'JH-5', 'JH-6'], datasets: [{ label: machine ? `أداء (${machine})` : 'أداء القسم', data: scores, backgroundColor: 'rgba(21, 101, 192, 0.3)', borderColor: '#1565C0', pointBackgroundColor: '#2E7D32', borderWidth: 2 }] },
                options: { scales: { r: { min: 0, max: 100, ticks: { stepSize: 20, color: isDark?'#eee':'#666', backdropColor: 'transparent' }, grid: { color: isDark?'#444':'#ddd' }, pointLabels: { color: isDark?'#eee':'#666' } } }, maintainAspectRatio: false }
            });
        }

        const ctxTrend = document.getElementById('trendChart');
        if(ctxTrend) {
            if(trendChartInstance) trendChartInstance.destroy();
            const isDark = document.body.classList.contains('dark-mode');
            trendChartInstance = new Chart(ctxTrend.getContext('2d'), {
                type: 'line',
                data: { labels: audits.map(a => a.date), datasets: [{ label: 'تطور التقييم %', data: audits.map(a => a.totalPct), borderColor: '#F57F17', backgroundColor: 'rgba(245, 127, 23, 0.2)', fill: true, tension: 0.3, borderWidth: 2, pointRadius: 4 }] },
                options: { scales: { y: { min: 0, max: 100, ticks: { color: isDark?'#eee':'#666' } }, x: { ticks: { color: isDark?'#eee':'#666' } } }, maintainAspectRatio: false }
            });
        }
    }
}

function printDeptDashboard() {
    window.scrollTo(0, 0);
    const btns = document.querySelectorAll('#deptDashboardScreen .no-print'); btns.forEach(b => b.style.display = 'none');
    
    const element = document.getElementById('deptDashboardScreen');
    const opt = { 
        margin: 0.3, 
        filename: `لوحة_قيادة_${currentViewedDept}_${new Date().toLocaleDateString('ar-EG').replace(/\//g,'-')}.pdf`, 
        image: { type: 'jpeg', quality: 1 }, 
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 }, 
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } 
    };
    
    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save().then(() => { 
            btns.forEach(b => b.style.display = 'flex');
            document.querySelectorAll('#deptDashboardScreen .btn').forEach(b => b.style.display = 'block');
        });
    }
}

// ==========================================
// AUDIT FLOW
// ==========================================
function startNewAuditFlow() { 
    const draft = localStorage.getItem('tpm_audit_draft');
    if(draft) {
        const draftObj = JSON.parse(draft);
        if(confirm(`يوجد تقييم غير مكتمل لقسم (${draftObj.dept}). هل تريد استكماله؟\n\n- اضغط OK للاستكمال.\n- اضغط Cancel لبدء تقييم جديد (سيتم مسح القديم).`)) {
            loadAuditDraft(); return; 
        } else { clearAuditDraft(); }
    }
    showScreen('setupScreen'); 
}

function initAuditSequential() {
    let machineName = document.getElementById('setupMachine').value.trim() || 'عام';
    currentAudit = {
        id: uniqueNumericId().toString(), dept: document.getElementById('selectDept').value, machine: machineName,
        auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG'),
        stepsOrder: ['JH-0', 'JH-1', 'JH-2', 'JH-3', 'JH-4', 'JH-5', 'JH-6'],
        currentStepIndex: 0, results: {}
    };
    renderCurrentAuditStep();
}

function renderCurrentAuditStep() {
    const stepKey = currentAudit.stepsOrder[currentAudit.currentStepIndex];
    const stepData = AUDIT_DATA[stepKey];
    
    currentStepSelections = (currentAudit.results[stepKey] && currentAudit.results[stepKey].selections) ? JSON.parse(JSON.stringify(currentAudit.results[stepKey].selections)) : {};
    currentStepImages = (currentAudit.results[stepKey] && currentAudit.results[stepKey].images) ? JSON.parse(JSON.stringify(currentAudit.results[stepKey].images)) : {};

    document.getElementById('auditStepTitle').innerText = `${stepKey}: ${stepData.name}`;
    document.getElementById('auditProgressBar').style.width = `${((currentAudit.currentStepIndex) / 7) * 100}%`;

    let html = '';
    stepData.items.forEach(item => {
        let hasImage = '';
        if (currentStepImages['img_' + item.id]) {
            hasImage = `
            <div id="img_preview_elem_${item.id}" style="position:relative; display:inline-block;">
                <img src="${currentStepImages['img_' + item.id].data}" style="height:40px; border-radius:4px; margin-right:10px; border:1px solid var(--border); vertical-align:middle;">
            </div>
            <button class="btn btn-outline btn-sm" style="display:inline-block; vertical-align:middle; padding:4px 8px; margin-right:5px;" onclick="runAIVision(${item.id}, '${item.title.replace(/'/g, "\\'")}')">👁️ AI</button>
            <button class="btn btn-danger btn-sm" style="display:inline-block; vertical-align:middle; padding:4px 8px;" onclick="removeAuditImage(${item.id})">🗑️ مسح</button>
            `;
        }
        
        html += `<div class="audit-item"><div class="item-header"><div class="item-num">${item.id}</div>
        <div class="item-title">${item.title} <span style="font-size:12px; color:var(--primary); font-weight:normal;">(${item.maxScore} درجة)</span>
            <div style="margin-top: 5px; display:flex; align-items:center;">
                <span class="icon-btn" onclick="explainItem('${item.title}')" title="شرح">💡</span>
                <span class="icon-btn" title="إضافة صورة" onclick="openImageSourcePicker(${item.id}, '${item.title.replace(/'/g, "\\'")}')">📸</span>
                <div id="preview_img_${item.id}">${hasImage}</div>
            </div>
        </div></div><div>`;
        
        item.levels.forEach(lvl => {
            let isSel = (currentStepSelections['item_' + item.id] && currentStepSelections['item_' + item.id].score === lvl.score) ? 'selected' : '';
            html += `<div class="level-opt ${isSel}" onclick="selectLevel(${item.id}, ${lvl.score}, ${item.maxScore}, this)"><div class="level-num">${lvl.level}</div><div class="level-text" style="flex:1;">${lvl.desc}</div><div style="font-size:11px; color:var(--success); font-weight:bold; white-space:nowrap;">(+${lvl.score} درجة)</div></div>`;
        });
        html += `</div></div>`;
    });
    document.getElementById('auditItemsContainer').innerHTML = html;
    window.scrollTo(0,0);
    showScreen('auditScreen');
}

function selectLevel(id, score, max, el) {
    currentStepSelections['item_' + id] = { score, max };
    if(el) {
        el.parentElement.querySelectorAll('.level-opt').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
    }
}

function finishCurrentStep() {
    const stepKey = currentAudit.stepsOrder[currentAudit.currentStepIndex];
    const stepData = AUDIT_DATA[stepKey];

    if(Object.keys(currentStepSelections).length < stepData.items.length) return alert('يجب الإجابة على جميع البنود للخطوة!');

    let tScore = 0, tMax = 0; currentStepImprovements = [];
    for(let safeKey in currentStepSelections) {
        let sc = currentStepSelections[safeKey].score, mx = currentStepSelections[safeKey].max;
        tScore += sc; tMax += mx;
        if(sc < mx) {
            let actualId = safeKey.replace('item_', '');
            let item = stepData.items.find(i => i.id == actualId);
            if(item) currentStepImprovements.push({ title: item.title });
        }
    }

    currentAudit.results[stepKey] = { 
        skipped: false, score: tScore, max: tMax, 
        improvements: currentStepImprovements.map(i => i.title || i),
        selections: JSON.parse(JSON.stringify(currentStepSelections)),
        images: JSON.parse(JSON.stringify(currentStepImages))
    };
    
    const aiBtn = document.getElementById('aiCapaBtn');
    if(aiBtn) aiBtn.style.display = currentStepImprovements.length > 0 ? 'inline-block' : 'none';
    
    saveAuditDraft(); 
    renderStepSummary(stepKey, tScore, tMax);
}
function skipCurrentStep() {
    if(confirm('تخطي هذه الخطوة؟')) {
        currentAudit.results[currentAudit.stepsOrder[currentAudit.currentStepIndex]] = { skipped: true, score: 0, max: 0, improvements: [], selections: {}, images: {} };
        goToNextStep();
    }
}

function renderStepSummary(stepKey, score, max) {
    document.getElementById('summaryStepTitle').innerText = `نتيجة ${stepKey}`;
    let pct = Math.round((score / max) * 100);
    document.getElementById('summaryPct').innerText = `${pct}%`;
    document.getElementById('summaryScoreStr').innerText = `${score} / ${max}`;
    document.querySelector('#stepSummaryScreen .score-circle').style.borderColor = pct >= 80 ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)');

    if(pct >= 90 && typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    let impHtml = currentStepImprovements.length === 0 ? '<div style="color:var(--success); font-weight:bold;">🎉 أداء ممتاز!</div>' : currentStepImprovements.map(i => `
        <div class="improvement-box" style="margin-bottom: 10px; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
            <b>${i.title}</b>
            <div style="margin-top:10px; display:flex; gap:5px;"><button class="btn btn-primary btn-sm" onclick="sendToTask('${i.title.replace(/'/g,"")}')">➕ تحويل لمهمة (CAPA)</button></div>
        </div>`).join('');
    document.getElementById('opportunitiesContainer').innerHTML = impHtml;
    window.scrollTo(0,0);
    showScreen('stepSummaryScreen');
}

function sendToTask(taskName, targetDept) {
    let dept = sanitizeInput(targetDept || (currentAudit ? currentAudit.dept : document.getElementById('dashDeptSelect').value));
    let phone = prompt('📞 أدخل رقم واتساب قائد الماكينة لإرسال تذكيرات له (أو اتركه فارغاً):', '');
    const safeTaskName = sanitizeInput(taskName);
    const safePhone = sanitizeInput(phone || '');
    tasksData.push({ id: uniqueNumericId(), dept: dept, task: safeTaskName, status: 'pending', date: new Date().toLocaleDateString('ar-EG'), phone: safePhone });
    renderTasks(); logAction(`إضافة مهمة قسم ${dept}`); syncToServer();
    alert('تم الإضافة لخطة العمل (CAPA)!');
}

function goToNextStep() {
    currentAudit.currentStepIndex++;
    if(currentAudit.currentStepIndex < 7) renderCurrentAuditStep(); else generateFinalReport();
}

function generateFinalReport() {
    let tS = 0, tM = 0;
    currentAudit.stepsOrder.forEach(k => {
        if(!currentAudit.results[k].skipped) { tS += currentAudit.results[k].score; tM += currentAudit.results[k].max; }
    });
    let finalPct = tM === 0 ? 0 : Math.round((tS / tM) * 100);
    document.getElementById('finalDeptName').innerText = currentAudit.dept;
    document.getElementById('finalTotalPct').innerText = `${finalPct}%`;
    currentAudit.totalScore = tS; currentAudit.totalMax = tM; currentAudit.totalPct = finalPct;
    
    if(finalPct >= 90 && typeof confetti !== 'undefined') {
        let duration = 3 * 1000; let animationEnd = Date.now() + duration;
        let interval = setInterval(function() {
            let timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            let particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } }));
        }, 250);
    }
    showScreen('finalReportScreen');
    setTimeout(initSignaturePad, 200); 
}
function saveFinalAudit() {
    if(!hasRole('admin', 'auditor')) return alert('عفواً، لا تملك صلاحية حفظ تقرير مراجعة.');
    if(sigCanvas) { currentAudit.signature = sigCanvas.toDataURL('image/png'); } 
    const existingIndex = historyData.findIndex(h => h.id === currentAudit.id);
    if(existingIndex >= 0) { historyData[existingIndex] = currentAudit; logAction(`تعديل تقرير ${currentAudit.dept}`); } 
    else { historyData.push(currentAudit); logAction(`إنشاء تقرير ${currentAudit.dept}`); }
    
    // 🟢 الإضافة الجبارة: إنشاء فولدر بخطة العمل أوتوماتيكياً 🟢
    let allImprovements = [];
    Object.keys(currentAudit.results).forEach(step => {
        if(currentAudit.results[step].improvements && currentAudit.results[step].improvements.length > 0) {
            allImprovements.push(...currentAudit.results[step].improvements);
        }
    });
    if(allImprovements.length > 0) {
        tasksData.push({
            id: uniqueNumericId(),
            isFolder: true, dept: currentAudit.dept, date: currentAudit.date, machine: currentAudit.machine || 'عام',
            task: `مجلد تحسينات مراجعة (${currentAudit.date})`,
            subTasks: allImprovements.map(imp => ({ text: imp, status: 'pending' })),
            status: 'pending'
        });
    }

    if(typeof deptPhones !== 'undefined' && deptPhones[currentAudit.dept]) {
        let cleanPhone = deptPhones[currentAudit.dept].replace(/[^0-9+]/g, '');
        let msg = `*تقرير مراجعة TPM 🏭*\nتم الانتهاء من مراجعة قسم: ${currentAudit.dept}\nالنتيجة: ${currentAudit.totalPct}%\n\nتم إدراج فرص التحسين أوتوماتيكياً في مجلد خطة العمل بالتطبيق.\nعاش جداً! 🚀`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    }

    renderHistory(); updateHomeDashboard(); syncToServer(); clearAuditDraft();
    awardPoints(50, 'إتمام مراجعة'); alert('تم الحفظ وتم إنشاء فولدر خطة العمل أوتوماتيكياً!'); showScreen('homeScreen'); 
}
let editingDeptIndex = -1;

function updateDeptListUI() {
    if(!document.getElementById('deptListContainer')) return;
    document.getElementById('deptListContainer').innerHTML = departments.map((d, i) => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid var(--border); background:var(--light-gray); border-radius:6px; margin-bottom:5px;">
            <div style="cursor:pointer; flex:1;" onclick="editDeptUI(${i}, '${d}')" title="اضغط لتعديل القسم أو الرقم">
                <b style="color:var(--primary);">${d} ✏️</b><br>
                <span style="font-size:11px; color:var(--danger); font-weight:bold;">📱 ${typeof deptPhones !== 'undefined' && deptPhones[d] ? deptPhones[d] : 'اضغط لإضافة رقم'}</span>
            </div>
            <button class="btn btn-danger btn-sm" style="height:fit-content;" onclick="delDept(${i}, '${d}')">حذف</button>
        </div>`).join('');
        
    const engContainer = document.getElementById('engListContainer');
    if(engContainer && typeof maintenanceEngineers !== 'undefined') {
        engContainer.innerHTML = maintenanceEngineers.map((eng, i) => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid var(--border);">
            <div><b>${eng.name}</b><br><span style="font-size:11px; color:var(--gray);">📱 ${eng.phone}</span></div>
            <button class="btn btn-danger btn-sm" style="height:fit-content;" onclick="delEngineer(${i})">حذف</button>
        </div>`).join('');
    }
        
    const engSelect = document.getElementById('newTagEngineer');
    if(engSelect && typeof maintenanceEngineers !== 'undefined') {
        engSelect.innerHTML = `<option value="">اختيار مهندس الصيانة للتبليغ...</option>` + maintenanceEngineers.map(e => `<option value="${e.phone}">${e.name}</option>`).join('');
    }
}

function editDeptUI(idx, deptName) {
    document.getElementById('newDeptInput').value = deptName;
    document.getElementById('newDeptPhone').value = (typeof deptPhones !== 'undefined' && deptPhones[deptName]) ? deptPhones[deptName] : '';
    editingDeptIndex = idx;
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function addOrUpdateDept() {
    if(!hasRole('admin')) return alert('عفواً، هذه الصلاحية للمدير فقط.');
    const val = sanitizeInput(document.getElementById('newDeptInput').value);
    const phone = document.getElementById('newDeptPhone') ? sanitizeInput(document.getElementById('newDeptPhone').value) : '';
    if(!val) return alert('برجاء كتابة اسم القسم!');
    
    if(typeof deptPhones === 'undefined') window.deptPhones = {};

    if (editingDeptIndex > -1) {
        let oldName = departments[editingDeptIndex];
        if (oldName !== val) {
            // تحديث اسم القسم في كل قاعدة البيانات!
            departments[editingDeptIndex] = val;
            historyData.forEach(h => { if(h.dept === oldName) h.dept = val; });
            tasksData.forEach(t => { if(t.dept === oldName) t.dept = val; });
            tagsData.forEach(t => { if(t.dept === oldName) t.dept = val; });
            if(deptPhones[oldName]) { deptPhones[val] = phone || deptPhones[oldName]; delete deptPhones[oldName]; }
            else if(phone) deptPhones[val] = phone;
            logAction(`تعديل اسم قسم من ${oldName} إلى ${val}`);
        } else {
            if(phone) deptPhones[val] = phone; else delete deptPhones[val];
            logAction(`تحديث رقم قسم: ${val}`);
        }
        editingDeptIndex = -1;
    } else {
        if(!departments.includes(val)) { departments.push(val); logAction(`إضافة قسم جديد: ${val}`); }
        if(phone) deptPhones[val] = phone;
    }
    
    updateDeptDropdown(); updateDeptListUI(); syncToServer(); 
    document.getElementById('newDeptInput').value = ''; 
    if(document.getElementById('newDeptPhone')) document.getElementById('newDeptPhone').value = '';
    alert('تم الحفظ بنجاح!');
}

function delDept(i, deptName) {
    if(!hasRole('admin')) return alert('عفواً، هذه الصلاحية للمدير فقط.');
    deptName = deptName || departments[i];
    if(departments.length > 1 && confirm(`متأكد من حذف قسم (${deptName})؟`)) { 
        logAction(`حذف قسم: ${deptName}`); departments.splice(i, 1); 
        if(typeof deptPhones !== 'undefined' && deptPhones[deptName]) delete deptPhones[deptName];
        updateDeptDropdown(); updateDeptListUI(); syncToServer(); 
    }
}

function addEngineer() {
    if(!hasRole('admin')) return alert('عفواً، هذه الصلاحية للمدير فقط.');
    const name = sanitizeInput(document.getElementById('newEngName').value);
    const phone = sanitizeInput(document.getElementById('newEngPhone').value);
    if(name && phone) {
        if(typeof maintenanceEngineers === 'undefined') window.maintenanceEngineers = [];
        maintenanceEngineers.push({name, phone}); updateDeptListUI(); syncToServer(); logAction(`إضافة مهندس: ${name}`);
        document.getElementById('newEngName').value = ''; document.getElementById('newEngPhone').value = '';
    }
}
function delEngineer(i) { if(!hasRole('admin')) return alert('عفواً، هذه الصلاحية للمدير فقط.'); if(confirm('حذف المهندس؟')) { maintenanceEngineers.splice(i, 1); updateDeptListUI(); syncToServer(); } }
// ==========================================
// TASKS, CAPA FOLDERS & REPORTS
// ==========================================
function renderTasks() {
    let pendAll = 0, progAll = 0, doneAll = 0;
    let deptStats = {};
    departments.forEach(d => deptStats[d] = { pending: 0, done: 0, total: 0 });

    tasksData.forEach(t => {
        let isDone = false;
        if(t.isFolder) {
            let safeSubTasks = t.subTasks || [];
            let doneSub = safeSubTasks.filter(s => s.status === 'done').length;
            isDone = (doneSub === safeSubTasks.length && safeSubTasks.length > 0);
            if(isDone) doneAll++; else if(doneSub > 0) progAll++; else pendAll++;
        } else {
            isDone = (t.status === 'done');
            if(t.status === 'pending') pendAll++; else if(t.status === 'progress') progAll++; else doneAll++;
        }
        if(t.dept && deptStats[t.dept]) { 
            deptStats[t.dept].total++; 
            if(isDone) deptStats[t.dept].done++; else deptStats[t.dept].pending++; 
        }
    });

    let mainPendingEl = document.getElementById('kpiTasksPendingAll');
    if(mainPendingEl) {
        mainPendingEl.innerText = pendAll; document.getElementById('kpiTasksProgressAll').innerText = progAll; document.getElementById('kpiTasksDoneAll').innerText = doneAll;
        let gridHtml = departments.map(d => {
            let s = deptStats[d]; let col = s.pending > 0 ? 'var(--danger)' : (s.total > 0 ? 'var(--success)' : 'var(--gray)');
            return `<div style="background:var(--white); border:1px solid var(--border); border-right:4px solid ${col}; padding:15px; border-radius:8px; cursor:pointer;" onclick="openTasksDept('${d}')">
                <b style="font-size:14px;">${d}</b><div style="font-size:11px; margin-top:5px; color:gray;">مهام معلقة: <b style="color:var(--danger);">${s.pending}</b> | مكتملة: <b style="color:var(--success);">${s.done}</b></div>
            </div>`;
        }).join('');
        document.getElementById('tasksDeptGrid').innerHTML = gridHtml;
    }

    if(currentTaskDept) {
        let pendingDept = deptStats[currentTaskDept] ? deptStats[currentTaskDept].pending : 0;
        let doneDept = deptStats[currentTaskDept] ? deptStats[currentTaskDept].done : 0;
        document.getElementById('kpiTasksPendingDept').innerText = pendingDept;
        document.getElementById('kpiTasksDoneDept').innerText = doneDept;

        let listHtml = ''; let folderHtml = '';
        let deptTasks = [...tasksData].reverse().filter(t => t.dept === currentTaskDept);

        deptTasks.forEach(t => {
            if(t.isFolder) {
                let safeSubTasks = t.subTasks || [];
                let totalSub = safeSubTasks.length; let doneSub = safeSubTasks.filter(s => s.status === 'done').length;
                let fStatus = doneSub === totalSub && totalSub > 0 ? '🟢 مكتمل' : (doneSub === 0 ? '🔴 معلق' : `🟡 جاري (${doneSub}/${totalSub})`);
                let subsHtml = safeSubTasks.map((st, idx) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px dashed #eee;">
                        <label style="font-size:12px; cursor:pointer; color:${st.status==='done'?'gray':'black'}; text-decoration:${st.status==='done'?'line-through':'none'};"><input type="checkbox" ${st.status==='done'?'checked':''} onclick="toggleFolderSubTask(${t.id}, ${idx})"> ${st.text}</label>
                    </div>`).join('');
                folderHtml += `<div class="card" style="border:1px solid var(--primary); border-top:4px solid var(--primary);"><div style="display:flex; justify-content:space-between; margin-bottom:10px;"><div><b style="color:var(--primary-dark);">📁 ${t.task}</b><br><span style="font-size:11px;">⚙️ ${t.machine || 'عام'}</span></div><span style="font-size:11px; font-weight:bold;">${fStatus}</span></div><div style="background:#f9f9f9; padding:10px; border-radius:8px;">${subsHtml || '<div style="font-size:11px;color:gray;">لا توجد تفاصيل</div>'}</div></div>`;
            } else {
                let selectStatus = `<select class="form-control" style="width:auto; padding:2px; font-size:11px;" onchange="changeTaskStatus(${t.id}, this.value)"><option value="pending" ${t.status==='pending'?'selected':''}>⏳ انتظار</option><option value="progress" ${t.status==='progress'?'selected':''}>🛠️ تنفيذ</option><option value="done" ${t.status==='done'?'selected':''}>✔️ مكتملة</option></select>`;
                let col = t.status === 'done' ? 'var(--success)' : (t.status === 'progress' ? 'var(--warning)' : 'var(--danger)');
                listHtml += `<div class="task-card" style="border-right-color:${col}; opacity:${t.status==='done'?'0.7':'1'};"><div style="display:flex; justify-content:space-between; align-items:center;"><div><span style="font-size:11px; color:gray;">(${t.date})</span><p style="margin-top:5px; font-size:13px; font-weight:bold;">${t.task}</p></div><div>${selectStatus}</div></div></div>`;
            }
        });
        let listC = document.getElementById('tasksListContainer'); if(listC) listC.innerHTML = listHtml || '<div style="color:gray; text-align:center; font-size:12px;">لا توجد مهام فردية</div>';
        let folderC = document.getElementById('auditFoldersContainer'); if(folderC) folderC.innerHTML = folderHtml || '<div style="color:gray; text-align:center; font-size:12px;">لا توجد مجلدات مراجعات</div>';
    }
}
function openTasksDept(dept) {
    currentTaskDept = dept;
    document.getElementById('tasksDeptTitle').innerText = 'مهام قسم: ' + dept;
    document.getElementById('btnDeptName').innerText = dept;
    document.getElementById('tasksMainView').style.display = 'none';
    document.getElementById('tasksDeptView').style.display = 'block';
    renderTasks();
}

function closeTasksDept() {
    currentTaskDept = null;
    document.getElementById('tasksDeptView').style.display = 'none';
    document.getElementById('tasksMainView').style.display = 'block';
    renderTasks();
}

function toggleFolderSubTask(folderId, subTaskIndex) { let folder = tasksData.find(x => x.id === folderId); if(folder) { let st = folder.subTasks[subTaskIndex]; st.status = st.status === 'done' ? 'pending' : 'done'; renderTasks(); syncToServer(); } }
function changeTaskStatus(taskId, newStatus) { let t = tasksData.find(x => x.id === taskId); if(t) { t.status = newStatus; renderTasks(); syncToServer(); } }
function exportTasksToCSV() {
    if(currentUser.role !== 'admin') return alert('عفواً، للمدير فقط');
    if(!tasksData || tasksData.length === 0) return alert('لا توجد مهام للتصدير.');

    let csvContent = "data:text/csv;charset=utf-8,%EF%BB%BF";
    csvContent += "ID,القسم,المهمة,النوع,الوقت,الحالة,التاريخ,الماكينة,الهاتف\n";

    tasksData.forEach((task) => {
        if (task.isFolder) {
            const subTasks = Array.isArray(task.subTasks) ? task.subTasks : [];
            subTasks.forEach((subTask, index) => {
                const row = [
                    `${task.id}-${index + 1}`,
                    task.dept || '',
                    subTask.text || '',
                    'Folder SubTask',
                    '',
                    subTask.status || 'pending',
                    task.date || '',
                    task.machine || '',
                    task.phone || ''
                ].map(toCsvCell);
                csvContent += row.join(",") + "\n";
            });
        } else {
            const row = [
                task.id || '',
                task.dept || '',
                task.task || '',
                task.type || '',
                task.time || '',
                task.status || 'pending',
                task.date || '',
                task.machine || '',
                task.phone || ''
            ].map(toCsvCell);
            csvContent += row.join(",") + "\n";
        }
    });

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `TPM_CAPA_${new Date().toLocaleDateString('ar-EG').replace(/\//g,'-')}.csv`;
    link.click();
    logAction('استخراج المهام إلى Excel');
    syncToServer();
}

function addManualTaskDept() {
    if(!hasRole('admin', 'auditor')) return alert('عفواً، لا تملك صلاحية إضافة مهام.');
    const taskVal = sanitizeInput(document.getElementById('newTaskInput').value);
    if(!taskVal) return alert('اكتب المهمة!');
    tasksData.push({ id: uniqueNumericId(), dept: currentTaskDept, task: taskVal, status: 'pending', date: new Date().toLocaleDateString('ar-EG') });
    renderTasks(); syncToServer(); document.getElementById('newTaskInput').value = '';
}

function renderHistory() {
    // 🛡️ فلترة التقارير الحقيقية فقط وإخفاء تقارير الكايزن الوهمية
    let realAudits = historyData.filter(a => !(a.stepsOrder && a.stepsOrder.includes('ManualKaizen')));
    
    document.getElementById('historyListContainer').innerHTML = realAudits.length === 0 ? '<div style="color:gray;">لا توجد تقارير</div>' : 
    [...realAudits].reverse().map(a => {
        let col = a.totalPct >= 80 ? 'success' : (a.totalPct >= 50 ? 'warning' : 'danger');
        let adminBtns = currentUser.role === 'admin' ? `<div style="margin-top: 15px; display: flex; gap: 5px; justify-content: flex-end;" onclick="event.stopPropagation();"><button class="btn btn-warning btn-sm" onclick="editReport('${a.id}')">✏️</button><button class="btn btn-danger btn-sm" onclick="deleteReport('${a.id}')">🗑️</button></div>` : '';
        return `<div class="card" style="border-right: 4px solid var(--${col}); cursor:pointer;" onclick="viewDetailedReport('${a.id}')"><div style="display:flex; justify-content:space-between;"><div><b>${escapeHtml(a.dept)}</b><br><span style="font-size:11px; color:gray;">${escapeHtml(a.date)}</span></div><b style="color:var(--${col}); font-size:18px;">${a.totalPct}%</b></div>${adminBtns}</div>`;
    }).join('');
}
function editReport(id) { const rep = historyData.find(h => h.id === id); if(rep && confirm('تعديل؟')) { currentAudit = JSON.parse(JSON.stringify(rep)); currentAudit.currentStepIndex = 0; renderCurrentAuditStep(); } }
function deleteReport(id) { if(confirm('حذف نهائي؟')) { historyData = historyData.filter(h => h.id !== id); renderHistory(); updateHomeDashboard(); syncToServer(); } }
function viewDetailedReport(id) {
    const a = historyData.find(h => h.id === id); if(!a) return;
    
    document.getElementById('detDept').innerText = a.dept;
    document.getElementById('detMachine').innerText = a.machine || 'عام';
    document.getElementById('detAuditor').innerText = a.auditor;
    document.getElementById('detDate').innerText = a.date;
    document.getElementById('detPct').innerText = `${a.totalPct}%`;
    document.getElementById('detPct').style.color = a.totalPct >= 80 ? '#2E7D32' : (a.totalPct >= 50 ? '#F57F17' : '#C62828');

    document.getElementById('detStepsContainer').innerHTML = a.stepsOrder.map(k => {
        let r = a.results[k];
        if(!r || r.skipped) return `<div class="print-section" style="page-break-inside: avoid; color: gray;"><b>${k}</b>: تم تخطي هذه الخطوة</div>`;
        let p = Math.round((r.score/r.max)*100);
        let col = p >= 80 ? '#2E7D32' : (p >= 50 ? '#F57F17' : '#C62828');
        
        let imps = (r.improvements || []).length > 0 ? r.improvements.map(i => {
            let taskBtn = (currentUser.role === 'admin' || currentUser.role === 'auditor') ? `<button class="btn btn-primary btn-sm no-print" style="padding: 2px 8px; font-size: 11px; margin-right:10px; display:inline-block;" onclick="sendToTask('${i.replace(/'/g,"")}', '${a.dept}')">➕ تحويل لمهمة</button>` : '';
            return `<li style="margin-bottom: 8px; display:flex; justify-content:space-between; align-items:flex-start;"><span style="flex:1; color:#444;">- ${escapeHtml(i)}</span>${taskBtn}</li>`;
        }).join('') : '<span style="color:#2E7D32; font-weight:bold;">لا يوجد تعليقات - أداء ممتاز</span>';
        
        let imgsHtml = '';
        if(r.images) { Object.values(r.images).forEach(img => { const url = safeUrl(img.data); if (url) imgsHtml += `<img src="${url}" style="height:80px; width:auto; border-radius:4px; margin:5px; border:1px solid #ccc; display:inline-block;">`; }); }
        let galleryBlock = imgsHtml ? `<div style="margin-top:10px; background:#fafafa; padding:5px; border-radius:4px;"><b>📸 الأدلة المصورة:</b><br>${imgsHtml}</div>` : '';

        return `<div class="print-section" style="margin-bottom:15px; border:1px solid #ddd; padding:15px; border-radius:8px; page-break-inside: avoid; background:#fff;">
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f0f4f8; padding:10px; border-radius: 6px; border-right:4px solid ${col}; margin-bottom:10px;">
                <b style="color:#333; font-size:15px;">${k} : ${AUDIT_DATA[k].name}</b> 
                <b style="color:${col}; font-size:18px; background:#fff; padding:2px 10px; border-radius:4px; border:1px solid #ddd;">${p}%</b>
            </div>
            <div style="font-size:13px; margin-bottom:10px;"><b>💡 فرص التحسين المكتشفة:</b><ul style="margin-right:20px; margin-top:5px; list-style:none; padding:0;">${imps}</ul></div>
            ${galleryBlock}
        </div>`;
    }).join('');
    
    let relatedTags = tagsData.filter(t => t.dept === a.dept && t.status === 'open' && (a.machine === 'عام' || t.machine === a.machine));
    let tagsHtml = '';
    if(relatedTags.length > 0) {
        tagsHtml = `<h3 style="color: #C62828; margin-bottom:10px; border-bottom:2px solid #eee; padding-bottom:5px;">🏷️ تاجات مفتوحة تتطلب تدخل (للمعدة: ${escapeHtml(a.machine)}):</h3>`;
        tagsHtml += relatedTags.map(t => {
            let colorCode = t.color === 'red' ? '#D32F2F' : '#1976D2';
            let typeName = t.color === 'red' ? 'صيانة (أحمر)' : 'إنتاج (أزرق)';
            return `<div style="border-right: 5px solid ${colorCode}; background: #fff; border: 1px solid #ddd; border-right-width: 5px; padding: 10px; margin-bottom: 8px; border-radius: 6px; font-size:13px; page-break-inside: avoid;">
                <b style="color:${colorCode};">تاج ${typeName}</b> | ${escapeHtml(t.desc)} <span style="color:#777; font-size:11px; float:left;">تاريخ الإصدار: ${escapeHtml(t.date)}</span>
            </div>`;
        }).join('');
    }
    document.getElementById('detTagsContainer').innerHTML = tagsHtml;

    let printSigDiv = document.getElementById('printSignature');
    if(printSigDiv) {
        if(a.signature) {
            const signatureUrl = safeUrl(a.signature);
            printSigDiv.innerHTML = `<div style="display:flex; justify-content:space-between; text-align:center; font-weight:bold; margin-bottom: 40px; align-items:flex-end;"><div style="flex:1;">توقيع المراجع<br>${signatureUrl ? `<img src="${signatureUrl}" style="height: 60px; mix-blend-mode: multiply; margin-top:5px;">` : ''}</div><div style="flex:1;">مدير الصيانة<br><br>.......................</div><div style="flex:1;">مدير المصنع<br><br>.......................</div></div><div style="text-align:left; font-size:11px; color:#777; border-top: 1px dashed #ccc; padding-top: 5px;">تم الإصدار والتقييم عبر نظام (TPM Enterprise) - إعداد: م. محمد فايز</div>`;
        } else {
             printSigDiv.innerHTML = `<div style="display:flex; justify-content:space-between; text-align:center; font-weight:bold; margin-bottom: 40px;"><div style="flex:1;">توقيع المراجع<br><br>.......................</div><div style="flex:1;">مدير الصيانة<br><br>.......................</div><div style="flex:1;">مدير المصنع<br><br>.......................</div></div><div style="text-align:left; font-size:11px; color:#777; border-top: 1px dashed #ccc; padding-top: 5px;">تم الإصدار والتقييم عبر نظام (TPM Enterprise) - إعداد: م. محمد فايز</div>`;
        }
    }

    showScreen('detailedReportScreen');
    window.currentReportText = `*تقرير TPM*\n🏭 القسم: ${a.dept}\n⚙️ الماكينة: ${a.machine||'عام'}\n👤 المراجع: ${a.auditor}\n📅 التاريخ: ${a.date}\n⭐ النتيجة: ${a.totalPct}%\n\nراجع النظام للتفاصيل.`;
}

function downloadProfessionalPDF() {
    window.scrollTo(0, 0); 
    document.getElementById('printSignature').style.display = 'block';
    const btns = document.querySelectorAll('#detailedReportScreen .btn'); btns.forEach(b => b.style.display = 'none');
    const noPrintBtns = document.querySelectorAll('.no-print'); noPrintBtns.forEach(b => b.style.display = 'none');
    
    const element = document.getElementById('printableReportArea');
    const opt = { 
        margin: 0.2, 
        filename: `تقرير_المراجعة_${document.getElementById('detDept').innerText}_${document.getElementById('detMachine').innerText}.pdf`, 
        image: { type: 'jpeg', quality: 1 }, 
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0, windowWidth: document.documentElement.offsetWidth }, 
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } 
    };
    
    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save().then(() => { 
            document.getElementById('printSignature').style.display = 'none'; 
            btns.forEach(b => b.style.display = 'block'); 
            noPrintBtns.forEach(b => b.style.display = 'inline-block');
        });
    }
}
function shareWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent(window.currentReportText)}`); }

function renderKaizenFeed() {
    const selectedDept = document.getElementById('kaizenDeptSelect') ? document.getElementById('kaizenDeptSelect').value : 'الكل';
    let allPosts = [];
    historyData.forEach(audit => {
        if(selectedDept !== 'الكل' && audit.dept !== selectedDept) return;
        if (!audit.results) return; 
        
        Object.keys(audit.results).forEach(step => {
            if(audit.results[step] && audit.results[step].images) {
                Object.keys(audit.results[step].images).forEach(k => allPosts.push({ auditId: audit.id, dept: audit.dept, auditor: audit.auditor, date: audit.date, title: audit.results[step].images[k].title, data: audit.results[step].images[k].data, key: k }));
            }
        });
    });
    allPosts.sort((a,b) => Number(b.auditId) - Number(a.auditId));
    
    document.getElementById('kaizenFeedContainer').innerHTML = allPosts.length === 0 ? '<div style="color:gray;text-align:center;">لا توجد مشاركات</div>' : allPosts.map(p => {
        let likeId = p.auditId + '_' + p.key; 
        let isLiked = likesData[likeId] && likesData[likeId].includes(currentUser.name); 
        let likeCount = likesData[likeId] ? likesData[likeId].length : 0;
        
        let comments = kaizenComments[likeId] || [];
        let commentsHtml = comments.map(c => `
            <div style="background:#fff; padding:8px; border-radius:8px; margin-bottom:5px; border:1px solid #eee;">
                <b style="font-size:12px; color:var(--primary);">${escapeHtml(c.user)}</b> <span style="font-size:10px; color:gray;">${escapeHtml(c.date)}</span>
                <div style="font-size:13px; margin-top:3px;">${escapeHtml(c.text)}</div>
            </div>
        `).join('');

        let canEditDelete = currentUser.role === 'admin' || currentUser.name === p.auditor;
        let adminBtns = canEditDelete ? `
            <button class="action-btn" style="color:var(--danger);" onclick="deleteKaizenPost('${p.auditId}', '${p.key}')" title="مسح">🗑️</button>
            <button class="action-btn" style="color:var(--warning);" onclick="editKaizenPost('${p.auditId}', '${p.key}')" title="تعديل">✏️</button>
        ` : '';

        const postImgUrl = safeUrl(p.data);
        return `<div class="kaizen-post">
            <div class="kaizen-header"><b>${escapeHtml(p.auditor)}</b> <span style="font-size:11px;color:gray;">${escapeHtml(p.dept)}</span></div>
            ${postImgUrl ? `<img src="${postImgUrl}" class="kaizen-img">` : ''}
            <div class="kaizen-body"><b>${escapeHtml(p.title)}</b></div>
            <div class="kaizen-footer" style="border-bottom: 1px solid var(--border);">
                <button class="action-btn ${isLiked?'liked':''}" onclick="toggleKaizenLike('${likeId}')">👍 (${likeCount})</button>
                <button class="action-btn" onclick="document.getElementById('comment_sec_${likeId}').style.display='block'">💬 تعليق (${comments.length})</button>
                <div style="margin-right:auto; display:flex;">${adminBtns}</div>
            </div>
            <div id="comment_sec_${likeId}" style="display:none; padding:10px; background:var(--light-gray);">
                <div style="max-height:150px; overflow-y:auto; margin-bottom:10px;">${commentsHtml || '<div style="font-size:11px; color:gray; text-align:center;">لا توجد تعليقات، كن أول من يعلق!</div>'}</div>
                <div style="display:flex; gap:5px;">
                    <input type="text" id="comment_input_${likeId}" class="form-control" style="flex:1; padding:5px; font-size:12px;" placeholder="اكتب تعليقك هنا...">
                    <button class="btn btn-primary btn-sm" style="margin:0;" onclick="addKaizenComment('${likeId}')">إرسال</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function addKaizenComment(likeId) {
    let input = document.getElementById(`comment_input_${likeId}`);
    let text = sanitizeInput(input.value);
    if(!text) return;
    if(!kaizenComments[likeId]) kaizenComments[likeId] = [];
    
    kaizenComments[likeId].push({ user: currentUser.name, text: text, date: new Date().toLocaleTimeString('ar-EG') });
    syncToServer(); awardPoints(2, 'كتابة تعليق'); input.value = '';
    renderKaizenFeed();
    setTimeout(() => { document.getElementById(`comment_sec_${likeId}`).style.display='block'; }, 100); 
}

function toggleKaizenLike(likeId) {
    if(!likesData[likeId]) likesData[likeId] = [];
    let idx = likesData[likeId].indexOf(currentUser.name);
    if(idx > -1) likesData[likeId].splice(idx, 1); else { likesData[likeId].push(currentUser.name); }
    syncToServer(); renderKaizenFeed();
}

function deleteKaizenPost(auditId, imgKey) {
    let audit = historyData.find(h => h.id === auditId);
    if(audit) {
        if (currentUser.role !== 'admin' && currentUser.name !== audit.auditor) return alert('عفواً، لا تملك صلاحية مسح هذا الكايزن.');
        if(!confirm('هل أنت متأكد من مسح هذه المشاركة نهائياً؟')) return;
        
        if (audit.stepsOrder && audit.stepsOrder.includes('ManualKaizen')) {
            historyData = historyData.filter(h => h.id !== auditId);
        } else {
            Object.keys(audit.results).forEach(step => {
                if(audit.results[step].images && audit.results[step].images[imgKey]) {
                    delete audit.results[step].images[imgKey];
                }
            });
        }
        syncToServer(); renderKaizenFeed(); logAction('مسح كايزن');
    }
}

function editKaizenPost(auditId, imgKey) {
    let audit = historyData.find(h => h.id === auditId);
    if(!audit) return;
    if (currentUser.role !== 'admin' && currentUser.name !== audit.auditor) return alert('عفواً، لا تملك صلاحية تعديل هذا الكايزن.');
    
    let currentTitle = "";
    let targetImg = null;
    
    Object.keys(audit.results).forEach(step => {
        if(audit.results[step].images && audit.results[step].images[imgKey]) {
            targetImg = audit.results[step].images[imgKey];
            currentTitle = targetImg.title;
        }
    });

    if(targetImg) {
        let newTitle = prompt("تعديل وصف التحسين:", currentTitle);
        if (newTitle !== null && newTitle.trim() !== "") {
            targetImg.title = sanitizeInput(newTitle);
            syncToServer(); renderKaizenFeed(); logAction('تعديل كايزن');
        }
    }
}
// ==========================================
// TAGS MANAGEMENT
// ==========================================
function addNewTag() {
    let desc = sanitizeInput(document.getElementById('newTagDesc').value);
    let color = document.getElementById('newTagColor').value;
    let dept = sanitizeInput(document.getElementById('newTagDept').value);
    let machine = sanitizeInput(document.getElementById('newTagMachine').value);
    let spareParts = document.getElementById('newTagSpareParts') ? sanitizeInput(document.getElementById('newTagSpareParts').value) : '';
    let engSelect = document.getElementById('newTagEngineer'); // إضافة المهندس

    if(!desc) return alert('برجاء كتابة وصف المشكلة!');
    
    let fullDesc = spareParts ? `${desc} [مطلوب: ${spareParts}]` : desc;

    tagsData.unshift({ id: uniqueNumericId(), desc: fullDesc, color: color, dept: dept, machine: machine, image: currentTagImg, status: 'open', auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG') });
    
    // 🟢 الإضافة الجديدة: رسالة الواتساب لمهندس الصيانة للتاجات الحمراء 🟢
    if(color === 'red' && engSelect && engSelect.value) {
        let openRedTags = tagsData.filter(t => t.status === 'open' && t.color === 'red').length;
        let cleanPhone = engSelect.value.replace(/[^0-9+]/g, '');
        let msg = `*🚨 إشعار عطل (تاج أحمر) 🚨*\n\nالمعدة: ${machine || 'عام'}\nالقسم: ${dept}\nالوصف: ${fullDesc}\n\nإجمالي التاجات الحمراء المفتوحة بالمصنع: ${openRedTags}\nبرجاء سرعة الفحص للإصلاح.`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    }

    document.getElementById('newTagDesc').value = '';
    document.getElementById('newTagMachine').value = '';
    if(document.getElementById('newTagSpareParts')) document.getElementById('newTagSpareParts').value = '';
    document.getElementById('tagImageInput').value = '';
    document.getElementById('tagImagePreview').innerHTML = '';
    currentTagImg = null;
    
    awardPoints(10, 'إصدار تاج جديد');
    renderTags(); syncToServer(); logAction(`إصدار تاج ${color} لـ ${dept}`);
}

function closeTag(id) {
    let t = tagsData.find(x => x.id === id);
    if(t) { t.status = 'closed'; renderTags(); syncToServer(); logAction(`إغلاق تاج في ${t.dept}`); awardPoints(20, 'إغلاق تاج'); }
}

function updateTagState(id, newState) {
    if(!hasRole('admin', 'auditor')) return alert('عفواً، لا تملك صلاحية تعديل حالة التاج.');
    let t = tagsData.find(x => x.id === id);
    if(t) { 
        t.status = newState; 
        renderTags(); syncToServer(); 
        logAction(`تغيير حالة التاج إلى: ${newState}`); 
        if(newState === 'closed') awardPoints(20, 'إغلاق تاج معلق');
    }
}

function renderTags() {
    const c = document.getElementById('tagsListContainer'); if(!c) return;
    let filterDept = document.getElementById('filterTagDept').value;
    let filterMachine = document.getElementById('filterTagMachine').value.trim().toLowerCase();
    
    let filteredTags = tagsData.filter(t => {
        let matchDept = (filterDept === 'الكل' || t.dept === filterDept);
        let matchMachine = (filterMachine === '' || (t.machine && t.machine.toLowerCase().includes(filterMachine)));
        return matchDept && matchMachine;
    });

    c.innerHTML = filteredTags.length === 0 ? '<div style="color:gray;">لا توجد تاجات مطابقة</div>' : filteredTags.map(t => {
        let tagClass = t.color === 'red' ? 'tag-red' : 'tag-blue';
        const tagImgUrl = safeUrl(t.image);
        let imgHtml = tagImgUrl ? `<img src="${tagImgUrl}" style="width:100%; max-height:200px; object-fit:cover; border-radius:8px; margin-top:10px; margin-bottom:10px; border:1px solid var(--border);">` : '';
        
        let canEditDelete = currentUser.role === 'admin' || currentUser.name === t.auditor;
        let deleteBtnHtml = canEditDelete ? `<button class="btn btn-danger btn-sm" onclick="deleteTag(${t.id})" style="margin-right:3px; padding:2px 6px; font-size:11px;">🗑️ مسح</button>` : '';
        let editBtnHtml = canEditDelete ? `<button class="btn btn-warning btn-sm" onclick="editTag(${t.id})" style="margin-right:3px; padding:2px 6px; font-size:11px;">✏️ تعديل</button>` : '';
        
        let canChangeStatus = currentUser.role === 'admin' || currentUser.role === 'auditor' || currentUser.name === t.auditor;
        let disabledStr = canChangeStatus ? '' : 'disabled';

        let statusSelect = `
        <select class="form-control" style="width:110px; font-size:11px; padding:4px; font-weight:bold; background:${t.status==='closed'?'#E8F5E9':(t.status==='review'?'#E3F2FD':'#FFF3E0')};" onchange="updateTagState(${t.id}, this.value)" ${disabledStr}>
            <option value="open" ${t.status==='open'?'selected':''}>🔴 مفتوح</option>
            <option value="progress" ${t.status==='progress'?'selected':''}>🟡 جاري</option>
            <option value="review" ${t.status==='review'?'selected':''}>🔵 اعتماد</option>
            <option value="closed" ${t.status==='closed'?'selected':''}>🟢 مغلق</option>
        </select>`;

        return `<div class="tag-card ${tagClass}" style="opacity: ${t.status==='closed'?'0.6':'1'}; display:block;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <b style="color:${t.color==='red'?'#D32F2F':'#1976D2'}; font-size:15px;">تاج ${t.color==='red'?'أحمر (صيانة)':'أزرق (إنتاج)'}</b>
                    <div style="font-size:11px; color:var(--gray); margin-top:3px; font-weight:bold;">🏭 ${escapeHtml(t.dept)} | ⚙️ ${escapeHtml(t.machine || 'عام')}</div>
                    <div style="font-size:10px; color:var(--gray); margin-bottom:5px;">📅 ${escapeHtml(t.date)} - 👤 ${escapeHtml(t.auditor)}</div>
                </div>
                <div style="display:flex; gap:3px; align-items:center;">${editBtnHtml} ${deleteBtnHtml} ${statusSelect}</div>
            </div>
            ${imgHtml}
            <div style="font-size:14px; font-weight:bold; margin-top:5px; background:var(--light-gray); padding:8px; border-radius:6px;">${escapeHtml(t.desc)}</div>
        </div>`;
    }).join('');
}

function deleteTag(id) {
    let t = tagsData.find(x => x.id === id);
    if (!t) return;
    if (currentUser.role !== 'admin' && currentUser.name !== t.auditor) return alert('عفواً، لا تملك صلاحية مسح هذا التاج.');
    
    if(confirm('هل أنت متأكد من مسح هذا التاج نهائياً؟')) {
        tagsData = tagsData.filter(x => x.id !== id);
        renderTags(); syncToServer(); logAction('مسح تاج');
    }
}

function editTag(id) {
    let t = tagsData.find(x => x.id === id);
    if (!t) return;
    if (currentUser.role !== 'admin' && currentUser.name !== t.auditor) return alert('عفواً، لا تملك صلاحية تعديل هذا التاج.');
    
    let newDesc = prompt("تعديل وصف المشكلة:", t.desc);
    if (newDesc !== null && newDesc.trim() !== "") {
        t.desc = sanitizeInput(newDesc);
        renderTags(); syncToServer(); logAction('تعديل محتوى التاج');
    }
}

function updateTagState(id, newState) {
    let t = tagsData.find(x => x.id === id);
    if(t) { 
        if (currentUser.role !== 'admin' && currentUser.role !== 'auditor' && currentUser.name !== t.auditor) return alert('عفواً، لا تملك صلاحية تعديل حالة التاج.');
        t.status = newState; 
        renderTags(); syncToServer(); 
        logAction(`تغيير حالة التاج إلى: ${newState}`); 
        if(newState === 'closed') awardPoints(20, 'إغلاق تاج معلق');
    }
}

async function handleTagImage(event) {
    const file = event.target.files[0]; if(!file) return;
    document.getElementById('tagImagePreview').innerHTML = "<span style='font-size:12px; color:var(--primary); font-weight:bold;'>⏳ جاري رفع صورة التاج...</span>";
    
    processAndEnhanceImage(file, async function(dataUrl) {
        const downloadURL = await uploadImageToStorage(dataUrl, `tags_images/${document.getElementById('newTagDept').value || 'general'}`);
        
        if(downloadURL) {
            currentTagImg = downloadURL;
            document.getElementById('tagImagePreview').innerHTML = `<img src="${downloadURL}" style="height:60px; border-radius:4px; border:1px solid #ccc;"><br><button class="btn btn-danger btn-sm" style="margin-top:5px;" onclick="currentTagImg=null; document.getElementById('tagImagePreview').innerHTML='';">🗑️ مسح الصورة</button>`;
        } else {
            document.getElementById('tagImagePreview').innerHTML = "<span style='font-size:11px; color:red;'>❌ فشل رفع الصورة للسيرفر</span>";
        }
    });
}
// ==========================================
// SMART GLOBAL SEARCH
// ==========================================
function executeGlobalSearch() {
    const query = document.getElementById('globalSearchInput').value.trim().toLowerCase();
    const resultsBox = document.getElementById('searchResults');
    
    if (query.length < 2) {
        resultsBox.style.display = 'none';
        return;
    }

    let resultsHtml = '';
    
    let foundAudits = historyData.filter(a => 
        a.dept.toLowerCase().includes(query) || 
        (a.machine && a.machine.toLowerCase().includes(query)) || 
        a.auditor.toLowerCase().includes(query) || 
        a.date.includes(query)
    ).slice(0, 5);

    if (foundAudits.length > 0) {
        resultsHtml += `<div style="padding:8px 10px; background:var(--primary-light); color:var(--primary-dark); font-weight:bold; font-size:12px;">📊 التقارير والمراجعات</div>`;
        foundAudits.forEach(a => {
            resultsHtml += `<div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;" onclick="viewDetailedReport('${a.id}'); document.getElementById('searchResults').style.display='none';">
                <b>${escapeHtml(a.dept)} (ماكينة: ${escapeHtml(a.machine || 'عام')})</b> <span style="float:left; color:var(--success); font-weight:bold;">${a.totalPct}%</span>
                <div style="font-size:11px; color:gray;">📅 ${escapeHtml(a.date)} | 👤 ${escapeHtml(a.auditor)}</div>
            </div>`;
        });
    }

    let foundTags = tagsData.filter(t => 
        t.desc.toLowerCase().includes(query) || 
        (t.machine && t.machine.toLowerCase().includes(query)) || 
        t.dept.toLowerCase().includes(query)
    ).slice(0, 5);

    if (foundTags.length > 0) {
        resultsHtml += `<div style="padding:8px 10px; background:#ffebee; color:#d32f2f; font-weight:bold; font-size:12px;">🏷️ التاجات والمشكلات</div>`;
        foundTags.forEach(t => {
            let status = t.status === 'open' ? '🔴 مفتوح' : (t.status === 'closed' ? '🟢 مغلق' : '🟡 قيد العمل');
            const machineFilterValue = sanitizeInput(t.machine || '').replace(/'/g, "\\'");
            resultsHtml += `<div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;" onclick="showScreen('tagsScreen'); document.getElementById('filterTagMachine').value='${machineFilterValue}'; renderTags(); document.getElementById('searchResults').style.display='none';">
                <b>${escapeHtml(t.desc.substring(0,30))}...</b> <span style="float:left; font-size:11px; font-weight:bold;">${status}</span>
                <div style="font-size:11px; color:gray;">🏭 ${escapeHtml(t.dept)} (⚙️ ${escapeHtml(t.machine || 'عام')})</div>
            </div>`;
        });
    }

    let foundTasks = tasksData.filter(t => 
        t.task.toLowerCase().includes(query) || 
        t.dept.toLowerCase().includes(query)
    ).slice(0, 5);

    if (foundTasks.length > 0) {
        resultsHtml += `<div style="padding:8px 10px; background:#fff3e0; color:#e65100; font-weight:bold; font-size:12px;">📋 مهام العمل (CAPA)</div>`;
        foundTasks.forEach(t => {
            let status = t.status === 'pending' ? '⏳ قيد الانتظار' : '✔️ تمت';
            resultsHtml += `<div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;" onclick="showScreen('tasksScreen'); document.getElementById('searchResults').style.display='none';">
                <b>${t.task.substring(0,30)}...</b> <span style="float:left; font-size:11px; font-weight:bold;">${status}</span>
                <div style="font-size:11px; color:gray;">🏭 ${t.dept}</div>
            </div>`;
        });
    }

    if (resultsHtml === '') {
        resultsHtml = `<div style="padding:15px; text-align:center; color:gray;">لا توجد نتائج مطابقة لـ "${query}"</div>`;
    }

    resultsBox.innerHTML = resultsHtml;
    resultsBox.style.display = 'block';
}

document.addEventListener('click', function(event) {
    const searchBox = document.getElementById('searchResults');
    const searchInput = document.getElementById('globalSearchInput');
    if (searchBox && event.target !== searchInput && !searchBox.contains(event.target)) {
        searchBox.style.display = 'none';
    }
});

async function scanBarcodeFromImage(event) {
    const file = event.target.files[0]; if(!file) return;
    document.getElementById('globalSearchInput').value = "⏳ جاري قراءة الباركود...";
    
    try {
        if (!('BarcodeDetector' in window)) throw new Error('غير مدعوم');
        const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
        const bitmap = await createImageBitmap(file);
        const barcodes = await barcodeDetector.detect(bitmap);
        
        if (barcodes.length > 0) {
            let code = barcodes[0].rawValue;
            document.getElementById('globalSearchInput').value = code;
            executeGlobalSearch();
            awardPoints(5, 'استخدام الباركود الذكي');
        } else {
            alert('لم يتم العثور على باركود واضح في الصورة.');
            document.getElementById('globalSearchInput').value = '';
        }
    } catch(e) {
        let manualCode = prompt('هاتفك لا يدعم مسح الباركود السريع. برجاء كتابة كود الماكينة يدوياً:');
        if(manualCode) { 
            document.getElementById('globalSearchInput').value = manualCode; 
            executeGlobalSearch(); 
        } else {
            document.getElementById('globalSearchInput').value = '';
        }
    }
    event.target.value = '';
}

function generateAndPrintQR() {
    const dept = document.getElementById('qrDeptSelect').value;
    const machine = document.getElementById('qrMachineInput').value.trim();
    if(!machine) return alert('برجاء كتابة اسم أو رقم الماكينة أولاً.');

    const qrData = encodeURIComponent(machine); 
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>طباعة باركود - ${machine}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Arial; text-align: center; padding: 40px; background: #f5f5f5; }
                .ticket { background: #fff; border: 4px solid #1565C0; padding: 30px; border-radius: 20px; display: inline-block; width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); margin-bottom: 20px; }
                h1 { color: #1565C0; margin-bottom: 5px; font-size: 28px; }
                h2 { color: #555; margin-top: 0; font-size: 22px; }
                .machine-name { color: #D32F2F; font-size: 32px; margin: 15px 0; padding: 10px; background: #FFEBEE; border-radius: 10px; }
                img { margin: 20px 0; border: 3px solid #eee; padding: 15px; border-radius: 15px; width: 250px; height: 250px; }
                .instructions { font-size: 16px; color: #333; font-weight: bold; }
                .footer { font-size: 13px; color: #999; margin-top: 30px; border-top: 2px dashed #ccc; padding-top: 15px; }
                .btn-action { background: #1565C0; color: white; padding: 12px 25px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: bold; margin: 5px; }
                @media print { .no-print { display: none !important; } body { background: white; padding:0; } .ticket{ box-shadow: none; } }
            </style>
        </head>
        <body>
            <div class="ticket">
                <h1>نظام إدارة (TPM)</h1>
                <h2>قسم: ${dept}</h2>
                <div class="machine-name">${machine}</div>
                <img src="${qrUrl}" />
                <p class="instructions">📱 امسح الباركود عبر التطبيق لفتح الملف الذكي</p>
                <div class="footer">إعداد وتطوير: م. محمد فايز</div>
            </div>
            <div class="no-print">
                <button class="btn-action" onclick="window.print()">🖨️ طباعة التيكت</button>
                <button class="btn-action" style="background:#C62828;" onclick="window.close()">❌ إغلاق</button>
            </div>
        </body>
        </html>
    `);
}

// ==========================================
// KAIZEN IMAGE HANDLING
// ==========================================
let kaizenImgs = { before: null, after: null };
function handleKaizenImage(event, type) {
    const file = event.target.files[0]; if(!file) return;
    let previewId = type === 'before' ? 'kaizenBeforePreview' : 'kaizenAfterPreview';
    document.getElementById(previewId).innerHTML = "<span style='font-size:10px; color:gray;'>⏳ جاري الضغط...</span>";
    
    processAndEnhanceImage(file, function(dataUrl) {
        kaizenImgs[type] = dataUrl;
        document.getElementById(previewId).innerHTML = `<img src="${dataUrl}" style="height:60px; border-radius:4px; border:1px solid #ccc;">`;
    });
}

function submitManualKaizen() {
    const title = sanitizeInput(document.getElementById('newKaizenTitle').value);
    const dept = sanitizeInput(document.getElementById('newKaizenDept').value);
    
    if(!title || !kaizenImgs.before || !kaizenImgs.after) return alert('برجاء كتابة الوصف ورفع صورتين (قبل وبعد).');
    
    // إظهار رسالة تحميل وقفل الزرار
    const submitBtn = document.querySelector('#kaizenUploadModal .btn-success');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = "⏳ جاري الدمج والرفع...";
    submitBtn.disabled = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const imgBefore = new Image(); const imgAfter = new Image();
    
    imgBefore.onload = function() {
        imgAfter.onload = async function() {
            canvas.width = 600; canvas.height = 300;
            ctx.fillStyle = "white"; ctx.fillRect(0,0,600,300);
            ctx.drawImage(imgBefore, 0, 0, 295, 300);
            ctx.drawImage(imgAfter, 305, 0, 295, 300);
            
            ctx.fillStyle = "rgba(211,47,47,0.8)"; ctx.fillRect(10, 10, 50, 25);
            ctx.fillStyle = "white"; ctx.font = "bold 14px Arial"; ctx.fillText("قبل", 25, 27);
            
            ctx.fillStyle = "rgba(46,125,50,0.8)"; ctx.fillRect(315, 10, 50, 25);
            ctx.fillStyle = "white"; ctx.font = "bold 14px Arial"; ctx.fillText("بعد", 330, 27);
            
            let combinedImgBase64 = canvas.toDataURL('image/jpeg', 0.8);
            
            // 🔥 هنا التغيير الجوهري: نرفع الصورة المدمجة للـ Storage
            const downloadURL = await uploadImageToStorage(combinedImgBase64, `kaizen_images/${dept}`);
            
            if (downloadURL) {
                let fakeAuditId = uniqueNumericId().toString();
                let fakeAudit = {
                    id: fakeAuditId, dept: dept, auditor: currentUser.name, date: new Date().toLocaleDateString('ar-EG'),
                    totalPct: 100, stepsOrder: ['ManualKaizen'], results: { 'ManualKaizen': { images: { 'img_1': { title: title, data: downloadURL } } } }
                };
                historyData.push(fakeAudit);
                
                document.getElementById('newKaizenTitle').value = '';
                document.getElementById('kaizenBeforePreview').innerHTML = ''; document.getElementById('kaizenAfterPreview').innerHTML = '';
                kaizenImgs = { before: null, after: null };
                document.getElementById('kaizenUploadModal').style.display = 'none';
                
                awardPoints(40, 'مشاركة كايزن (قبل وبعد)');
                syncToServer(); renderKaizenFeed(); alert('تم نشر التحسين بنجاح في مجتمع كايزن! 🚀');
            } else {
                alert("❌ حدث خطأ أثناء الرفع للسيرفر.");
            }
            
            // إرجاع الزرار لحالته الأصلية
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        };
        imgAfter.src = kaizenImgs.after;
    };
    imgBefore.src = kaizenImgs.before;
}

// ==========================================
// SIGNATURE PAD
// ==========================================
let sigCanvas, sigCtx, isDrawing = false;
function initSignaturePad() {
    sigCanvas = document.getElementById('signatureCanvas');
    if(!sigCanvas) return;
    sigCtx = sigCanvas.getContext('2d');
    sigCtx.lineWidth = 3;
    sigCtx.lineCap = 'round';
    sigCtx.strokeStyle = '#0D47A1'; 
    clearSignature(); 

    sigCanvas.onmousedown = (e) => { isDrawing = true; sigCtx.beginPath(); sigCtx.moveTo(e.offsetX, e.offsetY); };
    sigCanvas.onmousemove = (e) => { if(isDrawing) { sigCtx.lineTo(e.offsetX, e.offsetY); sigCtx.stroke(); } };
    sigCanvas.onmouseup = () => { isDrawing = false; };
    sigCanvas.onmouseleave = () => { isDrawing = false; };

    sigCanvas.ontouchstart = (e) => { isDrawing = true; let touch = e.touches[0]; let rect = sigCanvas.getBoundingClientRect(); sigCtx.beginPath(); sigCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top); e.preventDefault(); };
    sigCanvas.ontouchmove = (e) => { if(isDrawing) { let touch = e.touches[0]; let rect = sigCanvas.getBoundingClientRect(); sigCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top); sigCtx.stroke(); } e.preventDefault(); };
    sigCanvas.ontouchend = () => { isDrawing = false; };
}

function clearSignature() {
    if(sigCtx && sigCanvas) { sigCtx.fillStyle = '#fafafa'; sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height); }
}

// ==========================================
// GAMIFICATION POINTS
// ==========================================
function awardPoints(points, reason) {
    if(!currentUser.name) return;
    if(!userPoints[currentUser.name]) userPoints[currentUser.name] = 0;
    userPoints[currentUser.name] += points;
    syncToServer();
    
    let toast = document.createElement('div');
    toast.innerHTML = `🎉 كسبت <b>+${points}</b> نقطة! (${reason})`;
    toast.style.cssText = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:var(--success); color:white; padding:10px 20px; border-radius:20px; font-weight:bold; z-index:9999; box-shadow: 0 4px 10px rgba(0,0,0,0.3); animation: fadeIn 0.3s, fadeOut 0.5s 2.5s forwards;";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ==========================================
// CENTRAL API KEYS MANAGEMENT (للمدير فقط)
// ==========================================
function saveApiKeys() {
    if(!hasRole('admin')) return alert('صلاحية المدير فقط.');
    const imgbb = document.getElementById('imgbbKeyInput').value.trim();
    const gemini = document.getElementById('geminiKeyInput').value.trim();
    
    document.getElementById('cloudStatus').innerHTML = "⏳ جاري حفظ المفاتيح...";
    
    db.ref('tpm_system/api_keys').set({ imgbb: imgbb, gemini: gemini })
    .then(() => {
        alert('✅ تم حفظ المفاتيح المركزية! ستعمل الآن عند جميع العمال تلقائياً.');
        document.getElementById('cloudStatus').innerHTML = "☁️ متصل ومزامن";
    })
    .catch(e => alert('❌ خطأ: ' + e.message));
}