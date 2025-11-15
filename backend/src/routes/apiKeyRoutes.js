import express from 'express';
import apiKeyController from '../controllers/apiKeyController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantResolver } from '../middlewares/tenantResolver.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);
router.use(tenantResolver);

/**
 * API Key Management
 */

// Get all API keys for current organization
router.get('/', apiKeyController.getApiKeys);

// Create new API key
router.post('/', apiKeyController.createApiKey);

// Get API key by ID
router.get('/:id', apiKeyController.getApiKey);

// Update API key
router.patch('/:id', apiKeyController.updateApiKey);

// Revoke API key
router.delete('/:id', apiKeyController.revokeApiKey);

// Rotate API key
router.post('/:id/rotate', apiKeyController.rotateApiKey);

export default router;
