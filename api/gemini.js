export default async function handler(req, res) {
    // 1. حماية البوابة (Method Guard)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, imageBase64 } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        // 2. التحقق من وجود مفتاح التشغيل
        if (!apiKey) throw new Error("مفتاح Gemini API غير موجود في متغيرات البيئة (Environment Variables).");

        // 3. هندسة محتوى الطلب (Payload Construction)
        let parts = [{ text: prompt || "تحليل" }];

        // معالجة الصور إن وجدت (Multimodal Support)
        if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 20) {
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

        // 4. الاعتماد الكلي على الموديل الأسرع والأكثر استقراراً
        const modelName = "gemini-1.5-flash";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        // 5. الاتصال بخوادم جوجل
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();

        // 6. التقاط أخطاء جوجل الحقيقية وتمريرها للواجهة لفهم المشكلة
        if (!response.ok) {
            console.error("[Google API Error]:", data);
            throw new Error(data.error?.message || "فشل الاتصال بخوادم الذكاء الاصطناعي");
        }

        // 7. الإرجاع الناجح
        return res.status(200).json(data);

    } catch (error) {
        console.error("[Architect-Prime Backend Error]:", error);
        return res.status(500).json({ error: error.message });
    }
}
