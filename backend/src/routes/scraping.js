const express = require('express');
const scrapingController = require('../controllers/scrapingController');
const { authenticate, requireRole } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  createStoreSchema,
  updateStoreSchema,
  listScrapedQuerySchema,
} = require('../validators/scrapingValidators');

const router = express.Router();

// La veille concurrentielle est réservée aux vendeurs et aux admins.
router.use(authenticate, requireRole('vendeur', 'admin'));

router.get('/stores', scrapingController.listStores);
router.post('/stores', validate(createStoreSchema), scrapingController.createStore);
router.put('/stores/:id', validate(updateStoreSchema), scrapingController.updateStore);
router.delete('/stores/:id', scrapingController.deleteStore);
router.get(
  '/stores/:id/products',
  validate(listScrapedQuerySchema, 'query'),
  scrapingController.listScrapedProducts
);
router.post('/run/:storeId', scrapingController.runScraping);

module.exports = router;
