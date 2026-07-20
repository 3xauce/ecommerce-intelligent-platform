const request = require('supertest');

jest.mock('../src/config/db', () => require('./fakeDb'));

const fakeDb = require('./fakeDb');
const app = require('../src/app');
const { createUserWithRole } = require('./testHelpers');

beforeEach(() => {
  fakeDb.__reset();
});

describe('Boutiques', () => {
  it('un vendeur sans boutique reçoit 404 sur GET /api/shops/me', async () => {
    const { accessToken } = await createUserWithRole(app, 'vendeur', 'v-noshop@test.com', {
      withShop: false,
    });
    const res = await request(app).get('/api/shops/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });

  it('un vendeur crée sa boutique puis la retrouve', async () => {
    const { accessToken } = await createUserWithRole(app, 'vendeur', 'v-create@test.com', {
      withShop: false,
    });

    const createRes = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Ma Super Boutique', description: 'Des produits géniaux' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe('Ma Super Boutique');

    const getRes = await request(app).get('/api/shops/me').set('Authorization', `Bearer ${accessToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.name).toBe('Ma Super Boutique');
  });

  it('refuse une seconde boutique pour le même vendeur (409)', async () => {
    const { accessToken } = await createUserWithRole(app, 'vendeur', 'v-dup@test.com');

    const res = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Boutique 2' });
    expect(res.status).toBe(409);
  });

  it('un vendeur met à jour sa boutique', async () => {
    const { accessToken } = await createUserWithRole(app, 'vendeur', 'v-update@test.com');

    const res = await request(app)
      .put('/api/shops/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Nouveau nom', description: 'Mise à jour' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nouveau nom');
  });

  it('un client ne peut pas créer de boutique (403)', async () => {
    const { accessToken } = await createUserWithRole(app, 'client', 'c-shop@test.com');
    const res = await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Boutique interdite' });
    expect(res.status).toBe(403);
  });

  it('bloque la création de produit tant que le vendeur n’a pas de boutique (400)', async () => {
    const { accessToken } = await createUserWithRole(app, 'vendeur', 'v-gate@test.com', {
      withShop: false,
    });

    const blocked = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Produit orphelin', price: 10, stock: 5 });
    expect(blocked.status).toBe(400);

    await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Boutique enfin créée' });

    const allowed = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Premier produit', price: 10, stock: 5 });
    expect(allowed.status).toBe(201);
  });

  it('GET /api/shops liste les boutiques avec compteurs (admin uniquement)', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v-list@test.com', {
      withShop: false,
    });
    const admin = await createUserWithRole(app, 'admin', 'a-list@test.com');

    await request(app)
      .post('/api/shops')
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send({ name: 'Boutique Listée' });
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send({ name: 'Produit A', price: 10, stock: 5 });

    const forbidden = await request(app)
      .get('/api/shops')
      .set('Authorization', `Bearer ${vendeur.accessToken}`);
    expect(forbidden.status).toBe(403);

    const res = await request(app).get('/api/shops').set('Authorization', `Bearer ${admin.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Boutique Listée');
    expect(res.body[0].products_count).toBe(1);
    expect(res.body[0].vendor_email).toBe('v-list@test.com');
  });
});
