import { Logger } from './logger.js';
import { ApiKey } from '../models/index.js';

/**
 * API Key Authentication Middleware
 * Authenticates requests using HMAC-signed API keys
 */

export const apiKeyAuth = async (req, res, next) => {
  try {
    // Check for API key in headers
    const apiKeyHeader = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKeyHeader) {
      return res.status(401).json({
        success: false,
        error: 'API key required. Include X-API-Key header.'
      });
    }

    // Validate API key format
    if (!apiKeyHeader.startsWith('nlqdb_')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key format'
      });
    }

    // Find API key
    const apiKey = await ApiKey.findByKey(apiKeyHeader);

    if (!apiKey) {
      Logger.warn('Invalid API key attempt', {
        keyPrefix: apiKeyHeader.substring(0, 20),
        ip: req.ip
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid or expired API key'
      });
    }

    // Check if key is expired
    if (apiKey.isExpired()) {
      return res.status(401).json({
        success: false,
        error: 'API key has expired'
      });
    }

    // Check organization status
    const organization = apiKey.organizationId;
    if (!organization || organization.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Organization is not active'
      });
    }

    // Record usage
    await apiKey.recordUsage(req.ip);
    await organization.incrementUsage({ apiRequests: 1 });

    // Attach to request
    req.apiKey = apiKey;
    req.organization = organization;
    req.authType = 'apikey';
    req.user = {
      organizationId: organization._id,
      role: 'api',
      _id: apiKey.userId
    };

    Logger.debug('API key authenticated', {
      keyId: apiKey._id,
      organizationId: organization._id
    });

    next();
  } catch (error) {
    Logger.error('API key authentication failed', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Check API key permissions
 */
export const requireApiPermission = (permission) => {
  return (req, res, next) => {
    if (req.authType !== 'apikey') {
      return next(); // Not an API key request
    }

    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    if (!req.apiKey.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        error: `API key does not have permission: ${permission}`
      });
    }

    next();
  };
};

/**
 * API Rate Limiter (per API key)
 */
export const apiKeyRateLimit = async (req, res, next) => {
  if (req.authType !== 'apikey' || !req.apiKey) {
    return next();
  }

  try {
    const apiKey = req.apiKey;
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check rate limits (simplified - in production use Redis)
    const recentRequests = apiKey.usage.totalRequests || 0;
    const rateLimit = apiKey.rateLimit || { requestsPerMinute: 60, requestsPerDay: 1000 };

    // This is a simple check - real implementation should track time windows
    if (recentRequests > rateLimit.requestsPerDay) {
      return res.status(429).json({
        success: false,
        error: 'API key rate limit exceeded',
        limits: {
          perMinute: rateLimit.requestsPerMinute,
          perDay: rateLimit.requestsPerDay
        }
      });
    }

    next();
  } catch (error) {
    Logger.error('API rate limit check failed', error);
    next(); // Don't block on rate limit errors
  }
};

/**
 * Dual authentication - support both JWT and API keys
 */
export const authenticateRequest = async (req, res, next) => {
  // Check for API key first
  const apiKeyHeader = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];

  if (apiKeyHeader || (authHeader && authHeader.startsWith('nlqdb_'))) {
    return apiKeyAuth(req, res, next);
  }

  // Fall back to JWT authentication
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Use existing JWT middleware
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Authentication required. Provide JWT token or API key.'
  });
};

export default {
  apiKeyAuth,
  requireApiPermission,
  apiKeyRateLimit,
  authenticateRequest
};
