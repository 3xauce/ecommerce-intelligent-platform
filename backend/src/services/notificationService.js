const notificationModel = require('../models/notificationModel');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

/**
 * Notifie un utilisateur. L'échec d'une notification ne doit JAMAIS faire
 * échouer le flux métier appelant (commande, webhook...) : tout est
 * silencieusement journalisé.
 */
async function notify(userId, { title, message, channel = 'in_app', email = null }) {
  try {
    await notificationModel.create({ userId, channel, title, message });
  } catch (err) {
    logger.error('Échec de création de notification', { error: err.message, userId, title });
    return;
  }

  if (channel === 'email' && email) {
    try {
      await sendEmail({ to: email, subject: title, text: message });
    } catch (err) {
      logger.error("Échec d'envoi d'email de notification", { error: err.message, userId });
    }
  }
}

module.exports = { notify };
