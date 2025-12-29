// backend/src/utils/email.js
// Re-usable mail helper using your tested SMTP config (Gmail + App Password)

const nodemailer = require('nodemailer');

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: (process.env.SMTP_SECURE !== 'false'), // default true for 465
  auth: {
    user: process.env.SMTP_USER || process.env.MAIL_USER || "admin@salesdream.com",
    pass: process.env.SMTP_PASS || process.env.MAIL_PASS || "", // App Password (16 chars) or env
  },
};

const FROM_NAME = process.env.MAIL_FROM_NAME || "Sales Dream";
const FROM_EMAIL = process.env.MAIL_FROM || SMTP_CONFIG.auth.user || "admin@salesdream.com";

async function createTransporter() {
  const transporter = nodemailer.createTransport(SMTP_CONFIG);
  // optional verify — comment out if you don't want verification on every start
  try {
    await transporter.verify();
    // console.log("✅ SMTP connection verified successfully.");
  } catch (err) {
    // Don't crash; caller can catch problems.
    console.warn("SMTP verify failed:", err.message || err);
  }
  return transporter;
}

/**
 * sendMail(options)
 * options = {
 *   to: 'recipient@example.com' or ['a@x.com','b@y.com'],
 *   subject: 'Hello!',
 *   text: 'Plain text body',
 *   html: '<b>HTML body</b>',
 *   attachments: [{ filename: 'file.txt', path: './file.txt' }] // optional
 * }
 */
async function sendMail(options = {}) {
  const transporter = await createTransporter();

  const from = `"${FROM_NAME}" <${FROM_EMAIL}>`;

  const mailOptions = {
    from,
    to: options.to,
    subject: options.subject || '(no subject)',
    text: options.text || undefined,
    html: options.html || undefined,
    attachments: options.attachments || undefined,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

// Convenience helpers used by authController
async function sendOtpEmail(to, otp, opts = {}) {
  const html = opts.html || `
    <h2>Your OTP Code</h2>
    <p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p>
    <p>This code will expire in ${Math.ceil((process.env.OTP_TTL_SECONDS||600)/60)} minutes.</p>
  `;
  return sendMail({ to, subject: opts.subject || 'Your SalesDream OTP Code', html });
}

async function sendVerificationEmail(to, username, code, opts = {}) {
  const verificationLink = opts.link || `https://app.salesdream.com/verify?code=${encodeURIComponent(code)}`;
  const html = opts.html || `
    <p>Dear ${username},</p>
    <p>Thank you for joining <b>SalesDream</b>! Please verify your email by clicking below:</p>
    <p><a href="${verificationLink}">Verify Now</a></p>
    <p>Best regards,<br/><strong>The SalesDream Team</strong></p>
  `;
  return sendMail({ to, subject: opts.subject || 'Welcome to SalesDream - Verify your email', html });
}

async function sendPasswordResetEmail(to, token, opts = {}) {
  const resetLink = opts.link || `https://app.salesdream.com/reset-password?token=${encodeURIComponent(token)}`;
  const html = opts.html || `
    <h2>Password Reset Request</h2>
    <p>Click the link below to reset your password:</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>If you didn't request this change, ignore this email.</p>
  `;
  return sendMail({ to, subject: opts.subject || 'SalesDream - Password Reset', html });
}

module.exports = {
  sendMail,
  sendOtpEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  createTransporter, // exported for debugging if needed
};
