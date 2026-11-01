import crypto from 'node:crypto';

const OTP_SECRET = process.env.OTP_SECRET || 'zipzap-cloud-secret-otp-token-2026';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const email = (body.email || '').trim().toLowerCase();
    const otp = (body.otp || '').trim();
    const token = (body.token || '').trim();

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP code are required.' });
    }

    if (!token) {
      return res.status(400).json({ success: false, error: 'Session token missing. Please request a new OTP.' });
    }

    const parts = token.split(':');
    if (parts.length !== 2) {
      return res.status(400).json({ success: false, error: 'Malformed verification token. Please request a new OTP.' });
    }

    const [expiresAtStr, signature] = parts;
    const expiresAt = Number(expiresAtStr);

    if (Date.now() > expiresAt) {
      return res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new OTP.' });
    }

    const hmac = crypto.createHmac('sha256', OTP_SECRET);
    hmac.update(`${email}:${otp}:${expiresAtStr}`);
    const expectedSignature = hmac.digest('hex');

    if (signature === expectedSignature) {
      return res.status(200).json({ success: true, message: 'OTP verified successfully!' });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid verification code. Please check your email and try again.' });
    }
  } catch (err) {
    console.error('[verify-otp] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to verify OTP.' });
  }
}

