const analyticsModel = require('../models/analyticsModel');
const orderModel = require('../models/orderModel');
const cartModel = require('../models/cartModel');
const productModel = require('../models/productModel');

/**
 * Chatbot à base de règles (NLP léger) : détecte l'intention d'une question
 * en français et répond avec les données réelles de l'utilisateur. Les
 * intentions dépendent du rôle : analytics pour vendeur/admin, assistance
 * boutique (commandes, panier, recherche) pour les clients.
 * Aucun appel externe — déterministe, rapide, fonctionne hors ligne.
 */

function euro(value) {
  return `${Number(value || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function normalize(text) {
  // Minuscules + suppression des accents pour un matching robuste
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const VENDOR_INTENTS = [
  {
    id: 'revenue',
    patterns: /(chiffre d.affaires|\bca\b|revenu|encaisse|combien.*(gagne|vendu))/,
    async run(vendorId) {
      const kpis = await analyticsModel.orderKpis(vendorId);
      return {
        text:
          `Sur les 30 derniers jours : ${euro(kpis.revenue_paid)} encaissés sur ` +
          `${kpis.orders_count} commande${kpis.orders_count > 1 ? 's' : ''}` +
          (Number(kpis.revenue_pending) > 0
            ? `, et ${euro(kpis.revenue_pending)} en attente de paiement.`
            : '.'),
      };
    },
  },
  {
    id: 'top_products',
    patterns: /(meilleur|top|plus vendu|best.?seller|produit.*(marche|vend))/,
    async run(vendorId) {
      const top = await analyticsModel.topProducts(vendorId, 3);
      if (!top.length) {
        return { text: 'Aucune vente enregistrée pour le moment — impossible de calculer un top produits.' };
      }
      const lines = top.map(
        (p, i) => `${i + 1}. ${p.name} — ${euro(p.revenue)} (${p.quantity} vendus)`
      );
      return { text: `Vos meilleures ventes :\n${lines.join('\n')}` };
    },
  },
  {
    id: 'orders',
    patterns: /(commande|vente(s)?\b|combien.*vendu)/,
    async run(vendorId) {
      const kpis = await analyticsModel.orderKpis(vendorId);
      return {
        text: `Vous avez ${kpis.orders_count} commande${kpis.orders_count > 1 ? 's' : ''} sur les 30 derniers jours, pour un total encaissé de ${euro(kpis.revenue_paid)}.`,
      };
    },
  },
  {
    id: 'low_stock',
    patterns: /(stock (faible|bas)|rupture|reapprovisionn|epuise|manque.*stock|stock)/,
    async run(vendorId) {
      const kpis = await analyticsModel.productKpis(vendorId);
      if (kpis.low_stock_count === 0) {
        return { text: 'Aucun produit en stock faible (seuil : 5 unités). Tout va bien !' };
      }
      return {
        text: `${kpis.low_stock_count} produit${kpis.low_stock_count > 1 ? 's sont' : ' est'} en stock faible (≤ 5 unités) sur ${kpis.products_count} au catalogue. Pensez à réapprovisionner depuis « Ma boutique ».`,
      };
    },
  },
  {
    id: 'competitors',
    patterns: /(concurrent|veille|scrap|prix.*(marche|concurrence)|comparaison)/,
    async run(vendorId) {
      const summary = await analyticsModel.competitorSummary(vendorId);
      if (!summary.length) {
        return {
          text: "Aucun store concurrent configuré. Ajoutez-en un depuis la page « Veille concurrentielle » du dashboard pour commencer l'analyse.",
        };
      }
      const lines = summary.map(
        (s) =>
          `• ${s.name} : ${s.scraped_count} produits suivis, prix moyen ${euro(s.avg_price)} (min ${euro(s.min_price)}, max ${euro(s.max_price)})`
      );
      return { text: `Votre veille concurrentielle :\n${lines.join('\n')}` };
    },
  },
  {
    id: 'catalog',
    patterns: /(catalogue|mes produits|combien.*produit)/,
    async run(vendorId) {
      const kpis = await analyticsModel.productKpis(vendorId);
      return {
        text: `Votre catalogue compte ${kpis.products_count} produit${kpis.products_count > 1 ? 's' : ''}, dont ${kpis.low_stock_count} en stock faible.`,
      };
    },
  },
  {
    id: 'help',
    patterns: /(aide|help|quoi.*(demander|faire)|comment|bonjour|salut|hello)/,
    async run() {
      return {
        text:
          'Je réponds à vos questions sur votre activité. Essayez par exemple :\n' +
          '• « Quel est mon chiffre d’affaires ? »\n' +
          '• « Quels sont mes produits en stock faible ? »\n' +
          '• « Quelles sont mes meilleures ventes ? »\n' +
          '• « Où en sont les prix de mes concurrents ? »',
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Intentions côté client : suivi d'achats, panier, recherche dans le catalogue
// ---------------------------------------------------------------------------

const ORDER_STATUS_LABELS = {
  pending: 'en attente de paiement',
  paid: 'payée',
  payment_failed: 'en échec de paiement',
};

const CLIENT_INTENTS = [
  {
    id: 'my_orders',
    patterns: /(commande|livraison|colis|suivi|achat)/,
    async run(userId) {
      const orders = await orderModel.listByCustomer(userId, { limit: 3 });
      if (!orders.length) {
        return {
          text: "Vous n'avez pas encore passé de commande. Parcourez le catalogue pour trouver votre bonheur !",
        };
      }
      const lines = orders.map((o) => {
        const date = new Date(o.created_at).toLocaleDateString('fr-FR');
        const status = ORDER_STATUS_LABELS[o.status] || o.status;
        return `• Commande du ${date} — ${euro(o.total)} — ${status}`;
      });
      return {
        text: `Vos dernières commandes :\n${lines.join('\n')}\nRetrouvez le détail dans « Mes commandes ».`,
      };
    },
  },
  {
    id: 'my_cart',
    patterns: /(panier|cart\b)/,
    async run(userId) {
      const cart = await cartModel.getOrCreateCart(userId);
      const items = await cartModel.getItems(cart.id);
      if (!items.length) {
        return { text: 'Votre panier est vide. Ajoutez des produits depuis le catalogue !' };
      }
      const total = items.reduce(
        (sum, item) => sum + Number(item.product_price) * item.quantity,
        0
      );
      const count = items.reduce((sum, item) => sum + item.quantity, 0);
      const lines = items
        .slice(0, 4)
        .map((i) => `• ${i.product_name} × ${i.quantity} — ${euro(i.product_price)}`);
      return {
        text: `Votre panier contient ${count} article${count > 1 ? 's' : ''} pour un total de ${euro(total)} :\n${lines.join('\n')}`,
      };
    },
  },
  {
    id: 'product_search',
    patterns: /(?:cherche[sz]?|trouve[rz]?|recherche|avez.vous|as.tu|y a.t.il)\s+(?:un[e]?\s+|des\s+|d[ue]\s+|le\s+|la\s+|les\s+)?(.{2,60})/,
    async run(userId, match) {
      const query = match[1].replace(/[?!.]/g, '').trim();
      const { items } = await productModel.list({ search: query, limit: 3 });
      if (!items.length) {
        return { text: `Aucun produit trouvé pour « ${query} ». Essayez un autre mot-clé.` };
      }
      const lines = items.map((p) => `• ${p.name} — ${euro(p.price)}`);
      return {
        text: `Voici ce que j'ai trouvé pour « ${query} » :\n${lines.join('\n')}\nRetrouvez-les dans le catalogue.`,
      };
    },
  },
  {
    id: 'help',
    patterns: /(aide|help|quoi.*(demander|faire)|comment|bonjour|salut|hello)/,
    async run() {
      return {
        text:
          'Je vous aide dans vos achats. Essayez par exemple :\n' +
          '• « Où en est ma commande ? »\n' +
          '• « Que contient mon panier ? »\n' +
          '• « Cherche un casque audio »',
      };
    },
  },
];

const UNKNOWN_REPLIES = {
  vendor:
    "Je n'ai pas compris la question. Je sais répondre sur : le chiffre d'affaires, " +
    'les commandes, les stocks faibles, les meilleures ventes, le catalogue et la ' +
    'veille concurrentielle. Tapez « aide » pour des exemples.',
  client:
    "Je n'ai pas compris la question. Je peux vous renseigner sur vos commandes, " +
    'votre panier, ou chercher un produit dans le catalogue. Tapez « aide » pour des exemples.',
};

async function answer(user, message) {
  const text = normalize(message);
  const isVendor = user.role === 'vendeur' || user.role === 'admin';
  const intents = isVendor ? VENDOR_INTENTS : CLIENT_INTENTS;

  for (const intent of intents) {
    const match = intent.patterns.exec(text);
    if (match) {
      const result = await intent.run(user.id, match);
      return { intent: intent.id, ...result };
    }
  }

  return { intent: 'unknown', text: UNKNOWN_REPLIES[isVendor ? 'vendor' : 'client'] };
}

module.exports = { answer };
