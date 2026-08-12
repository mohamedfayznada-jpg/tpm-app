export default async function handler(req, res) {
    // 1. حماية البوابة (Method Guard)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, imageBase64 } = req.body;
        
        // 🔑 مفتاح OpenRouter
        const apiKey = process.env.OPENROUTER_API_KEY || "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";

        if (!apiKey) throw new Error("مفتاح OpenRouter غير موجود.");

        // 2. هندسة الطلب (Payload Construction)
        let userContent = [];
        if (prompt) userContent.push({ type: "text", text: prompt });

        if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 20) {
            const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            userContent.push({
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${cleanBase64}` }
            });
        }

        // 3. استراتيجية الموديلات المجانية المتعددة (Robust Routing)
        // نستخدم الموديلات المجانية المتاحة عبر OpenRouter والتي تدعم تحليل الصور
        const primaryModel = "google/gemini-1.5-flash:free"; 
        const fallbackModel = "meta-llama/llama-3.2-90b-vision-instruct:free";

        const payload = {
            model: primaryModel,
            messages: [{
                role: "user",
                content: userContent.length === 1 && userContent[0].type === "text" ? prompt : userContent
            }]
        };

        // 4. دالة الاتصال المباشر
        async function callOpenRouter(modelName) {
            payload.model = modelName;
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://tpm-app-five.vercel.app/", 
                    "X-Title": "Factory OS TPM"
                },
                body: JSON.stringify(payload)
            });
            return await response.json();
        }

        // 5. محاولة الاتصال بالموديل الأساسي
        let data = await callOpenRouter(primaryModel);

        // 6. نظام التبديل الذاتي (Auto-Fallback) في حالة تعطل الموديل
        if (data.error && (data.error.message.includes("No endpoints found") || data.error.message.includes("not found"))) {
            console.warn(`[Architect-Prime] Primary model failed. Switching to fallback: ${fallbackModel}`);
            data = await callOpenRouter(fallbackModel);
        }

        // إذا استمر الفشل، نعيد الخطأ الحقيقي
        if (data.error) throw new Error(data.error.message);

        // 7. تغليف الرد وإرساله للواجهة الأمامية
        const aiText = data.choices[0]?.message?.content || "عذراً، لم يتم استلام إجابة من السيرفر.";
        
        return res.status(200).json({
            candidates: [
                { content: { parts: [{ text: aiText }] } }
            ]
        });

    } catch (error) {
        console.error("[AI Engine Error]:", error);
        return res.status(500).json({ error: error.message });
    }
}
