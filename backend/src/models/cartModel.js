const db = require('../config/db');

async function getOrCreateCart(userId) {
  const existing = await db.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
  if (existing.rows[0]) return existing.rows[0];

  const { rows } = await db.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING *', [
    userId,
  ]);
  return rows[0];
}

async function getItems(cartId) {
  const { rows } = await db.query(
    `SELECT
       ci.id, ci.product_id, ci.quantity, ci.created_at, ci.updated_at,
       p.name AS product_name, p.price AS product_price, p.stock AS product_stock,
       p.is_active AS product_is_active, p.images AS product_images
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = $1
     ORDER BY ci.created_at ASC`,
    [cartId]
  );
  return rows;
}

async function findItem(cartId, productId) {
  const { rows } = await db.query(
    'SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2',
    [cartId, productId]
  );
  return rows[0] || null;
}

async function upsertItem(cartId, productId, quantity) {
  const { rows } = await db.query(
    `INSERT INTO cart_items (cart_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (cart_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = NOW()
     RETURNING *`,
    [cartId, productId, quantity]
  );
  return rows[0];
}

async function setItemQuantity(cartId, productId, quantity) {
  const { rows } = await db.query(
    `UPDATE cart_items SET quantity = $1, updated_at = NOW()
     WHERE cart_id = $2 AND product_id = $3 RETURNING *`,
    [quantity, cartId, productId]
  );
  return rows[0] || null;
}

async function removeItem(cartId, productId) {
  const { rowCount } = await db.query(
    'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2',
    [cartId, productId]
  );
  return rowCount > 0;
}

async function clearCart(cartId) {
  await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
}

module.exports = {
  getOrCreateCart,
  getItems,
  findItem,
  upsertItem,
  setItemQuantity,
  removeItem,
  clearCart,
};
