export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { prompt, imageBase64 } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error("Gemini API Key is missing.");

        // تجهيز البيانات
        let parts = [{ text: prompt || "تحليل" }];
        let hasImage = false;

        if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 20) {
            const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            parts.push({ inline_data: { mime_type: "image/jpeg", data: cleanBase64 } });
            hasImage = true;
        }

        const payload = { contents: [{ role: "user", parts: parts }] };

        // 🚀 [Out of the Box] - قائمة الموديلات للتبديل التلقائي
        const primaryModel = "gemini-1.5-flash";
        const fallbackModel = hasImage ? "gemini-1.5-pro" : "gemini-1.0-pro";

        // دالة الاتصال بجوجل (استخدمنا v1 المستقر بدلاً من v1beta المتقلب)
        async function callGemini(modelName) {
            const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        }

        // 1. المحاولة بالموديل الأساسي السريع
        let data = await callGemini(primaryModel);

        // 2. نظام التحويل الذاتي (لو جوجل رفضت الموديل لأي سبب، السيرفر بيعالجها في صمت)
        if (data.error && (data.error.message.includes("not found") || data.error.message.includes("not supported"))) {
            console.warn(`Model ${primaryModel} failed. Auto-switching to ${fallbackModel}...`);
            data = await callGemini(fallbackModel);
        }

        // 3. لو كله فشل، نطلع الإيرور
        if (data.error) throw new Error(data.error.message);

        // 4. الرد الناجح
        res.status(200).json(data);

    } catch (error) {
        console.error("Gemini AI Error:", error);
        res.status(500).json({ error: error.message });
    }
}
