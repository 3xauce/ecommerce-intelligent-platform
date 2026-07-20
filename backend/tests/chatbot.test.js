jest.mock('../src/models/analyticsModel', () => ({
  orderKpis: jest.fn(),
  productKpis: jest.fn(),
  topProducts: jest.fn(),
  competitorSummary: jest.fn(),
}));

const analyticsModel = require('../src/models/analyticsModel');
const { answer } = require('../src/services/chatbotService');

const VENDOR_ID = 'vendor-1';

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
});

describe('Chatbot analytique', () => {
  it("répond au chiffre d'affaires (avec accents ou non)", async () => {
    for (const question of ['Quel est mon chiffre d’affaires ?', 'mon CA ?', 'combien j ai gagne']) {
      const reply = await answer(VENDOR_ID, question);
      expect(reply.intent).toBe('revenue');
      // toLocaleString('fr-FR') sépare les milliers par une espace insécable
      expect(reply.text).toMatch(/1[\s  ]250,50/);
    }
  });

  it('répond sur les stocks faibles', async () => {
    const reply = await answer(VENDOR_ID, 'Quels produits sont en stock faible ?');
    expect(reply.intent).toBe('low_stock');
    expect(reply.text).toContain('2 produits');
  });

  it('répond sur les meilleures ventes', async () => {
    const reply = await answer(VENDOR_ID, 'quelles sont mes meilleures ventes ?');
    expect(reply.intent).toBe('top_products');
    expect(reply.text).toContain('Casque Pro');
    expect(reply.text).toContain('1.');
  });

  it('répond sur la veille concurrentielle', async () => {
    const reply = await answer(VENDOR_ID, 'où en sont mes concurrents ?');
    expect(reply.intent).toBe('competitors');
    expect(reply.text).toContain('Store A');
  });

  it('propose de l’aide sur une salutation', async () => {
    const reply = await answer(VENDOR_ID, 'Bonjour');
    expect(reply.intent).toBe('help');
  });

  it('répond proprement à une question incomprise', async () => {
    const reply = await answer(VENDOR_ID, 'quelle est la météo demain ?');
    expect(reply.intent).toBe('unknown');
    expect(reply.text).toContain('aide');
  });
});
