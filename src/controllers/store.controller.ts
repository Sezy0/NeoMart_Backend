import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { StoreService } from '@/services/store.service';
import { asyncHandler } from '@/middleware/errorHandler';

export class StoreController {
  private storeService = new StoreService();

  createStore = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const store = await this.storeService.createStore(req.user!.id, req.body);
    
    res.status(201).json({
      status: 'success',
      message: 'Store created successfully',
      data: store
    });
  });

  getAllStores = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await this.storeService.getAllStores(page, limit);
    
    res.status(200).json({
      status: 'success',
      message: 'Stores retrieved successfully',
      data: result.data,
      pagination: result.pagination
    });
  });

  getStoreById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const store = await this.storeService.getStoreById(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Store retrieved successfully',
      data: store
    });
  });

  updateStore = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const store = await this.storeService.updateStore(id, req.body);
    
    res.status(200).json({
      status: 'success',
      message: 'Store updated successfully',
      data: store
    });
  });

  deleteStore = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    await this.storeService.deleteStore(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Store deleted successfully'
    });
  });

  approveStore = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const store = await this.storeService.approveStore(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Store approved successfully',
      data: store
    });
  });

  rejectStore = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const store = await this.storeService.rejectStore(id, rejectionReason);
    
    res.status(200).json({
      status: 'success',
      message: 'Store rejected successfully',
      data: store
    });
  });

  suspendStore = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const store = await this.storeService.suspendStore(id, rejectionReason);
    
    res.status(200).json({
      status: 'success',
      message: 'Store suspended successfully',
      data: store
    });
  });

  getStoresByUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    
    // Check if user can access this data
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'FOUNDER' && req.user!.id !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    
    const stores = await this.storeService.getStoresByUser(userId);
    
    res.status(200).json({
      status: 'success',
      message: 'User stores retrieved successfully',
      data: stores
    });
  });
}