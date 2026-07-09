const request = require('supertest');

jest.mock('../src/config/db', () => require('./fakeDb'));
jest.mock('../src/config/stripe', () => require('./fakeStripe'));

const fakeDb = require('./fakeDb');
const fakeStripe = require('./fakeStripe');
const app = require('../src/app');
const { createUserWithRole } = require('./testHelpers');

beforeEach(() => {
  fakeDb.__reset();
  fakeStripe.__reset();
});

async function createProduct(accessToken, overrides = {}) {
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Produit test', price: 10, stock: 10, ...overrides });
  return res.body;
}

async function setupCartWithItem(quantity = 3, productOverrides = {}) {
  const vendeur = await createUserWithRole(app, 'vendeur', `vendeur-${Date.now()}-${Math.random()}@shop.com`);
  const client = await createUserWithRole(app, 'client', `client-${Date.now()}-${Math.random()}@shop.com`);
  const product = await createProduct(vendeur.accessToken, productOverrides);

  await request(app)
    .post('/api/cart/items')
    .set('Authorization', `Bearer ${client.accessToken}`)
    .send({ product_id: product.id, quantity });

  return { vendeur, client, product };
}

describe('POST /api/orders/checkout', () => {
  it('refuse sans authentification (401)', async () => {
    const res = await request(app).post('/api/orders/checkout').send({});
    expect(res.status).toBe(401);
  });

  it('refuse un panier vide (400)', async () => {
    const { accessToken } = await createUserWithRole(app, 'client', 'client-empty@shop.com');
    const res = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('crée une commande, décrémente le stock et vide le panier', async () => {
    const { client, product } = await setupCartWithItem(3, { price: 12.5, stock: 10 });

    const res = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ currency: 'usd' });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('pending');
    expect(res.body.order.total).toBe(37.5);
    expect(res.body.order.stripe_payment_id).toMatch(/^pi_test_/);
    expect(res.body.clientSecret).toEqual(expect.any(String));

    const paymentIntents = fakeStripe.__paymentIntents();
    expect(paymentIntents).toHaveLength(1);
    expect(paymentIntents[0].amount).toBe(3750);
    expect(paymentIntents[0].currency).toBe('usd');

    const productRes = await request(app).get(`/api/products/${product.id}`);
    expect(productRes.body.stock).toBe(7);

    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${client.accessToken}`);
    expect(cartRes.body.items).toHaveLength(0);
  });

  it('refuse si le stock a diminué entre l’ajout au panier et le checkout (400)', async () => {
    const { vendeur, client, product } = await setupCartWithItem(5, { stock: 10 });

    // Le vendeur baisse le stock en dessous de la quantité déjà dans le panier
    await request(app)
      .put(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send({ name: 'Produit test', price: 10, stock: 2, is_active: true });

    const res = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('refuse une devise non supportée par Stripe (400)', async () => {
    const { client } = await setupCartWithItem(1);
    const res = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ currency: 'mad' });
    expect(res.status).toBe(400);
  });
});

describe('Historique des commandes', () => {
  it('liste uniquement les commandes de l’utilisateur connecté', async () => {
    const { client: clientA } = await setupCartWithItem(1);
    const { client: clientB } = await setupCartWithItem(1);

    await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${clientA.accessToken}`)
      .send({});

    const resA = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${clientA.accessToken}`);
    expect(resA.body.items).toHaveLength(1);

    const resB = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${clientB.accessToken}`);
    expect(resB.body.items).toHaveLength(0);
  });

  it('le détail d’une commande est accessible au propriétaire et à l’admin, refusé aux autres', async () => {
    const { client } = await setupCartWithItem(2);
    const other = await createUserWithRole(app, 'client', 'other-order@shop.com');
    const admin = await createUserWithRole(app, 'admin', 'admin-order@shop.com');

    const checkoutRes = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({});
    const orderId = checkoutRes.body.order.id;

    const ownerRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${client.accessToken}`);
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.items).toHaveLength(1);

    const otherRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${other.accessToken}`);
    expect(otherRes.status).toBe(403);

    const adminRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(adminRes.status).toBe(200);
  });
});

describe('POST /api/orders/webhook', () => {
  it('refuse une signature invalide (400)', async () => {
    const res = await request(app)
      .post('/api/orders/webhook')
      .set('stripe-signature', 'invalid-signature')
      .send({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_test_1' } } });

    expect(res.status).toBe(400);
  });

  it('marque la commande payée sur payment_intent.succeeded', async () => {
    const { client } = await setupCartWithItem(1);
    const checkoutRes = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({});
    const { id: orderId, stripe_payment_id: paymentIntentId } = checkoutRes.body.order;

    const webhookRes = await request(app)
      .post('/api/orders/webhook')
      .set('stripe-signature', 'valid-test-signature')
      .send({ type: 'payment_intent.succeeded', data: { object: { id: paymentIntentId } } });
    expect(webhookRes.status).toBe(200);

    const orderRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${client.accessToken}`);
    expect(orderRes.body.status).toBe('paid');
  });

  it('marque la commande en échec sur payment_intent.payment_failed', async () => {
    const { client } = await setupCartWithItem(1);
    const checkoutRes = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({});
    const { id: orderId, stripe_payment_id: paymentIntentId } = checkoutRes.body.order;

    await request(app)
      .post('/api/orders/webhook')
      .set('stripe-signature', 'valid-test-signature')
      .send({ type: 'payment_intent.payment_failed', data: { object: { id: paymentIntentId } } });

    const orderRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${client.accessToken}`);
    expect(orderRes.body.status).toBe('payment_failed');
  });
});
