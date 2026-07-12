const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/stats', adminController.getStats);
router.get('/orders', adminController.listAllOrders);

module.exports = router;
