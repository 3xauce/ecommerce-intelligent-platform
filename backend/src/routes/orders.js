const express = require('express');
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { checkoutSchema, listOrdersQuerySchema } = require('../validators/orderValidators');

const router = express.Router();

router.use(authenticate);

router.post('/checkout', validate(checkoutSchema), orderController.checkout);
router.get('/', validate(listOrdersQuerySchema, 'query'), orderController.listOrders);
router.get('/:id', orderController.getOrder);

module.exports = router;
