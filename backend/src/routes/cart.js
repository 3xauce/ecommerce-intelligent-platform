const express = require('express');
const cartController = require('../controllers/cartController');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { addItemSchema, updateItemSchema } = require('../validators/cartValidators');

const router = express.Router();

router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', validate(addItemSchema), cartController.addItem);
router.put('/items/:productId', validate(updateItemSchema), cartController.updateItem);
router.delete('/items/:productId', cartController.removeItem);
router.delete('/', cartController.clearCart);

module.exports = router;
