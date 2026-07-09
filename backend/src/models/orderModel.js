const db = require('../config/db');

/**
 * Chaque fonction accepte un `executor` (le pool `db` par défaut, ou un
 * client `pg` extrait via db.pool.connect() pendant une transaction) afin de
 * pouvoir participer à la transaction atomique du checkout (voir orderService).
 */

async function createOrder(
  executor,
  { customerId, total, currency, shippingAddress, stripePaymentId }
) {
  const { rows } = await executor.query(
    `INSERT INTO orders (customer_id, total, currency, shipping_address, stripe_payment_id, status)
     VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
    [customerId, total, currency, shippingAddress || null, stripePaymentId || null]
  );
  return rows[0];
}

async function createOrderItem(executor, { orderId, productId, quantity, unitPrice }) {
  const { rows } = await executor.query(
    `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [orderId, productId, quantity, unitPrice]
  );
  return rows[0];
}

/**
 * Décrémente le stock de façon atomique et échoue silencieusement (rows
 * vide) si le stock est insuffisant au moment de l'écriture — protège contre
 * une désynchronisation entre la vérification et le commit.
 */
async function decrementProductStock(executor, productId, quantity) {
  const { rows } = await executor.query(
    `UPDATE products SET stock = stock - $1, updated_at = NOW()
     WHERE id = $2 AND stock >= $1 AND is_active = true RETURNING *`,
    [quantity, productId]
  );
  return rows[0] || null;
}

async function findById(orderId, executor = db) {
  const { rows } = await executor.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  return rows[0] || null;
}

async function findByStripePaymentId(stripePaymentId, executor = db) {
  const { rows } = await executor.query('SELECT * FROM orders WHERE stripe_payment_id = $1', [
    stripePaymentId,
  ]);
  return rows[0] || null;
}

async function listByCustomer(customerId, { limit = 20, offset = 0 } = {}, executor = db) {
  const { rows } = await executor.query(
    `SELECT * FROM orders WHERE customer_id = $1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [customerId, limit, offset]
  );
  return rows;
}

async function getItems(orderId, executor = db) {
  const { rows } = await executor.query(
    `SELECT oi.*, p.name AS product_name
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [orderId]
  );
  return rows;
}

async function updateStatus(orderId, status, executor = db) {
  const { rows } = await executor.query(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, orderId]
  );
  return rows[0] || null;
}

module.exports = {
  createOrder,
  createOrderItem,
  decrementProductStock,
  findById,
  findByStripePaymentId,
  listByCustomer,
  getItems,
  updateStatus,
};
