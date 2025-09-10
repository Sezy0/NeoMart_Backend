import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { UserService } from '@/services/user.service';
import { asyncHandler } from '@/middleware/errorHandler';

export class UserController {
  private userService = new UserService();

  getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await this.userService.getUserProfile(req.user!.id);
    
    res.status(200).json({
      status: 'success',
      message: 'Profile retrieved successfully',
      data: user
    });
  });

  updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await this.userService.updateUserProfile(req.user!.id, req.body);
    
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: user
    });
  });

  updateCart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await this.userService.updateCart(req.user!.id, req.body);
    
    res.status(200).json({
      status: 'success',
      message: 'Cart updated successfully',
      data: result
    });
  });

  getCart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const cart = await this.userService.getCart(req.user!.id);
    
    res.status(200).json({
      status: 'success',
      message: 'Cart retrieved successfully',
      data: cart
    });
  });

  clearCart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await this.userService.clearCart(req.user!.id);
    
    res.status(200).json({
      status: 'success',
      message: 'Cart cleared successfully'
    });
  });

  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await this.userService.getUserById(id);
    
    res.status(200).json({
      status: 'success',
      message: 'User retrieved successfully',
      data: user
    });
  });

  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await this.userService.getAllUsers(page, limit);
    
    res.status(200).json({
      status: 'success',
      message: 'Users retrieved successfully',
      data: result.data,
      pagination: result.pagination
    });
  });

  updateUserRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;
    
    const user = await this.userService.updateUserRole(id, role);
    
    res.status(200).json({
      status: 'success',
      message: 'User role updated successfully',
      data: user
    });
  });

  updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const user = await this.userService.updateUserStatus(id, isActive);
    
    res.status(200).json({
      status: 'success',
      message: 'User status updated successfully',
      data: user
    });
  });
}