export const config = {
  runtime: 'edge', // ⚡ تفعيل محرك الـ Edge لمنع Vercel من إغلاق الاتصال السريع
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { prompt, imageBase64 } = body;
    
    // 🔑 مفتاح OpenRouter الخاص بك
    const apiKey = process.env.OPENROUTER_API_KEY || "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";

    let userContent = [];
    if (prompt) userContent.push({ type: "text", text: prompt });

    if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 20) {
      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      userContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanBase64}` } });
    }

    // 🚀 مصفوفة الإنقاذ: أحدث الموديلات المجانية الداعمة للصور (مرتبة بالأسرع)
    const freeModels = [
      "google/gemini-2.0-flash-exp:free",         // الأول: جيميناي الجديد
      "google/gemini-2.0-pro-exp-02-05:free",     // الثاني: جيميناي برو
      "qwen/qwen-vl-plus:free",                   // الثالث: كوين (ممتاز في الصور)
      "meta-llama/llama-3.2-11b-vision-instruct:free" // الرابع: لاما 3.2
    ];

    let aiText = "";
    let lastError = "";

    // 🔄 محرك التبديل التلقائي: يجرب الموديلات حتى ينجح واحد منها
    for (let model of freeModels) {
      const payload = {
        model: model,
        messages: [{ role: "user", content: userContent.length === 1 && userContent[0].type === "text" ? prompt : userContent }]
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

      const data = await response.json();

      // إذا نجح الاتصال والموديل موجود، نحفظ الإجابة ونخرج من اللوب فوراً
      if (response.ok && data.choices && data.choices.length > 0) {
        aiText = data.choices[0].message.content;
        break; 
      } else {
        // إذا فشل (بسبب تغيير اسمه أو مشغول)، نسجل الخطأ بصمت ونجرب اللي بعده
        lastError = data.error?.message || "Unknown error";
        console.warn(`[Architect-Prime] تخطي الموديل ${model} بسبب:`, lastError);
      }
    }

    // لو جربنا الـ 4 موديلات وكلهم فشلوا (مستحيل تقريباً)
    if (!aiText) {
      throw new Error("جميع خوادم الذكاء الاصطناعي المجانية مشغولة أو متوقفة حالياً. يرجى المحاولة بعد قليل.");
    }
    
    // إرجاع الرد للواجهة الأمامية بنفس تنسيق Gemini لكي يعمل بدون تعديل في الـ app.js
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: aiText }] } }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
