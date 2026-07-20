const analyticsModel = require('../models/analyticsModel');

/**
 * Chatbot analytique à base de règles (NLP léger) : détecte l'intention
 * d'une question en français et répond avec les données réelles du vendeur.
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

const INTENTS = [
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

async function answer(vendorId, message) {
  const text = normalize(message);

  for (const intent of INTENTS) {
    if (intent.patterns.test(text)) {
      const result = await intent.run(vendorId);
      return { intent: intent.id, ...result };
    }
  }

  return {
    intent: 'unknown',
    text:
      "Je n'ai pas compris la question. Je sais répondre sur : le chiffre d'affaires, " +
      'les commandes, les stocks faibles, les meilleures ventes, le catalogue et la ' +
      'veille concurrentielle. Tapez « aide » pour des exemples.',
  };
}

module.exports = { answer };
