const orderService = require('../services/orderService');
const orderModel = require('../models/orderModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const checkout = asyncHandler(async (req, res) => {
  const { currency, shipping_address: shippingAddress } = req.body;
  const result = await orderService.checkout({
    userId: req.user.id,
    currency,
    shippingAddress,
  });
  res.status(201).json(result);
});

const listOrders = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const orders = await orderModel.listByCustomer(req.user.id, { limit, offset });
  res.status(200).json({ items: orders, limit, offset });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await orderModel.findById(req.params.id);
  if (!order) throw ApiError.notFound('Commande introuvable');
  if (req.user.role !== 'admin' && order.customer_id !== req.user.id) {
    throw ApiError.forbidden("Vous n'avez pas accès à cette commande");
  }

  const items = await orderModel.getItems(order.id);
  res.status(200).json({ ...order, items });
});

module.exports = { checkout, listOrders, getOrder };
