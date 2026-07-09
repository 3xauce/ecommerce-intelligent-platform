const { getStripeClient } = require('../config/stripe');
const orderService = require('../services/orderService');
const logger = require('../utils/logger');

/**
 * req.body est ici un Buffer brut (voir app.js : express.raw() est monté
 * sur cette route avant express.json()), requis par Stripe pour vérifier
 * la signature HMAC de la requête.
 */
async function handleStripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    logger.error('Signature webhook Stripe invalide', { error: err.message });
    return res.status(400).json({ error: `Webhook invalide: ${err.message}` });
  }

  try {
    await orderService.handleStripeEvent(event);
  } catch (err) {
    logger.error('Erreur lors du traitement de l’événement Stripe', {
      error: err.message,
      eventType: event.type,
    });
    return res.status(500).json({ error: 'Erreur de traitement du webhook' });
  }

  return res.status(200).json({ received: true });
}

module.exports = { handleStripeWebhook };
