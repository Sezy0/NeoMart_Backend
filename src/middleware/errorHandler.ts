import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '@/config/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const errorHandler = (
  error: Error | AppError | Prisma.PrismaClientKnownRequestError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: any[] = [];

  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle different types of errors
  if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const target = error.meta?.target as string[];
        const field = target?.[0] || 'field';
        message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
        errors = [{ field, message: `This ${field} is already taken` }];
        break;
        
      case 'P2025':
        // Record not found
        statusCode = 404;
        message = 'Record not found';
        break;
        
      case 'P2003':
        // Foreign key constraint violation
        message = 'Invalid reference to related record';
        break;
        
      case 'P2014':
        // Required relation violation
        message = 'Required relation is missing';
        break;
        
      case 'P2021':
        // Table does not exist
        statusCode = 500;
        message = 'Database configuration error';
        break;
        
      case 'P2022':
        // Column does not exist
        statusCode = 500;
        message = 'Database schema error';
        break;
        
      default:
        message = 'Database operation failed';
        break;
    }
  } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = 500;
    message = 'Unknown database error occurred';
  } else if (error instanceof Prisma.PrismaClientRustPanicError) {
    statusCode = 500;
    message = 'Database connection error';
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 500;
    message = 'Database initialization error';
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid database query';
  } else if ((error as AppError).isOperational) {
    // Custom application errors
    statusCode = (error as AppError).statusCode || 500;
    message = error.message;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'NotBeforeError') {
    statusCode = 401;
    message = 'Token not active';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    switch ((error as any).code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = 'File upload error';
        break;
    }
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Something went wrong';
    errors = [];
  }

  const response: any = {
    status: 'error',
    message
  };

  if (errors.length > 0) {
    response.errors = errors;
  }

  // Add error details in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.details = {
      name: error.name,
      ...(error as any).meta
    };
  }

  res.status(statusCode).json(response);
};

// Handle 404 errors
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = createError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global unhandled promise rejection handler
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Close server & exit process
  process.exit(1);
});

// Global uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  // Close server & exit process
  process.exit(1);
});