const db = require('../config/db');

async function create({ vendorId, name, description }) {
  const { rows } = await db.query(
    `INSERT INTO shops (vendor_id, name, description)
     VALUES ($1, $2, $3) RETURNING *`,
    [vendorId, name, description || null]
  );
  return rows[0];
}

async function findByVendorId(vendorId) {
  const { rows } = await db.query('SELECT * FROM shops WHERE vendor_id = $1', [vendorId]);
  return rows[0] || null;
}

async function updateByVendorId(vendorId, { name, description }) {
  const { rows } = await db.query(
    `UPDATE shops SET name = $1, description = $2, updated_at = NOW()
     WHERE vendor_id = $3 RETURNING *`,
    [name, description || null, vendorId]
  );
  return rows[0] || null;
}

/**
 * Liste admin : toutes les boutiques avec l'identité du vendeur et le
 * nombre de produits (actifs / total).
 */
async function listAll() {
  const { rows } = await db.query(
    `SELECT
       s.*,
       u.first_name AS vendor_first_name,
       u.last_name AS vendor_last_name,
       u.email AS vendor_email,
       COUNT(p.id)::int AS products_count,
       COUNT(p.id) FILTER (WHERE p.is_active)::int AS active_products_count
     FROM shops s
     JOIN users u ON u.id = s.vendor_id
     LEFT JOIN products p ON p.vendor_id = s.vendor_id
     GROUP BY s.id, u.first_name, u.last_name, u.email
     ORDER BY s.name ASC`
  );
  return rows;
}

module.exports = { create, findByVendorId, updateByVendorId, listAll };
