// Load environment variables FIRST before any imports
import dotenv from 'dotenv';
dotenv.config();

import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectRedis } from '@/config/redis';
import { logger } from '@/config/logger';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { generalLimiter } from '@/middleware/rateLimiter';
import { sanitizeInput } from '@/middleware/validation';

// Import routes
import authRoutes from '@/routes/auth.routes';
import userRoutes from '@/routes/user.routes';
import storeRoutes from '@/routes/store.routes';
import productRoutes from '@/routes/product.routes';
import orderRoutes from '@/routes/order.routes';
import uploadRoutes from '@/routes/upload.routes';
import otpRoutes from '@/routes/otp.routes';

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'NeoMart API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/otp', otpRoutes);

// API documentation
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/docs', (req, res) => {
    res.json({
      status: 'success',
      message: 'NeoMart API Documentation',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        stores: '/api/stores',
        products: '/api/products',
        orders: '/api/orders',
        upload: '/api/upload',
        otp: '/api/otp',
      },
      documentation: 'https://github.com/Sezy0/NeoMart_Backend/blob/main/README.md'
    });
  });
}

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to Redis
    await connectRedis();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 NeoMart API server running on port ${PORT}`);
      logger.info(`📚 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🌐 CORS Origin: ${process.env.CORS_ORIGIN}`);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
        logger.info(`❤️  Health Check: http://localhost:${PORT}/health`);
      }
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Close database connections
          const { prisma } = await import('@/config/database');
          await prisma.$disconnect();
          logger.info('Database connections closed');
          
          // Close Redis connection
          const { redisClient } = await import('@/config/redis');
          await redisClient.quit();
          logger.info('Redis connection closed');
          
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;