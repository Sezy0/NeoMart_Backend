import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { OrderService } from '@/services/order.service';
import { asyncHandler } from '@/middleware/errorHandler';

export class OrderController {
  private orderService = new OrderService();

  createOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const order = await this.orderService.createOrder(req.user!.id, req.body);
    
    res.status(201).json({
      status: 'success',
      message: 'Order created successfully',
      data: order
    });
  });

  getOrderById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.orderService.getOrderById(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Order retrieved successfully',
      data: order
    });
  });

  getOrdersByUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    // Check access
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'FOUNDER' && req.user!.id !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    const result = await this.orderService.getOrdersByUser(userId, page, limit);
    
    res.status(200).json({
      status: 'success',
      message: 'User orders retrieved successfully',
      data: result.data,
      pagination: result.pagination
    });
  });

  getOrdersByStore = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { storeId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await this.orderService.getOrdersByStore(storeId, req.user!.id, page, limit);
    
    res.status(200).json({
      status: 'success',
      message: 'Store orders retrieved successfully',
      data: result.data,
      pagination: result.pagination
    });
  });

  updateOrderStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const order = await this.orderService.updateOrderStatus(id, status, req.user!.id);
    
    res.status(200).json({
      status: 'success',
      message: 'Order status updated successfully',
      data: order
    });
  });

  cancelOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const order = await this.orderService.cancelOrder(id, req.user!.id);
    
    res.status(200).json({
      status: 'success',
      message: 'Order cancelled successfully',
      data: order
    });
  });

  getAllOrders = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await this.orderService.getAllOrders(page, limit);
    
    res.status(200).json({
      status: 'success',
      message: 'All orders retrieved successfully',
      data: result.data,
      pagination: result.pagination
    });
  });

  refundOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const order = await this.orderService.refundOrder(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Order refunded successfully',
      data: order
    });
  });
}