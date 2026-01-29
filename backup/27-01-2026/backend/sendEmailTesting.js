const nodemailer = require('nodemailer');

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

// ======================
// CONFIGURE EVERYTHING HERE
// ======================
const SMTP_CONFIG = {
  host: "smtp.gmail.com",          // For Gmail use smtp.gmail.com
  port: 465,                       // 465 for SSL, 587 for TLS
  secure: true,                    // true for 465, false for 587
  auth: {
    user: "salesdream09@gmail.com",  // 👉 your full email address
    pass: "mzfo nvby cphn acts",     // 👉 Gmail App Password (not your Gmail password)
  },
};

const FROM_NAME = "Avinash Pandey";
const FROM_EMAIL = "salesdream09@gmail.com"; // same as auth.user usually

async function createTransporter() {
  const transporter = nodemailer.createTransport(SMTP_CONFIG);

  // Verify SMTP configuration (optional)
  await transporter.verify();
  console.log("✅ SMTP connection verified successfully.");
  return transporter;
}

async function sendMail(options = {}) {
  const transporter = await createTransporter();

  const from = `"${FROM_NAME}" <${FROM_EMAIL}>`;

  const mailOptions = {
    from,
    to: options.to,
    subject: options.subject || '(no subject)',
    text: options.text || '',
    html: options.html || undefined,
    attachments: options.attachments || undefined,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

/* Example run when executing this file directly */
if (require.main === module) {
  (async () => {
    try {
      const info = await sendMail({
        to: "avinashp2488@gmail.com",   // 👈 Change to your recipient
        subject: "Test Email from Node.js",
        text: "Hello Avinash! This is a plain text email from Node.js.",
        html: `<p>Hello <b>Avinash!</b> 👋<br>This is an <b>HTML email</b> sent from <code>Node.js</code>.</p>`,
        // attachments: [{ filename: "sample.txt", path: "./sample.txt" }],
      });

      console.log("✅ Message sent successfully!");
      console.log("Message ID:", info.messageId);
      console.log("Envelope:", info.envelope);
      console.log("Response:", info.response);
    } catch (err) {
      console.error("❌ Error sending mail:", err);
      process.exitCode = 1;
    }
  })();
}

module.exports = { sendMail };
