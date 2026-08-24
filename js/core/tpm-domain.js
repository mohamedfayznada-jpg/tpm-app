// TPM domain contract — single source of truth for terminology and KPI intent.
// This file describes the business model; it does not replace Firebase authorization rules.

export const TPM_DOMAIN = Object.freeze({
    pillars: Object.freeze([
        { code: 'JH', nameAr: 'الصيانة الذاتية', nameEn: 'Autonomous Maintenance', workspace: 'jhPortalScreen' },
        { code: 'PM', nameAr: 'الصيانة المخططة', nameEn: 'Planned Maintenance', workspace: 'pmScreen' },
        { code: 'KK', nameAr: 'التحسين المستمر', nameEn: 'Focused Improvement / Kaizen', workspace: 'kkScreen' },
        { code: 'QM', nameAr: 'الصيانة الموجهة للجودة', nameEn: 'Quality Maintenance', workspace: null },
        { code: 'ET', nameAr: 'التعليم والتدريب', nameEn: 'Education & Training', workspace: 'etScreen' },
        { code: 'HSE', nameAr: 'السلامة والصحة والبيئة', nameEn: 'Safety, Health & Environment', workspace: 'hseScreen' },
        { code: 'EM', nameAr: 'الإدارة المبكرة', nameEn: 'Early Management', workspace: null },
        { code: 'OT', nameAr: 'TPM الإداري', nameEn: 'Office TPM', workspace: null }
    ]),

    improvementCycles: Object.freeze([
        { code: 'PDCA', nameAr: 'دورة التحسين PDCA' },
        { code: 'A3', nameAr: 'حل المشكلة A3' },
        { code: '5WHY', nameAr: 'تحليل السبب الجذري 5 Why' },
        { code: 'OPL', nameAr: 'درس نقطة واحدة OPL' }
    ]),

    lossCategories: Object.freeze([
        { code: 'BD', nameAr: 'أعطال المعدات' },
        { code: 'SETUP', nameAr: 'التجهيز والتغيير' },
        { code: 'IDLE', nameAr: 'التوقفات والخمول' },
        { code: 'SPEED', nameAr: 'فقد السرعة' },
        { code: 'DEFECT', nameAr: 'العيوب وإعادة التشغيل' },
        { code: 'STARTUP', nameAr: 'فواقد بدء التشغيل' }
    ]),

    kpiFramework: Object.freeze([
        { code: 'OEE', nameAr: 'الكفاءة الكلية للمعدات', group: 'P' },
        { code: 'MTBF', nameAr: 'متوسط الزمن بين الأعطال', group: 'PM' },
        { code: 'MTTR', nameAr: 'متوسط زمن الإصلاح', group: 'PM' },
        { code: 'TAG_CLOSURE', nameAr: 'معدل إغلاق التاجات', group: 'Q' },
        { code: 'KAIZEN', nameAr: 'معدل التحسينات المنفذة', group: 'KK' },
        { code: 'AUDIT', nameAr: 'نضج/التزام المراجعات', group: 'TPM' },
        { code: 'CLIT', nameAr: 'الالتزام بقوائم الفحص', group: 'JH' }
    ])
});

export const getTPMPillar = (code) => TPM_DOMAIN.pillars.find((pillar) => pillar.code === code) || null;
