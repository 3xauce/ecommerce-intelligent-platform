const storeModel = require('../models/storeModel');
const scrapingService = require('../services/scrapingService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function assertOwnerOrAdmin(store, user) {
  if (user.role !== 'admin' && store.vendor_id !== user.id) {
    throw ApiError.forbidden("Vous n'êtes pas propriétaire de ce store concurrent");
  }
}

const listStores = asyncHandler(async (req, res) => {
  const stores =
    req.user.role === 'admin'
      ? await storeModel.listAll()
      : await storeModel.listByVendor(req.user.id);
  res.status(200).json(stores);
});

const createStore = asyncHandler(async (req, res) => {
  const { name, url, platform, css_selectors: cssSelectors } = req.body;
  const store = await storeModel.create({
    vendorId: req.user.id,
    name,
    url,
    platform,
    cssSelectors,
  });
  res.status(201).json(store);
});

const updateStore = asyncHandler(async (req, res) => {
  const existing = await storeModel.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Store concurrent introuvable');
  assertOwnerOrAdmin(existing, req.user);

  const { name, url, platform, css_selectors: cssSelectors, is_active: isActive } = req.body;
  const store = await storeModel.update(existing.id, {
    name,
    url,
    platform,
    cssSelectors,
    isActive,
  });
  res.status(200).json(store);
});

const deleteStore = asyncHandler(async (req, res) => {
  const existing = await storeModel.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Store concurrent introuvable');
  assertOwnerOrAdmin(existing, req.user);

  await storeModel.remove(existing.id);
  res.status(204).send();
});

const runScraping = asyncHandler(async (req, res) => {
  const store = await storeModel.findById(req.params.storeId);
  if (!store) throw ApiError.notFound('Store concurrent introuvable');
  assertOwnerOrAdmin(store, req.user);

  if (!store.is_active) {
    throw ApiError.badRequest('Ce store est désactivé — réactivez-le avant de lancer un scraping');
  }

  const job = await scrapingService.enqueueScrapingJob(store);
  res.status(202).json({
    message: 'Scraping mis en file, le worker va le traiter',
    job,
  });
});

const listScrapedProducts = asyncHandler(async (req, res) => {
  const store = await storeModel.findById(req.params.id);
  if (!store) throw ApiError.notFound('Store concurrent introuvable');
  assertOwnerOrAdmin(store, req.user);

  const { limit, offset } = req.query;
  const result = await storeModel.listScrapedProducts(store.id, { limit, offset });
  res.status(200).json({ ...result, limit, offset, last_scraped_at: store.last_scraped_at });
});

module.exports = {
  listStores,
  createStore,
  updateStore,
  deleteStore,
  runScraping,
  listScrapedProducts,
};
