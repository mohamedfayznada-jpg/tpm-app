export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body || {};
    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
      return res.status(503).json({ error: 'Image upload service is not configured on the server.' });
    }

    if (typeof image !== 'string' || image.trim().length === 0) {
      return res.status(400).json({ error: 'A Base64 image is required.' });
    }
    if (image.length > 12 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image payload is too large.' });
    }

    const formData = new URLSearchParams();
    formData.append('image', image);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: controller.signal,
    });
    } finally {
      clearTimeout(timer);
    }

    const data = await response.json().catch(() => ({}));
    const status = response.ok && data?.success ? 200 : (response.status >= 400 ? response.status : 502);

    if (status !== 200) {
      return res.status(status).json({
        error: data?.error?.message || 'Image upload failed.',
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('[TPM ImgBB] Upload failed:', error);
    return res.status(502).json({ error: 'Image upload service is temporarily unavailable.' });
  }
}
