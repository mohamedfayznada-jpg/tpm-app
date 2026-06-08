export default async function handler(req, res) {
    // التأكد إن الطلب جاي POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image } = req.body; // الصورة مبعوتة كـ Base64
        const apiKey = process.env.IMGBB_API_KEY; // بنقرأ المفتاح من Vercel

        if (!apiKey) throw new Error("API Key is missing in server configuration.");

        // تجهيز الداتا لـ ImgBB
        const formData = new URLSearchParams();
        formData.append('image', image);

        // إرسال الطلب لـ ImgBB
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const data = await response.json();
        
        // إرجاع النتيجة للفرونت إند بتاعنا
        res.status(200).json(data);
    } catch (error) {
        console.error("ImgBB Upload Error:", error);
        res.status(500).json({ error: error.message });
    }
}
