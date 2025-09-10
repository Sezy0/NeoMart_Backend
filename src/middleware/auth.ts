import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, Role } from '@/types';
import { jwtUtils } from '@/utils/jwt';
import { prisma } from '@/config/database';
import { cache, cacheKeys } from '@/config/redis';
import { logger } from '@/config/logger';

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    const payload = jwtUtils.verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired access token'
      });
    }

    // Check if session exists in database
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        status: 'error',
        message: 'Session expired or invalid'
      });
    }

    // Check if user is active
    if (!session.user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated'
      });
    }

    req.user = session.user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

export const authorize = (...roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user owns the resource or has admin privileges
export const authorizeOwnerOrAdmin = (resourceUserIdField: string = 'userId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Admin and Founder can access any resource
    if (req.user.role === 'ADMIN' || req.user.role === 'FOUNDER') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only access your own resources'
      });
    }

    next();
  };
};

// Check if user is a seller and owns the store
export const authorizeStoreOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Admin and Founder can access any store
    if (req.user.role === 'ADMIN' || req.user.role === 'FOUNDER') {
      return next();
    }

    // Check if user is a seller
    if (req.user.role !== 'SELLER') {
      return res.status(403).json({
        status: 'error',
        message: 'Seller access required'
      });
    }

    const storeId = req.params.storeId || req.params.id;
    
    if (!storeId) {
      return res.status(400).json({
        status: 'error',
        message: 'Store ID required'
      });
    }

    // Check if user owns the store
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { userId: true }
    });

    if (!store) {
      return res.status(404).json({
        status: 'error',
        message: 'Store not found'
      });
    }

    if (store.userId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only manage your own store'
      });
    }

    next();
  } catch (error) {
    logger.error('Store authorization error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Authorization failed'
    });
  }
};

// Check if user can access order (buyer, seller, or admin)
export const authorizeOrderAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Admin and Founder can access any order
    if (req.user.role === 'ADMIN' || req.user.role === 'FOUNDER') {
      return next();
    }

    const orderId = req.params.orderId || req.params.id;
    
    if (!orderId) {
      return res.status(400).json({
        status: 'error',
        message: 'Order ID required'
      });
    }

    // Check if user is the buyer or the seller of the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true }
    });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    const isBuyer = order.userId === req.user.id;
    const isSeller = order.store.userId === req.user.id;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only access your own orders'
      });
    }

    next();
  } catch (error) {
    logger.error('Order authorization error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Authorization failed'
    });
  }
};

// Optional authentication - doesn't fail if no token provided
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const payload = jwtUtils.verifyAccessToken(token);

    if (!payload) {
      return next();
    }

    // Check if session exists and is valid
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true }
    });

    if (session && session.expiresAt >= new Date() && session.user.isActive) {
      req.user = session.user;
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next();
  }
};