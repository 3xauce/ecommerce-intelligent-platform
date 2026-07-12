const request = require('supertest');

jest.mock('../src/config/db', () => require('./fakeDb'));
jest.mock('../src/config/redis', () => require('./fakeRedis'));
jest.mock('../src/config/stripe', () => require('./fakeStripe'));

const fakeDb = require('./fakeDb');
const fakeStripe = require('./fakeStripe');
const app = require('../src/app');
const { createUserWithRole } = require('./testHelpers');

beforeEach(() => {
  fakeDb.__reset();
  fakeStripe.__reset();
});

async function setupSale() {
  const vendeur = await createUserWithRole(app, 'vendeur', `v-notif-${Math.random()}@shop.com`);
  const client = await createUserWithRole(app, 'client', `c-notif-${Math.random()}@shop.com`);

  const productRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${vendeur.accessToken}`)
    .send({ name: 'Produit Notif', price: 30, stock: 6 });

  await request(app)
    .post('/api/cart/items')
    .set('Authorization', `Bearer ${client.accessToken}`)
    .send({ product_id: productRes.body.id, quantity: 2 });

  const checkoutRes = await request(app)
    .post('/api/orders/checkout')
    .set('Authorization', `Bearer ${client.accessToken}`)
    .send({});

  return { vendeur, client, product: productRes.body, order: checkoutRes.body.order };
}

describe('Notifications déclenchées par les commandes', () => {
  it('notifie le vendeur (nouvelle commande + stock faible) après un checkout', async () => {
    const { vendeur } = await setupSale(); // stock 6 - 2 = 4 <= 5 -> alerte

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${vendeur.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.unread_count).toBe(2);
    const titles = res.body.items.map((n) => n.title);
    expect(titles).toContain('Nouvelle commande reçue');
    expect(titles).toContain('Alerte stock faible');
  });

  it('notifie le client quand le paiement est confirmé (webhook)', async () => {
    const { client, order } = await setupSale();

    await request(app)
      .post('/api/orders/webhook')
      .set('stripe-signature', 'valid-test-signature')
      .send({ type: 'payment_intent.succeeded', data: { object: { id: order.stripe_payment_id } } });

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${client.accessToken}`);

    expect(res.body.items.some((n) => n.title === 'Paiement confirmé')).toBe(true);
  });

  it('marque une notification comme lue, puis toutes', async () => {
    const { vendeur } = await setupSale();

    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${vendeur.accessToken}`);
    const first = listRes.body.items[0];

    const readRes = await request(app)
      .put(`/api/notifications/${first.id}/read`)
      .set('Authorization', `Bearer ${vendeur.accessToken}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.is_read).toBe(true);

    await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${vendeur.accessToken}`);

    const afterRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${vendeur.accessToken}`);
    expect(afterRes.body.unread_count).toBe(0);
  });

  it("ne montre pas les notifications d'un autre utilisateur", async () => {
    const { vendeur } = await setupSale();
    const autre = await createUserWithRole(app, 'client', 'autre-notif@shop.com');

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${autre.accessToken}`);
    expect(res.body.items).toHaveLength(0);

    // Impossible de marquer lue la notification d'un autre (404)
    const vendorList = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${vendeur.accessToken}`);
    const readRes = await request(app)
      .put(`/api/notifications/${vendorList.body.items[0].id}/read`)
      .set('Authorization', `Bearer ${autre.accessToken}`);
    expect(readRes.status).toBe(404);
  });
});

describe('Dashboard administrateur', () => {
  it('refuse un vendeur sur /api/admin/stats (403)', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v-adm@shop.com');
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${vendeur.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('renvoie les statistiques globales de la plateforme', async () => {
    await setupSale();
    const admin = await createUserWithRole(app, 'admin', 'admin-stats@shop.com');

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users.total).toBe(3); // vendeur + client + admin
    expect(res.body.users.vendeur).toBe(1);
    expect(res.body.products.products_count).toBe(1);
    expect(res.body.orders.orders_count).toBe(1);
  });

  it('liste toutes les commandes avec l’email du client', async () => {
    const { client } = await setupSale();
    const admin = await createUserWithRole(app, 'admin', 'admin-orders@shop.com');

    const res = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].customer_email).toBe(client.user.email);
  });

  it('active/désactive un compte utilisateur, mais jamais le sien', async () => {
    const { client } = await setupSale();
    const admin = await createUserWithRole(app, 'admin', 'admin-status@shop.com');

    const res = await request(app)
      .put(`/api/users/${client.user.id}/status`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ is_active: false });
    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);

    // Le compte désactivé ne peut plus se connecter
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: client.user.email, password: 'Password123' });
    expect(loginRes.status).toBe(401);

    // Auto-désactivation interdite
    const selfRes = await request(app)
      .put(`/api/users/${admin.user.id}/status`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ is_active: false });
    expect(selfRes.status).toBe(400);
  });
});
