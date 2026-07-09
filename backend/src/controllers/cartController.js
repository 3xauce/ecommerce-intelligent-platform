const cartModel = require('../models/cartModel');
const productModel = require('../models/productModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function serializeCart(cart, items) {
  const serializedItems = items.map((item) => ({
    id: item.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: Number(item.product_price),
    subtotal: Number(item.product_price) * item.quantity,
    product: {
      name: item.product_name,
      price: Number(item.product_price),
      stock: item.product_stock,
      is_active: item.product_is_active,
      images: item.product_images,
    },
    stock_issue: !item.product_is_active
      ? 'Produit désactivé'
      : item.quantity > item.product_stock
        ? `Stock insuffisant (disponible: ${item.product_stock})`
        : null,
  }));

  return {
    id: cart.id,
    items: serializedItems,
    total: serializedItems.reduce((sum, item) => sum + item.subtotal, 0),
    item_count: serializedItems.reduce((sum, item) => sum + item.quantity, 0),
  };
}

const getCart = asyncHandler(async (req, res) => {
  const cart = await cartModel.getOrCreateCart(req.user.id);
  const items = await cartModel.getItems(cart.id);
  res.status(200).json(serializeCart(cart, items));
});

const addItem = asyncHandler(async (req, res) => {
  const { product_id: productId, quantity } = req.body;

  const product = await productModel.findById(productId);
  if (!product || !product.is_active) {
    throw ApiError.notFound('Produit introuvable ou indisponible');
  }

  const cart = await cartModel.getOrCreateCart(req.user.id);
  const existing = await cartModel.findItem(cart.id, productId);
  const totalQuantity = (existing ? existing.quantity : 0) + quantity;

  if (totalQuantity > product.stock) {
    throw ApiError.badRequest(`Stock insuffisant (disponible: ${product.stock})`);
  }

  await cartModel.upsertItem(cart.id, productId, quantity);
  const items = await cartModel.getItems(cart.id);
  res.status(201).json(serializeCart(cart, items));
});

const updateItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  const product = await productModel.findById(productId);
  if (!product) throw ApiError.notFound('Produit introuvable');
  if (quantity > product.stock) {
    throw ApiError.badRequest(`Stock insuffisant (disponible: ${product.stock})`);
  }

  const cart = await cartModel.getOrCreateCart(req.user.id);
  const updated = await cartModel.setItemQuantity(cart.id, productId, quantity);
  if (!updated) throw ApiError.notFound("Cet article n'est pas dans le panier");

  const items = await cartModel.getItems(cart.id);
  res.status(200).json(serializeCart(cart, items));
});

const removeItem = asyncHandler(async (req, res) => {
  const cart = await cartModel.getOrCreateCart(req.user.id);
  const removed = await cartModel.removeItem(cart.id, req.params.productId);
  if (!removed) throw ApiError.notFound("Cet article n'est pas dans le panier");

  const items = await cartModel.getItems(cart.id);
  res.status(200).json(serializeCart(cart, items));
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await cartModel.getOrCreateCart(req.user.id);
  await cartModel.clearCart(cart.id);
  res.status(204).send();
});

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
