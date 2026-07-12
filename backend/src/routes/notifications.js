const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', notificationController.listNotifications);
router.put('/read-all', notificationController.markAllRead);
router.put('/:id/read', notificationController.markRead);

module.exports = router;
