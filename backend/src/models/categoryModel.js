const db = require('../config/db');

async function create({ name, slug, parentId }) {
  const { rows } = await db.query(
    `INSERT INTO categories (name, slug, parent_id) VALUES ($1, $2, $3) RETURNING *`,
    [name, slug, parentId || null]
  );
  return rows[0];
}

async function findAll() {
  const { rows } = await db.query('SELECT * FROM categories ORDER BY name ASC');
  return rows;
}

async function findById(id) {
  const { rows } = await db.query('SELECT * FROM categories WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findBySlug(slug) {
  const { rows } = await db.query('SELECT * FROM categories WHERE slug = $1', [slug]);
  return rows[0] || null;
}

async function update(id, { name, slug, parentId }) {
  const { rows } = await db.query(
    `UPDATE categories SET name = $1, slug = $2, parent_id = $3 WHERE id = $4 RETURNING *`,
    [name, slug, parentId || null, id]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await db.query('DELETE FROM categories WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { create, findAll, findById, findBySlug, update, remove };
