const Stripe = require('stripe');

let stripeClient = null;

/**
 * Initialisation paresseuse : évite de faire planter le boot du serveur si
 * STRIPE_SECRET_KEY n'est pas encore configurée (dev/CI sans compte Stripe).
 * L'erreur n'apparaît que lorsqu'un paiement est réellement tenté.
 */
function getStripeClient() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY manquant dans les variables d'environnement");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

module.exports = { getStripeClient };
