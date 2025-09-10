import { Router } from 'express';
import { ProductController } from '@/controllers/product.controller';
import { authenticate, authorize, authorizeStoreOwner, optionalAuth } from '@/middleware/auth';
import { validateBody, validateParams, validateQuery } from '@/middleware/validation';
import { createProductSchema, updateProductSchema, productFiltersSchema, idParamSchema, createRatingSchema } from '@/utils/validation';
import { productCreationLimiter } from '@/middleware/rateLimiter';

const router = Router();
const productController = new ProductController();

/**
 * @route   GET /api/products
 * @desc    Get all products with filters and pagination
 * @access  Public
 */
router.get('/',
  validateQuery(productFiltersSchema),
  optionalAuth,
  productController.getAllProducts
);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Public
 */
router.get('/:id',
  validateParams(idParamSchema),
  optionalAuth,
  productController.getProductById
);

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Private (Seller)
 */
router.post('/',
  authenticate,
  authorize('SELLER', 'ADMIN', 'FOUNDER'),
  productCreationLimiter,
  validateBody(createProductSchema),
  productController.createProduct
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (Store Owner or Admin)
 */
router.put('/:id',
  authenticate,
  validateParams(idParamSchema),
  validateBody(updateProductSchema),
  productController.updateProduct
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product
 * @access  Private (Store Owner or Admin)
 */
router.delete('/:id',
  authenticate,
  validateParams(idParamSchema),
  productController.deleteProduct
);

/**
 * @route   GET /api/products/store/:storeId
 * @desc    Get products by store ID
 * @access  Public
 */
router.get('/store/:storeId',
  validateParams(idParamSchema),
  validateQuery(productFiltersSchema),
  productController.getProductsByStore
);

/**
 * @route   POST /api/products/:id/rating
 * @desc    Add product rating
 * @access  Private
 */
router.post('/:id/rating',
  authenticate,
  validateParams(idParamSchema),
  validateBody(createRatingSchema),
  productController.addRating
);

/**
 * @route   GET /api/products/:id/ratings
 * @desc    Get product ratings
 * @access  Public
 */
router.get('/:id/ratings',
  validateParams(idParamSchema),
  validateQuery(productFiltersSchema),
  productController.getRatings
);

/**
 * @route   GET /api/products/category/:category
 * @desc    Get products by category
 * @access  Public
 */
router.get('/category/:category',
  validateQuery(productFiltersSchema),
  productController.getProductsByCategory
);

/**
 * @route   GET /api/products/search/:query
 * @desc    Search products
 * @access  Public
 */
router.get('/search/:query',
  validateQuery(productFiltersSchema),
  productController.searchProducts
);

export default router;