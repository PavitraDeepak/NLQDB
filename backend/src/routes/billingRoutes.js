import express from 'express';
import billingController from '../controllers/billingController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantResolver } from '../middlewares/tenantResolver.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);
router.use(tenantResolver);

/**
 * Subscription Management
 */

// Get current subscription
router.get('/subscription', billingController.getCurrentSubscription);

// Get available plans
router.get('/plans', billingController.getPlans);

// Create checkout session
router.post('/checkout', billingController.createCheckoutSession);

// Create portal session
router.post('/portal', billingController.createPortalSession);

// Webhook endpoint (no auth required)
router.post('/webhook', billingController.handleWebhook);

export default router;
