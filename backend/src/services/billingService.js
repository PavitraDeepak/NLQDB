import Stripe from 'stripe';
import { Organization, Subscription, User } from '../models/index.js';
import { Logger } from '../middlewares/logger.js';
import EmailService from './emailService.js';

// Initialize Stripe only if API key is provided
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

class BillingService {
  constructor() {
    this.plans = {
      free: {
        name: 'Free',
        price: 0,
        currency: 'usd',
        interval: 'month',
        priceId: null, // No Stripe price for free
        features: {
          queriesPerMonth: 100,
          tokensPerMonth: 50000,
          maxTeamMembers: 3,
          maxApiKeys: 2,
          storageLimitMB: 100
        }
      },
      pro: {
        name: 'Pro',
        price: 1900, // $19.00 in cents
        currency: 'usd',
        interval: 'month',
        priceId: process.env.STRIPE_PRO_PRICE_ID,
        features: {
          queriesPerMonth: 5000,
          tokensPerMonth: 5000000,
          maxTeamMembers: 10,
          maxApiKeys: 10,
          storageLimitMB: 5000
        }
      },
      enterprise: {
        name: 'Enterprise',
        price: null, // Custom pricing
        currency: 'usd',
        interval: 'month',
        priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        features: {
          queriesPerMonth: -1, // unlimited
          tokensPerMonth: -1,
          maxTeamMembers: -1,
          maxApiKeys: -1,
          storageLimitMB: -1
        }
      }
    };
  }

  /**
   * Create Stripe customer for organization
   */
  async createCustomer(organization, user) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: organization.name,
        metadata: {
          organizationId: organization._id.toString(),
          userId: user._id.toString()
        }
      });

      organization.stripeCustomerId = customer.id;
      await organization.save();

      Logger.info('Stripe customer created', {
        customerId: customer.id,
        organizationId: organization._id
      });

      return customer;
    } catch (error) {
      Logger.error('Failed to create Stripe customer', error);
      throw error;
    }
  }

  /**
   * Create checkout session for new subscription
   */
  async createCheckoutSession(organization, user, plan, options = {}) {
    try {
      const { successUrl, cancelUrl, trialDays = 14 } = options;

      // Ensure customer exists
      let customerId = organization.stripeCustomerId;
      if (!customerId) {
        const customer = await this.createCustomer(organization, user);
        customerId = customer.id;
      }

      const planConfig = this.plans[plan];
      if (!planConfig || !planConfig.priceId) {
        throw new Error('Invalid plan or plan not configured');
      }

      const sessionConfig = {
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: planConfig.priceId,
            quantity: 1
          }
        ],
        success_url: successUrl || `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/billing/canceled`,
        metadata: {
          organizationId: organization._id.toString(),
          userId: user._id.toString(),
          plan
        },
        subscription_data: {
          metadata: {
            organizationId: organization._id.toString(),
            plan
          }
        }
      };

      // Add trial if specified
      if (trialDays > 0) {
        sessionConfig.subscription_data.trial_period_days = trialDays;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      Logger.info('Checkout session created', {
        sessionId: session.id,
        organizationId: organization._id,
        plan
      });

      return session;
    } catch (error) {
      Logger.error('Failed to create checkout session', error);
      throw error;
    }
  }

  /**
   * Create portal session for managing subscription
   */
  async createPortalSession(organization, returnUrl) {
    try {
      if (!organization.stripeCustomerId) {
        throw new Error('No Stripe customer ID found');
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: organization.stripeCustomerId,
        return_url: returnUrl || `${process.env.FRONTEND_URL}/billing`
      });

      return session;
    } catch (error) {
      Logger.error('Failed to create portal session', error);
      throw error;
    }
  }

  /**
   * Handle subscription created webhook
   */
  async handleSubscriptionCreated(stripeSubscription) {
    try {
      const organizationId = stripeSubscription.metadata.organizationId;
      const plan = stripeSubscription.metadata.plan || 'pro';

      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Create subscription record
      const subscription = new Subscription({
        organizationId: organization._id,
        plan,
        status: stripeSubscription.status,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0].price.id,
        stripeCustomerId: stripeSubscription.customer,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        amount: stripeSubscription.items.data[0].price.unit_amount,
        currency: stripeSubscription.currency,
        interval: stripeSubscription.items.data[0].price.recurring.interval,
        trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
        history: [{
          action: 'created',
          toPlan: plan,
          timestamp: new Date()
        }]
      });

      await subscription.save();

      // Update organization
      organization.plan = plan;
      organization.planStatus = stripeSubscription.status;
      organization.stripeSubscriptionId = stripeSubscription.id;
      organization.subscriptionStartDate = new Date();
      organization.trialEndsAt = subscription.trialEnd;
      await organization.updatePlan(plan);

      Logger.info('Subscription created', {
        subscriptionId: subscription._id,
        organizationId: organization._id,
        plan
      });

      // Send email
      const owner = await User.findById(organization.ownerUserId);
      if (owner) {
        await EmailService.sendSubscriptionConfirmation(owner, organization, plan);
      }

      return subscription;
    } catch (error) {
      Logger.error('Failed to handle subscription created', error);
      throw error;
    }
  }

  /**
   * Handle subscription updated webhook
   */
  async handleSubscriptionUpdated(stripeSubscription) {
    try {
      const subscription = await Subscription.findByStripeId(stripeSubscription.id);
      if (!subscription) {
        Logger.warn('Subscription not found for update', { stripeId: stripeSubscription.id });
        return;
      }

      const organization = await Organization.findById(subscription.organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Update subscription
      const oldStatus = subscription.status;
      subscription.status = stripeSubscription.status;
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;

      if (stripeSubscription.canceled_at) {
        subscription.canceledAt = new Date(stripeSubscription.canceled_at * 1000);
      }

      subscription.history.push({
        action: 'updated',
        timestamp: new Date(),
        metadata: { oldStatus, newStatus: stripeSubscription.status }
      });

      await subscription.save();

      // Update organization
      organization.planStatus = stripeSubscription.status;
      await organization.save();

      Logger.info('Subscription updated', {
        subscriptionId: subscription._id,
        oldStatus,
        newStatus: stripeSubscription.status
      });

      // Send email if status changed significantly
      if (oldStatus !== stripeSubscription.status) {
        const owner = await User.findById(organization.ownerUserId);
        if (owner && ['past_due', 'canceled', 'unpaid'].includes(stripeSubscription.status)) {
          await EmailService.sendSubscriptionAlert(owner, organization, stripeSubscription.status);
        }
      }
    } catch (error) {
      Logger.error('Failed to handle subscription updated', error);
      throw error;
    }
  }

  /**
   * Handle subscription deleted webhook
   */
  async handleSubscriptionDeleted(stripeSubscription) {
    try {
      const subscription = await Subscription.findByStripeId(stripeSubscription.id);
      if (!subscription) {
        return;
      }

      const organization = await Organization.findById(subscription.organizationId);
      if (!organization) {
        return;
      }

      // Update subscription
      subscription.status = 'canceled';
      subscription.endedAt = new Date();
      subscription.history.push({
        action: 'canceled',
        timestamp: new Date()
      });
      await subscription.save();

      // Downgrade organization to free
      organization.plan = 'free';
      organization.planStatus = 'canceled';
      organization.stripeSubscriptionId = null;
      await organization.updatePlan('free');

      Logger.info('Subscription deleted', {
        subscriptionId: subscription._id,
        organizationId: organization._id
      });

      // Send email
      const owner = await User.findById(organization.ownerUserId);
      if (owner) {
        await EmailService.sendSubscriptionCanceled(owner, organization);
      }
    } catch (error) {
      Logger.error('Failed to handle subscription deleted', error);
      throw error;
    }
  }

  /**
   * Handle invoice paid webhook
   */
  async handleInvoicePaid(invoice) {
    try {
      const subscription = await Subscription.findByStripeId(invoice.subscription);
      if (!subscription) {
        return;
      }

      Logger.info('Invoice paid', {
        invoiceId: invoice.id,
        subscriptionId: subscription._id,
        amount: invoice.amount_paid
      });

      // Update subscription status to active
      if (subscription.status !== 'active') {
        subscription.status = 'active';
        await subscription.save();

        const organization = await Organization.findById(subscription.organizationId);
        if (organization) {
          organization.planStatus = 'active';
          await organization.save();
        }
      }

      // Send receipt email
      const organization = await Organization.findById(subscription.organizationId);
      const owner = await User.findById(organization.ownerUserId);
      if (owner) {
        await EmailService.sendInvoiceReceipt(owner, organization, invoice);
      }
    } catch (error) {
      Logger.error('Failed to handle invoice paid', error);
      throw error;
    }
  }

  /**
   * Handle invoice payment failed webhook
   */
  async handleInvoicePaymentFailed(invoice) {
    try {
      const subscription = await Subscription.findByStripeId(invoice.subscription);
      if (!subscription) {
        return;
      }

      const organization = await Organization.findById(subscription.organizationId);
      if (!organization) {
        return;
      }

      // Update status
      organization.planStatus = 'past_due';
      await organization.save();

      Logger.warn('Invoice payment failed', {
        invoiceId: invoice.id,
        subscriptionId: subscription._id,
        organizationId: organization._id
      });

      // Send alert email
      const owner = await User.findById(organization.ownerUserId);
      if (owner) {
        await EmailService.sendPaymentFailed(owner, organization, invoice);
      }
    } catch (error) {
      Logger.error('Failed to handle invoice payment failed', error);
      throw error;
    }
  }

  /**
   * Get plan details
   */
  getPlanDetails(planName) {
    return this.plans[planName] || null;
  }

  /**
   * Get all plans
   */
  getAllPlans() {
    return this.plans;
  }

  /**
   * Calculate overage charges (for Pro plan)
   */
  calculateOverage(organization) {
    if (organization.plan !== 'pro') {
      return 0;
    }

    const queriesOver = Math.max(0, organization.usage.queriesThisMonth - organization.limits.queriesPerMonth);
    const overageRate = 0.002; // $0.002 per query
    return queriesOver * overageRate * 100; // in cents
  }
}

export default new BillingService();
