import { Logger } from './logger.js';

/**
 * Usage Recording Middleware
 * Tracks usage metrics for billing and analytics
 */

export const usageRecorder = (options = {}) => {
  const {
    recordQueries = false,
    recordTokens = false,
    recordStorage = false,
    recordApiCalls = false
  } = options;

  return async (req, res, next) => {
    const organization = req.organization;

    if (!organization) {
      return next();
    }

    // Store original end function
    const originalEnd = res.end;
    const startTime = Date.now();

    // Override res.end to capture response
    res.end = async function(...args) {
      // Restore original end
      res.end = originalEnd;

      try {
        const responseTime = Date.now() - startTime;
        const usage = {};

        // Record query execution
        if (recordQueries && res.statusCode === 200) {
          usage.queries = 1;
        }

        // Record token usage from response
        if (recordTokens && res.locals.tokensUsed) {
          usage.tokens = res.locals.tokensUsed;
        }

        // Record storage usage
        if (recordStorage && res.locals.storageMB) {
          usage.storageMB = res.locals.storageMB;
        }

        // Record API call
        if (recordApiCalls && req.authType === 'apikey') {
          usage.apiRequests = 1;
        }

        // Update organization usage
        if (Object.keys(usage).length > 0) {
          await organization.incrementUsage(usage);

          Logger.debug('Usage recorded', {
            organizationId: organization._id,
            usage,
            responseTime,
            endpoint: req.path
          });
        }

        // Log usage event for analytics
        logUsageEvent(req, res, {
          organizationId: organization._id,
          userId: req.user?._id,
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime,
          usage
        });

      } catch (error) {
        Logger.error('Usage recording failed', error);
        // Don't block the response
      }

      // Call original end
      return originalEnd.apply(res, args);
    };

    next();
  };
};

/**
 * Record query translation usage
 */
export const recordQueryTranslation = usageRecorder({
  recordQueries: true,
  recordTokens: true
});

/**
 * Record query execution usage
 */
export const recordQueryExecution = usageRecorder({
  recordQueries: true
});

/**
 * Record API usage
 */
export const recordApiUsage = usageRecorder({
  recordApiCalls: true
});

/**
 * Log usage event for analytics
 */
function logUsageEvent(req, res, data) {
  // This could send to an analytics service, log aggregator, or data warehouse
  const event = {
    timestamp: new Date(),
    type: 'usage',
    organizationId: data.organizationId,
    userId: data.userId,
    endpoint: data.endpoint,
    method: data.method,
    statusCode: data.statusCode,
    responseTime: data.responseTime,
    usage: data.usage,
    plan: req.organization?.plan,
    authType: req.authType || 'jwt',
    ip: req.ip,
    userAgent: req.headers['user-agent']
  };

  // Log to console (in production, send to analytics service)
  Logger.info('Usage event', event);

  // Could send to:
  // - Analytics service (Mixpanel, Amplitude)
  // - Data warehouse (BigQuery, Snowflake)
  // - Time-series DB (InfluxDB, TimescaleDB)
  // - Message queue (RabbitMQ, Kafka) for async processing
}

/**
 * Track feature usage
 */
export const trackFeature = (featureName) => {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        Logger.info('Feature used', {
          feature: featureName,
          organizationId: req.organization?._id,
          userId: req.user?._id,
          plan: req.organization?.plan
        });
      }
    });
    next();
  };
};

/**
 * Middleware to attach token count to response
 */
export const attachTokenUsage = (tokensUsed) => {
  return (req, res, next) => {
    res.locals.tokensUsed = tokensUsed;
    next();
  };
};

/**
 * Calculate and attach storage usage
 */
export const calculateStorageUsage = async (req, res, next) => {
  try {
    if (req.organization && req.body) {
      // Estimate storage from request/response size
      const requestSize = JSON.stringify(req.body).length;
      const storageMB = requestSize / (1024 * 1024);
      res.locals.storageMB = storageMB;
    }
  } catch (error) {
    // Don't block on errors
  }
  next();
};

/**
 * Usage summary middleware (attach current usage to response)
 */
export const attachUsageSummary = (req, res, next) => {
  if (req.organization) {
    res.locals.usageSummary = {
      plan: req.organization.plan,
      usage: req.organization.usage,
      limits: req.organization.limits,
      quotas: {
        queries: {
          used: req.organization.usage.queriesThisMonth,
          limit: req.organization.limits.queriesPerMonth,
          percentage: req.organization.limits.queriesPerMonth > 0
            ? (req.organization.usage.queriesThisMonth / req.organization.limits.queriesPerMonth * 100).toFixed(1)
            : 0
        },
        tokens: {
          used: req.organization.usage.tokensUsed,
          limit: req.organization.limits.tokensPerMonth,
          percentage: req.organization.limits.tokensPerMonth > 0
            ? (req.organization.usage.tokensUsed / req.organization.limits.tokensPerMonth * 100).toFixed(1)
            : 0
        }
      }
    };
  }
  next();
};

export default {
  usageRecorder,
  recordQueryTranslation,
  recordQueryExecution,
  recordApiUsage,
  trackFeature,
  attachTokenUsage,
  calculateStorageUsage,
  attachUsageSummary
};
