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

    const formData = new URLSearchParams();
    formData.append('image', image);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data = await response.json();
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
