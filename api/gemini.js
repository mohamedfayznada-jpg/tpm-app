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

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[TPM AI] OPENROUTER_API_KEY is not configured.');
    return json({ error: 'AI service is not configured on the server.' }, 503);
  }

  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const imageBase64 = typeof body?.imageBase64 === 'string' ? body.imageBase64 : '';

    if (!prompt && imageBase64.length <= 20) {
      return json({ error: 'A prompt or a valid image is required.' }, 400);
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

    const freeModels = [
      'google/gemini-2.0-flash-exp:free',
      'google/gemini-2.0-pro-exp-02-05:free',
      'qwen/qwen-vl-plus:free',
      'meta-llama/llama-3.2-11b-vision-instruct:free',
    ];

    let aiText = '';

    for (const model of freeModels) {
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
          'HTTP-Referer': 'https://tpm-app-five.vercel.app/',
          'X-Title': 'Factory OS TPM',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const candidateText = data?.choices?.[0]?.message?.content;

      if (response.ok && typeof candidateText === 'string' && candidateText.trim()) {
        aiText = candidateText;
        break;
      }

      console.warn(`[TPM AI] Skipping model ${model}:`, data?.error?.message || 'Unknown error');
    }

    if (!aiText) {
      throw new Error('All configured AI models are unavailable right now.');
    }

    return json({
      candidates: [{ content: { parts: [{ text: aiText }] } }],
    });
  } catch (error) {
    console.error('[TPM AI] Request failed:', error);
    return json({ error: error.message || 'AI request failed.' }, 500);
  }
}
