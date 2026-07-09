const db = require('../config/db');

async function create({ name, description, price, stock, categoryId, vendorId }) {
  const { rows } = await db.query(
    `INSERT INTO products (name, description, price, stock, category_id, vendor_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, description || null, price, stock || 0, categoryId || null, vendorId]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [id]);
  return rows[0] || null;
}

/**
 * Liste paginée avec filtres optionnels. `includeInactive` réservé au
 * propriétaire/admin (le catalogue public ne montre que is_active = true).
 */
async function list({
  categoryId,
  search,
  vendorId,
  minPrice,
  maxPrice,
  includeInactive = false,
  limit = 20,
  offset = 0,
}) {
  const conditions = [];
  const params = [];

  if (!includeInactive) {
    conditions.push('is_active = true');
  }
  if (categoryId) {
    params.push(categoryId);
    conditions.push(`category_id = $${params.length}`);
  }
  if (vendorId) {
    params.push(vendorId);
    conditions.push(`vendor_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }
  if (minPrice !== undefined) {
    params.push(minPrice);
    conditions.push(`price >= $${params.length}`);
  }
  if (maxPrice !== undefined) {
    params.push(maxPrice);
    conditions.push(`price <= $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const { rows } = await db.query(
    `SELECT * FROM products ${whereClause}
     ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*)::int AS total FROM products ${whereClause}`,
    params.slice(0, params.length - 2)
  );

  return { items: rows, total: countRows[0].total };
}

async function update(id, { name, description, price, stock, categoryId, isActive }) {
  const { rows } = await db.query(
    `UPDATE products
     SET name = $1, description = $2, price = $3, stock = $4,
         category_id = $5, is_active = $6, updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [name, description || null, price, stock, categoryId || null, isActive, id]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await db.query('DELETE FROM products WHERE id = $1', [id]);
  return rowCount > 0;
}

async function addImages(id, urls) {
  const { rows } = await db.query(
    `UPDATE products
     SET images = images || $1::jsonb, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [JSON.stringify(urls), id]
  );
  return rows[0] || null;
}

async function removeImage(id, url) {
  const { rows } = await db.query(
    `UPDATE products
     SET images = (
       SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
       FROM jsonb_array_elements_text(images) AS elem
       WHERE elem <> $1
     ), updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [url, id]
  );
  return rows[0] || null;
}

module.exports = { create, findById, list, update, remove, addImages, removeImage };
