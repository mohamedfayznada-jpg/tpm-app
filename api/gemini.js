export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, imageBase64 } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error("Gemini API Key is missing.");

        // تجهيز الـ Payload لجوجل
        let contents = [];
        if (imageBase64) {
            contents.push({
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
                ]
            });
        } else {
            contents.push({
                parts: [{ text: prompt }]
            });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const data = await response.json();
        
        // لو في إيرور من جوجل نرجعه
        if (data.error) {
            throw new Error(data.error.message);
        }

        // إرجاع النتيجة للفرونت إند
        res.status(200).json(data);
    } catch (error) {
        console.error("Gemini AI Error:", error);
        res.status(500).json({ error: error.message });
    }
}
