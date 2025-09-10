import { Router } from 'express';
import { UserController } from '@/controllers/user.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validateBody, validateParams } from '@/middleware/validation';
import { updateUserSchema, updateCartSchema, idParamSchema } from '@/utils/validation';

const router = Router();
const userController = new UserController();

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me',
  authenticate,
  userController.getProfile
);

/**
 * @route   PUT /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me',
  authenticate,
  validateBody(updateUserSchema),
  userController.updateProfile
);

/**
 * @route   POST /api/users/cart
 * @desc    Update user cart
 * @access  Private
 */
router.post('/cart',
  authenticate,
  validateBody(updateCartSchema),
  userController.updateCart
);

/**
 * @route   GET /api/users/cart
 * @desc    Get user cart
 * @access  Private
 */
router.get('/cart',
  authenticate,
  userController.getCart
);

/**
 * @route   DELETE /api/users/cart
 * @desc    Clear user cart
 * @access  Private
 */
router.delete('/cart',
  authenticate,
  userController.clearCart
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (Admin only)
 * @access  Private (Admin)
 */
router.get('/:id',
  authenticate,
  authorize('ADMIN', 'FOUNDER'),
  validateParams(idParamSchema),
  userController.getUserById
);

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin)
 */
router.get('/',
  authenticate,
  authorize('ADMIN', 'FOUNDER'),
  userController.getAllUsers
);

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id/role',
  authenticate,
  authorize('ADMIN', 'FOUNDER'),
  validateParams(idParamSchema),
  userController.updateUserRole
);

/**
 * @route   PUT /api/users/:id/status
 * @desc    Update user status (activate/deactivate) (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id/status',
  authenticate,
  authorize('ADMIN', 'FOUNDER'),
  validateParams(idParamSchema),
  userController.updateUserStatus
);

export default router;