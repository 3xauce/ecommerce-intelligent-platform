const db = require('../config/db');

/** Ventes journalières (unités) d'un produit sur les N derniers jours. */
async function salesHistory(productId, days = 120) {
  const { rows } = await db.query(
    `SELECT TO_CHAR(DATE(o.created_at), 'YYYY-MM-DD') AS day,
            SUM(oi.quantity)::int AS units
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.product_id = $1
       AND o.status <> 'payment_failed'
       AND o.created_at >= NOW() - INTERVAL '1 day' * $2
     GROUP BY DATE(o.created_at)
     ORDER BY day ASC`,
    [productId, days]
  );
  return rows;
}

async function storePrediction({ productId, predictionType, predictedValue, confidence, periodDays }) {
  const { rows } = await db.query(
    `INSERT INTO predictions (product_id, prediction_type, predicted_value, confidence, period_days)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [productId, predictionType, predictedValue, confidence, periodDays]
  );
  return rows[0];
}

async function listByProduct(productId, limit = 10) {
  const { rows } = await db.query(
    `SELECT * FROM predictions WHERE product_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [productId, limit]
  );
  return rows;
}

module.exports = { salesHistory, storePrediction, listByProduct };
