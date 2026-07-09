const express = require('express');
const categoryController = require('../controllers/categoryController');
const { authenticate, requireRole } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { createCategorySchema, updateCategorySchema } = require('../validators/categoryValidators');

const router = express.Router();

router.get('/', categoryController.listCategories);
router.get('/:id', categoryController.getCategory);

router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate(createCategorySchema),
  categoryController.createCategory
);
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate(updateCategorySchema),
  categoryController.updateCategory
);
router.delete('/:id', authenticate, requireRole('admin'), categoryController.deleteCategory);

module.exports = router;
