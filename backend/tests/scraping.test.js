const request = require('supertest');

jest.mock('../src/config/db', () => require('./fakeDb'));
jest.mock('../src/config/redis', () => require('./fakeRedis'));

const fakeDb = require('./fakeDb');
const fakeRedis = require('./fakeRedis');
const app = require('../src/app');
const { createUserWithRole } = require('./testHelpers');

beforeEach(() => {
  fakeDb.__reset();
  fakeRedis.__reset();
});

const validStore = {
  name: 'Concurrent A',
  url: 'https://concurrent-a.example.com',
  platform: 'woocommerce',
};

describe('Configuration des stores concurrents', () => {
  it('refuse un client (403) — réservé vendeur/admin', async () => {
    const client = await createUserWithRole(app, 'client', 'client-scrap@shop.com');
    const res = await request(app)
      .get('/api/scraping/stores')
      .set('Authorization', `Bearer ${client.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('un vendeur peut créer un store woocommerce', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v-scrap1@shop.com');
    const res = await request(app)
      .post('/api/scraping/stores')
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send(validStore);

    expect(res.status).toBe(201);
    expect(res.body.platform).toBe('woocommerce');
    expect(res.body.is_active).toBe(true);
  });

  it('exige des sélecteurs CSS pour la plateforme generic (400)', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v-scrap2@shop.com');
    const res = await request(app)
      .post('/api/scraping/stores')
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send({ ...validStore, platform: 'generic' });

    expect(res.status).toBe(400);
  });

  it('accepte generic avec des sélecteurs complets', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v-scrap3@shop.com');
    const res = await request(app)
      .post('/api/scraping/stores')
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send({
        ...validStore,
        platform: 'generic',
        css_selectors: { product: '.item', name: '.title', price: '.price' },
      });

    expect(res.status).toBe(201);
    expect(res.body.css_selectors.product).toBe('.item');
  });

  it("un vendeur ne voit pas les stores d'un autre vendeur", async () => {
    const vendeur1 = await createUserWithRole(app, 'vendeur', 'v-scrap4@shop.com');
    const vendeur2 = await createUserWithRole(app, 'vendeur', 'v-scrap5@shop.com');

    await request(app)
      .post('/api/scraping/stores')
      .set('Authorization', `Bearer ${vendeur1.accessToken}`)
      .send(validStore);

    const res = await request(app)
      .get('/api/scraping/stores')
      .set('Authorization', `Bearer ${vendeur2.accessToken}`);
    expect(res.body).toHaveLength(0);
  });

  it("un admin voit tous les stores et peut modifier ceux d'un vendeur", async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v-scrap6@shop.com');
    const admin = await createUserWithRole(app, 'admin', 'admin-scrap@shop.com');

    const createRes = await request(app)
      .post('/api/scraping/stores')
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send(validStore);

    const listRes = await request(app)
      .get('/api/scraping/stores')
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(listRes.body).toHaveLength(1);

    const updateRes = await request(app)
      .put(`/api/scraping/stores/${createRes.body.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ ...validStore, name: 'Concurrent A (renommé)', is_active: false });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('Concurrent A (renommé)');
    expect(updateRes.body.is_active).toBe(false);
  });
});

describe('Lancement du scraping', () => {
  it('met un job en file Redis (202)', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v-run1@shop.com');
    const createRes = await request(app)
      .post('/api/scraping/stores')
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send(validStore);

    const res = await request(app)
      .post(`/api/scraping/run/${createRes.body.id}`)
      .set('Authorization', `Bearer ${vendeur.accessToken}`);

    expect(res.status).toBe(202);

    const queues = fakeRedis.__queues();
    expect(queues['scraping:jobs']).toHaveLength(1);
    const job = JSON.parse(queues['scraping:jobs'][0]);
    expect(job.store_id).toBe(createRes.body.id);
  });

  it("refuse de lancer le scraping d'un store d'un autre vendeur (403)", async () => {
    const vendeur1 = await createUserWithRole(app, 'vendeur', 'v-run2@shop.com');
    const vendeur2 = await createUserWithRole(app, 'vendeur', 'v-run3@shop.com');

    const createRes = await request(app)
      .post('/api/scraping/stores')
      .set('Authorization', `Bearer ${vendeur1.accessToken}`)
      .send(validStore);

    const res = await request(app)
      .post(`/api/scraping/run/${createRes.body.id}`)
      .set('Authorization', `Bearer ${vendeur2.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('refuse un store désactivé (400)', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v-run4@shop.com');
    const createRes = await request(app)
      .post('/api/scraping/stores')
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send(validStore);

    await request(app)
      .put(`/api/scraping/stores/${createRes.body.id}`)
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send({ ...validStore, is_active: false });

    const res = await request(app)
      .post(`/api/scraping/run/${createRes.body.id}`)
      .set('Authorization', `Bearer ${vendeur.accessToken}`);
    expect(res.status).toBe(400);
  });
});

describe('Consultation des produits scrapés', () => {
  it('renvoie une liste paginée vide pour un nouveau store', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v-res1@shop.com');
    const createRes = await request(app)
      .post('/api/scraping/stores')
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send(validStore);

    const res = await request(app)
      .get(`/api/scraping/stores/${createRes.body.id}/products`)
      .set('Authorization', `Bearer ${vendeur.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});
