// utils/emailHelper.js
const nodemailer = require("nodemailer");

const FROM_EMAIL = process.env.EMAIL_FROM || "salesdream09@gmail.com";
const SMTP_USER = process.env.EMAIL_USER || "salesdream09@gmail.com";
const SMTP_PASS = process.env.EMAIL_PASS || "gfejdyncalwnoqcp"; // provided app password

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function sendOtpEmail(to, subject, text) {
  const mailOptions = {
    from: FROM_EMAIL,
    to,
    subject,
    text,
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendOtpEmail };
