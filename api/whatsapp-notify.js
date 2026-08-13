export const config = {
  runtime: 'edge',
};

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  },
});

const cleanText = (value, max = 160) => String(value ?? '')
  .replace(/[<>]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

const getConfig = () => ({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim(),
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  templateName: process.env.WHATSAPP_TEMPLATE_NAME?.trim(),
  templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'ar',
  graphVersion: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v23.0',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID?.trim(),
  allowedEmails: (process.env.TPM_NOTIFICATION_ALLOWED_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean),
});

const missingConfiguration = () => json({
  code: 'WHATSAPP_NOT_CONFIGURED',
  error: 'إشعارات WhatsApp غير مهيأة على الخادم بعد.',
  help: 'أضف متغيرات Meta ومتغيرات التحقق من Firebase في Vercel ثم أعد النشر.',
}, 503);

const decodeBase64UrlJson = (segment) => {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
  const value = atob(base64);
  return JSON.parse(value);
};

const verifyFirebaseToken = async (authorization, firebaseProjectId) => {
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice(7).trim();
  const [headerPart, payloadPart, signaturePart] = token.split('.');
  if (!headerPart || !payloadPart || !signaturePart) return null;

  const header = decodeBase64UrlJson(headerPart);
  const claims = decodeBase64UrlJson(payloadPart);
  const now = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${firebaseProjectId}`;
  if (header.alg !== 'RS256' || !header.kid || claims.aud !== firebaseProjectId || claims.iss !== expectedIssuer || !claims.sub || claims.exp <= now || claims.iat > now + 60) return null;

  const keyResponse = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  if (!keyResponse.ok) throw new Error('تعذر جلب مفاتيح تحقق Firebase');
  const keySet = await keyResponse.json();
  const jwk = keySet?.keys?.find(item => item.kid === header.kid && item.kty === 'RSA');
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const signedData = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
  const signatureBase64 = signaturePart.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(signaturePart.length / 4) * 4, '=');
  const signatureBinary = atob(signatureBase64);
  const signature = new Uint8Array(signatureBinary.length);
  for (let index = 0; index < signatureBinary.length; index += 1) signature[index] = signatureBinary.charCodeAt(index);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signedData);
  return valid ? claims : null;
};

const normalizePhone = (value) => String(value ?? '').replace(/[^0-9]/g, '');

const eventLabels = {
  tag_assigned: 'تاج صيانة مسند إليك',
  critical_tag: 'تاج حرج يحتاج تدخلًا فوريًا',
  tag_escalated: 'تاج تم تصعيده للمراجعة',
};

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const settings = getConfig();
  if (!settings.accessToken || !settings.phoneNumberId || !settings.templateName || !settings.firebaseProjectId || settings.allowedEmails.length === 0) return missingConfiguration();

  try {
    const identity = await verifyFirebaseToken(req.headers.get('authorization'), settings.firebaseProjectId);
    const userEmail = String(identity?.email || '').toLowerCase();
    if (!identity || !settings.allowedEmails.includes(userEmail)) {
      return json({ code: 'WHATSAPP_FORBIDDEN', error: 'ليست لديك صلاحية إرسال إشعارات WhatsApp.' }, 403);
    }

    const body = await req.json();
    const eventType = cleanText(body?.eventType, 32);
    const tag = body?.tag || {};
    if (!eventLabels[eventType]) return json({ code: 'WHATSAPP_INVALID_EVENT', error: 'نوع حدث الإشعار غير صالح.' }, 400);

    const phone = normalizePhone(tag.engineerPhone);
    const tagId = cleanText(tag.id, 80);
    const description = cleanText(tag.desc, 450);
    if (phone.length < 8 || phone.length > 15 || !tagId || !description) {
      return json({ code: 'WHATSAPP_INVALID_PAYLOAD', error: 'بيانات التاج أو رقم WhatsApp غير صالحة للإرسال.' }, 400);
    }

    const parameters = [
      tagId,
      eventLabels[eventType],
      cleanText(tag.dept, 100) || 'غير محدد',
      cleanText(tag.machine, 100) || 'غير محددة',
      ({ critical: 'حرجة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' }[tag.priority] || 'متوسطة'),
      description,
    ].map(text => ({ type: 'text', text }));

    const providerResponse = await fetch(`https://graph.facebook.com/${settings.graphVersion}/${encodeURIComponent(settings.phoneNumberId)}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: settings.templateName,
          language: { code: settings.templateLanguage },
          components: [{ type: 'body', parameters }],
        },
      }),
    });

    const providerData = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok) {
      console.error('[TPM WhatsApp] Meta rejected notification:', providerData?.error?.message || `HTTP ${providerResponse.status}`);
      return json({
        code: 'WHATSAPP_PROVIDER_REJECTED',
        error: 'تعذر إرسال الإشعار عبر WhatsApp. تحقق من اعتماد القالب وبيانات Meta.',
      }, 502);
    }

    return json({
      success: true,
      message: 'تم تسليم طلب الإشعار إلى WhatsApp.',
      messageId: providerData?.messages?.[0]?.id || null,
    });
  } catch (error) {
    console.error('[TPM WhatsApp] Request failed:', error?.message || error);
    return json({
      code: 'WHATSAPP_REQUEST_FAILED',
      error: 'تعذر تنفيذ طلب إشعار WhatsApp حاليًا.',
    }, 500);
  }
}
