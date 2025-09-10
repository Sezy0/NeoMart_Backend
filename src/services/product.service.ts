import { prisma } from '@/config/database';
import { cache, cacheKeys, cacheTTL } from '@/config/redis';
import { logger } from '@/config/logger';
import { CreateProductRequest, ProductFilters, CreateRatingRequest } from '@/types';
import { createError } from '@/middleware/errorHandler';

export class ProductService {
  async getAllProducts(filters: any) {
    try {
      const {
        category,
        minPrice,
        maxPrice,
        search,
        page = 1,
        limit = 20
      } = filters;

      const skip = (page - 1) * limit;
      
      // Build where clause
      const where: any = {
        inStock: true,
        store: {
          status: 'APPROVED',
          isActive: true
        }
      };

      if (category) {
        where.category = { contains: category, mode: 'insensitive' };
      }

      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice);
        if (maxPrice) where.price.lte = parseFloat(maxPrice);
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            mrp: true,
            price: true,
            images: true,
            category: true,
            tags: true,
            createdAt: true,
            store: {
              select: {
                id: true,
                name: true,
                username: true,
                logo: true
              }
            },
            _count: {
              select: {
                ratings: true
              }
            },
            ratings: {
              select: {
                rating: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.product.count({ where })
      ]);

      // Calculate average ratings
      const productsWithRatings = products.map(product => {
        const avgRating = product.ratings.length > 0
          ? product.ratings.reduce((sum, r) => sum + r.rating, 0) / product.ratings.length
          : 0;

        return {
          ...product,
          images: JSON.parse(product.images as string),
          tags: JSON.parse(product.tags as string || '[]'),
          averageRating: Math.round(avgRating * 10) / 10,
          totalRatings: product._count.ratings,
          ratings: undefined,
          _count: undefined
        };
      });

      return {
        data: productsWithRatings,
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
      logger.error('Get all products error:', error);
      throw error;
    }
  }

  async getProductById(productId: string) {
    try {
      // Try cache first
      const cached = await cache.get(cacheKeys.product(productId));
      if (cached) {
        return JSON.parse(cached);
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              username: true,
              logo: true,
              description: true,
              user: {
                select: {
                  name: true
                }
              }
            }
          },
          ratings: {
            select: {
              id: true,
              rating: true,
              review: true,
              createdAt: true,
              user: {
                select: {
                  name: true,
                  image: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
          },
          _count: {
            select: {
              ratings: true
            }
          }
        }
      });

      if (!product) {
        throw createError('Product not found', 404);
      }

      // Calculate average rating
      const avgRating = product.ratings.length > 0
        ? product.ratings.reduce((sum, r) => sum + r.rating, 0) / product.ratings.length
        : 0;

      const productWithRating = {
        ...product,
        images: JSON.parse(product.images as string),
        tags: JSON.parse(product.tags as string || '[]'),
        averageRating: Math.round(avgRating * 10) / 10,
        totalRatings: product._count.ratings
      };

      // Cache the product
      await cache.set(
        cacheKeys.product(productId),
        JSON.stringify(productWithRating),
        cacheTTL.product
      );

      return productWithRating;
    } catch (error) {
      logger.error('Get product by ID error:', error);
      throw error;
    }
  }

  async createProduct(userId: string, data: CreateProductRequest) {
    try {
      // Get user's store
      const store = await prisma.store.findUnique({
        where: { userId },
        select: { id: true, status: true, isActive: true }
      });

      if (!store) {
        throw createError('Store not found', 404);
      }

      if (store.status !== 'APPROVED' || !store.isActive) {
        throw createError('Store must be approved and active to add products', 400);
      }

      // Validate price
      if (data.price > data.mrp) {
        throw createError('Price cannot be higher than MRP', 400);
      }

      const product = await prisma.product.create({
        data: {
          name: data.name,
          description: data.description,
          mrp: data.mrp,
          price: data.price,
          images: JSON.stringify(data.images),
          category: data.category,
          tags: JSON.stringify(data.tags || []),
          storeId: store.id
        },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              username: true
            }
          }
        }
      });

      logger.info(`Product created: ${product.name} by store: ${store.id}`);
      return {
        ...product,
        images: JSON.parse(product.images as string),
        tags: JSON.parse(product.tags as string || '[]')
      };
    } catch (error) {
      logger.error('Create product error:', error);
      throw error;
    }
  }

  async updateProduct(productId: string, userId: string, data: Partial<CreateProductRequest>) {
    try {
      // Check if user owns the product
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          store: {
            select: { userId: true }
          }
        }
      });

      if (!product) {
        throw createError('Product not found', 404);
      }

      if (product.store.userId !== userId) {
        throw createError('Access denied', 403);
      }

      // Validate price if updating
      if (data.price && data.mrp && data.price > data.mrp) {
        throw createError('Price cannot be higher than MRP', 400);
      }

      const updateData: any = { ...data };
      if (data.images) {
        updateData.images = JSON.stringify(data.images);
      }
      if (data.tags) {
        updateData.tags = JSON.stringify(data.tags);
      }

      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: updateData,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              username: true
            }
          }
        }
      });

      // Clear cache
      await cache.del(cacheKeys.product(productId));

      logger.info(`Product updated: ${productId}`);
      return {
        ...updatedProduct,
        images: JSON.parse(updatedProduct.images as string),
        tags: JSON.parse(updatedProduct.tags as string || '[]')
      };
    } catch (error) {
      logger.error('Update product error:', error);
      throw error;
    }
  }

  async deleteProduct(productId: string, userId: string) {
    try {
      // Check if user owns the product
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          store: {
            select: { userId: true }
          }
        }
      });

      if (!product) {
        throw createError('Product not found', 404);
      }

      if (product.store.userId !== userId) {
        throw createError('Access denied', 403);
      }

      // Check if product has active orders
      const activeOrders = await prisma.orderItem.count({
        where: {
          productId,
          order: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED']
            }
          }
        }
      });

      if (activeOrders > 0) {
        throw createError('Cannot delete product with active orders', 400);
      }

      await prisma.product.delete({
        where: { id: productId }
      });

      // Clear cache
      await cache.del(cacheKeys.product(productId));

      logger.info(`Product deleted: ${productId}`);
    } catch (error) {
      logger.error('Delete product error:', error);
      throw error;
    }
  }

  async getProductsByStore(storeId: string, filters: any) {
    try {
      const {
        category,
        minPrice,
        maxPrice,
        search,
        page = 1,
        limit = 20
      } = filters;

      const skip = (page - 1) * limit;
      
      const where: any = {
        storeId,
        inStock: true
      };

      if (category) {
        where.category = { contains: category, mode: 'insensitive' };
      }

      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice);
        if (maxPrice) where.price.lte = parseFloat(maxPrice);
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            mrp: true,
            price: true,
            images: true,
            category: true,
            tags: true,
            createdAt: true,
            _count: {
              select: {
                ratings: true
              }
            },
            ratings: {
              select: {
                rating: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.product.count({ where })
      ]);

      const productsWithRatings = products.map(product => {
        const avgRating = product.ratings.length > 0
          ? product.ratings.reduce((sum, r) => sum + r.rating, 0) / product.ratings.length
          : 0;

        return {
          ...product,
          images: JSON.parse(product.images as string),
          tags: JSON.parse(product.tags as string || '[]'),
          averageRating: Math.round(avgRating * 10) / 10,
          totalRatings: product._count.ratings,
          ratings: undefined,
          _count: undefined
        };
      });

      return {
        data: productsWithRatings,
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
      logger.error('Get products by store error:', error);
      throw error;
    }
  }

  async addRating(productId: string, userId: string, data: CreateRatingRequest) {
    try {
      // Check if user has purchased this product
      const order = await prisma.order.findFirst({
        where: {
          userId,
          status: 'DELIVERED',
          orderItems: {
            some: {
              productId
            }
          }
        },
        include: {
          orderItems: {
            where: { productId }
          }
        }
      });

      if (!order) {
        throw createError('You can only rate products you have purchased and received', 400);
      }

      // Check if user already rated this product for this order
      const existingRating = await prisma.rating.findUnique({
        where: {
          userId_productId_orderId: {
            userId,
            productId,
            orderId: data.orderId
          }
        }
      });

      if (existingRating) {
        throw createError('You have already rated this product for this order', 409);
      }

      const rating = await prisma.rating.create({
        data: {
          rating: data.rating,
          review: data.review,
          userId,
          productId,
          orderId: data.orderId
        },
        include: {
          user: {
            select: {
              name: true,
              image: true
            }
          }
        }
      });

      // Clear product cache
      await cache.del(cacheKeys.product(productId));

      logger.info(`Rating added for product: ${productId} by user: ${userId}`);
      return rating;
    } catch (error) {
      logger.error('Add rating error:', error);
      throw error;
    }
  }

  async getRatings(productId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [ratings, total] = await Promise.all([
        prisma.rating.findMany({
          where: { productId },
          select: {
            id: true,
            rating: true,
            review: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                image: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.rating.count({ where: { productId } })
      ]);

      return {
        data: ratings,
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
      logger.error('Get ratings error:', error);
      throw error;
    }
  }
}