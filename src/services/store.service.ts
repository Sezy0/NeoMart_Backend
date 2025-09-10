import { StoreStatus } from '@prisma/client';
import { prisma } from '@/config/database';
import { cache, cacheKeys, cacheTTL } from '@/config/redis';
import { logger } from '@/config/logger';
import { CreateStoreRequest } from '@/types';
import { createError } from '@/middleware/errorHandler';

export class StoreService {
  async createStore(userId: string, data: CreateStoreRequest) {
    try {
      // Check if user already has a store
      const existingStore = await prisma.store.findUnique({
        where: { userId }
      });

      if (existingStore) {
        throw createError('User already has a store', 409);
      }

      // Check if username is taken
      const existingUsername = await prisma.store.findUnique({
        where: { username: data.username }
      });

      if (existingUsername) {
        throw createError('Store username already taken', 409);
      }

      // Create store
      const store = await prisma.store.create({
        data: {
          userId,
          name: data.name,
          description: data.description,
          username: data.username,
          address: data.address,
          logo: data.logo,
          banner: data.banner,
          socialLinks: data.socialLinks || {},
          status: StoreStatus.PENDING,
          isActive: false,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Update user role to SELLER
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'SELLER' }
      });

      // Clear user cache
      await cache.del(cacheKeys.user(userId));

      logger.info(`Store created: ${store.name} by user: ${userId}`);
      return store;
    } catch (error) {
      logger.error('Create store error:', error);
      throw error;
    }
  }

  async getAllStores(page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [stores, total] = await Promise.all([
        prisma.store.findMany({
          where: {
            status: StoreStatus.APPROVED,
            isActive: true
          },
          select: {
            id: true,
            name: true,
            description: true,
            username: true,
            logo: true,
            banner: true,
            socialLinks: true,
            createdAt: true,
            user: {
              select: {
                name: true
              }
            },
            _count: {
              select: {
                products: true,
                orders: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.store.count({
          where: {
            status: StoreStatus.APPROVED,
            isActive: true
          }
        })
      ]);

      return {
        data: stores,
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
      logger.error('Get all stores error:', error);
      throw error;
    }
  }

  async getStoreById(storeId: string) {
    try {
      // Try cache first
      const cached = await cache.get(cacheKeys.store(storeId));
      if (cached) {
        return JSON.parse(cached);
      }

      const store = await prisma.store.findUnique({
        where: { id: storeId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          products: {
            where: { inStock: true },
            select: {
              id: true,
              name: true,
              price: true,
              images: true,
              category: true
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              products: true,
              orders: true
            }
          }
        }
      });

      if (!store) {
        throw createError('Store not found', 404);
      }

      // Cache the store
      await cache.set(
        cacheKeys.store(storeId),
        JSON.stringify(store),
        cacheTTL.store
      );

      return store;
    } catch (error) {
      logger.error('Get store by ID error:', error);
      throw error;
    }
  }

  async updateStore(storeId: string, data: Partial<CreateStoreRequest>) {
    try {
      // Check if username is taken (if updating username)
      if (data.username) {
        const existingUsername = await prisma.store.findFirst({
          where: {
            username: data.username,
            id: { not: storeId }
          }
        });

        if (existingUsername) {
          throw createError('Store username already taken', 409);
        }
      }

      const store = await prisma.store.update({
        where: { id: storeId },
        data: {
          ...data,
          socialLinks: data.socialLinks || undefined
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Clear cache
      await cache.del(cacheKeys.store(storeId));

      logger.info(`Store updated: ${storeId}`);
      return store;
    } catch (error) {
      logger.error('Update store error:', error);
      throw error;
    }
  }

  async deleteStore(storeId: string) {
    try {
      // Check if store has active orders
      const activeOrders = await prisma.order.count({
        where: {
          storeId,
          status: {
            in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED']
          }
        }
      });

      if (activeOrders > 0) {
        throw createError('Cannot delete store with active orders', 400);
      }

      await prisma.store.delete({
        where: { id: storeId }
      });

      // Clear cache
      await cache.del(cacheKeys.store(storeId));

      logger.info(`Store deleted: ${storeId}`);
    } catch (error) {
      logger.error('Delete store error:', error);
      throw error;
    }
  }

  async approveStore(storeId: string) {
    try {
      const store = await prisma.store.update({
        where: { id: storeId },
        data: {
          status: StoreStatus.APPROVED,
          isActive: true,
          rejectionReason: null
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Clear cache
      await cache.del(cacheKeys.store(storeId));

      logger.info(`Store approved: ${storeId}`);
      return store;
    } catch (error) {
      logger.error('Approve store error:', error);
      throw error;
    }
  }

  async rejectStore(storeId: string, rejectionReason: string) {
    try {
      const store = await prisma.store.update({
        where: { id: storeId },
        data: {
          status: StoreStatus.REJECTED,
          isActive: false,
          rejectionReason
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Clear cache
      await cache.del(cacheKeys.store(storeId));

      logger.info(`Store rejected: ${storeId}`);
      return store;
    } catch (error) {
      logger.error('Reject store error:', error);
      throw error;
    }
  }

  async suspendStore(storeId: string, reason: string) {
    try {
      const store = await prisma.store.update({
        where: { id: storeId },
        data: {
          status: StoreStatus.SUSPENDED,
          isActive: false,
          rejectionReason: reason
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Clear cache
      await cache.del(cacheKeys.store(storeId));

      logger.info(`Store suspended: ${storeId}`);
      return store;
    } catch (error) {
      logger.error('Suspend store error:', error);
      throw error;
    }
  }

  async getStoresByUser(userId: string) {
    try {
      const stores = await prisma.store.findMany({
        where: { userId },
        include: {
          _count: {
            select: {
              products: true,
              orders: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return stores;
    } catch (error) {
      logger.error('Get stores by user error:', error);
      throw error;
    }
  }

  async getStoreStats(storeId: string) {
    try {
      const stats = await prisma.store.findUnique({
        where: { id: storeId },
        select: {
          _count: {
            select: {
              products: true,
              orders: true
            }
          },
          orders: {
            select: {
              total: true,
              status: true,
              createdAt: true
            }
          }
        }
      });

      if (!stats) {
        throw createError('Store not found', 404);
      }

      const totalRevenue = stats.orders.reduce((sum, order) => sum + order.total, 0);
      const ordersByStatus = stats.orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate monthly revenue
      const monthlyRevenue = stats.orders.reduce((acc, order) => {
        const month = order.createdAt.toISOString().substring(0, 7); // YYYY-MM
        acc[month] = (acc[month] || 0) + order.total;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalProducts: stats._count.products,
        totalOrders: stats._count.orders,
        totalRevenue,
        ordersByStatus,
        monthlyRevenue
      };
    } catch (error) {
      logger.error('Get store stats error:', error);
      throw error;
    }
  }
}