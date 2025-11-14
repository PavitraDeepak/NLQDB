import { Organization, Subscription } from '../models/index.js';
import { Logger } from '../middlewares/logger.js';
import BillingService from './billingService.js';

class PlanService {
  constructor() {
    this.plans = {
      free: {
        name: 'Free',
        price: 0,
        limits: {
          queriesPerMonth: 100,
          tokensPerMonth: 50000,
          maxTeamMembers: 3,
          maxApiKeys: 2,
          storageLimitMB: 100
        },
        features: [
          '100 queries per month',
          '50k tokens per month',
          'Up to 3 team members',
          '2 API keys',
          'Community support',
          'Basic analytics'
        ]
      },
      pro: {
        name: 'Pro',
        price: 19,
        limits: {
          queriesPerMonth: 5000,
          tokensPerMonth: 5000000,
          maxTeamMembers: 10,
          maxApiKeys: 10,
          storageLimitMB: 5000
        },
        features: [
          '5,000 queries per month',
          '5M tokens per month',
          'Up to 10 team members',
          '10 API keys',
          'Priority support',
          'Advanced analytics',
          'Custom integrations',
          'Overage billing ($0.002/query)'
        ]
      },
      enterprise: {
        name: 'Enterprise',
        price: null,
        limits: {
          queriesPerMonth: -1,
          tokensPerMonth: -1,
          maxTeamMembers: -1,
          maxApiKeys: -1,
          storageLimitMB: -1
        },
        features: [
          'Unlimited queries',
          'Unlimited tokens',
          'Unlimited team members',
          'Unlimited API keys',
          'Dedicated support',
          'Custom analytics',
          'Custom integrations',
          'SLA guarantee',
          'SOC 2 compliance',
          'Custom contracts',
          'Dedicated infrastructure'
        ]
      }
    };
  }

  /**
   * Get all available plans
   */
  getAllPlans() {
    return this.plans;
  }

  /**
   * Get plan details
   */
  getPlan(planName) {
    return this.plans[planName] || null;
  }

  /**
   * Compare plans
   */
  comparePlans() {
    return Object.entries(this.plans).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      price: plan.price,
      limits: plan.limits,
      features: plan.features
    }));
  }

  /**
   * Upgrade organization plan
   */
  async upgradePlan(organizationId, userId, newPlan) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const currentPlan = organization.plan;
      
      // Check if it's actually an upgrade
      const planHierarchy = { free: 0, pro: 1, enterprise: 2 };
      if (planHierarchy[newPlan] <= planHierarchy[currentPlan]) {
        throw new Error('This is not an upgrade');
      }

      // For Pro plan, create Stripe subscription
      if (newPlan === 'pro') {
        const user = await organization.populate('ownerUserId');
        const session = await BillingService.createCheckoutSession(
          organization,
          user.ownerUserId,
          newPlan
        );

        return {
          requiresPayment: true,
          checkoutUrl: session.url,
          sessionId: session.id
        };
      }

      // For Enterprise, requires manual process
      if (newPlan === 'enterprise') {
        return {
          requiresContact: true,
          message: 'Please contact our sales team for Enterprise pricing',
          contactEmail: process.env.SUPPORT_EMAIL || 'sales@nlqdb.com'
        };
      }

      Logger.info('Plan upgrade initiated', {
        organizationId,
        from: currentPlan,
        to: newPlan,
        userId
      });

      return { success: true };
    } catch (error) {
      Logger.error('Failed to upgrade plan', error);
      throw error;
    }
  }

  /**
   * Downgrade organization plan
   */
  async downgradePlan(organizationId, userId, newPlan) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const currentPlan = organization.plan;

      // Check if it's actually a downgrade
      const planHierarchy = { free: 0, pro: 1, enterprise: 2 };
      if (planHierarchy[newPlan] >= planHierarchy[currentPlan]) {
        throw new Error('This is not a downgrade');
      }

      // Check if current usage fits in new plan
      const newPlanLimits = this.plans[newPlan].limits;
      const warnings = [];

      if (organization.usage.queriesThisMonth > newPlanLimits.queriesPerMonth) {
        warnings.push(`Current query usage (${organization.usage.queriesThisMonth}) exceeds new limit (${newPlanLimits.queriesPerMonth})`);
      }

      const teamSize = await organization.constructor.aggregate([
        { $match: { _id: organization._id } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: 'organizationId',
            as: 'members'
          }
        },
        { $project: { teamSize: { $size: '$members' } } }
      ]);

      if (teamSize[0]?.teamSize > newPlanLimits.maxTeamMembers) {
        warnings.push(`Current team size (${teamSize[0].teamSize}) exceeds new limit (${newPlanLimits.maxTeamMembers})`);
      }

      if (warnings.length > 0) {
        return {
          canDowngrade: false,
          warnings,
          message: 'Please reduce usage before downgrading'
        };
      }

      // Cancel Stripe subscription if exists
      if (organization.stripeSubscriptionId) {
        const subscription = await Subscription.findByStripeId(organization.stripeSubscriptionId);
        if (subscription) {
          await subscription.cancel(false); // Cancel at period end
        }
      }

      // Update organization
      organization.plan = newPlan;
      await organization.updatePlan(newPlan);

      Logger.info('Plan downgraded', {
        organizationId,
        from: currentPlan,
        to: newPlan,
        userId
      });

      return {
        success: true,
        message: 'Plan will be downgraded at the end of billing period',
        effectiveDate: organization.subscriptionEndDate
      };
    } catch (error) {
      Logger.error('Failed to downgrade plan', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(organizationId, userId, immediately = false) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      if (organization.plan === 'free') {
        throw new Error('Free plan cannot be canceled');
      }

      if (organization.stripeSubscriptionId) {
        const subscription = await Subscription.findByStripeId(organization.stripeSubscriptionId);
        if (subscription) {
          await subscription.cancel(immediately);
        }
      }

      if (immediately) {
        organization.plan = 'free';
        organization.planStatus = 'canceled';
        await organization.updatePlan('free');
      } else {
        organization.planStatus = 'canceled';
        await organization.save();
      }

      Logger.info('Subscription canceled', {
        organizationId,
        immediately,
        userId
      });

      return {
        success: true,
        message: immediately
          ? 'Subscription canceled immediately'
          : 'Subscription will be canceled at period end',
        effectiveDate: immediately ? new Date() : organization.subscriptionEndDate
      };
    } catch (error) {
      Logger.error('Failed to cancel subscription', error);
      throw error;
    }
  }

  /**
   * Reactivate canceled subscription
   */
  async reactivateSubscription(organizationId, userId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      if (organization.planStatus !== 'canceled') {
        throw new Error('Subscription is not canceled');
      }

      // Reactivate via Stripe
      if (organization.stripeSubscriptionId) {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.update(organization.stripeSubscriptionId, {
          cancel_at_period_end: false
        });
      }

      organization.planStatus = 'active';
      await organization.save();

      Logger.info('Subscription reactivated', {
        organizationId,
        userId
      });

      return {
        success: true,
        message: 'Subscription reactivated successfully'
      };
    } catch (error) {
      Logger.error('Failed to reactivate subscription', error);
      throw error;
    }
  }

  /**
   * Get recommended plan based on usage
   */
  async getRecommendedPlan(organizationId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const usage = organization.usage;
      const currentPlan = organization.plan;

      // Calculate average monthly usage
      const avgQueries = usage.queriesThisMonth;
      const avgTokens = usage.tokensUsed;

      let recommendedPlan = 'free';
      let reasons = [];

      // Check if Pro is needed
      if (avgQueries > this.plans.free.limits.queriesPerMonth ||
          avgTokens > this.plans.free.limits.tokensPerMonth) {
        recommendedPlan = 'pro';
        reasons.push('Current usage exceeds Free plan limits');
      }

      // Check if Enterprise is needed
      if (avgQueries > this.plans.pro.limits.queriesPerMonth ||
          avgTokens > this.plans.pro.limits.tokensPerMonth) {
        recommendedPlan = 'enterprise';
        reasons.push('High usage volume detected');
      }

      const teamSize = await organization.constructor.aggregate([
        { $match: { _id: organization._id } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: 'organizationId',
            as: 'members'
          }
        },
        { $project: { teamSize: { $size: '$members' } } }
      ]);

      if (teamSize[0]?.teamSize > this.plans[currentPlan].limits.maxTeamMembers) {
        if (recommendedPlan === 'free') recommendedPlan = 'pro';
        reasons.push('Team size exceeds current plan limit');
      }

      return {
        currentPlan,
        recommendedPlan,
        shouldUpgrade: recommendedPlan !== currentPlan,
        reasons,
        usage: {
          queries: avgQueries,
          tokens: avgTokens,
          teamSize: teamSize[0]?.teamSize || 0
        }
      };
    } catch (error) {
      Logger.error('Failed to get recommended plan', error);
      throw error;
    }
  }

  /**
   * Calculate estimated cost for usage
   */
  calculateEstimatedCost(queries, plan = 'pro') {
    const planConfig = this.plans[plan];
    if (!planConfig || plan === 'enterprise') {
      return null;
    }

    let cost = planConfig.price || 0;

    // Add overage costs for Pro plan
    if (plan === 'pro' && queries > planConfig.limits.queriesPerMonth) {
      const overage = queries - planConfig.limits.queriesPerMonth;
      const overageCost = overage * 0.002; // $0.002 per query
      cost += overageCost;
    }

    return {
      baseCost: planConfig.price,
      overageCost: cost - (planConfig.price || 0),
      totalCost: cost,
      currency: 'USD'
    };
  }
}

export default new PlanService();
