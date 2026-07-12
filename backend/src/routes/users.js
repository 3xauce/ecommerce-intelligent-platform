const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, requireRole } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  updateProfileSchema,
  updateRoleSchema,
  updateStatusSchema,
} = require('../validators/userValidators');

const router = express.Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.put('/me', validate(updateProfileSchema), userController.updateMe);

router.get('/', requireRole('admin'), userController.listUsers);
router.put('/:id/role', requireRole('admin'), validate(updateRoleSchema), userController.updateUserRole);
router.put(
  '/:id/status',
  requireRole('admin'),
  validate(updateStatusSchema),
  userController.updateUserStatus
);

module.exports = router;
