import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { ProductService } from '@/services/product.service';
import { asyncHandler } from '@/middleware/errorHandler';

export class ProductController {
  private productService = new ProductService();

  getAllProducts = asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query;
    const result = await this.productService.getAllProducts(filters);
    
    res.status(200).json({
      status: 'success',
      message: 'Products retrieved successfully',
      data: result.data,
      pagination: result.pagination
    });
  });

  getProductById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const product = await this.productService.getProductById(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Product retrieved successfully',
      data: product
    });
  });

  createProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const product = await this.productService.createProduct(req.user!.id, req.body);
    
    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: product
    });
  });

  updateProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const product = await this.productService.updateProduct(id, req.user!.id, req.body);
    
    res.status(200).json({
      status: 'success',
      message: 'Product updated successfully',
      data: product
    });
  });

  deleteProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    await this.productService.deleteProduct(id, req.user!.id);
    
    res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully'
    });
  });

  getProductsByStore = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const filters = req.query;
    const result = await this.productService.getProductsByStore(storeId, filters);
    
    res.status(200).json({
      status: 'success',
      message: 'Store products retrieved successfully',
      data: result.data,
      pagination: result.pagination
    });
  });

  addRating = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const rating = await this.productService.addRating(id, req.user!.id, req.body);
    
    res.status(201).json({
      status: 'success',
      message: 'Rating added successfully',
      data: rating
    });
  });

  getRatings = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await this.productService.getRatings(id, page, limit);
    
    res.status(200).json({
      status: 'success',
      message: 'Product ratings retrieved successfully',
      data: result.data,
      pagination: result.pagination
    });
  });

  getProductsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.params;
    const filters = { ...req.query, category };
    const result = await this.productService.getAllProducts(filters);
    
    res.status(200).json({
      status: 'success',
      message: 'Category products retrieved successfully',
      data: result.data,
      pagination: result.pagination
    });
  });

  searchProducts = asyncHandler(async (req: Request, res: Response) => {
    const { query } = req.params;
    const filters = { ...req.query, search: query };
    const result = await this.productService.getAllProducts(filters);
    
    res.status(200).json({
      status: 'success',
      message: 'Search results retrieved successfully',
      data: result.data,
      pagination: result.pagination
    });
  });
}