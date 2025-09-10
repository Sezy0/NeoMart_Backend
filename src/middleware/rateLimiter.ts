import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { cache, cacheKeys } from '@/config/redis';
import { logger } from '@/config/logger';

// General rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10'), // 10 attempts per window
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use email if provided in body, otherwise fall back to IP
    return req.body?.email || req.ip;
  },
});

// OTP rate limiter
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 OTP requests per window
  message: {
    status: 'error',
    message: 'Too many OTP requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.body?.email || req.ip;
  },
});

// Upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 uploads per minute
  message: {
    status: 'error',
    message: 'Too many upload requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Custom Redis-based rate limiter for more complex scenarios
export const createRedisRateLimiter = (
  windowMs: number,
  maxRequests: number,
  keyPrefix: string
) => {
  return async (req: Request, res: Response, next: Function) => {
    try {
      const identifier = req.body?.email || req.ip;
      const key = `${keyPrefix}:${identifier}`;
      const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
      const windowKey = `${key}:${windowStart}`;

      // Get current count
      const currentCount = await cache.get(windowKey);
      const count = currentCount ? parseInt(currentCount) : 0;

      if (count >= maxRequests) {
        const resetTime = windowStart + windowMs;
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(resetTime).toISOString(),
          'Retry-After': retryAfter.toString(),
        });

        return res.status(429).json({
          status: 'error',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter
        });
      }

      // Increment counter
      const newCount = await cache.incr(windowKey);
      
      // Set expiration if this is the first request in the window
      if (newCount === 1) {
        await cache.expire(windowKey, Math.ceil(windowMs / 1000));
      }

      // Set response headers
      const resetTime = windowStart + windowMs;
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - newCount).toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString(),
      });

      next();
    } catch (error) {
      logger.error('Redis rate limiter error:', error);
      // Fall back to allowing the request if Redis is unavailable
      next();
    }
  };
};

// OTP attempt limiter with Redis
export const otpAttemptLimiter = createRedisRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'otp_attempts'
);

// Login attempt limiter with Redis
export const loginAttemptLimiter = createRedisRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // 10 attempts
  'login_attempts'
);

// Password reset limiter
export const passwordResetLimiter = createRedisRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 attempts
  'password_reset'
);

// Store creation limiter (prevent spam store creation)
export const storeCreationLimiter = createRedisRateLimiter(
  24 * 60 * 60 * 1000, // 24 hours
  1, // 1 store per day per user
  'store_creation'
);

// Product creation limiter
export const productCreationLimiter = createRedisRateLimiter(
  60 * 60 * 1000, // 1 hour
  50, // 50 products per hour
  'product_creation'
);

// Order creation limiter
export const orderCreationLimiter = createRedisRateLimiter(
  60 * 1000, // 1 minute
  5, // 5 orders per minute
  'order_creation'
);