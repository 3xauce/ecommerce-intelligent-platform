const productModel = require('../models/productModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function assertOwnerOrAdmin(product, user) {
  if (user.role !== 'admin' && product.vendor_id !== user.id) {
    throw ApiError.forbidden("Vous n'êtes pas propriétaire de ce produit");
  }
}

const listProducts = asyncHandler(async (req, res) => {
  const {
    category_id: categoryId,
    vendor_id: vendorId,
    search,
    min_price: minPrice,
    max_price: maxPrice,
    limit,
    offset,
  } = req.query;

  const result = await productModel.list({
    categoryId,
    vendorId,
    search,
    minPrice,
    maxPrice,
    limit,
    offset,
  });

  res.status(200).json({ items: result.items, total: result.total, limit, offset });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await productModel.findById(req.params.id);
  const isOwnerOrAdmin = req.user && (req.user.role === 'admin' || req.user.id === product?.vendor_id);

  if (!product || (!product.is_active && !isOwnerOrAdmin)) {
    throw ApiError.notFound('Produit introuvable');
  }
  res.status(200).json(product);
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, stock, category_id: categoryId } = req.body;
  const product = await productModel.create({
    name,
    description,
    price,
    stock,
    categoryId,
    vendorId: req.user.id,
  });
  res.status(201).json(product);
});

const updateProduct = asyncHandler(async (req, res) => {
  const existing = await productModel.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Produit introuvable');
  assertOwnerOrAdmin(existing, req.user);

  const {
    name,
    description,
    price,
    stock,
    category_id: categoryId,
    is_active: isActive,
  } = req.body;

  const product = await productModel.update(existing.id, {
    name,
    description,
    price,
    stock,
    categoryId,
    isActive,
  });
  res.status(200).json(product);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const existing = await productModel.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Produit introuvable');
  assertOwnerOrAdmin(existing, req.user);

  await productModel.remove(existing.id);
  res.status(204).send();
});

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  assertOwnerOrAdmin,
};
