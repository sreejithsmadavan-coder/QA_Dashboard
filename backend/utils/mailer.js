const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  // If real SMTP is configured, use it
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('✓ Email: Using SMTP →', process.env.SMTP_HOST);
    return transporter;
  }

  // Otherwise, use Ethereal (local fake email — captures & gives preview URL)
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  console.log('✓ Email: Using Ethereal (local preview) →', testAccount.user);
  return transporter;
}

async function sendOTPEmail(to, otp, userName) {
  const transport = await getTransporter();

  const info = await transport.sendMail({
    from: process.env.SMTP_FROM || '"QA Nexus" <noreply@qanexus.local>',
    to,
    subject: 'QA Nexus — Password Reset OTP',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#1A1D23;border-radius:16px;color:#E8E8EC">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:36px;font-weight:900;letter-spacing:2px;color:#E8E8EC">QA <span style="color:#C8E64A">NEXUS</span></div>
          <div style="font-size:11px;color:#6B7080;letter-spacing:4px;margin-top:4px">PASSWORD RESET</div>
        </div>
        <p style="font-size:15px;color:#9096A8;margin-bottom:20px">Hi <strong style="color:#E8E8EC">${userName || 'there'}</strong>,</p>
        <p style="font-size:14px;color:#9096A8;margin-bottom:24px">Use the OTP below to reset your password. This code expires in <strong style="color:#E8E8EC">10 minutes</strong>.</p>
        <div style="text-align:center;margin:28px 0">
          <div style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#C8E64A,#A8C830);border-radius:12px;font-size:32px;font-weight:900;letter-spacing:8px;color:#121418">${otp}</div>
        </div>
        <p style="font-size:13px;color:#6B7080;margin-top:24px">If you didn't request this, ignore this email. Your account is safe.</p>
        <hr style="border:none;border-top:1px solid #2A2D35;margin:24px 0"/>
        <p style="font-size:11px;color:#484C58;text-align:center">QA Nexus — Quality at the speed of light</p>
      </div>
    `,
  });

  // For Ethereal, log the preview URL so user can see the email
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('\n📧 OTP Email Preview → ', previewUrl, '\n');
  }

  return { messageId: info.messageId, previewUrl };
}

module.exports = { sendOTPEmail };
