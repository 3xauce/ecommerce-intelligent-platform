const request = require('supertest');

jest.mock('../src/config/db', () => require('./fakeDb'));
jest.mock('../src/config/redis', () => require('./fakeRedis'));
jest.mock('../src/config/stripe', () => require('./fakeStripe'));

const fakeDb = require('./fakeDb');
const fakeStripe = require('./fakeStripe');
const app = require('../src/app');
const { createUserWithRole } = require('./testHelpers');

const AI_URL = 'http://localhost:8010';
const originalFetch = global.fetch;

beforeEach(() => {
  fakeDb.__reset();
  fakeStripe.__reset();
  process.env.AI_SERVICE_URL = AI_URL;
});

afterEach(() => {
  global.fetch = originalFetch;
});

function mockFetch(handlers) {
  global.fetch = jest.fn(async (url, options = {}) => {
    for (const [pattern, handler] of Object.entries(handlers)) {
      if (String(url).includes(pattern)) {
        return handler(url, options);
      }
    }
    throw new Error(`fetch non mocké pour: ${url}`);
  });
}

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

function htmlResponse(html, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new Error('not json');
    },
    text: async () => html,
  };
}

async function setupVendorWithSale() {
  const vendeur = await createUserWithRole(app, 'vendeur', `v-ai-${Math.random()}@shop.com`);
  const client = await createUserWithRole(app, 'client', `c-ai-${Math.random()}@shop.com`);

  const productRes = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${vendeur.accessToken}`)
    .send({ name: 'Casque Bluetooth Pro', price: 84.9, stock: 20 });

  await request(app)
    .post('/api/cart/items')
    .set('Authorization', `Bearer ${client.accessToken}`)
    .send({ product_id: productRes.body.id, quantity: 3 });

  await request(app)
    .post('/api/orders/checkout')
    .set('Authorization', `Bearer ${client.accessToken}`)
    .send({});

  return { vendeur, client, product: productRes.body };
}

describe('GET /api/ai/predictions/:productId', () => {
  it('refuse un client (403)', async () => {
    const client = await createUserWithRole(app, 'client', 'c-pred@shop.com');
    const res = await request(app)
      .get('/api/ai/predictions/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${client.accessToken}`);
    expect(res.status).toBe(403);
  });

  it("refuse le produit d'un autre vendeur (403)", async () => {
    const { product } = await setupVendorWithSale();
    const autre = await createUserWithRole(app, 'vendeur', 'v-autre-ai@shop.com');

    const res = await request(app)
      .get(`/api/ai/predictions/${product.id}`)
      .set('Authorization', `Bearer ${autre.accessToken}`);
    expect(res.status).toBe(403);
  });

  it("envoie l'historique au service IA et stocke les prédictions", async () => {
    const { vendeur, product } = await setupVendorWithSale();

    mockFetch({
      [AI_URL]: (url, options) => {
        const body = JSON.parse(options.body);
        // L'historique transmis contient bien la vente du checkout (3 unités)
        expect(body.history).toHaveLength(1);
        expect(body.history[0].units).toBe(3);
        expect(body.periods).toEqual([30, 60, 90]);
        return jsonResponse({
          model: 'linear_regression',
          predictions: [
            { period_days: 30, predicted_units: 90, confidence: 0.3 },
            { period_days: 60, predicted_units: 180, confidence: 0.3 },
            { period_days: 90, predicted_units: 270, confidence: 0.3 },
          ],
        });
      },
    });

    const res = await request(app)
      .get(`/api/ai/predictions/${product.id}`)
      .set('Authorization', `Bearer ${vendeur.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.model).toBe('linear_regression');
    expect(res.body.predictions).toHaveLength(3);
    expect(res.body.predictions[0].predicted_units).toBe(90);

    // Les prédictions sont persistées dans la table predictions
    const stored = fakeDb.__predictions();
    expect(stored).toHaveLength(3);
    expect(stored[0].prediction_type).toBe('sales_forecast');
    expect(stored[0].product_id).toBe(product.id);
  });

  it('renvoie 503 si le service IA est injoignable', async () => {
    const { vendeur, product } = await setupVendorWithSale();

    global.fetch = jest.fn(async () => {
      throw new Error('ECONNREFUSED');
    });

    const res = await request(app)
      .get(`/api/ai/predictions/${product.id}`)
      .set('Authorization', `Bearer ${vendeur.accessToken}`);
    expect(res.status).toBe(503);
  });
});

describe('GET /api/ai/trends', () => {
  it('renvoie les tendances classées par le service IA', async () => {
    const { vendeur } = await setupVendorWithSale();

    mockFetch({
      [AI_URL]: () =>
        jsonResponse({
          trends: [
            { product_id: 'x', name: 'Casque Bluetooth Pro', slope_pct_per_day: 5.2, trend: 'hausse' },
          ],
        }),
    });

    const res = await request(app)
      .get('/api/ai/trends')
      .set('Authorization', `Bearer ${vendeur.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.trends[0].trend).toBe('hausse');
  });

  it('renvoie une liste vide sans appeler le service si aucun produit', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v-vide-ai@shop.com');
    global.fetch = jest.fn();

    const res = await request(app)
      .get('/api/ai/trends')
      .set('Authorization', `Bearer ${vendeur.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.trends).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('POST /api/ai/magic-compare', () => {
  const PAGE_JSONLD = `
    <html><head>
      <title>Casque Bluetooth Premium | RivalShop</title>
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Product",
         "name":"Casque Bluetooth Premium",
         "offers":{"@type":"Offer","price":"79.99","priceCurrency":"EUR"}}
      </script>
    </head><body>...</body></html>`;

  it('extrait le produit (JSON-LD) et le positionne face au catalogue', async () => {
    const { vendeur } = await setupVendorWithSale(); // Casque Bluetooth Pro à 84,90 €

    mockFetch({ 'rivalshop.example.com': () => htmlResponse(PAGE_JSONLD) });

    const res = await request(app)
      .post('/api/ai/magic-compare')
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send({ url: 'https://rivalshop.example.com/p/casque-premium' });

    expect(res.status).toBe(200);
    expect(res.body.detected.name).toBe('Casque Bluetooth Premium');
    expect(res.body.detected.price).toBe(79.99);
    expect(res.body.detected.source).toBe('json-ld');

    expect(res.body.best_match).not.toBeNull();
    expect(res.body.best_match.product.name).toBe('Casque Bluetooth Pro');
    // 84,90 € vs 79,99 € : mon produit est plus cher
    expect(res.body.best_match.positioning).toBe('plus_cher');
    expect(res.body.best_match.price_diff_pct).toBeGreaterThan(2);
  });

  it("422 si la page ne contient aucun produit extractible", async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v-mc2@shop.com');
    mockFetch({ 'vide.example.com': () => htmlResponse('<html><body><p>Rien ici</p></body></html>') });

    const res = await request(app)
      .post('/api/ai/magic-compare')
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send({ url: 'https://vide.example.com/page' });

    expect(res.status).toBe(422);
  });

  it('400 sur une URL invalide', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v-mc3@shop.com');
    const res = await request(app)
      .post('/api/ai/magic-compare')
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send({ url: 'pas-une-url' });
    expect(res.status).toBe(400);
  });
});

describe('extractProductInfo — heuristique de prix (fallback)', () => {
  const { extractProductInfo } = require('../src/services/magicCompareService');

  it('détecte un prix préfixé £ dans un élément class="price..."', () => {
    const html = `<html><head><title>A Light in the Attic | Books</title></head>
      <body><p class="price_color">£51.77</p></body></html>`;
    const info = extractProductInfo(html);
    expect(info.price).toBe(51.77);
    expect(info.currency).toBe('GBP');
    expect(info.source).toBe('heuristique');
  });

  it('détecte un prix préfixé $ hors élément price', () => {
    const html = '<html><head><title>Gadget</title></head><body><span>$19.99</span></body></html>';
    const info = extractProductInfo(html);
    expect(info.price).toBe(19.99);
    expect(info.currency).toBe('USD');
  });

  it('détecte toujours un prix suffixé € (comportement historique)', () => {
    const html = '<html><head><title>Produit</title></head><body><div>29,90 €</div></body></html>';
    const info = extractProductInfo(html);
    expect(info.price).toBe(29.9);
    expect(info.currency).toBe('EUR');
  });
});
