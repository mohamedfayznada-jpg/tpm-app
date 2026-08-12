export default async function handler(req, res) {
    // 1. حماية البوابة (Method Guard)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, imageBase64 } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        // 2. التحقق من وجود مفتاح التشغيل (Fail-Fast)
        if (!apiKey) throw new Error("Gemini API Key is missing in environment variables.");

        // 3. هندسة محتوى الطلب (Payload Construction)
        let parts = [{ text: prompt || "تحليل" }];

        if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 20) {
            // تنظيف الـ Base64 من الترويسة (Data URI scheme) لمنع أخطاء فك التشفير في جوجل
            const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            parts.push({ 
                inline_data: { 
                    mime_type: "image/jpeg", 
                    data: cleanBase64 
                } 
            });
        }

        const payload = { 
            contents: [{ role: "user", parts: parts }] 
        };

        // 4. استراتيجية الموديلات (Model Routing Strategy)
        // نعتمد عائلة 1.5 الأحدث: Flash للسرعة، و Pro للدقة العالية كبديل للطوارئ
        const primaryModel = "gemini-1.5-flash";
        const fallbackModel = "gemini-1.5-pro";

        // 5. دالة الاتصال الديناميكية (Dynamic Fetcher)
        async function callGemini(modelName) {
            // 🛠️ تم دمج اسم الموديل ديناميكياً لحل مشكلة التوجيه الأعمى
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            return await response.json();
        }

        // 6. التنفيذ مع نظام التحويل الذاتي (Failover Mechanism)
        let data = await callGemini(primaryModel);

        // إذا رفضت جوجل الموديل الأساسي (لأي تغيير مستقبلي في خوادمهم)، نعبر للموديل البديل بصمت
        if (data.error && (data.error.message.includes("not found") || data.error.message.includes("not supported"))) {
            console.warn(`[Architect-Prime] Model ${primaryModel} failed. Auto-switching to ${fallbackModel}...`);
            data = await callGemini(fallbackModel);
        }

        // إذا استمر الفشل، نقوم بإيقاف العملية وإرجاع الخطأ للواجهة
        if (data.error) throw new Error(data.error.message);

        // 7. الإرجاع الناجح (Success Delivery)
        return res.status(200).json(data);

    } catch (error) {
        console.error("[Architect-Prime] Gemini AI Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
