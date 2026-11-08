import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const OTP_SECRET = process.env.OTP_SECRET || 'zipzap-cloud-secret-otp-token-2026';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

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
    const purpose = body.purpose || 'signup';

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required.' });
    }

    // SMTP Credentials priority: Environment Variables -> Fallback
    const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER || process.env.VITE_SMTP_USER || '0xdevprabhu@gmail.com').trim();
    const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.VITE_SMTP_PASS || 'qngz dnin hwir afxg';
    const smtpPass = rawPass.replace(/\s+/g, '').trim();

    if (!smtpUser || !smtpPass) {
      return res.status(500).json({
        success: false,
        error: 'Gmail SMTP credentials missing. Please set SMTP_USER and SMTP_PASS in Vercel Environment Variables.'
      });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create cryptographic HMAC token (valid for 10 minutes)
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const hmac = crypto.createHmac('sha256', OTP_SECRET);
    hmac.update(`${email}:${otp}:${expiresAt}`);
    const token = `${expiresAt}:${hmac.digest('hex')}`;

    // Subject & Title
    const actionText = purpose === 'signup'
      ? 'verify your email address and create your ZipZap account'
      : 'reset your ZipZap account password';
    const titleText = purpose === 'signup' ? 'Email Verification Code' : 'Password Reset Request';
    const subject = `⚡ Your ZipZap Verification Code: ${otp}`;

    // Find authentic ZipZap logo
    const attachments = [];
    const possiblePaths = [
      path.join(process.cwd(), 'frontend-portal', 'public', 'portal', 'zip-zap.png'),
      path.join(process.cwd(), 'public', 'portal', 'zip-zap.png'),
      path.join(process.cwd(), 'frontend-portal', 'public', 'zip-zap.png'),
      path.join(process.cwd(), 'public', 'zip-zap.png'),
      path.join(process.cwd(), 'frontend-portal', 'public', 'zipzap_logo.png'),
      path.join(process.cwd(), 'public', 'zipzap_logo.png'),
      path.join(process.cwd(), 'backend-scraper', 'assets', 'zipzap_logo.png')
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        attachments.push({
          filename: 'zipzap_logo.png',
          path: p,
          cid: 'zipzap_logo'
        });
        break;
      }
    }

    // Rich Branded HTML with authentic logo
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleText} - ZipZap Jobs</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #001640 0%, #002262 50%, #0b327b 100%); padding: 36px 36px 30px; text-align: center;">
              <div style="text-align: center; margin-bottom: 12px;">
                <img src="cid:zipzap_logo" width="72" height="72" alt="ZipZap Logo" style="display: inline-block; width: 72px; height: 72px; border-radius: 18px; border: 0; outline: none; box-shadow: 0 4px 16px rgba(1, 171, 185, 0.4); object-fit: contain; background: #ffffff;" />
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">
                Zip<span style="color: #01ABB9;">Zap</span> <span style="background: #1E60FF; color: #ffffff; font-size: 13px; font-weight: 800; padding: 3px 8px; border-radius: 6px; vertical-align: middle; margin-left: 4px;">JOBS</span>
              </h1>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 13px; font-weight: 500;">Multi-Portal Daily Job Radar & Application Tracker</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 36px 28px;">
              <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 18px; font-weight: 800;">${titleText}</h2>
              <p style="margin: 0 0 24px; color: #475569; font-size: 14px; line-height: 1.6;">
                Use the one-time verification code below to ${actionText}. This code will expire in <strong>10 minutes</strong>.
              </p>
              <div style="background: #f0f7ff; border: 2px dashed #93c5fd; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #1e60ff; margin: 0;">
                  ${otp}
                </div>
                <div style="color: #64748b; font-size: 12px; margin-top: 8px; font-weight: 600;">⏱ Valid for 10 minutes only</div>
              </div>
              <p style="margin: 0 0 12px; color: #64748b; font-size: 13px; line-height: 1.5;">
                🔒 <strong>Security Notice:</strong> Never share this code with anyone. ZipZap support will never ask for your verification code.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                If you did not request this verification code, please disregard this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 22px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 600;">
                ZipZap Jobs — Spot Jobs Before Anyone Else
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                Automated notification from your ZipZap platform.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    await transporter.sendMail({
      from: `"ZipZap Jobs" <${smtpUser}>`,
      to: email,
      subject: subject,
      text: `Your ZipZap verification code is: ${otp}. Valid for 10 minutes.`,
      html: html,
      attachments: attachments
    });

    return res.status(200).json({
      success: true,
      message: `OTP sent to ${email} successfully!`,
      token: token,
      expires_timestamp: expiresAt
    });
  } catch (err) {
    console.error('[send-otp] Error:', err);
    return res.status(500).json({
      success: false,
      error: `Failed to send email: ${err.message || 'SMTP Authentication Error. Check 16-digit Google App Password.'}`
    });
  }
}
