const db = require('../config/db');

async function create({ vendorId, name, url, platform, cssSelectors }) {
  const { rows } = await db.query(
    `INSERT INTO competitor_stores (vendor_id, name, url, platform, css_selectors)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [vendorId, name, url, platform, cssSelectors ? JSON.stringify(cssSelectors) : null]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await db.query('SELECT * FROM competitor_stores WHERE id = $1', [id]);
  return rows[0] || null;
}

async function listByVendor(vendorId) {
  const { rows } = await db.query(
    'SELECT * FROM competitor_stores WHERE vendor_id = $1 ORDER BY created_at DESC',
    [vendorId]
  );
  return rows;
}

async function listAll() {
  const { rows } = await db.query('SELECT * FROM competitor_stores ORDER BY created_at DESC');
  return rows;
}

async function listActive() {
  const { rows } = await db.query('SELECT * FROM competitor_stores WHERE is_active = true');
  return rows;
}

async function update(id, { name, url, platform, cssSelectors, isActive }) {
  const { rows } = await db.query(
    `UPDATE competitor_stores
     SET name = $1, url = $2, platform = $3, css_selectors = $4, is_active = $5
     WHERE id = $6 RETURNING *`,
    [name, url, platform, cssSelectors ? JSON.stringify(cssSelectors) : null, isActive, id]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await db.query('DELETE FROM competitor_stores WHERE id = $1', [id]);
  return rowCount > 0;
}

async function listScrapedProducts(storeId, { limit = 50, offset = 0 } = {}) {
  const { rows } = await db.query(
    `SELECT * FROM scraped_products WHERE store_id = $1
     ORDER BY scraped_at DESC LIMIT $2 OFFSET $3`,
    [storeId, limit, offset]
  );

  const { rows: countRows } = await db.query(
    'SELECT COUNT(*)::int AS total FROM scraped_products WHERE store_id = $1',
    [storeId]
  );

  return { items: rows, total: countRows[0].total };
}

module.exports = {
  create,
  findById,
  listByVendor,
  listAll,
  listActive,
  update,
  remove,
  listScrapedProducts,
};
