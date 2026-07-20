const shopModel = require('../models/shopModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const getMyShop = asyncHandler(async (req, res) => {
  const shop = await shopModel.findByVendorId(req.user.id);
  if (!shop) throw ApiError.notFound("Vous n'avez pas encore créé votre boutique");
  res.status(200).json(shop);
});

const createMyShop = asyncHandler(async (req, res) => {
  const existing = await shopModel.findByVendorId(req.user.id);
  if (existing) throw ApiError.conflict('Vous avez déjà une boutique');

  const { name, description } = req.body;
  const shop = await shopModel.create({ vendorId: req.user.id, name, description });
  res.status(201).json(shop);
});

const updateMyShop = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const shop = await shopModel.updateByVendorId(req.user.id, { name, description });
  if (!shop) throw ApiError.notFound("Vous n'avez pas encore créé votre boutique");
  res.status(200).json(shop);
});

const listShops = asyncHandler(async (req, res) => {
  const shops = await shopModel.listAll();
  res.status(200).json(shops);
});

module.exports = { getMyShop, createMyShop, updateMyShop, listShops };
