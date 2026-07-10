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

/**
 * Prépare un vendeur avec un produit vendu via un vrai flux checkout
 * (panier -> commande), pour que les agrégats aient des données réelles.
 */
async function setupVendorWithSale() {
  const vendeur = await createUserWithRole(app, 'vendeur', `v-ana-${Math.random()}@shop.com`);
  const client = await createUserWithRole(app, 'client', `c-ana-${Math.random()}@shop.com`);

  const productRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${vendeur.accessToken}`)
    .send({ name: 'Produit Analytique', price: 50, stock: 10 });

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

describe('GET /api/analytics/dashboard', () => {
  it('refuse un client (403)', async () => {
    const client = await createUserWithRole(app, 'client', 'c-dash@shop.com');
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${client.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('renvoie les KPIs du vendeur après une vente', async () => {
    const { vendeur } = await setupVendorWithSale();

    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${vendeur.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('vendeur');
    expect(res.body.kpis.products_count).toBe(1);
    expect(res.body.kpis.orders_count).toBe(1);
    expect(res.body.kpis.revenue_pending).toBe(100); // 2 × 50 €, commande pending
    expect(res.body.kpis.revenue_paid).toBe(0);

    expect(res.body.sales_by_day).toHaveLength(1);
    expect(res.body.sales_by_day[0].revenue).toBe(100);
    expect(res.body.sales_by_day[0].orders).toBe(1);

    expect(res.body.top_products).toHaveLength(1);
    expect(res.body.top_products[0].name).toBe('Produit Analytique');
    expect(res.body.top_products[0].units_sold).toBe(2);
  });

  it("le périmètre d'un vendeur n'inclut pas les ventes des autres", async () => {
    await setupVendorWithSale();
    const autreVendeur = await createUserWithRole(app, 'vendeur', 'v-vide@shop.com');

    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${autreVendeur.accessToken}`);

    expect(res.body.kpis.orders_count).toBe(0);
    expect(res.body.kpis.products_count).toBe(0);
  });

  it('un admin voit le périmètre plateforme', async () => {
    await setupVendorWithSale();
    const admin = await createUserWithRole(app, 'admin', 'admin-dash@shop.com');

    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(res.body.scope).toBe('plateforme');
    expect(res.body.kpis.orders_count).toBe(1);
  });
});

describe('GET /api/analytics/competitors', () => {
  it('agrège les données scrapées par store', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v-comp@shop.com');

    const storeRes = await request(app)
      .post('/api/scraping/stores')
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send({ name: 'Rival', url: 'https://rival.example.com', platform: 'shopify' });

    fakeDb.__seedScrapedProduct({ store_id: storeRes.body.id, product_name: 'Casque X', price: 80 });
    fakeDb.__seedScrapedProduct({ store_id: storeRes.body.id, product_name: 'Casque Y', price: 120 });

    const res = await request(app)
      .get('/api/analytics/competitors')
      .set('Authorization', `Bearer ${vendeur.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary).toHaveLength(1);
    expect(res.body.summary[0].scraped_count).toBe(2);
    expect(res.body.summary[0].avg_price).toBe(100);
    expect(res.body.summary[0].min_price).toBe(80);
    expect(res.body.summary[0].max_price).toBe(120);

    expect(res.body.price_trend).toHaveLength(1);
    expect(res.body.price_trend[0].avg_price).toBe(100);

    expect(res.body.latest_products).toHaveLength(2);
  });
});

describe('GET /api/analytics/export/csv', () => {
  it('exporte les ventes en CSV', async () => {
    const { vendeur } = await setupVendorWithSale();

    const res = await request(app)
      .get('/api/analytics/export/csv?type=sales')
      .set('Authorization', `Bearer ${vendeur.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('ventes.csv');
    expect(res.text).toContain('date;commandes;chiffre_affaires');
    expect(res.text).toContain(';1;100');
  });

  it('refuse un type inconnu (400)', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v-csv@shop.com');
    const res = await request(app)
      .get('/api/analytics/export/csv?type=hack')
      .set('Authorization', `Bearer ${vendeur.accessToken}`);
    expect(res.status).toBe(400);
  });
});
