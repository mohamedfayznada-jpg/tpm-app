export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { prompt, imageBase64 } = body;
    
    // مفتاح OpenRouter 
    const apiKey = process.env.OPENROUTER_API_KEY || "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";

    let userContent = [];
    if (prompt) userContent.push({ type: "text", text: prompt });

    if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 20) {
      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      userContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanBase64}` } });
    }

    const payload = {
      model: "google/gemini-2.0-flash-lite-preview-02-05:free",
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

    if (!response.ok) {
      throw new Error(data.error?.message || "فشل الاتصال بالخادم");
    }

    const aiText = data.choices[0]?.message?.content || "لم يتم استلام إجابة.";
    
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: aiText }] } }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
