// sendEmail.js
require('dotenv').config();
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

async function createTransporter() {
  // Primary: SMTP transporter using env vars
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: (process.env.SMTP_SECURE === 'true'), // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // optional timeouts:
    // connectionTimeout: 30_000,
    // greetingTimeout: 30_000,
  });

  // Verify connection configuration (useful during development)
  await transporter.verify();
  return transporter;
}

async function sendMail(options = {}) {
  const transporter = await createTransporter();

  const fromName = process.env.FROM_NAME || '';
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

  const mailOptions = {
    from,
    to: options.to,
    subject: options.subject || '(no subject)',
    text: options.text || '',
    html: options.html || undefined,
    attachments: options.attachments || undefined,
  };

  const info = await transporter.sendMail(mailOptions);
  // info contains envelope info and messageId
  return info;
}

/* Example run when executing this file directly.
   Edit target email address below or call sendMail from another module.
*/
if (require.main === module) {
  (async () => {
    try {
      const info = await sendMail({
        to: 'recipient@example.com',
        subject: 'Test email from Node',
        text: 'Hello — this is a plain text body.',
        html: `<p>Hello — this is an <b>HTML</b> body.</p>`,
        // attachments: [{ filename: 'readme.txt', path: './README.md' }],
      });

      console.log('Message sent: %s', info.messageId);
      console.log('Envelope:', info.envelope);
      console.log('Response:', info.response); // server response
    } catch (err) {
      console.error('Error sending mail:', err);
      process.exitCode = 1;
    }
  })();
}

module.exports = { sendMail };
