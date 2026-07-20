const express = require('express');
const shopController = require('../controllers/shopController');
const { authenticate, requireRole } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { shopSchema } = require('../validators/shopValidators');

const router = express.Router();

router.use(authenticate);

router.get('/me', requireRole('vendeur', 'admin'), shopController.getMyShop);
router.post('/', requireRole('vendeur', 'admin'), validate(shopSchema), shopController.createMyShop);
router.put('/me', requireRole('vendeur', 'admin'), validate(shopSchema), shopController.updateMyShop);

router.get('/', requireRole('admin'), shopController.listShops);

module.exports = router;
