import { Router } from 'express';
import { OrderController } from '@/controllers/order.controller';
import { authenticate, authorize, authorizeOrderAccess } from '@/middleware/auth';
import { validateBody, validateParams, validateQuery } from '@/middleware/validation';
import { createOrderSchema, updateOrderStatusSchema, idParamSchema, paginationSchema } from '@/utils/validation';
import { orderCreationLimiter } from '@/middleware/rateLimiter';

const router = Router();
const orderController = new OrderController();

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Private
 */
router.post('/',
  authenticate,
  orderCreationLimiter,
  validateBody(createOrderSchema),
  orderController.createOrder
);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Private (Buyer, Seller, or Admin)
 */
router.get('/:id',
  authenticate,
  authorizeOrderAccess,
  validateParams(idParamSchema),
  orderController.getOrderById
);

/**
 * @route   GET /api/orders/user/:userId
 * @desc    Get orders by user ID
 * @access  Private (Owner or Admin)
 */
router.get('/user/:userId',
  authenticate,
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  orderController.getOrdersByUser
);

/**
 * @route   GET /api/orders/store/:storeId
 * @desc    Get orders by store ID
 * @access  Private (Store Owner or Admin)
 */
router.get('/store/:storeId',
  authenticate,
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  orderController.getOrdersByStore
);

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status
 * @access  Private (Seller or Admin)
 */
router.put('/:id/status',
  authenticate,
  validateParams(idParamSchema),
  validateBody(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private (Buyer or Admin)
 */
router.post('/:id/cancel',
  authenticate,
  authorizeOrderAccess,
  validateParams(idParamSchema),
  orderController.cancelOrder
);

/**
 * @route   GET /api/orders
 * @desc    Get all orders (Admin only)
 * @access  Private (Admin)
 */
router.get('/',
  authenticate,
  authorize('ADMIN', 'FOUNDER'),
  validateQuery(paginationSchema),
  orderController.getAllOrders
);

/**
 * @route   POST /api/orders/:id/refund
 * @desc    Process refund for order
 * @access  Private (Admin)
 */
router.post('/:id/refund',
  authenticate,
  authorize('ADMIN', 'FOUNDER'),
  validateParams(idParamSchema),
  orderController.refundOrder
);

export default router;