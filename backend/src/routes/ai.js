const express = require('express');
const aiController = require('../controllers/aiController');
const { authenticate, requireRole } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { magicCompareSchema, chatbotSchema } = require('../validators/aiValidators');

const router = express.Router();

// L'aide à la décision IA est réservée aux vendeurs et admins.
router.use(authenticate, requireRole('vendeur', 'admin'));

router.get('/predictions/:productId', aiController.getPredictions);
router.get('/trends', aiController.getTrends);
router.post('/magic-compare', validate(magicCompareSchema), aiController.magicCompare);
router.post('/chatbot', validate(chatbotSchema), aiController.chatbot);

module.exports = router;
