import { uploadUtils } from '@/config/imagekit';
import { logger } from '@/config/logger';
import { UploadResponse } from '@/types';
import { createError } from '@/middleware/errorHandler';

export class UploadService {
  async uploadSingleImage(file: Express.Multer.File, folder: string = 'general'): Promise<UploadResponse> {
    try {
      const result = await uploadUtils.uploadFile(
        file.buffer,
        file.originalname,
        folder
      );

      logger.info(`Image uploaded: ${result.fileId} to folder: ${folder}`);
      return result;
    } catch (error) {
      logger.error('Upload single image error:', error);
      throw createError('Failed to upload image', 500);
    }
  }

  async uploadMultipleImages(files: Express.Multer.File[], folder: string = 'general') {
    try {
      const uploadPromises = files.map(file => 
        uploadUtils.uploadFile(file.buffer, file.originalname, folder)
      );

      const results = await Promise.allSettled(uploadPromises);
      
      const uploadedFiles: UploadResponse[] = [];
      const failedUploads: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          uploadedFiles.push(result.value);
        } else {
          failedUploads.push(files[index].originalname);
          logger.error(`Failed to upload ${files[index].originalname}:`, result.reason);
        }
      });

      logger.info(`Uploaded ${uploadedFiles.length} images, ${failedUploads.length} failed`);

      return {
        uploadedFiles,
        failedUploads,
        totalUploaded: uploadedFiles.length,
        totalFailed: failedUploads.length
      };
    } catch (error) {
      logger.error('Upload multiple images error:', error);
      throw createError('Failed to upload images', 500);
    }
  }

  async deleteImage(fileId: string): Promise<{ message: string }> {
    try {
      const success = await uploadUtils.deleteFile(fileId);
      
      if (!success) {
        throw createError('Failed to delete image', 500);
      }

      logger.info(`Image deleted: ${fileId}`);
      return { message: 'Image deleted successfully' };
    } catch (error) {
      logger.error('Delete image error:', error);
      throw error;
    }
  }

  async getSignedUrl(filePath: string, transformations?: string): Promise<string> {
    try {
      const signedUrl = uploadUtils.generateSignedUrl(filePath, transformations);
      
      if (!signedUrl) {
        throw createError('Failed to generate signed URL', 500);
      }

      return signedUrl;
    } catch (error) {
      logger.error('Get signed URL error:', error);
      throw error;
    }
  }

  async getFileDetails(fileId: string) {
    try {
      const details = await uploadUtils.getFileDetails(fileId);
      
      if (!details) {
        throw createError('File not found', 404);
      }

      return details;
    } catch (error) {
      logger.error('Get file details error:', error);
      throw error;
    }
  }

  generateResponsiveUrls(url: string) {
    try {
      return uploadUtils.generateResponsiveUrls(url);
    } catch (error) {
      logger.error('Generate responsive URLs error:', error);
      throw createError('Failed to generate responsive URLs', 500);
    }
  }
}