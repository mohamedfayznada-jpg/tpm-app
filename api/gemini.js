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

        // 2. هندسة الطلب والصور (Payload Construction)
        let userContent = [];
        if (prompt) userContent.push({ type: "text", text: prompt });

        if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 20) {
            const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            userContent.push({
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${cleanBase64}` }
            });
        }

        // 3. 🚀 مصفوفة الموديلات المجانية المدرعة (Self-Healing Array)
        // هذه الموديلات مجانية 100%، تدعم الصور، وممتازة في اللغة العربية
        const freeModels = [
            "qwen/qwen-2-vl-7b-instruct:free",          // الأكثر استقراراً ودعماً للصور
            "google/gemini-2.0-flash-exp:free",         // إصدار جيميناي المجاني الجديد 
            "meta-llama/llama-3.2-11b-vision-instruct:free" // موديل ميتا الاحتياطي
        ];

        let data = null;
        let lastError = "";

        // 4. خوارزمية التبديل التلقائي (Auto-Failover Loop)
        for (let modelName of freeModels) {
            const payload = {
                model: modelName,
                messages: [{
                    role: "user",
                    content: userContent.length === 1 && userContent[0].type === "text" ? prompt : userContent
                }]
            };

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

            // إذا نجح الاتصال والموديل متوفر، نخرج من الحلقة (Loop)
            if (response.ok && tempData.choices && tempData.choices.length > 0) {
                data = tempData;
                console.log(`[Architect-Prime] Success with model: ${modelName}`);
                break;
            } else {
                // إذا فشل (بسبب اسم خاطئ أو سيرفر مشغول)، نسجل الخطأ وننتقل للموديل التالي
                lastError = tempData.error?.message || "Unknown error";
                console.warn(`[Architect-Prime] Model ${modelName} failed: ${lastError}. Trying next...`);
            }
        }

        // 5. إذا جربنا كل الموديلات المجانية وكلها فاشلة
        if (!data) {
            throw new Error(lastError || "جميع سيرفرات الذكاء الاصطناعي المجانية مشغولة حالياً، يرجى المحاولة بعد قليل.");
        }

        // 6. تغليف الرد وإرساله للواجهة الأمامية
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
