import { OrderStatus } from '@prisma/client';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { CreateOrderRequest, Cart, CartItem } from '@/types';
import { createError } from '@/middleware/errorHandler';

export class OrderService {
  async createOrder(userId: string, data: CreateOrderRequest) {
    try {
      // Get user's cart
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { cart: true }
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      const cart: Cart = user.cart ? JSON.parse(user.cart) : { items: [], total: 0 };

      if (!cart.items || cart.items.length === 0) {
        throw createError('Cart is empty', 400);
      }

      // Group cart items by store
      const itemsByStore = new Map<string, CartItem[]>();
      
      for (const item of cart.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { storeId: true, price: true, inStock: true, name: true }
        });

        if (!product) {
          throw createError(`Product ${item.productId} not found`, 404);
        }

        if (!product.inStock) {
          throw createError(`Product ${product.name} is out of stock`, 400);
        }

        if (product.price !== item.price) {
          throw createError(`Price changed for product ${product.name}`, 400);
        }

        if (!itemsByStore.has(product.storeId)) {
          itemsByStore.set(product.storeId, []);
        }
        itemsByStore.get(product.storeId)!.push({
          ...item,
          storeId: product.storeId
        } as CartItem & { storeId: string });
      }

      // Create orders for each store
      const orders = [];

      for (const [storeId, storeItems] of itemsByStore) {
        const storeTotal = storeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let finalTotal = storeTotal;

        // Apply coupon if provided
        let couponUsed = false;
        if (data.couponCode) {
          const coupon = await prisma.coupon.findUnique({
            where: { code: data.couponCode }
          });

          if (coupon && coupon.isActive && coupon.expiresAt > new Date()) {
            // Check usage limit
            if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
              throw createError('Coupon usage limit exceeded', 400);
            }

            // Apply discount
            if (coupon.discountType === 'PERCENTAGE') {
              finalTotal = storeTotal * (1 - coupon.discount / 100);
            } else {
              finalTotal = Math.max(0, storeTotal - coupon.discount);
            }

            couponUsed = true;

            // Update coupon usage
            await prisma.coupon.update({
              where: { id: coupon.id },
              data: { usageCount: { increment: 1 } }
            });
          }
        }

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create order using transaction
        const order = await prisma.$transaction(async (tx) => {
          // Create order
          const newOrder = await tx.order.create({
            data: {
              orderNumber,
              total: finalTotal,
              userId,
              storeId,
              paymentMethod: data.paymentMethod,
              isCouponUsed: couponUsed,
              coupon: couponUsed ? data.couponCode : null,
            }
          });

          // Create order items and update stock
          for (const item of storeItems) {
            await tx.orderItem.create({
              data: {
                orderId: newOrder.id,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price
              }
            });

            // Note: In a real app, you'd update product stock here
            // await tx.product.update({
            //   where: { id: item.productId },
            //   data: { stock: { decrement: item.quantity } }
            // });
          }

          return newOrder;
        });

        orders.push(order);
      }

      // Clear user's cart
      await prisma.user.update({
        where: { id: userId },
        data: { cart: JSON.stringify({ items: [], total: 0 }) }
      });

      logger.info(`Orders created for user: ${userId}, count: ${orders.length}`);
      
      // Return the first order (or all orders if multiple stores)
      return orders.length === 1 ? orders[0] : orders;
    } catch (error) {
      logger.error('Create order error:', error);
      throw error;
    }
  }

  async getOrderById(orderId: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          store: {
            select: {
              id: true,
              name: true,
              username: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                  category: true
                }
              }
            }
          }
        }
      });

      if (!order) {
        throw createError('Order not found', 404);
      }

      return {
        ...order,
        orderItems: order.orderItems.map(item => ({
          ...item,
          product: {
            ...item.product,
            images: JSON.parse(item.product.images as string)
          }
        }))
      };
    } catch (error) {
      logger.error('Get order by ID error:', error);
      throw error;
    }
  }

  async getOrdersByUser(userId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { userId },
          include: {
            store: {
              select: {
                id: true,
                name: true,
                username: true,
                logo: true
              }
            },
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true
                  }
                }
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.order.count({ where: { userId } })
      ]);

      const ordersWithImages = orders.map(order => ({
        ...order,
        orderItems: order.orderItems.map(item => ({
          ...item,
          product: {
            ...item.product,
            images: JSON.parse(item.product.images as string)
          }
        }))
      }));

      return {
        data: ordersWithImages,
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
      logger.error('Get orders by user error:', error);
      throw error;
    }
  }

  async getOrdersByStore(storeId: string, userId: string, page: number = 1, limit: number = 20) {
    try {
      // Check if user owns the store
      const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { userId: true }
      });

      if (!store) {
        throw createError('Store not found', 404);
      }

      if (store.userId !== userId) {
        throw createError('Access denied', 403);
      }

      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { storeId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true
                  }
                }
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.order.count({ where: { storeId } })
      ]);

      const ordersWithImages = orders.map(order => ({
        ...order,
        orderItems: order.orderItems.map(item => ({
          ...item,
          product: {
            ...item.product,
            images: JSON.parse(item.product.images as string)
          }
        }))
      }));

      return {
        data: ordersWithImages,
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
      logger.error('Get orders by store error:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, userId: string) {
    try {
      // Check if user owns the store for this order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          store: {
            select: { userId: true }
          }
        }
      });

      if (!order) {
        throw createError('Order not found', 404);
      }

      if (order.store.userId !== userId) {
        throw createError('Access denied', 403);
      }

      // Validate status transition
      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        PENDING: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['PROCESSING', 'CANCELLED'],
        PROCESSING: ['SHIPPED', 'CANCELLED'],
        SHIPPED: ['DELIVERED'],
        DELIVERED: ['REFUNDED'],
        CANCELLED: [],
        REFUNDED: []
      };

      if (!validTransitions[order.status].includes(status)) {
        throw createError(`Cannot change status from ${order.status} to ${status}`, 400);
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          store: {
            select: {
              id: true,
              name: true,
              username: true
            }
          }
        }
      });

      logger.info(`Order status updated: ${orderId} -> ${status}`);
      return updatedOrder;
    } catch (error) {
      logger.error('Update order status error:', error);
      throw error;
    }
  }

  async cancelOrder(orderId: string, userId: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          userId: true,
          status: true,
          store: {
            select: { userId: true }
          }
        }
      });

      if (!order) {
        throw createError('Order not found', 404);
      }

      // Check if user can cancel (buyer or store owner)
      const canCancel = order.userId === userId || order.store.userId === userId;
      if (!canCancel) {
        throw createError('Access denied', 403);
      }

      // Check if order can be cancelled
      if (!['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status)) {
        throw createError('Order cannot be cancelled at this stage', 400);
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED }
      });

      logger.info(`Order cancelled: ${orderId}`);
      return updatedOrder;
    } catch (error) {
      logger.error('Cancel order error:', error);
      throw error;
    }
  }

  async getAllOrders(page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            store: {
              select: {
                id: true,
                name: true,
                username: true
              }
            },
            _count: {
              select: {
                orderItems: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.order.count()
      ]);

      return {
        data: orders,
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
      logger.error('Get all orders error:', error);
      throw error;
    }
  }

  async refundOrder(orderId: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true }
      });

      if (!order) {
        throw createError('Order not found', 404);
      }

      if (order.status !== 'DELIVERED') {
        throw createError('Only delivered orders can be refunded', 400);
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REFUNDED }
      });

      logger.info(`Order refunded: ${orderId}`);
      return updatedOrder;
    } catch (error) {
      logger.error('Refund order error:', error);
      throw error;
    }
  }
}