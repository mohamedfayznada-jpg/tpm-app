export default async function handler(req, res) {
    // 1. حماية البوابة (Method Guard)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, imageBase64 } = req.body;
        
        // 🔑 تم دمج المفتاح الخاص بك (مع إمكانية تغييره مستقبلاً من إعدادات Vercel)
        const apiKey = process.env.OPENROUTER_API_KEY || "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";

        // 2. هندسة الطلب ليتوافق مع نظام OpenRouter / OpenAI
        let userContent = [];
        
        if (prompt) {
            userContent.push({ type: "text", text: prompt });
        }

        // معالجة وإرفاق الصور (الرؤية الآلية)
        if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 20) {
            const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            userContent.push({
                type: "image_url",
                image_url: {
                    url: `data:image/jpeg;base64,${cleanBase64}`
                }
            });
        }

        // 3. اختيار موديل Llama 3.2 (الأحدث والأسرع مجاناً، ويدعم الصور بامتياز)
        const payload = {
            model: "meta-llama/llama-3.2-11b-vision-instruct:free",
            messages: [
                {
                    role: "user",
                    content: userContent.length === 1 && userContent[0].type === "text" 
                             ? prompt 
                             : userContent
                }
            ]
        };

        // 4. الاتصال المباشر والمستقر بـ OpenRouter
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://tpm-app-five.vercel.app/", // رابط موقعك لتوثيق الطلب
                "X-Title": "Factory OS TPM"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // التقاط أخطاء السيرفر (إن وجدت)
        if (!response.ok) {
            console.error("[OpenRouter Error]:", data);
            throw new Error(data.error?.message || "فشل الاتصال بخوادم OpenRouter");
        }

        // 5. الخدعة المعمارية: تغليف الرد ليبدو وكأنه من Gemini لكي لا تنهار الواجهة الأمامية
        const aiText = data.choices[0]?.message?.content || "لم يتم استلام إجابة من الذكاء الاصطناعي.";
        
        const formattedResponse = {
            candidates: [
                {
                    content: {
                        parts: [{ text: aiText }]
                    }
                }
            ]
        };

        // 6. الإرجاع الناجح للواجهة
        return res.status(200).json(formattedResponse);

    } catch (error) {
        console.error("[AI Engine Error]:", error);
        return res.status(500).json({ error: error.message });
    }
}
