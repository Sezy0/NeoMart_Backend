import { createClient } from 'redis';
import { logger } from './logger';

// Connection status tracking
let isRedisConnected = false;
let redisClient: any = null;

// Function to create Redis client after environment is loaded
const createRedisClient = () => {
  if (redisClient) return redisClient;
  
  redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  return redisClient;
};

// Setup Redis event handlers
const setupRedisEventHandlers = (client: any) => {
  client.on('error', (err: any) => {
    logger.error('Redis Client Error:', err);
    isRedisConnected = false;
  });

  client.on('connect', () => {
    logger.info('Redis Client Connected');
    isRedisConnected = true;
  });

  client.on('ready', () => {
    logger.info('Redis Client Ready');
    isRedisConnected = true;
  });

  client.on('end', () => {
    logger.info('Redis Client Disconnected');
    isRedisConnected = false;
  });
};

// Connect to Redis
const connectRedis = async () => {
  try {
    if (!process.env.REDIS_URL) {
      logger.warn('Redis URL not configured. Running without Redis cache.');
      return;
    }

    // Create Redis client and setup event handlers
    const client = createRedisClient();
    setupRedisEventHandlers(client);
    
    await client.connect();
    isRedisConnected = true;
    logger.info('Connected to Redis cloud service');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    logger.warn('Application will continue without Redis cache functionality');
    isRedisConnected = false;
    // Don't exit process, allow app to run without Redis
  }
};

// Cache utility functions
export const cache = {
  async get(key: string): Promise<string | null> {
    try {
      if (!isRedisConnected || !redisClient) return null;
      return await redisClient.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  },

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      if (!isRedisConnected || !redisClient) return false;
      if (ttl) {
        await redisClient.setEx(key, ttl, value);
      } else {
        await redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  },

  async del(key: string): Promise<boolean> {
    try {
      if (!isRedisConnected) return false;
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      if (!isRedisConnected) return false;
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  },

  async incr(key: string): Promise<number> {
    try {
      if (!isRedisConnected) return 0;
      return await redisClient.incr(key);
    } catch (error) {
      logger.error('Redis INCR error:', error);
      return 0;
    }
  },

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (!isRedisConnected) return false;
      await redisClient.expire(key, seconds);
      return true;
    } catch (error) {
      logger.error('Redis EXPIRE error:', error);
      return false;
    }
  },

  async sadd(key: string, member: string): Promise<boolean> {
    try {
      if (!isRedisConnected) return false;
      await redisClient.sAdd(key, member);
      return true;
    } catch (error) {
      logger.error('Redis SADD error:', error);
      return false;
    }
  },

  async srem(key: string, member: string): Promise<boolean> {
    try {
      if (!isRedisConnected) return false;
      await redisClient.sRem(key, member);
      return true;
    } catch (error) {
      logger.error('Redis SREM error:', error);
      return false;
    }
  },

  async smembers(key: string): Promise<string[]> {
    try {
      if (!isRedisConnected) return [];
      return await redisClient.sMembers(key);
    } catch (error) {
      logger.error('Redis SMEMBERS error:', error);
      return [];
    }
  }
};

// Cache key generators
export const cacheKeys = {
  user: (id: string) => `user:${id}`,
  product: (id: string) => `product:${id}`,
  store: (id: string) => `store:${id}`,
  productsByCategory: (category: string, page: number) => 
    `products:category:${category}:page:${page}`,
  userCart: (userId: string) => `cart:${userId}`,
  otpAttempts: (email: string) => `otp_attempts:${email}`,
  session: (sessionId: string) => `session:${sessionId}`,
  userSessions: (userId: string) => `user_sessions:${userId}`,
  rateLimit: (endpoint: string, ip: string) => `rate_limit:${endpoint}:${ip}`
};

// TTL settings (in seconds)
export const cacheTTL = {
  user: 3600,        // 1 hour
  product: 7200,     // 2 hours  
  store: 3600,       // 1 hour
  productList: 1800, // 30 minutes
  cart: 86400,       // 24 hours
  otpAttempts: 900,  // 15 minutes
  session: 604800,   // 7 days
  rateLimit: 900     // 15 minutes
};

// Getter function for Redis client
const getRedisClient = () => {
  return redisClient || createRedisClient();
};

export { getRedisClient as redisClient, connectRedis, isRedisConnected };
