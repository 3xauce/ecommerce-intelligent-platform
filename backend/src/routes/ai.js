const express = require('express');
const aiController = require('../controllers/aiController');
const { authenticate, requireRole } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { magicCompareSchema, chatbotSchema } = require('../validators/aiValidators');

const router = express.Router();

router.use(authenticate);

// Le chatbot est ouvert à tous les utilisateurs connectés : intentions
// analytics pour vendeur/admin, assistance boutique pour les clients.
router.post('/chatbot', validate(chatbotSchema), aiController.chatbot);

// L'aide à la décision IA est réservée aux vendeurs et admins.
router.use(requireRole('vendeur', 'admin'));

router.get('/predictions/:productId', aiController.getPredictions);
router.get('/trends', aiController.getTrends);
router.post('/magic-compare', validate(magicCompareSchema), aiController.magicCompare);

module.exports = router;
