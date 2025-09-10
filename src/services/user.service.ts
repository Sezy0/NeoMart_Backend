import { Role } from '@prisma/client';
import { prisma } from '@/config/database';
import { cache, cacheKeys, cacheTTL } from '@/config/redis';
import { logger } from '@/config/logger';
import { Cart, CartItem } from '@/types';
import { createError } from '@/middleware/errorHandler';

export class UserService {
  async getUserProfile(userId: string) {
    try {
      // Try to get from cache first
      const cached = await cache.get(cacheKeys.user(userId));
      if (cached) {
        const user = JSON.parse(cached);
        // Remove sensitive data
        delete user.password;
        return user;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          emailVerifiedAt: true,
          discordId: true,
          discordUsername: true,
          discordAvatar: true,
          createdAt: true,
          updatedAt: true,
          store: {
            select: {
              id: true,
              name: true,
              username: true,
              status: true,
              isActive: true
            }
          }
        }
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      // Cache the user data
      await cache.set(
        cacheKeys.user(userId),
        JSON.stringify(user),
        cacheTTL.user
      );

      return user;
    } catch (error) {
      logger.error('Get user profile error:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, data: { name?: string; image?: string }) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          discordId: true,
          discordUsername: true,
          discordAvatar: true,
          updatedAt: true
        }
      });

      // Clear cache
      await cache.del(cacheKeys.user(userId));

      logger.info(`User profile updated: ${userId}`);
      return user;
    } catch (error) {
      logger.error('Update user profile error:', error);
      throw error;
    }
  }

  async updateCart(userId: string, cartData: { items: CartItem[] }) {
    try {
      // Validate cart items
      for (const item of cartData.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, price: true, inStock: true }
        });

        if (!product) {
          throw createError(`Product ${item.productId} not found`, 404);
        }

        if (!product.inStock) {
          throw createError(`Product ${item.productId} is out of stock`, 400);
        }

        if (item.price !== product.price) {
          throw createError(`Price mismatch for product ${item.productId}`, 400);
        }
      }

      // Calculate total
      const total = cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const cart: Cart = {
        items: cartData.items,
        total
      };

      // Update user cart
      await prisma.user.update({
        where: { id: userId },
        data: { cart: JSON.stringify(cart) }
      });

      // Cache the cart
      await cache.set(
        cacheKeys.userCart(userId),
        JSON.stringify(cart),
        cacheTTL.cart
      );

      logger.info(`Cart updated for user: ${userId}`);
      return cart;
    } catch (error) {
      logger.error('Update cart error:', error);
      throw error;
    }
  }

  async getCart(userId: string): Promise<Cart> {
    try {
      // Try cache first
      const cached = await cache.get(cacheKeys.userCart(userId));
      if (cached) {
        return JSON.parse(cached);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { cart: true }
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      const cart: Cart = user.cart ? JSON.parse(user.cart) : { items: [], total: 0 };

      // Cache the cart
      await cache.set(
        cacheKeys.userCart(userId),
        JSON.stringify(cart),
        cacheTTL.cart
      );

      return cart;
    } catch (error) {
      logger.error('Get cart error:', error);
      throw error;
    }
  }

  async clearCart(userId: string) {
    try {
      const emptyCart: Cart = { items: [], total: 0 };

      await prisma.user.update({
        where: { id: userId },
        data: { cart: JSON.stringify(emptyCart) }
      });

      // Clear cache
      await cache.del(cacheKeys.userCart(userId));

      logger.info(`Cart cleared for user: ${userId}`);
    } catch (error) {
      logger.error('Clear cart error:', error);
      throw error;
    }
  }

  async getUserById(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          emailVerifiedAt: true,
          discordId: true,
          discordUsername: true,
          discordAvatar: true,
          createdAt: true,
          updatedAt: true,
          store: {
            select: {
              id: true,
              name: true,
              username: true,
              status: true,
              isActive: true
            }
          },
          _count: {
            select: {
              buyerOrders: true,
              ratings: true
            }
          }
        }
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      return user;
    } catch (error) {
      logger.error('Get user by ID error:', error);
      throw error;
    }
  }

  async getAllUsers(page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            isEmailVerified: true,
            discordId: true,
            discordUsername: true,
            createdAt: true,
            store: {
              select: {
                id: true,
                name: true,
                status: true
              }
            },
            _count: {
              select: {
                buyerOrders: true,
                ratings: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count()
      ]);

      return {
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        }
      };
    } catch (error) {
      logger.error('Get all users error:', error);
      throw error;
    }
  }

  async updateUserRole(userId: string, role: Role) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          updatedAt: true
        }
      });

      // Clear cache
      await cache.del(cacheKeys.user(userId));

      logger.info(`User role updated: ${userId} -> ${role}`);
      return user;
    } catch (error) {
      logger.error('Update user role error:', error);
      throw error;
    }
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          updatedAt: true
        }
      });

      // Clear cache
      await cache.del(cacheKeys.user(userId));

      // If deactivating user, logout all sessions
      if (!isActive) {
        await prisma.session.deleteMany({
          where: { userId }
        });
      }

      logger.info(`User status updated: ${userId} -> ${isActive ? 'active' : 'inactive'}`);
      return user;
    } catch (error) {
      logger.error('Update user status error:', error);
      throw error;
    }
  }

  async getUserStats(userId: string) {
    try {
      const stats = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          _count: {
            select: {
              buyerOrders: true,
              ratings: true
            }
          },
          buyerOrders: {
            select: {
              total: true,
              status: true
            }
          }
        }
      });

      if (!stats) {
        throw createError('User not found', 404);
      }

      const totalSpent = stats.buyerOrders.reduce((sum, order) => sum + order.total, 0);
      const ordersByStatus = stats.buyerOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalOrders: stats._count.buyerOrders,
        totalRatings: stats._count.ratings,
        totalSpent,
        ordersByStatus
      };
    } catch (error) {
      logger.error('Get user stats error:', error);
      throw error;
    }
  }
}