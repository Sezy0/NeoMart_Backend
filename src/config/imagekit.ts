import ImageKit from 'imagekit';
import { logger } from './logger';

if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
  logger.error('ImageKit configuration missing. Please check environment variables.');
  process.exit(1);
}

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// Image transformation presets
export const imageTransformations = {
  thumbnail: 'tr:w-200,h-200,c-maintain_ratio',
  medium: 'tr:w-500,h-500,c-maintain_ratio',
  large: 'tr:w-1000,h-1000,c-maintain_ratio',
  webp: 'tr:f-webp,q-80',
  blur: 'tr:bl-10'
};

// Upload utility functions
export const uploadUtils = {
  async uploadFile(
    file: Buffer,
    fileName: string,
    folder: string = 'general'
  ): Promise<{
    fileId: string;
    url: string;
    thumbnailUrl: string;
    name: string;
    size: number;
    filePath: string;
  }> {
    try {
      const result = await imagekit.upload({
        file,
        fileName,
        folder: `/${folder}`,
        useUniqueFileName: true,
        tags: [folder, 'nekomart'],
      });

      return {
        fileId: result.fileId,
        url: result.url,
        thumbnailUrl: `${result.url}?${imageTransformations.thumbnail}`,
        name: result.name,
        size: result.size,
        filePath: result.filePath,
      };
    } catch (error) {
      logger.error('ImageKit upload error:', error);
      throw new Error('Failed to upload image');
    }
  },

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await imagekit.deleteFile(fileId);
      return true;
    } catch (error) {
      logger.error('ImageKit delete error:', error);
      return false;
    }
  },

  async getFileDetails(fileId: string) {
    try {
      return await imagekit.getFileDetails(fileId);
    } catch (error) {
      logger.error('ImageKit get file details error:', error);
      return null;
    }
  },

  generateSignedUrl(filePath: string, transformations?: string): string {
    try {
      return imagekit.url({
        path: filePath,
        transformation: transformations ? [{ raw: transformations }] : undefined,
        signed: true,
        expireSeconds: 3600, // 1 hour
      });
    } catch (error) {
      logger.error('ImageKit signed URL error:', error);
      return '';
    }
  },

  // Generate different sizes for responsive images
  generateResponsiveUrls(url: string) {
    const baseUrl = url.split('?')[0]; // Remove existing transformations
    
    return {
      original: url,
      thumbnail: `${baseUrl}?${imageTransformations.thumbnail}`,
      medium: `${baseUrl}?${imageTransformations.medium}`,
      large: `${baseUrl}?${imageTransformations.large}`,
      webp: `${baseUrl}?${imageTransformations.webp}`,
    };
  }
};

export { imagekit };