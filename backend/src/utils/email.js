const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

/**
 * Envoie un email. Si aucun SMTP n'est configuré (dev/test), on journalise
 * le contenu au lieu d'échouer, pour ne pas bloquer les flux d'auth en local.
 */
async function sendEmail({ to, subject, text, html }) {
  const client = getTransporter();
  if (!client) {
    logger.info('SMTP non configuré — email simulé', { to, subject, text });
    return;
  }
  await client.sendMail({
    from: process.env.SMTP_USER || 'no-reply@platform.com',
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendEmail };
