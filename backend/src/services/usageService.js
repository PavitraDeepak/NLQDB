import { Organization, AuditQuery } from '../models/index.js';
import { Logger } from '../middlewares/logger.js';

class UsageService {
  /**
   * Record query execution
   */
  async recordQueryExecution(organizationId, userId, queryData) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return;
      }

      await organization.incrementUsage({
        queries: 1,
        tokens: queryData.tokensUsed || 0
      });

      Logger.debug('Query usage recorded', {
        organizationId,
        userId,
        tokensUsed: queryData.tokensUsed
      });
    } catch (error) {
      Logger.error('Failed to record query execution', error);
    }
  }

  /**
   * Record API usage
   */
  async recordApiUsage(organizationId, apiKeyId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return;
      }

      await organization.incrementUsage({
        apiRequests: 1
      });
    } catch (error) {
      Logger.error('Failed to record API usage', error);
    }
  }

  /**
   * Get usage analytics
   */
  async getUsageAnalytics(organizationId, period = '30d') {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Get audit logs for analytics
      const queries = await AuditQuery.find({
        organizationId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).sort({ createdAt: 1 });

      // Aggregate by day
      const dailyUsage = this.aggregateByDay(queries, startDate, endDate);

      // Calculate totals
      const totals = {
        queries: queries.length,
        successfulQueries: queries.filter(q => q.success).length,
        failedQueries: queries.filter(q => !q.success).length,
        tokensUsed: queries.reduce((sum, q) => sum + (q.tokensUsed || 0), 0),
        avgResponseTime: queries.length > 0
          ? queries.reduce((sum, q) => sum + (q.executionTime || 0), 0) / queries.length
          : 0
      };

      return {
        period,
        startDate,
        endDate,
        totals,
        dailyUsage,
        currentUsage: organization.usage,
        limits: organization.limits
      };
    } catch (error) {
      Logger.error('Failed to get usage analytics', error);
      throw error;
    }
  }

  /**
   * Get usage breakdown by feature
   */
  async getUsageBreakdown(organizationId) {
    try {
      const queries = await AuditQuery.find({ organizationId })
        .limit(1000)
        .sort({ createdAt: -1 });

      // Group by collection
      const byCollection = {};
      queries.forEach(q => {
        const collection = q.mongoQuery?.collection || 'unknown';
        if (!byCollection[collection]) {
          byCollection[collection] = { count: 0, tokens: 0 };
        }
        byCollection[collection].count++;
        byCollection[collection].tokens += q.tokensUsed || 0;
      });

      // Group by user
      const byUser = {};
      queries.forEach(q => {
        const userId = q.userId?.toString() || 'unknown';
        if (!byUser[userId]) {
          byUser[userId] = { count: 0, tokens: 0 };
        }
        byUser[userId].count++;
        byUser[userId].tokens += q.tokensUsed || 0;
      });

      return {
        byCollection,
        byUser,
        totalQueries: queries.length
      };
    } catch (error) {
      Logger.error('Failed to get usage breakdown', error);
      throw error;
    }
  }

  /**
   * Reset monthly usage (scheduled job)
   */
  async resetMonthlyUsage() {
    try {
      const organizations = await Organization.find({
        status: 'active'
      });

      let resetCount = 0;
      for (const org of organizations) {
        const lastReset = org.usage.queriesLastReset;
        const now = new Date();
        
        // Reset if it's been more than a month
        if (this.shouldResetUsage(lastReset, now)) {
          await org.resetMonthlyUsage();
          resetCount++;
        }
      }

      Logger.info('Monthly usage reset completed', { count: resetCount });
      return resetCount;
    } catch (error) {
      Logger.error('Failed to reset monthly usage', error);
      throw error;
    }
  }

  /**
   * Check if usage should be reset
   */
  shouldResetUsage(lastReset, now) {
    const lastResetDate = new Date(lastReset);
    const daysSinceReset = (now - lastResetDate) / (1000 * 60 * 60 * 24);
    return daysSinceReset >= 30;
  }

  /**
   * Get quota status
   */
  async getQuotaStatus(organizationId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const usage = organization.usage;
      const limits = organization.limits;

      return {
        queries: {
          used: usage.queriesThisMonth,
          limit: limits.queriesPerMonth,
          remaining: Math.max(0, limits.queriesPerMonth - usage.queriesThisMonth),
          percentage: limits.queriesPerMonth > 0
            ? Math.round((usage.queriesThisMonth / limits.queriesPerMonth) * 100)
            : 0,
          exceeded: usage.queriesThisMonth >= limits.queriesPerMonth
        },
        tokens: {
          used: usage.tokensUsed,
          limit: limits.tokensPerMonth,
          remaining: Math.max(0, limits.tokensPerMonth - usage.tokensUsed),
          percentage: limits.tokensPerMonth > 0
            ? Math.round((usage.tokensUsed / limits.tokensPerMonth) * 100)
            : 0,
          exceeded: usage.tokensUsed >= limits.tokensPerMonth
        },
        storage: {
          used: usage.storageMB,
          limit: limits.storageLimitMB,
          remaining: Math.max(0, limits.storageLimitMB - usage.storageMB),
          percentage: limits.storageLimitMB > 0
            ? Math.round((usage.storageMB / limits.storageLimitMB) * 100)
            : 0,
          exceeded: usage.storageMB >= limits.storageLimitMB
        },
        resetDate: usage.queriesLastReset
      };
    } catch (error) {
      Logger.error('Failed to get quota status', error);
      throw error;
    }
  }

  /**
   * Aggregate queries by day
   */
  aggregateByDay(queries, startDate, endDate) {
    const days = {};
    const currentDate = new Date(startDate);

    // Initialize all days
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      days[dateKey] = {
        date: dateKey,
        queries: 0,
        tokens: 0,
        successful: 0,
        failed: 0
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate queries
    queries.forEach(query => {
      const dateKey = query.createdAt.toISOString().split('T')[0];
      if (days[dateKey]) {
        days[dateKey].queries++;
        days[dateKey].tokens += query.tokensUsed || 0;
        if (query.success) {
          days[dateKey].successful++;
        } else {
          days[dateKey].failed++;
        }
      }
    });

    return Object.values(days);
  }

  /**
   * Send usage alerts
   */
  async checkAndSendUsageAlerts() {
    try {
      const organizations = await Organization.find({
        status: 'active',
        plan: { $ne: 'enterprise' }
      });

      for (const org of organizations) {
        const quotas = await this.getQuotaStatus(org._id);

        // Check if any quota is above 80%
        const alerts = [];
        if (quotas.queries.percentage >= 80) {
          alerts.push({
            type: 'queries',
            percentage: quotas.queries.percentage,
            used: quotas.queries.used,
            limit: quotas.queries.limit
          });
        }

        if (quotas.tokens.percentage >= 80) {
          alerts.push({
            type: 'tokens',
            percentage: quotas.tokens.percentage,
            used: quotas.tokens.used,
            limit: quotas.tokens.limit
          });
        }

        // Send alerts if any
        if (alerts.length > 0) {
          Logger.warn('Usage alert triggered', {
            organizationId: org._id,
            alerts
          });
          // Could send email here
        }
      }
    } catch (error) {
      Logger.error('Failed to check usage alerts', error);
    }
  }

  /**
   * Record query translation (for chat service)
   */
  async recordQueryTranslation(organizationId, userId, tokensUsed = 0) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return;
      }

      await organization.incrementUsage({
        queries: 1,
        tokens: tokensUsed
      });

      Logger.debug('Query translation recorded', {
        organizationId,
        userId,
        tokensUsed
      });
    } catch (error) {
      Logger.error('Failed to record query translation', error);
    }
  }

  /**
   * Record query execution (for chat service)
   */
  async recordQueryExecution(organizationId, userId, rowCount = 0) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return;
      }

      await organization.incrementUsage({
        queries: 1
      });

      Logger.debug('Query execution recorded', {
        organizationId,
        userId,
        rowCount
      });
    } catch (error) {
      Logger.error('Failed to record query execution', error);
    }
  }
}

export default new UsageService();
