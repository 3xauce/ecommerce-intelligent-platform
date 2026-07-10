import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const INDIGO = [79, 70, 229];
const INK = [15, 23, 42];
const MUTED = [100, 116, 139];

function euro(value) {
  return `${Number(value || 0).toFixed(2)} EUR`;
}

/**
 * Génère le rapport PDF du dashboard (exigence "Rapports PDF" du cahier
 * des charges) : KPIs, top produits et synthèse concurrentielle.
 */
export function generateDashboardPdf({ dashboard, competitors, userName }) {
  const doc = new jsPDF();
  const now = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // En-tête
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Novacart — Rapport analytique', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Généré le ${now} — ${userName || ''}`, 14, 19);

  // KPIs
  const { kpis } = dashboard;
  doc.setTextColor(...INK);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Indicateurs clés', 14, 38);

  autoTable(doc, {
    startY: 42,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Produits au catalogue', String(kpis.products_count)],
      ['Produits actifs', String(kpis.active_products)],
      ['Produits en stock faible (≤ 5)', String(kpis.low_stock_count)],
      ['Commandes', String(kpis.orders_count)],
      ['Chiffre d’affaires encaissé', euro(kpis.revenue_paid)],
      ['En attente de paiement', euro(kpis.revenue_pending)],
      ['Stores concurrents suivis', String(kpis.stores_count)],
      ['Produits concurrents collectés', String(kpis.scraped_products_count)],
    ],
    headStyles: { fillColor: INDIGO },
    styles: { fontSize: 9 },
  });

  // Top produits
  if (dashboard.top_products?.length) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Meilleures ventes', 14, doc.lastAutoTable.finalY + 12);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['Produit', 'Unités vendues', 'Chiffre d’affaires']],
      body: dashboard.top_products.map((p) => [p.name, String(p.units_sold), euro(p.revenue)]),
      headStyles: { fillColor: INDIGO },
      styles: { fontSize: 9 },
    });
  }

  // Concurrents
  if (competitors?.summary?.length) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Synthèse concurrentielle', 14, doc.lastAutoTable.finalY + 12);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['Store', 'Plateforme', 'Produits', 'Prix moyen', 'Min', 'Max']],
      body: competitors.summary.map((s) => [
        s.name,
        s.platform,
        String(s.scraped_count),
        s.avg_price != null ? euro(s.avg_price) : '—',
        s.min_price != null ? euro(s.min_price) : '—',
        s.max_price != null ? euro(s.max_price) : '—',
      ]),
      headStyles: { fillColor: INDIGO },
      styles: { fontSize: 9 },
    });
  }

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    'Plateforme E-Commerce Intelligente — rapport généré automatiquement',
    14,
    doc.internal.pageSize.height - 10
  );

  doc.save('rapport-novacart.pdf');
}
