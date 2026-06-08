export default async function handler(req, res) {
    // 1. التأكد إن الطلب POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, imageBase64 } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error("Gemini API Key is missing.");

        // 2. تجهيز المصفوفة الخاصة بالمحتوى
        let parts = [{ text: prompt || "تحليل" }];

        // 3. تنظيف الصورة بذكاء (Sanitization)
        if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 20) {
            // لو الصورة جاية بالـ prefix، هنقصه وناخد الداتا البيور بس
            const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            
            parts.push({
                inline_data: { 
                    mime_type: "image/jpeg", 
                    data: cleanBase64 
                }
            });
        }

        // 4. استخدام الموديل الأحدث والأكثر استقراراً
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        
        // 5. إرسال الطلب لجوجل بالصيغة القياسية
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: "user", // ⬅️ إضافة الدور ضرورية في التحديث الجديد
                    parts: parts
                }]
            })
        });

        const data = await response.json();
        
        // لو جوجل اعترضت، نرجع الإيرور بوضوح
        if (data.error) {
            throw new Error(data.error.message);
        }

        res.status(200).json(data);
    } catch (error) {
        console.error("Gemini AI Error:", error);
        res.status(500).json({ error: error.message });
    }
}
