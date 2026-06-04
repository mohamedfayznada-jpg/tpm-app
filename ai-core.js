// 🔥 ملف ai-core.js - العقل الجديد كلياً
console.log("🚀 AI Core V1.0 Loaded Successfully!");

let tempAiPdf = null;

// 1. محرك الذكاء الاصطناعي المُحكم
async function safeGeminiCall(promptText, pdfBase64 = null) {
    const key = globalApiKeys?.gemini || (window.__TPM_CONFIG__ && window.__TPM_CONFIG__.geminiApiKey);
    if(!key) return "⚠️ خطأ: مفتاح الذكاء الاصطناعي مفقود من الإعدادات!";

    // برومبت عسكري يمنع أي هرتلة
    let prompt = `أنت مهندس صيانة. تعليمات صارمة جداً: أجب بنص عادي فقط. ممنوع استخدام أي جداول أو علامات HTML أو أكواد برمجية نهائياً. أجب باختصار شديد في 3 أسطر كحد أقصى.\n\nالسؤال هو: ${promptText}`;
    
    let body = { contents: [{ parts: [{ text: prompt }] }] };
    
    if (pdfBase64) {
        let b64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
        body.contents[0].parts.push({ inline_data: { mime_type: "application/pdf", data: b64 } });
    }

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if(data.error) return "⚠️ خطأ من جوجل: " + data.error.message;
        
        let text = data.candidates[0].content.parts[0].text;
        // السلاح النووي: مسح أي كود Markdown أو HTML
        text = text.replace(/```[\s\S]*?```/g, "").replace(/<\/?[^>]+(>|$)/g, ""); 
        return text.trim();
    } catch(e) {
        return "⚠️ فشل الاتصال بالإنترنت أو السيرفر.";
    }
}

// 2. دوال الشاشة الجديدة (بأسماء جديدة لتجنب أي تضارب)
window.askAI_New = async function() {
    let q = document.getElementById('kbSearchInput').value;
    if(!q) return alert("اكتب سؤالك أولاً!");
    
    document.getElementById('aiSearchResponse').style.display = 'block';
    document.getElementById('aiResponseText').innerHTML = "<i>جاري التفكير... ⏳</i>";
    
    let answer = await safeGeminiCall(q);
    document.getElementById('aiResponseText').innerHTML = answer.replace(/\n/g, '<br>');
    window.lastAIAnswer = answer;
};

window.quizAI_New = async function() {
    let topic = prompt("أدخل موضوع الامتحان:");
    if(!topic) return;
    
    document.getElementById('aiSearchResponse').style.display = 'block';
    document.getElementById('aiResponseText').innerHTML = "<i>جاري بناء الاختبار... ⏳</i>";
    
    let answer = await safeGeminiCall(`اكتب 3 أسئلة اختيارات عن: ${topic}`);
    document.getElementById('aiResponseText').innerHTML = answer.replace(/\n/g, '<br>');
};

window.helpAudit_New = async function(itemName) {
    document.getElementById('aiModal').style.display = 'flex';
    document.getElementById('aiModalText').innerHTML = "<div style='padding:20px; text-align:center;'>جاري استشارة الخبير... ⏳</div>";
    
    let answer = await safeGeminiCall(`كيف أفحص البند التالي في مصنع: "${itemName}"؟`);
    document.getElementById('aiModalText').innerHTML = `<div style="padding:15px; font-size:14px; line-height:1.7;">${answer.replace(/\n/g, '<br>')}</div>`;
};

// 3. رفع الـ PDF بطريقة آمنة
window.uploadPdf_New = function(event) {
    const file = event.target.files[0];
    if(!file) return;
    
    document.getElementById('pdfExtractStatus').innerText = "جاري قراءة الملف... ⏳";
    const reader = new FileReader();
    reader.onload = function(e) {
        tempAiPdf = e.target.result;
        document.getElementById('pdfExtractStatus').innerHTML = `✅ تم رفع: <b style="color:var(--primary);">${file.name}</b>`;
    };
    reader.readAsDataURL(file);
};

window.saveBook_New = function() {
    const title = document.getElementById('kbTitle').value;
    if(!title) return alert("أدخل العنوان!");
    
    let newBook = { 
        id: Date.now().toString(), 
        title: title, 
        category: document.getElementById('kbCategory').value, 
        pdfData: tempAiPdf, // حفظ في الذاكرة محلياً لعدم خنق الفايربيز
        date: new Date().toLocaleDateString()
    };
    
    knowledgeBaseData.push(newBook);
    document.getElementById('addBookModal').style.display = 'none';
    document.getElementById('kbTitle').value = '';
    document.getElementById('pdfExtractStatus').innerText = "اضغط لرفع ملف PDF 📄";
    tempAiPdf = null;
    
    alert("✅ تم الحفظ بنجاح!");
    if(typeof renderKnowledgeShelves === 'function') renderKnowledgeShelves();
};

// 4. حقن زر الاستنجاد الجديد
setInterval(() => {
    document.querySelectorAll('.audit-item .item-header').forEach(header => {
        if(!header.querySelector('.new-sos-btn')) {
            // نمسح الزرار القديم الميت لو موجود
            let oldBtn = header.querySelector('.sos-btn');
            if(oldBtn) oldBtn.remove();
            
            const titleText = header.innerText.replace(/[\d\.]/g, '').trim();
            const btn = document.createElement('button');
            btn.className = "new-sos-btn";
            btn.innerHTML = "🧠 مساعدة";
            btn.style.cssText = "margin-right:auto; background:#DBEAFE; color:#1E3A8A; border:1px solid #1E3A8A; border-radius:5px; padding:2px 8px; font-size:11px; cursor:pointer;";
            btn.onclick = () => window.helpAudit_New(titleText);
            header.appendChild(btn);
        }
    });
}, 2000);
