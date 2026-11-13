import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const testRecipient = (body.email || '').trim();

    const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER || process.env.VITE_SMTP_USER || '0xdevprabhu@gmail.com').trim();
    const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.VITE_SMTP_PASS || 'qngz dnin hwir afxg';
    const smtpPass = rawPass.replace(/\s+/g, '').trim();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    await transporter.verify();

    if (testRecipient) {
      await transporter.sendMail({
        from: `"Traptip Jobs" <${smtpUser}>`,
        to: testRecipient,
        subject: '⚡ Traptip SMTP Connection Verified!',
        text: 'Congratulations! Your Gmail 16-digit App Password is working perfectly with Traptip Jobs on Vercel.',
        html: '<div style="font-family: sans-serif; padding: 20px; text-align: center;"><h2>⚡ SMTP Verified!</h2><p>Your Gmail 16-digit App Password is working perfectly on Vercel!</p></div>'
      });
    }

    return res.status(200).json({
      success: true,
      message: `SMTP Connection to Gmail successful using ${smtpUser}!`
    });
  } catch (err) {
    console.error('[test-smtp] Error:', err);
    return res.status(500).json({
      success: false,
      error: `SMTP Connection test failed: ${err.message}`
    });
  }
}

