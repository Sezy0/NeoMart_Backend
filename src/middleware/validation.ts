import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '@/config/logger';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors
        });
      }

      logger.error('Validation error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Convert string numbers to actual numbers for query parameters
      const query = { ...req.query };
      
      // Convert common numeric fields
      if (query.page) query.page = parseInt(query.page as string);
      if (query.limit) query.limit = parseInt(query.limit as string);
      if (query.minPrice) query.minPrice = parseFloat(query.minPrice as string);
      if (query.maxPrice) query.maxPrice = parseFloat(query.maxPrice as string);

      const validatedData = schema.parse(query);
      req.query = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          status: 'error',
          message: 'Query validation failed',
          errors
        });
      }

      logger.error('Query validation error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          status: 'error',
          message: 'Parameter validation failed',
          errors
        });
      }

      logger.error('Parameter validation error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };
};

// Validate file uploads
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }

  const files = req.files as Express.Multer.File[] || [req.file as Express.Multer.File];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  const maxFiles = 10;

  if (files.length > maxFiles) {
    return res.status(400).json({
      status: 'error',
      message: `Too many files. Maximum ${maxFiles} files allowed`
    });
  }

  for (const file of files) {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed'
      });
    }

    if (file.size > maxSize) {
      return res.status(400).json({
        status: 'error',
        message: 'File size too large. Maximum size is 10MB'
      });
    }
  }

  next();
};

// Sanitize input to prevent XSS
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeString = (str: string): string => {
    return str
      .replace(/[<>]/g, '') // Remove < and > characters
      .trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};