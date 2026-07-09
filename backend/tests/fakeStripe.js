/**
 * Mock du module config/stripe utilisé dans les tests (jest.mock). Simule
 * juste assez de l'API Stripe (paymentIntents, webhooks.constructEvent) pour
 * exercer orderService sans jamais appeler le réseau Stripe réel.
 */
let paymentIntents = [];
let seq = 1;

function reset() {
  paymentIntents = [];
  seq = 1;
}

const stripeClient = {
  paymentIntents: {
    create: jest.fn(async ({ amount, currency }) => {
      const pi = {
        id: `pi_test_${seq}`,
        client_secret: `pi_test_${seq}_secret_${seq}`,
        amount,
        currency,
        status: 'requires_payment_method',
        metadata: {},
      };
      seq += 1;
      paymentIntents.push(pi);
      return pi;
    }),
    update: jest.fn(async (id, data) => {
      const pi = paymentIntents.find((p) => p.id === id);
      if (pi) Object.assign(pi, data);
      return pi;
    }),
  },
  webhooks: {
    constructEvent: jest.fn((rawBody, signature) => {
      if (signature === 'invalid-signature') {
        throw new Error('Signature invalide (test)');
      }
      return JSON.parse(rawBody.toString());
    }),
  },
};

module.exports = {
  getStripeClient: () => stripeClient,
  __reset: reset,
  __paymentIntents: () => paymentIntents,
};
