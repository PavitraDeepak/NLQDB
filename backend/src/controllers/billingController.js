import billingService from '../services/billingService.js';
import planService from '../services/planService.js';
import { Organization, Subscription } from '../models/index.js';
import { Logger } from '../middlewares/logger.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create checkout session
 * POST /api/billing/checkout
 */
export const createCheckoutSession = async (req, res) => {
  try {
    const { plan, successUrl, cancelUrl } = req.body;
    const organization = req.organization;
    const user = req.user;

    const session = await billingService.createCheckoutSession(
      organization,
      user,
      plan,
      { successUrl, cancelUrl }
    );

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    Logger.error('Create checkout session failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create checkout session'
    });
  }
};

/**
 * Create portal session
 * POST /api/billing/portal
 */
export const createPortalSession = async (req, res) => {
  try {
    const { returnUrl } = req.body;
    const organization = req.organization;

    const session = await billingService.createPortalSession(organization, returnUrl);

    res.json({
      success: true,
      data: {
        url: session.url
      }
    });
  } catch (error) {
    Logger.error('Create portal session failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create portal session'
    });
  }
};

/**
 * Get current subscription
 * GET /api/billing/subscription
 */
export const getCurrentSubscription = async (req, res) => {
  try {
    const organizationId = req.organization._id;

    const subscription = await Subscription.findActiveByOrganization(organizationId);

    if (!subscription) {
      return res.json({
        success: true,
        data: null,
        message: 'No active subscription'
      });
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    Logger.error('Get subscription failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription'
    });
  }
};

/**
 * Get all plans
 * GET /api/billing/plans
 */
export const getPlans = async (req, res) => {
  try {
    const plans = planService.comparePlans();

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    Logger.error('Get plans failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get plans'
    });
  }
};

/**
 * Upgrade plan
 * POST /api/billing/upgrade
 */
export const upgradePlan = async (req, res) => {
  try {
    const { plan } = req.body;
    const organizationId = req.organization._id;
    const userId = req.user._id;

    const result = await planService.upgradePlan(organizationId, userId, plan);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    Logger.error('Upgrade plan failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upgrade plan'
    });
  }
};

/**
 * Cancel subscription
 * POST /api/billing/cancel
 */
export const cancelSubscription = async (req, res) => {
  try {
    const { immediately } = req.body;
    const organizationId = req.organization._id;
    const userId = req.user._id;

    const result = await planService.cancelSubscription(organizationId, userId, immediately);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    Logger.error('Cancel subscription failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel subscription'
    });
  }
};

/**
 * Reactivate subscription
 * POST /api/billing/reactivate
 */
export const reactivateSubscription = async (req, res) => {
  try {
    const organizationId = req.organization._id;
    const userId = req.user._id;

    const result = await planService.reactivateSubscription(organizationId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    Logger.error('Reactivate subscription failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reactivate subscription'
    });
  }
};

/**
 * Stripe webhook handler
 * POST /api/billing/webhook
 */
export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    Logger.error('Webhook signature verification failed', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        Logger.info('Checkout session completed', { sessionId: event.data.object.id });
        break;

      case 'customer.subscription.created':
        await billingService.handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await billingService.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await billingService.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        await billingService.handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await billingService.handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        Logger.info('Unhandled webhook event type', { type: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    Logger.error('Webhook handler failed', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

/**
 * Get recommended plan
 * GET /api/billing/recommended
 */
export const getRecommendedPlan = async (req, res) => {
  try {
    const organizationId = req.organization._id;
    const recommendation = await planService.getRecommendedPlan(organizationId);

    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    Logger.error('Get recommended plan failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendation'
    });
  }
};

export default {
  createCheckoutSession,
  createPortalSession,
  getCurrentSubscription,
  getPlans,
  upgradePlan,
  cancelSubscription,
  reactivateSubscription,
  handleWebhook,
  getRecommendedPlan
};
