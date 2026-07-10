const analyticsModel = require('../models/analyticsModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// Admin = vue plateforme entière ; vendeur = son propre périmètre.
function scopeVendorId(user) {
  return user.role === 'admin' ? null : user.id;
}

const dashboard = asyncHandler(async (req, res) => {
  const vendorId = scopeVendorId(req.user);
  const days = Number(req.query.days) || 30;

  const [products, orders, scraping, sales, top] = await Promise.all([
    analyticsModel.productKpis(vendorId),
    analyticsModel.orderKpis(vendorId),
    analyticsModel.scrapingKpis(vendorId),
    analyticsModel.salesByDay(vendorId, days),
    analyticsModel.topProducts(vendorId, 5),
  ]);

  res.status(200).json({
    scope: vendorId ? 'vendeur' : 'plateforme',
    kpis: { ...products, ...orders, ...scraping },
    sales_by_day: sales,
    top_products: top,
    period_days: days,
  });
});

const competitors = asyncHandler(async (req, res) => {
  const vendorId = scopeVendorId(req.user);
  const days = Number(req.query.days) || 30;

  const [summary, trend, latest] = await Promise.all([
    analyticsModel.competitorSummary(vendorId),
    analyticsModel.competitorPriceTrend(vendorId, days),
    analyticsModel.latestScrapedProducts(vendorId, 20),
  ]);

  res.status(200).json({
    summary,
    price_trend: trend,
    latest_products: latest,
    period_days: days,
  });
});

function toCsv(headers, rows) {
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers.join(';'), ...rows.map((row) => row.map(escape).join(';'))];
  // BOM UTF-8 pour l'ouverture directe dans Excel
  return `﻿${lines.join('\n')}`;
}

const exportCsv = asyncHandler(async (req, res) => {
  const vendorId = scopeVendorId(req.user);
  const type = req.query.type || 'sales';

  let csv;
  let filename;

  if (type === 'sales') {
    const sales = await analyticsModel.salesByDay(vendorId, 90);
    csv = toCsv(
      ['date', 'commandes', 'chiffre_affaires'],
      sales.map((row) => [row.day, row.orders, row.revenue])
    );
    filename = 'ventes.csv';
  } else if (type === 'competitors') {
    const latest = await analyticsModel.latestScrapedProducts(vendorId, 1000);
    csv = toCsv(
      ['store', 'produit', 'prix', 'stock', 'url', 'scrape_le'],
      latest.map((row) => [
        row.store_name,
        row.product_name,
        row.price,
        row.stock_status,
        row.url,
        row.scraped_at instanceof Date ? row.scraped_at.toISOString() : row.scraped_at,
      ])
    );
    filename = 'concurrents.csv';
  } else {
    throw ApiError.badRequest('Type d’export invalide (attendu: sales | competitors)');
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});

module.exports = { dashboard, competitors, exportCsv };
