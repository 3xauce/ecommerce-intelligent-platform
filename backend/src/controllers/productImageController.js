const fs = require('fs');
const path = require('path');
const productModel = require('../models/productModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { assertOwnerOrAdmin } = require('./productController');
const { UPLOAD_DIR } = require('../middlewares/upload');

const uploadImages = asyncHandler(async (req, res) => {
  const product = await productModel.findById(req.params.id);
  if (!product) throw ApiError.notFound('Produit introuvable');
  assertOwnerOrAdmin(product, req.user);

  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest('Aucun fichier reçu (champ "images" attendu)');
  }

  const urls = req.files.map((file) => `/uploads/products/${file.filename}`);
  const updated = await productModel.addImages(product.id, urls);
  res.status(201).json(updated);
});

const deleteImage = asyncHandler(async (req, res) => {
  const product = await productModel.findById(req.params.id);
  if (!product) throw ApiError.notFound('Produit introuvable');
  assertOwnerOrAdmin(product, req.user);

  const { url } = req.body;
  if (!url) throw ApiError.badRequest('Le champ "url" est requis');

  const updated = await productModel.removeImage(product.id, url);

  const filename = path.basename(url);
  const filePath = path.join(UPLOAD_DIR, filename);
  fs.unlink(filePath, () => {});

  res.status(200).json(updated);
});

module.exports = { uploadImages, deleteImage };
