import rateLimit from 'express-rate-limit';
import { createClient } from 'redis';

let redisClient = null;

// Initialize Redis client if enabled
if (process.env.REDIS_ENABLED === 'true' && process.env.REDIS_URL) {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
      redisClient = null;
    });

    await redisClient.connect();
    console.log('Redis connected for rate limiting');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    redisClient = null;
  }
}

// Redis store for rate limiter
class RedisStore {
  constructor(client) {
    this.client = client;
    this.prefix = 'rl:';
  }

  async increment(key) {
    const fullKey = this.prefix + key;
    const current = await this.client.incr(fullKey);
    
    if (current === 1) {
      await this.client.expire(fullKey, 900); // 15 minutes
    }
    
    return {
      totalHits: current,
      resetTime: new Date(Date.now() + 900000)
    };
  }

  async decrement(key) {
    const fullKey = this.prefix + key;
    await this.client.decr(fullKey);
  }

  async resetKey(key) {
    const fullKey = this.prefix + key;
    await this.client.del(fullKey);
  }
}

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore(redisClient) : undefined,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore(redisClient) : undefined
});

// Rate limiter for query execution (more strict)
export const queryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 queries per minute
  message: {
    success: false,
    error: 'Query rate limit exceeded. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore(redisClient) : undefined,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for admins
    return req.user?.role === 'admin';
  }
});

// Per-user daily query limit
export const dailyQueryLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: (req) => {
    // Different limits based on role
    if (req.user?.role === 'admin') return 10000;
    if (req.user?.role === 'analyst') return 1000;
    return 100; // viewer
  },
  message: {
    success: false,
    error: 'Daily query limit exceeded for your role.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore(redisClient) : undefined,
  keyGenerator: (req) => {
    return `daily:${req.user?.id || req.ip}`;
  }
});

export { redisClient };
