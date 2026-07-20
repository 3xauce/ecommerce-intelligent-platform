jest.mock('../src/models/analyticsModel', () => ({
  orderKpis: jest.fn(),
  productKpis: jest.fn(),
  topProducts: jest.fn(),
  competitorSummary: jest.fn(),
}));
jest.mock('../src/models/orderModel', () => ({
  listByCustomer: jest.fn(),
}));
jest.mock('../src/models/cartModel', () => ({
  getOrCreateCart: jest.fn(),
  getItems: jest.fn(),
}));
jest.mock('../src/models/productModel', () => ({
  list: jest.fn(),
}));

const analyticsModel = require('../src/models/analyticsModel');
const orderModel = require('../src/models/orderModel');
const cartModel = require('../src/models/cartModel');
const productModel = require('../src/models/productModel');
const { answer } = require('../src/services/chatbotService');

const VENDOR = { id: 'vendor-1', role: 'vendeur' };
const CLIENT = { id: 'client-1', role: 'client' };

beforeEach(() => {
  jest.clearAllMocks();
  analyticsModel.orderKpis.mockResolvedValue({
    revenue_paid: 1250.5,
    revenue_pending: 100,
    orders_count: 12,
  });
  analyticsModel.productKpis.mockResolvedValue({ products_count: 8, low_stock_count: 2 });
  analyticsModel.topProducts.mockResolvedValue([
    { name: 'Casque Pro', revenue: 500, quantity: 5 },
    { name: 'Souris X', revenue: 300, quantity: 10 },
  ]);
  analyticsModel.competitorSummary.mockResolvedValue([
    { name: 'Store A', scraped_count: 20, avg_price: 38.05, min_price: 13.99, max_price: 57.25 },
  ]);

  orderModel.listByCustomer.mockResolvedValue([
    { created_at: '2026-07-18T10:00:00Z', total: 89.99, status: 'paid' },
    { created_at: '2026-07-10T10:00:00Z', total: 25.5, status: 'pending' },
  ]);
  cartModel.getOrCreateCart.mockResolvedValue({ id: 'cart-1' });
  cartModel.getItems.mockResolvedValue([
    { product_name: 'Casque Audio', product_price: 79.99, quantity: 2 },
  ]);
  productModel.list.mockResolvedValue({
    items: [{ name: 'Casque Bluetooth ANC Pro', price: 129.99 }],
    total: 1,
  });
});

describe('Chatbot — intentions vendeur', () => {
  it("répond au chiffre d'affaires (avec accents ou non)", async () => {
    for (const question of ['Quel est mon chiffre d’affaires ?', 'mon CA ?', 'combien j ai gagne']) {
      const reply = await answer(VENDOR, question);
      expect(reply.intent).toBe('revenue');
      // toLocaleString('fr-FR') sépare les milliers par une espace insécable
      expect(reply.text).toMatch(/1[\s  ]250,50/);
    }
  });

  it('répond sur les stocks faibles', async () => {
    const reply = await answer(VENDOR, 'Quels produits sont en stock faible ?');
    expect(reply.intent).toBe('low_stock');
    expect(reply.text).toContain('2 produits');
  });

  it('répond sur les meilleures ventes', async () => {
    const reply = await answer(VENDOR, 'quelles sont mes meilleures ventes ?');
    expect(reply.intent).toBe('top_products');
    expect(reply.text).toContain('Casque Pro');
    expect(reply.text).toContain('1.');
  });

  it('répond sur la veille concurrentielle', async () => {
    const reply = await answer(VENDOR, 'où en sont mes concurrents ?');
    expect(reply.intent).toBe('competitors');
    expect(reply.text).toContain('Store A');
  });

  it('propose de l’aide sur une salutation', async () => {
    const reply = await answer(VENDOR, 'Bonjour');
    expect(reply.intent).toBe('help');
  });

  it('répond proprement à une question incomprise', async () => {
    const reply = await answer(VENDOR, 'quelle est la météo demain ?');
    expect(reply.intent).toBe('unknown');
    expect(reply.text).toContain('aide');
  });
});

describe('Chatbot — intentions client', () => {
  it('donne le statut des dernières commandes', async () => {
    const reply = await answer(CLIENT, 'Où en est ma commande ?');
    expect(reply.intent).toBe('my_orders');
    expect(orderModel.listByCustomer).toHaveBeenCalledWith(CLIENT.id, { limit: 3 });
    expect(reply.text).toContain('payée');
    expect(reply.text).toContain('en attente de paiement');
  });

  it("indique qu'il n'y a aucune commande le cas échéant", async () => {
    orderModel.listByCustomer.mockResolvedValue([]);
    const reply = await answer(CLIENT, 'suivi de ma livraison');
    expect(reply.intent).toBe('my_orders');
    expect(reply.text).toContain('pas encore');
  });

  it('résume le contenu du panier avec le total', async () => {
    const reply = await answer(CLIENT, 'que contient mon panier ?');
    expect(reply.intent).toBe('my_cart');
    expect(reply.text).toContain('Casque Audio');
    expect(reply.text).toContain('2 articles');
    expect(reply.text).toContain('159,98');
  });

  it('signale un panier vide', async () => {
    cartModel.getItems.mockResolvedValue([]);
    const reply = await answer(CLIENT, 'mon panier');
    expect(reply.intent).toBe('my_cart');
    expect(reply.text).toContain('vide');
  });

  it('recherche un produit dans le catalogue', async () => {
    const reply = await answer(CLIENT, 'cherche un casque audio');
    expect(reply.intent).toBe('product_search');
    expect(productModel.list).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'casque audio', limit: 3 })
    );
    expect(reply.text).toContain('Casque Bluetooth ANC Pro');
    expect(reply.text).toContain('129,99');
  });

  it('répond proprement quand la recherche ne donne rien', async () => {
    productModel.list.mockResolvedValue({ items: [], total: 0 });
    const reply = await answer(CLIENT, 'cherche une cafetière italienne');
    expect(reply.intent).toBe('product_search');
    expect(reply.text).toContain('Aucun produit');
  });

  it('propose une aide adaptée au client', async () => {
    const reply = await answer(CLIENT, 'bonjour');
    expect(reply.intent).toBe('help');
    expect(reply.text).toContain('panier');
  });

  it("un client n'accède pas aux intentions analytics vendeur", async () => {
    const reply = await answer(CLIENT, 'quel est mon chiffre d’affaires ?');
    expect(reply.intent).toBe('unknown');
    expect(analyticsModel.orderKpis).not.toHaveBeenCalled();
  });
});
