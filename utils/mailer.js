const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // true ถ้าใช้ 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendMail({ to, subject, html, bcc }) {
  if (process.env.EMAIL_ENABLED !== "true") return;
  if ((!to || to.length === 0) && (!bcc || bcc.length === 0)) return;

  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: to || undefined,
    bcc: bcc || undefined,
    subject,
    html,
  });
}

module.exports = { sendMail };
