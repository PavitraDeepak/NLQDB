import { Logger } from './logger.js';

/**
 * Plan Limiter Middleware
 * Enforces subscription plan limits on API requests
 */

export const planLimiter = (options = {}) => {
  const {
    feature = 'general',
    requirePlan = null
  } = options;

  return async (req, res, next) => {
    try {
      const organization = req.organization;

      if (!organization) {
        return res.status(403).json({
          success: false,
          error: 'Organization context required'
        });
      }

      // Skip checks for enterprise plans
      if (organization.plan === 'enterprise') {
        return next();
      }

      // Check if feature requires specific plan
      if (requirePlan) {
        const planHierarchy = { free: 0, pro: 1, enterprise: 2 };
        const currentPlanLevel = planHierarchy[organization.plan] || 0;
        const requiredPlanLevel = planHierarchy[requirePlan] || 0;

        if (currentPlanLevel < requiredPlanLevel) {
          return res.status(402).json({
            success: false,
            error: `This feature requires a ${requirePlan} plan or higher`,
            currentPlan: organization.plan,
            requiredPlan: requirePlan,
            upgradeUrl: `/billing/upgrade`
          });
        }
      }

      // Check specific feature limits
      switch (feature) {
        case 'query':
          if (!organization.canExecuteQuery()) {
            return res.status(429).json({
              success: false,
              error: 'Query limit exceeded for this month',
              usage: {
                used: organization.usage.queriesThisMonth,
                limit: organization.limits.queriesPerMonth
              },
              upgradeUrl: `/billing/upgrade`
            });
          }
          break;

        case 'tokens':
          const estimatedTokens = req.body.estimatedTokens || 1000;
          if (!organization.canUseTokens(estimatedTokens)) {
            return res.status(429).json({
              success: false,
              error: 'Token limit exceeded for this month',
              usage: {
                used: organization.usage.tokensUsed,
                limit: organization.limits.tokensPerMonth,
                estimated: estimatedTokens
              },
              upgradeUrl: `/billing/upgrade`
            });
          }
          break;

        case 'api':
          const apiLimit = organization.limits.maxApiKeys || 2;
          if (req.body.createApiKey && organization.apiKeys?.length >= apiLimit) {
            return res.status(429).json({
              success: false,
              error: `API key limit reached (${apiLimit} keys)`,
              upgradeUrl: `/billing/upgrade`
            });
          }
          break;

        case 'team':
          const teamLimit = organization.limits.maxTeamMembers || 3;
          if (req.body.inviteUser) {
            const currentTeamSize = await req.db.User.countDocuments({
              organizationId: organization._id,
              isActive: true
            });
            if (currentTeamSize >= teamLimit) {
              return res.status(429).json({
                success: false,
                error: `Team member limit reached (${teamLimit} members)`,
                upgradeUrl: `/billing/upgrade`
              });
            }
          }
          break;

        case 'storage':
          if (organization.usage.storageMB >= organization.limits.storageLimitMB) {
            return res.status(429).json({
              success: false,
              error: 'Storage limit exceeded',
              usage: {
                used: organization.usage.storageMB,
                limit: organization.limits.storageLimitMB
              },
              upgradeUrl: `/billing/upgrade`
            });
          }
          break;
      }

      Logger.debug('Plan limit check passed', {
        organizationId: organization._id,
        feature,
        plan: organization.plan
      });

      next();
    } catch (error) {
      Logger.error('Plan limiter error', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify plan limits'
      });
    }
  };
};

/**
 * Check if organization has active subscription
 */
export const requireActiveSubscription = (req, res, next) => {
  const organization = req.organization;

  if (!organization) {
    return res.status(403).json({
      success: false,
      error: 'No organization context'
    });
  }

  const activeStatuses = ['active', 'trialing'];
  if (!activeStatuses.includes(organization.planStatus)) {
    return res.status(402).json({
      success: false,
      error: 'Active subscription required',
      planStatus: organization.planStatus,
      upgradeUrl: `/billing/subscribe`
    });
  }

  next();
};

/**
 * Check usage quota before processing
 */
export const checkQuota = (resourceType) => {
  return async (req, res, next) => {
    const organization = req.organization;

    if (!organization || organization.plan === 'enterprise') {
      return next();
    }

    let exceeded = false;
    let message = '';

    switch (resourceType) {
      case 'queries':
        if (organization.usage.queriesThisMonth >= organization.limits.queriesPerMonth) {
          exceeded = true;
          message = 'Monthly query quota exceeded';
        }
        break;
      case 'tokens':
        if (organization.usage.tokensUsed >= organization.limits.tokensPerMonth) {
          exceeded = true;
          message = 'Monthly token quota exceeded';
        }
        break;
      case 'storage':
        if (organization.usage.storageMB >= organization.limits.storageLimitMB) {
          exceeded = true;
          message = 'Storage quota exceeded';
        }
        break;
    }

    if (exceeded) {
      return res.status(429).json({
        success: false,
        error: message,
        quota: {
          type: resourceType,
          used: organization.usage[`${resourceType}ThisMonth`] || organization.usage[resourceType],
          limit: organization.limits[`${resourceType}PerMonth`] || organization.limits[`${resourceType}LimitMB`]
        }
      });
    }

    next();
  };
};

export default {
  planLimiter,
  requireActiveSubscription,
  checkQuota
};
