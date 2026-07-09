const request = require('supertest');

jest.mock('../src/config/db', () => require('./fakeDb'));

const fakeDb = require('./fakeDb');
const app = require('../src/app');
const { createUserWithRole } = require('./testHelpers');

beforeEach(() => {
  fakeDb.__reset();
});

async function createProduct(app, accessToken, overrides = {}) {
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Produit test', price: 10, stock: 5, ...overrides });
  return res.body;
}

describe('Panier', () => {
  it('refuse tout accès sans authentification (401)', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });

  it('crée un panier vide au premier accès', async () => {
    const { accessToken } = await createUserWithRole(app, 'client', 'client-cart1@shop.com');
    const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('ajoute un produit et calcule le total', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'vendeur-cart1@shop.com');
    const client = await createUserWithRole(app, 'client', 'client-cart2@shop.com');
    const product = await createProduct(app, vendeur.accessToken, { price: 12.5, stock: 10 });

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ product_id: product.id, quantity: 3 });

    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(3);
    expect(res.body.total).toBe(37.5);
    expect(res.body.item_count).toBe(3);
  });

  it('cumule la quantité si le produit est ajouté deux fois', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'vendeur-cart2@shop.com');
    const client = await createUserWithRole(app, 'client', 'client-cart3@shop.com');
    const product = await createProduct(app, vendeur.accessToken, { stock: 10 });

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ product_id: product.id, quantity: 2 });

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ product_id: product.id, quantity: 3 });

    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(5);
  });

  it('refuse d’ajouter plus que le stock disponible (400)', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'vendeur-cart3@shop.com');
    const client = await createUserWithRole(app, 'client', 'client-cart4@shop.com');
    const product = await createProduct(app, vendeur.accessToken, { stock: 2 });

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ product_id: product.id, quantity: 5 });

    expect(res.status).toBe(400);
  });

  it('modifie la quantité exacte d’un article', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'vendeur-cart4@shop.com');
    const client = await createUserWithRole(app, 'client', 'client-cart5@shop.com');
    const product = await createProduct(app, vendeur.accessToken, { stock: 10 });

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ product_id: product.id, quantity: 2 });

    const res = await request(app)
      .put(`/api/cart/items/${product.id}`)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ quantity: 7 });

    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(7);
  });

  it('retire un article du panier', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'vendeur-cart5@shop.com');
    const client = await createUserWithRole(app, 'client', 'client-cart6@shop.com');
    const product = await createProduct(app, vendeur.accessToken, { stock: 10 });

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ product_id: product.id, quantity: 2 });

    const res = await request(app)
      .delete(`/api/cart/items/${product.id}`)
      .set('Authorization', `Bearer ${client.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  it('vide complètement le panier', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'vendeur-cart6@shop.com');
    const client = await createUserWithRole(app, 'client', 'client-cart7@shop.com');
    const product = await createProduct(app, vendeur.accessToken, { stock: 10 });

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ product_id: product.id, quantity: 2 });

    const clearRes = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${client.accessToken}`);
    expect(clearRes.status).toBe(204);

    const getRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${client.accessToken}`);
    expect(getRes.body.items).toHaveLength(0);
  });

  it('chaque utilisateur a son propre panier, isolé des autres', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'vendeur-cart7@shop.com');
    const clientA = await createUserWithRole(app, 'client', 'client-cartA@shop.com');
    const clientB = await createUserWithRole(app, 'client', 'client-cartB@shop.com');
    const product = await createProduct(app, vendeur.accessToken, { stock: 10 });

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${clientA.accessToken}`)
      .send({ product_id: product.id, quantity: 4 });

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${clientB.accessToken}`);

    expect(res.body.items).toHaveLength(0);
  });
});
