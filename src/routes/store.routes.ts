import { Router } from 'express';
import { StoreController } from '@/controllers/store.controller';
import { authenticate, authorize, authorizeStoreOwner } from '@/middleware/auth';
import { validateBody, validateParams, validateQuery } from '@/middleware/validation';
import { createStoreSchema, updateStoreSchema, storeActionSchema, idParamSchema, paginationSchema } from '@/utils/validation';
import { storeCreationLimiter } from '@/middleware/rateLimiter';

const router = Router();
const storeController = new StoreController();

/**
 * @route   POST /api/stores
 * @desc    Create a new store
 * @access  Private (USER role)
 */
router.post('/',
  authenticate,
  storeCreationLimiter,
  validateBody(createStoreSchema),
  storeController.createStore
);

/**
 * @route   GET /api/stores
 * @desc    Get all stores with pagination
 * @access  Public
 */
router.get('/',
  validateQuery(paginationSchema),
  storeController.getAllStores
);

/**
 * @route   GET /api/stores/:id
 * @desc    Get store by ID
 * @access  Public
 */
router.get('/:id',
  validateParams(idParamSchema),
  storeController.getStoreById
);

/**
 * @route   PUT /api/stores/:id
 * @desc    Update store
 * @access  Private (Store Owner)
 */
router.put('/:id',
  authenticate,
  authorizeStoreOwner,
  validateParams(idParamSchema),
  validateBody(updateStoreSchema),
  storeController.updateStore
);

/**
 * @route   DELETE /api/stores/:id
 * @desc    Delete store
 * @access  Private (Store Owner or Admin)
 */
router.delete('/:id',
  authenticate,
  authorizeStoreOwner,
  validateParams(idParamSchema),
  storeController.deleteStore
);

/**
 * @route   POST /api/stores/:id/approve
 * @desc    Approve store
 * @access  Private (Admin)
 */
router.post('/:id/approve',
  authenticate,
  authorize('ADMIN', 'FOUNDER'),
  validateParams(idParamSchema),
  storeController.approveStore
);

/**
 * @route   POST /api/stores/:id/reject
 * @desc    Reject store
 * @access  Private (Admin)
 */
router.post('/:id/reject',
  authenticate,
  authorize('ADMIN', 'FOUNDER'),
  validateParams(idParamSchema),
  validateBody(storeActionSchema),
  storeController.rejectStore
);

/**
 * @route   POST /api/stores/:id/suspend
 * @desc    Suspend store
 * @access  Private (Admin)
 */
router.post('/:id/suspend',
  authenticate,
  authorize('ADMIN', 'FOUNDER'),
  validateParams(idParamSchema),
  validateBody(storeActionSchema),
  storeController.suspendStore
);

/**
 * @route   GET /api/stores/user/:userId
 * @desc    Get stores by user ID
 * @access  Private (Owner or Admin)
 */
router.get('/user/:userId',
  authenticate,
  validateParams(idParamSchema),
  storeController.getStoresByUser
);

export default router;