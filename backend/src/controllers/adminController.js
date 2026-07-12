const db = require('../config/db');
const analyticsModel = require('../models/analyticsModel');
const asyncHandler = require('../utils/asyncHandler');

const getStats = asyncHandler(async (req, res) => {
  const [products, orders, scraping] = await Promise.all([
    analyticsModel.productKpis(null),
    analyticsModel.orderKpis(null),
    analyticsModel.scrapingKpis(null),
  ]);

  const { rows: userRows } = await db.query(
    `SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`
  );
  const usersByRole = { admin: 0, vendeur: 0, client: 0 };
  for (const row of userRows) usersByRole[row.role] = row.count;

  res.status(200).json({
    users: { ...usersByRole, total: userRows.reduce((sum, r) => sum + r.count, 0) },
    products,
    orders,
    scraping,
  });
});

const listAllOrders = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  const { rows } = await db.query(
    `SELECT o.*, u.email AS customer_email, u.first_name, u.last_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.customer_id
     ORDER BY o.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.status(200).json({ items: rows, limit, offset });
});

module.exports = { getStats, listAllOrders };
