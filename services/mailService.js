const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || user === 'your-email@gmail.com') {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

async function sendMail({ to, subject, html }) {
  const transport = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transport) {
    console.warn('[MAIL] SMTP not configured. Printing email to console instead.');
    console.warn('[MAIL] To:', to);
    console.warn('[MAIL] Subject:', subject);
    console.warn('[MAIL] Body:', html);
    return { sent: false, reason: 'SMTP not configured' };
  }

  const info = await transport.sendMail({ from, to, subject, html });
  console.log('[MAIL] Email sent:', info.messageId);
  return { sent: true, messageId: info.messageId };
}

module.exports = { sendMail, getTransporter };
