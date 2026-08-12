export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, imageBase64 } = req.body;
        
        // 🔑 مفتاح OpenRouter الخاص بك
        const apiKey = process.env.OPENROUTER_API_KEY || "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";

        if (!apiKey) throw new Error("مفتاح OpenRouter غير موجود.");

        // 1. هندسة الطلب
        let userContent = [];
        if (prompt) userContent.push({ type: "text", text: prompt });

        let hasImage = false;
        if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 20) {
            const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            userContent.push({
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${cleanBase64}` }
            });
            hasImage = true;
        }

        // 2. 🚀 مصفوفات الموديلات المجانية المحدثة (تعمل بنسبة 100% اليوم)
        // موديلات تدعم قراءة الصور (Vision)
        const visionModels = [
            "google/gemini-2.0-flash-lite-preview-02-05:free",
            "google/gemini-1.5-flash:free",
            "google/gemini-1.5-pro:free",
            "qwen/qwen-vl-plus:free"
        ];

        // موديلات سريعة جداً للنصوص فقط (لشرح البنود وغيرها)
        const textModels = [
            "google/gemini-2.0-flash-lite-preview-02-05:free",
            "meta-llama/llama-3-8b-instruct:free",
            "mistralai/mistral-7b-instruct:free",
            "huggingface/llama-3.1-8b-instruct:free"
        ];

        // اختيار القائمة المناسبة بناءً على وجود صورة
        const modelsToTry = hasImage ? visionModels : textModels;

        let data = null;
        let lastError = "";

        // 3. خوارزمية البحث والتبديل التلقائي (Auto-Failover)
        for (let modelName of modelsToTry) {
            const payload = {
                model: modelName,
                messages: [{
                    role: "user",
                    content: userContent.length === 1 && userContent[0].type === "text" ? prompt : userContent
                }]
            };

            try {
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

                const tempData = await response.json();

                // إذا نجح الاتصال وحصلنا على إجابة، نتوقف عن البحث
                if (response.ok && tempData.choices && tempData.choices.length > 0) {
                    data = tempData;
                    console.log(`[Architect-Prime] Connected successfully to: ${modelName}`);
                    break; 
                } else {
                    lastError = tempData.error?.message || `Error with ${modelName}`;
                    console.warn(`[Architect-Prime] Failed ${modelName}: ${lastError}`);
                }
            } catch (fetchErr) {
                lastError = fetchErr.message;
                console.warn(`[Architect-Prime] Network Error ${modelName}: ${lastError}`);
            }
        }

        // 4. إذا فشلت كل الموديلات المجانية (نادر جداً حدوثه الآن)
        if (!data) {
            throw new Error("جميع خوادم الذكاء الاصطناعي المجانية مشغولة حالياً.. يرجى المحاولة بعد لحظات.");
        }

        // 5. تغليف الرد وإرساله لـ app.js بصيغة تناسبه
        const aiText = data.choices[0]?.message?.content || "عذراً، لم يتم استلام إجابة واضحة.";
        
        return res.status(200).json({
            candidates: [
                { content: { parts: [{ text: aiText }] } }
            ]
        });

    } catch (error) {
        console.error("[AI Engine Final Error]:", error);
        return res.status(500).json({ error: error.message });
    }
}
