export const config = {
  runtime: 'edge',
};

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
});

const serviceUnavailable = () => json({
  code: 'AI_NOT_CONFIGURED',
  error: 'ميزة الشرح الذكي غير جاهزة على الخادم حاليًا.',
  help: 'أضف OPENROUTER_API_KEY إلى متغيرات بيئة مشروع Vercel ثم أعد النشر.',
}, 503);

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  // This key is deliberately server-only. It must be configured in Vercel,
  // never embedded in index.html, app.js, or any client-side bundle.
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    console.error('[TPM AI] OPENROUTER_API_KEY is not configured.');
    return serviceUnavailable();
  }

  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const imageBase64 = typeof body?.imageBase64 === 'string' ? body.imageBase64 : '';

    if (!prompt && imageBase64.length <= 20) {
      return json({
        code: 'AI_INVALID_REQUEST',
        error: 'أدخل سؤالك أو أرفق صورة صالحة للتحليل.',
      }, 400);
    }

    const userContent = [];
    if (prompt) userContent.push({ type: 'text', text: prompt });

    if (imageBase64.length > 20) {
      const cleanBase64 = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${cleanBase64}` },
      });
    }

    // The OpenRouter free router selects an available model that supports the
    // request capabilities, including vision when an image is supplied.
    // It avoids pinning TPM to short-lived experimental model slugs.
    const fallbackModels = ['openrouter/free'];

    let aiText = '';

    for (const model of fallbackModels) {
      const payload = {
        model,
        messages: [{
          role: 'user',
          content: userContent.length === 1 && userContent[0].type === 'text'
            ? prompt
            : userContent,
        }],
      };

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': `https://${process.env.VERCEL_URL || 'tpm-app.vercel.app'}`,
          'X-Title': 'Factory OS TPM',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      const candidateText = data?.choices?.[0]?.message?.content;

      if (response.ok && typeof candidateText === 'string' && candidateText.trim()) {
        aiText = candidateText;
        break;
      }

      console.warn(`[TPM AI] Skipping model ${model}:`, data?.error?.message || `HTTP ${response.status}`);
    }

    if (!aiText) {
      return json({
        code: 'AI_PROVIDER_UNAVAILABLE',
        error: 'الخدمة الذكية مشغولة أو غير متاحة حاليًا. حاول مرة أخرى بعد قليل.',
      }, 503);
    }

    return json({
      candidates: [{ content: { parts: [{ text: aiText }] } }],
    });
  } catch (error) {
    console.error('[TPM AI] Request failed:', error);
    return json({
      code: 'AI_REQUEST_FAILED',
      error: 'تعذر إتمام طلب الذكاء الاصطناعي. تحقق من الاتصال وحاول مجددًا.',
    }, 500);
  }
}
