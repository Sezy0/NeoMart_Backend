import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { UploadService } from '@/services/upload.service';
import { asyncHandler } from '@/middleware/errorHandler';

export class UploadController {
  private uploadService = new UploadService();

  uploadSingleImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    const folder = req.body.folder || 'general';
    const result = await this.uploadService.uploadSingleImage(req.file, folder);
    
    res.status(200).json({
      status: 'success',
      message: 'Image uploaded successfully',
      data: result
    });
  });

  uploadMultipleImages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded'
      });
    }

    const folder = req.body.folder || 'general';
    const result = await this.uploadService.uploadMultipleImages(files, folder);
    
    res.status(200).json({
      status: 'success',
      message: 'Images uploaded successfully',
      data: result
    });
  });

  deleteImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { fileId } = req.params;
    const result = await this.uploadService.deleteImage(fileId);
    
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  });

  getSignedUrl = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { filePath, transformations } = req.query;
    
    if (!filePath) {
      return res.status(400).json({
        status: 'error',
        message: 'File path is required'
      });
    }

    const result = await this.uploadService.getSignedUrl(
      filePath as string,
      transformations as string
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Signed URL generated successfully',
      data: { signedUrl: result }
    });
  });
}