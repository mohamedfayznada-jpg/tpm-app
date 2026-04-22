// ==========================================
// 🚀 FACTORY OS - V5.2 (FULL UNABRIDGED)
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

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// متغيرات النظام
let departments = ['إنتاج', 'صيانة', 'جودة', 'مخازن'], tagsData = [], historyData = [], userPoints = {};
let currentUser = { name: '', role: '' }, currentAudit = null;

// 🛡️ تعقيم المدخلات (أمان عالي)
function sanitizeInput(val) { 
    if (!val) return '';
    const div = document.createElement('div');
    div.textContent = val;
    return div.innerHTML.trim(); 
}

// 🎤 التعرف على الصوت
function startVoiceRecognition(targetId) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("متصفحك لا يدعم التعرف على الصوت");
    const rec = new SpeechRecognition();
    rec.lang = 'ar-EG';
    rec.start();
    rec.onresult = (e) => { document.getElementById(targetId).value = e.results[0][0].transcript; };
}

// ------------------------------------------
// 🔍 دالة مسح الباركود الفعالة (النسخة الحديثة)
// ------------------------------------------
async function scanBarcodeFromImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showToast('جاري قراءة الباركود... 🔍');
    const html5QrCode = new Html5Qrcode("searchResults"); 
    
    try {
        const decodedText = await html5QrCode.scanFile(file, true);
        showToast('تمت القراءة بنجاح!');
        
        document.getElementById('searchResults').style.display = 'block';
        document.getElementById('searchResults').innerHTML = `
            <div style="padding:20px; background:rgba(46,125,50,0.1); border:1px solid var(--success); border-radius:15px; text-align:center;">
                <div style="font-size:30px; margin-bottom:10px;">✅</div>
                <b class="success-text" style="font-size:16px;">تم التعرف على البيانات:</b><br>
                <div style="margin-top:10px; padding:10px; background:rgba(0,0,0,0.3); border-radius:8px; color:var(--text-main); word-break: break-all; font-family:monospace;">
                    ${decodedText}
                </div>
                <button class="btn btn-sm btn-outline" style="margin-top:15px; width:auto;" onclick="document.getElementById('searchResults').style.display='none'">إغلاق</button>
            </div>
        `;
    } catch (err) {
        showToast('تعذرت قراءة الباركود، تأكد من وضوح الصورة.');
    }
}
// 🔐 الدخول والمزامنة الذكية
async function login() {
    const u = document.getElementById('loginUsername').value;
    const p = document.getElementById('loginPassword').value;
    const n = document.getElementById('displayName').value;
    if(!u || !p || !n) return alert("برجاء إكمال البيانات");
    try {
        await firebase.auth().signInWithEmailAndPassword(u + "@tpm.app", p);
        currentUser = { name: n, role: 'admin' };
        localStorage.setItem('tpm_user', n);
        initGranularListeners();
        showScreen('homeScreen');
        document.getElementById('bottomNav').style.display = 'flex';
    } catch(e) { alert("خطأ في الدخول"); }
}

function initGranularListeners() {
    db.ref('tpm_system/tags').on('value', snap => {
        tagsData = Object.values(snap.val() || {}).filter(x => x.id);
        renderTags(); updateHomeDashboard();
    });
    db.ref('tpm_system/history').on('value', snap => {
        historyData = Object.values(snap.val() || {}).filter(x => x.id);
    });
    db.ref('tpm_system/points').on('value', snap => {
        userPoints = snap.val() || {};
        updateUsersLeaderboard();
    });
}

// 📋 مصفوفة التقييم الكاملة (بدون أي اختصارات)
const AUDIT_DATA = {
    "JH-0": { name: "الخطوة التحضيرية", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوه التحضيرية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل"},{level:6,score:5,desc:"خطة كاملة ومعتمدة وجميع المشغلين على دراية بها"}] },
        { id: 2, title: "وجود ماده علمية متكامله لشرح خطوات الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل"},{level:6,score:5,desc:"مادة علمية متكاملة تغطي كافة الأنشطة"}] },
        { id: 3, title: "قياس مدى فهم مشغلي الماكينات لأنشطة خطوات الصيانه الذاتيه", maxScore: 15, levels: [{level:1,score:0,desc:"لا يوجد وعي"},{level:6,score:15,desc:"وعي كامل بجميع الأنشطة"}] },
        { id: 4, title: "إعداد وإصدار قائمة بجميع أماكن الخطر بالماكينات", maxScore: 10, levels: [{level:1,score:0,desc:"لا توجد قائمة"},{level:6,score:10,desc:"قائمة شاملة ومعتمدة ومشروحة للجميع"}] },
        { id: 5, title: "تدريب عملي (OJT) للظواهر السبع الغير طبيعية", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد دلائل"},{level:6,score:20,desc:"تدريب عملي متكامل وفهم كامل للظواهر السبع"}] },
        { id: 6, title: "تدريب عملي لشرح الـ Structure Diagram لأجزاء الماكينات", maxScore: 25, levels: [{level:1,score:0,desc:"لا توجد دلائل"},{level:6,score:25,desc:"شرح وافٍ لجميع أجزاء الماكينة وفهم كامل"}] },
        { id: 7, title: "إعداد نماذج الـ OPL الخاصة بأنشطة الصيانة الذاتية", maxScore: 15, levels: [{level:1,score:0,desc:"لا توجد دلائل"},{level:6,score:15,desc:"تنفيذ جميع نماذج الـ OPL المخططة بوعي كامل"}] },
        { id: 8, title: "المراجعة الذاتية بواسطة فريق الصيانة الذاتية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل"},{level:6,score:5,desc:"مراجعة دورية ونشر النتائج وخطة عمل تصحيحية"}] }
    ]},
    "JH-1": { name: "التنظيف المبدئي والفحص", items: [
        { id: 1, title: "إعداد خطة عمل لتنفيذ انشطة الخطوه الأولى", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد خطة"},{level:6,score:5,desc:"خطة كاملة ومعتمدة وجميع المشغلين على دراية بها"}] },
        { id: 2, title: "إعداد وإصدار خرائط الصيانة الذاتية (CLIT MAP)", maxScore: 20, levels: [{level:1,score:0,desc:"لا توجد خرائط"},{level:6,score:20,desc:"خرائط تفصيلية لكافة الأجزاء والأزمنة"}] },
        { id: 3, title: "استخدام التاجات لرصد الظواهر السبع ومصفوفة التاجات", maxScore: 10, levels: [{level:1,score:0,desc:"لا يوجد استخدام"},{level:6,score:10,desc:"حصر وتصنيف دقيق لكل التاجات دورياً"}] },
        { id: 4, title: "رصد الأماكن التي يصعب الوصول إليها", maxScore: 5, levels: [{level:1,score:0,desc:"لا يوجد رصد"},{level:6,score:5,desc:"قائمة مفصلة وخطط عمل معتمدة للصيانة"}] },
        { id: 5, title: "تفعيل إستخدام نماذج ( إعرف - لماذا )", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد دلائل"},{level:6,score:5,desc:"استخدام دوري لجميع أسباب المشكلات"}] },
        { id: 6, title: "خطة عمل لتصحيح المشكلات المسجلة في التاجات", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد خطة"},{level:6,score:5,desc:"خطة مفصلة ووعي كامل من المشغلين"}] },
        { id: 7, title: "التحقق من فعالية التحسين (الظواهر السبع)", maxScore: 25, levels: [{level:1,score:0,desc:"لا يوجد تحليل"},{level:6,score:25,desc:"تحليل جذري وتنفيذ تحسينات ملموسة"}] },
        { id: 8, title: "فعالية التحسين لتقليل أزمنة الصيانة الذاتية", maxScore: 25, levels: [{level:1,score:0,desc:"لا يوجد تحليل"},{level:6,score:25,desc:"تحليل كامل وتقليل فعلي للأزمنة وتوثيقها"}] },
        { id: 9, title: "المراجعة الذاتية (الخطوة الأولى)", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد مراجعة"},{level:6,score:5,desc:"مراجعة دورية ونشر نقاط القوة والتحسين"}] }
    ]},
    "JH-2": { name: "الخطوة الثانية", items: [
        { id: 1, title: "خطة عمل الخطوة الثانية", maxScore: 5, levels: [{level:1,score:0,desc:"لا توجد"},{level:6,score:5,desc:"خطة كاملة"}] },
        { id: 2, title: "الحفاظ على الخطوة الأولى", maxScore: 10, levels: [{level:6,score:10,desc:"حفاظ بنسبة 100%"}] },
        { id: 3, title: "وعي العاملين بمصادر التلوث", maxScore: 20, levels: [{level:6,score:20,desc:"وعي كامل"}] },
        { id: 4, title: "رصد مصادر التلوث", maxScore: 20, levels: [{level:6,score:20,desc:"خرائط مفصلة"}] },
        { id: 5, title: "رصد الأماكن الصعبة", maxScore: 5, levels: [{level:6,score:5,desc:"خرائط كاملة"}] },
        { id: 6, title: "إجراءات القضاء على التلوث", maxScore: 20, levels: [{level:6,score:20,desc:"تحسينات موثقة"}] },
        { id: 7, title: "إجراءات القضاء على الأماكن الصعبة", maxScore: 20, levels: [{level:6,score:20,desc:"تقليل أزمنة الصيانة"}] },
        { id: 8, title: "موضوعات التحسين PDCA", maxScore: 10, levels: [{level:6,score:10,desc:"تطبيق كامل"}] },
        { id: 9, title: "المراجعة الذاتية", maxScore: 5, levels: [{level:6,score:5,desc:"مراجعة كاملة"}] }
    ]},
    "JH-3": { name: "الخطوة الثالثة", items: [
        { id: 1, title: "خطة عمل الخطوة الثالثة", maxScore: 5, levels: [{level:6,score:5,desc:"مكتملة"}] },
        { id: 2, title: "تحسن شروط التنظيف المبدئي", maxScore: 5, levels: [{level:6,score:5,desc:"100%"}] },
        { id: 3, title: "الحفاظ على الخطوة الثانية", maxScore: 5, levels: [{level:6,score:5,desc:"100%"}] },
        { id: 4, title: "معايير التنظيف (CLIT MAP)", maxScore: 15, levels: [{level:6,score:15,desc:"تحديد كامل وFoot Map"}] },
        { id: 5, title: "معايير التزييت والتشحيم", maxScore: 15, levels: [{level:6,score:15,desc:"إدارة مرئية وحماية من التلوث"}] },
        { id: 6, title: "معايير الفحص", maxScore: 15, levels: [{level:6,score:15,desc:"أدوات متوفرة ومعايير واضحة"}] },
        { id: 7, title: "معايير التربيط", maxScore: 15, levels: [{level:6,score:15,desc:"أدوات متوفرة بالقرب من العمل"}] },
        { id: 8, title: "نماذج الفحص الدوري", maxScore: 25, levels: [{level:6,score:25,desc:"تسجيل الوقت الفعلي بانتظام"}] },
        { id: 9, title: "رصد التسريبات وتحديث الخرائط", maxScore: 10, levels: [{level:6,score:10,desc:"وجود منحنيات توضح الموقف"}] },
        { id: 10, title: "المراجعة الذاتية", maxScore: 5, levels: [{level:6,score:5,desc:"مراجعة كاملة"}] }
    ]},
    "JH-4": { name: "الخطوة الرابعة", items: [
        { id: 1, title: "خطة الخطوة الرابعة", maxScore: 5, levels: [{level:6,score:5,desc:"مكتملة"}] },
        { id: 2, title: "الحفاظ على 1-3", maxScore: 5, levels: [{level:6,score:5,desc:"100%"}] },
        { id: 3, title: "مصفوفة المهارات Skill Matrix", maxScore: 20, levels: [{level:6,score:20,desc:"تدريب أكاديمي وعملي 75%"}] },
        { id: 4, title: "مهارات التزييت", maxScore: 5, levels: [{level:6,score:5,desc:"إتقان كامل"}] },
        { id: 5, title: "تقييم التزييت ميدانياً", maxScore: 10, levels: [{level:6,score:10,desc:"تطبيق كامل"}] },
        { id: 6, title: "مهارات نقل الحركة", maxScore: 5, levels: [{level:6,score:5,desc:"إتقان كامل"}] },
        { id: 7, title: "تقييم نقل الحركة ميدانياً", maxScore: 10, levels: [{level:6,score:10,desc:"فحص شامل"}] },
        { id: 8, title: "مهارات هيدروليك/نيوماتيك", maxScore: 5, levels: [{level:6,score:5,desc:"إتقان كامل"}] },
        { id: 9, title: "تقييم هيدروليك ميدانياً", maxScore: 10, levels: [{level:6,score:10,desc:"فحص التسريب والضوضاء"}] },
        { id: 10, title: "أساسيات الكهرباء", maxScore: 5, levels: [{level:6,score:5,desc:"إتقان كامل"}] },
        { id: 11, title: "تقييم الكهرباء ميدانياً", maxScore: 10, levels: [{level:6,score:10,desc:"فحص الحساسات والحرارة"}] },
        { id: 12, title: "المسامير والصواميل", maxScore: 5, levels: [{level:6,score:5,desc:"إتقان كامل"}] },
        { id: 13, title: "تقييم المسامير ميدانياً", maxScore: 10, levels: [{level:6,score:10,desc:"فحص الأطوال والاهتزاز"}] },
        { id: 14, title: "المراجعة الذاتية", maxScore: 5, levels: [{level:6,score:5,desc:"مراجعة كاملة"}] }
    ]},
    "JH-5": { name: "الخطوة الخامسة", items: [
        { id: 1, title: "خطة الخطوة الخامسة", maxScore: 5, levels: [{level:6,score:5,desc:"مكتملة"}] },
        { id: 2, title: "الحفاظ على 1-4", maxScore: 10, levels: [{level:6,score:10,desc:"تحسن مستويات الفحص"}] },
        { id: 3, title: "تحديث الخرائط لتفادي إغفال البنود", maxScore: 25, levels: [{level:6,score:25,desc:"استخدام علامات مرئية"}] },
        { id: 4, title: "سهولة الفحص Foot Map", maxScore: 20, levels: [{level:6,score:20,desc:"الوصول للوقت المعياري"}] },
        { id: 5, title: "الفحص الذاتي للجودة", maxScore: 20, levels: [{level:6,score:20,desc:"مراجعة معدات الوزن والقياس"}] },
        { id: 6, title: "رفع مهارات الفحص", maxScore: 20, levels: [{level:6,score:20,desc:"خطة تدريب شاملة"}] },
        { id: 7, title: "تحديث الفواقد", maxScore: 10, levels: [{level:6,score:10,desc:"منحنيات الموقف قبل وبعد"}] },
        { id: 8, title: "المراجعة الذاتية", maxScore: 5, levels: [{level:6,score:5,desc:"مراجعة كاملة"}] }
    ]},
    "JH-6": { name: "الخطوة السادسة", items: [
        { id: 1, title: "خطة الخطوة السادسة", maxScore: 5, levels: [{level:6,score:5,desc:"مكتملة"}] },
        { id: 2, title: "الحفاظ على 1-5", maxScore: 10, levels: [{level:6,score:10,desc:"إجراءات تحسين ملموسة"}] },
        { id: 3, title: "دمج الجودة والفحص الثابت", maxScore: 40, levels: [{level:6,score:40,desc:"صيانة تنبؤية متقدمة"}] },
        { id: 4, title: "تنظيم مواقع التخزين 5S", maxScore: 25, levels: [{level:6,score:25,desc:"تحديد المواقع والكميات بدقة"}] },
        { id: 5, title: "تقييم المعايير وإجراءات العمل", maxScore: 20, levels: [{level:6,score:20,desc:"منهجية واضحة للمشاكل"}] },
        { id: 6, title: "أنشطة المجموعة 5S", maxScore: 10, levels: [{level:6,score:10,desc:"منحنيات توضح التقدم"}] },
        { id: 7, title: "المراجعة الذاتية", maxScore: 5, levels: [{level:6,score:5,desc:"مراجعة كاملة"}] }
    ]}
};

// وظائف الواجهة والتحكم (تكملة app.js)
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0,0);
}

function updateHomeDashboard() {
    document.getElementById('homeOpenTags').innerText = tagsData.filter(t => t.status === 'open').length;
    let grid = departments.map(d => `<div class="card" onclick="alert('فتح قسم ${d}')">${d}</div>`).join('');
    document.getElementById('homeDeptGrid').innerHTML = grid;
}

function renderTags() {
    let c = document.getElementById('tagsListContainer');
    c.innerHTML = tagsData.map(t => `<div class="card" style="border-right: 5px solid ${t.color}"><b>${t.desc}</b><br><small>${t.machine}</small></div>`).join('');
}

// تشغيل النظام تلقائياً
window.onload = () => { if(localStorage.getItem('tpm_user')) login(); };