const request = require('supertest');

jest.mock('../src/config/db', () => require('./fakeDb'));

const fakeDb = require('./fakeDb');
const app = require('../src/app');
const { createUserWithRole } = require('./testHelpers');

beforeEach(() => {
  fakeDb.__reset();
});

describe('Catégories', () => {
  it('un admin peut créer une catégorie avec un slug auto-généré', async () => {
    const { accessToken } = await createUserWithRole(app, 'admin', 'admin@cat.com');

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Électronique & Accessoires' });

    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('electronique-accessoires');
  });

  it('un client ne peut pas créer de catégorie (403)', async () => {
    const { accessToken } = await createUserWithRole(app, 'client', 'client@cat.com');

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Sport' });

    expect(res.status).toBe(403);
  });

  it('refuse une catégorie en doublon (409)', async () => {
    const { accessToken } = await createUserWithRole(app, 'admin', 'admin2@cat.com');

    await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Mode' });

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Mode' });

    expect(res.status).toBe(409);
  });

  it('liste les catégories publiquement, sans authentification', async () => {
    const { accessToken } = await createUserWithRole(app, 'admin', 'admin3@cat.com');
    await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Maison' });

    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('Produits', () => {
  async function createCategory(app, accessToken, name) {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name });
    return res.body;
  }

  it('un vendeur peut créer un produit', async () => {
    const { accessToken } = await createUserWithRole(app, 'vendeur', 'vendeur1@shop.com');

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Clavier mécanique', price: 79.99, stock: 10 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Clavier mécanique');
    expect(res.body.stock).toBe(10);
    expect(res.body.is_active).toBe(true);
  });

  it('un client ne peut pas créer de produit (403)', async () => {
    const { accessToken } = await createUserWithRole(app, 'client', 'client1@shop.com');

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Souris', price: 19.99, stock: 5 });

    expect(res.status).toBe(403);
  });

  it('la liste publique ne renvoie que les produits actifs', async () => {
    const { accessToken } = await createUserWithRole(app, 'vendeur', 'vendeur2@shop.com');
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Écran 27"', price: 199.99, stock: 3 });

    await request(app)
      .put(`/api/products/${createRes.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Écran 27"', price: 199.99, stock: 3, is_active: false });

    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  it('filtre les produits par catégorie et recherche texte', async () => {
    const { accessToken } = await createUserWithRole(app, 'vendeur', 'vendeur3@shop.com');
    const admin = await createUserWithRole(app, 'admin', 'admin-cat@shop.com');
    const category = await createCategory(app, admin.accessToken, 'Informatique');

    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Clavier RGB', price: 59.99, stock: 5, category_id: category.id });
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Chaise de bureau', price: 149.99, stock: 2 });

    const byCategory = await request(app).get(`/api/products?category_id=${category.id}`);
    expect(byCategory.body.items).toHaveLength(1);
    expect(byCategory.body.items[0].name).toBe('Clavier RGB');

    const bySearch = await request(app).get('/api/products?search=chaise');
    expect(bySearch.body.items).toHaveLength(1);
    expect(bySearch.body.items[0].name).toBe('Chaise de bureau');
  });

  it("un vendeur ne peut pas modifier le produit d'un autre vendeur (403)", async () => {
    const vendeur1 = await createUserWithRole(app, 'vendeur', 'v1@shop.com');
    const vendeur2 = await createUserWithRole(app, 'vendeur', 'v2@shop.com');

    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${vendeur1.accessToken}`)
      .send({ name: 'Sac à dos', price: 39.99, stock: 8 });

    const res = await request(app)
      .put(`/api/products/${createRes.body.id}`)
      .set('Authorization', `Bearer ${vendeur2.accessToken}`)
      .send({ name: 'Sac à dos modifié', price: 45, stock: 8, is_active: true });

    expect(res.status).toBe(403);
  });

  it('un admin peut modifier ou supprimer le produit de n’importe quel vendeur', async () => {
    const vendeur = await createUserWithRole(app, 'vendeur', 'v3@shop.com');
    const admin = await createUserWithRole(app, 'admin', 'admin4@shop.com');

    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${vendeur.accessToken}`)
      .send({ name: 'Lampe', price: 25, stock: 4 });

    const updateRes = await request(app)
      .put(`/api/products/${createRes.body.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Lampe LED', price: 29, stock: 4, is_active: true });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('Lampe LED');

    const deleteRes = await request(app)
      .delete(`/api/products/${createRes.body.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(deleteRes.status).toBe(204);
  });
});
