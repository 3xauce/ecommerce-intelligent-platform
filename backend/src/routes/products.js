const express = require('express');
const productController = require('../controllers/productController');
const imageController = require('../controllers/productImageController');
const { authenticate, optionalAuthenticate, requireRole } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
} = require('../validators/productValidators');

const router = express.Router();

router.get('/', validate(listProductsQuerySchema, 'query'), productController.listProducts);
router.get('/:id', optionalAuthenticate, productController.getProduct);

router.post(
  '/',
  authenticate,
  requireRole('vendeur', 'admin'),
  validate(createProductSchema),
  productController.createProduct
);
router.put(
  '/:id',
  authenticate,
  requireRole('vendeur', 'admin'),
  validate(updateProductSchema),
  productController.updateProduct
);
router.delete('/:id', authenticate, requireRole('vendeur', 'admin'), productController.deleteProduct);

router.post(
  '/:id/images',
  authenticate,
  requireRole('vendeur', 'admin'),
  upload.array('images', 5),
  imageController.uploadImages
);
router.delete(
  '/:id/images',
  authenticate,
  requireRole('vendeur', 'admin'),
  imageController.deleteImage
);

module.exports = router;
