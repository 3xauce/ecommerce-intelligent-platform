const db = require('../config/db');

/**
 * Toutes les fonctions acceptent vendorId = null pour un périmètre
 * plateforme entière (cas admin).
 */

async function productKpis(vendorId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS products_count,
            COUNT(*) FILTER (WHERE is_active)::int AS active_products,
            COUNT(*) FILTER (WHERE stock <= 5)::int AS low_stock_count
     FROM products
     WHERE ($1::uuid IS NULL OR vendor_id = $1)`,
    [vendorId]
  );
  return rows[0];
}

async function orderKpis(vendorId) {
  const { rows } = await db.query(
    `SELECT COUNT(DISTINCT o.id)::int AS orders_count,
            COALESCE(SUM(oi.quantity * oi.unit_price) FILTER (WHERE o.status = 'paid'), 0)::float AS revenue_paid,
            COALESCE(SUM(oi.quantity * oi.unit_price) FILTER (WHERE o.status = 'pending'), 0)::float AS revenue_pending
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     WHERE o.status <> 'payment_failed'
       AND ($1::uuid IS NULL OR p.vendor_id = $1)`,
    [vendorId]
  );
  return rows[0];
}

async function scrapingKpis(vendorId) {
  const { rows } = await db.query(
    `SELECT COUNT(DISTINCT cs.id)::int AS stores_count,
            COUNT(sp.id)::int AS scraped_products_count
     FROM competitor_stores cs
     LEFT JOIN scraped_products sp ON sp.store_id = cs.id
     WHERE ($1::uuid IS NULL OR cs.vendor_id = $1)`,
    [vendorId]
  );
  return rows[0];
}

async function salesByDay(vendorId, days = 30) {
  const { rows } = await db.query(
    `SELECT TO_CHAR(DATE(o.created_at), 'YYYY-MM-DD') AS day,
            COALESCE(SUM(oi.quantity * oi.unit_price), 0)::float AS revenue,
            COUNT(DISTINCT o.id)::int AS orders
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     WHERE o.status <> 'payment_failed'
       AND o.created_at >= NOW() - INTERVAL '1 day' * $2
       AND ($1::uuid IS NULL OR p.vendor_id = $1)
     GROUP BY DATE(o.created_at)
     ORDER BY day ASC`,
    [vendorId, days]
  );
  return rows;
}

async function topProducts(vendorId, limit = 5) {
  const { rows } = await db.query(
    `SELECT p.id, p.name,
            SUM(oi.quantity)::int AS units_sold,
            SUM(oi.quantity * oi.unit_price)::float AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     WHERE o.status <> 'payment_failed'
       AND ($1::uuid IS NULL OR p.vendor_id = $1)
     GROUP BY p.id, p.name
     ORDER BY revenue DESC
     LIMIT $2`,
    [vendorId, limit]
  );
  return rows;
}

async function competitorSummary(vendorId) {
  const { rows } = await db.query(
    `SELECT cs.id, cs.name, cs.platform, cs.last_scraped_at,
            COUNT(sp.id)::int AS scraped_count,
            ROUND(AVG(sp.price), 2)::float AS avg_price,
            MIN(sp.price)::float AS min_price,
            MAX(sp.price)::float AS max_price
     FROM competitor_stores cs
     LEFT JOIN scraped_products sp ON sp.store_id = cs.id
     WHERE ($1::uuid IS NULL OR cs.vendor_id = $1)
     GROUP BY cs.id
     ORDER BY cs.created_at DESC`,
    [vendorId]
  );
  return rows;
}

async function competitorPriceTrend(vendorId, days = 30) {
  const { rows } = await db.query(
    `SELECT cs.name AS store_name,
            TO_CHAR(DATE(sp.scraped_at), 'YYYY-MM-DD') AS day,
            ROUND(AVG(sp.price), 2)::float AS avg_price
     FROM scraped_products sp
     JOIN competitor_stores cs ON cs.id = sp.store_id
     WHERE sp.scraped_at >= NOW() - INTERVAL '1 day' * $2
       AND ($1::uuid IS NULL OR cs.vendor_id = $1)
     GROUP BY cs.name, DATE(sp.scraped_at)
     ORDER BY day ASC`,
    [vendorId, days]
  );
  return rows;
}

async function latestScrapedProducts(vendorId, limit = 20) {
  const { rows } = await db.query(
    `SELECT sp.product_name, sp.price, sp.stock_status, sp.url, sp.scraped_at,
            cs.name AS store_name
     FROM scraped_products sp
     JOIN competitor_stores cs ON cs.id = sp.store_id
     WHERE ($1::uuid IS NULL OR cs.vendor_id = $1)
     ORDER BY sp.scraped_at DESC
     LIMIT $2`,
    [vendorId, limit]
  );
  return rows;
}

module.exports = {
  productKpis,
  orderKpis,
  scrapingKpis,
  salesByDay,
  topProducts,
  competitorSummary,
  competitorPriceTrend,
  latestScrapedProducts,
};
