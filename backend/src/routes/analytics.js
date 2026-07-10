const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authenticate, requireRole } = require('../middlewares/auth');

const router = express.Router();

// Le dashboard analytique est réservé aux vendeurs (leur périmètre)
// et aux admins (périmètre plateforme).
router.use(authenticate, requireRole('vendeur', 'admin'));

router.get('/dashboard', analyticsController.dashboard);
router.get('/competitors', analyticsController.competitors);
router.get('/export/csv', analyticsController.exportCsv);

module.exports = router;
