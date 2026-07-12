const db = require('../config/db');
const cartModel = require('../models/cartModel');
const orderModel = require('../models/orderModel');
const { getStripeClient } = require('../config/stripe');
const { notify } = require('./notificationService');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const LOW_STOCK_THRESHOLD = 5;

const SUPPORTED_CURRENCIES = ['usd', 'eur'];

async function checkout({ userId, currency = 'usd', shippingAddress }) {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw ApiError.badRequest(`Devise non supportée pour le paiement (autorisées: ${SUPPORTED_CURRENCIES.join(', ')})`);
  }

  const cart = await cartModel.getOrCreateCart(userId);
  const items = await cartModel.getItems(cart.id);

  if (items.length === 0) {
    throw ApiError.badRequest('Le panier est vide');
  }

  const issues = items.filter(
    (item) => !item.product_is_active || item.quantity > item.product_stock
  );
  if (issues.length > 0) {
    throw ApiError.badRequest(
      'Certains articles du panier ne sont plus disponibles au stock demandé',
      issues.map((i) => `${i.product_name}: stock disponible ${i.product_stock}`)
    );
  }

  const total = items.reduce(
    (sum, item) => sum + Number(item.product_price) * item.quantity,
    0
  );

  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100),
    currency,
  });

  const client = await db.pool.connect();
  let order;
  const vendorSales = new Map(); // vendor_id -> [{name, quantity}]
  const lowStockProducts = []; // {vendor_id, name, stock}
  try {
    await client.query('BEGIN');

    order = await orderModel.createOrder(client, {
      customerId: userId,
      total,
      currency,
      shippingAddress,
      stripePaymentId: paymentIntent.id,
    });

    for (const item of items) {
      await orderModel.createOrderItem(client, {
        orderId: order.id,
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.product_price,
      });

      const updatedProduct = await orderModel.decrementProductStock(
        client,
        item.product_id,
        item.quantity
      );
      if (!updatedProduct) {
        throw ApiError.conflict(`Stock insuffisant pour "${item.product_name}"`);
      }

      if (updatedProduct.vendor_id) {
        const sales = vendorSales.get(updatedProduct.vendor_id) || [];
        sales.push({ name: updatedProduct.name, quantity: item.quantity });
        vendorSales.set(updatedProduct.vendor_id, sales);

        if (updatedProduct.stock <= LOW_STOCK_THRESHOLD) {
          lowStockProducts.push({
            vendor_id: updatedProduct.vendor_id,
            name: updatedProduct.name,
            stock: updatedProduct.stock,
          });
        }
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Notifications post-commande (jamais bloquantes pour le flux d'achat)
  for (const [vendorId, sales] of vendorSales) {
    const detail = sales.map((s) => `${s.quantity} × ${s.name}`).join(', ');
    await notify(vendorId, {
      title: 'Nouvelle commande reçue',
      message: `Commande n° ${order.id.slice(0, 8).toUpperCase()} : ${detail}`,
    });
  }
  for (const product of lowStockProducts) {
    await notify(product.vendor_id, {
      title: 'Alerte stock faible',
      message: `"${product.name}" n'a plus que ${product.stock} unité(s) en stock`,
    });
  }

  try {
    await stripe.paymentIntents.update(paymentIntent.id, { metadata: { order_id: order.id } });
  } catch (err) {
    logger.error("Impossible d'attacher order_id aux métadonnées Stripe", { error: err.message });
  }

  try {
    await cartModel.clearCart(cart.id);
  } catch (err) {
    logger.error('Échec du vidage du panier après commande', { error: err.message, orderId: order.id });
  }

  return { order, clientSecret: paymentIntent.client_secret };
}

async function handleStripeEvent(event) {
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const order = await orderModel.findByStripePaymentId(paymentIntent.id);
    if (order && order.status === 'pending') {
      await orderModel.updateStatus(order.id, 'paid');
      logger.info('Commande marquée payée', { orderId: order.id });
      if (order.customer_id) {
        await notify(order.customer_id, {
          title: 'Paiement confirmé',
          message: `Votre commande n° ${order.id.slice(0, 8).toUpperCase()} a bien été payée. Merci !`,
        });
      }
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const order = await orderModel.findByStripePaymentId(paymentIntent.id);
    if (order && order.status === 'pending') {
      await orderModel.updateStatus(order.id, 'payment_failed');
      logger.info('Commande marquée en échec de paiement', { orderId: order.id });
    }
  }
}

module.exports = { checkout, handleStripeEvent, SUPPORTED_CURRENCIES };
