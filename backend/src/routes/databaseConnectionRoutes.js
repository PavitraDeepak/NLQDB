import express from 'express';
import databaseConnectionController from '../controllers/databaseConnectionController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantResolver, requireOrgAdmin } from '../middlewares/tenantResolver.js';

const router = express.Router();

// All routes require authentication and organization context
router.use(authMiddleware);
router.use(tenantResolver);

/**
 * Database Connection Management
 */

// Get all connections for organization
router.get('/', databaseConnectionController.getConnections);

// Create new connection (admin only)
router.post('/', requireOrgAdmin, databaseConnectionController.createConnection);

// Get connection by ID
router.get('/:id', databaseConnectionController.getConnection);

// Update connection (admin only)
router.put('/:id', requireOrgAdmin, databaseConnectionController.updateConnection);

// Delete connection (admin only)
router.delete('/:id', requireOrgAdmin, databaseConnectionController.deleteConnection);

// Test connection
router.post('/:id/test', databaseConnectionController.testConnection);

// Get schema for connection
router.get('/:id/schema', databaseConnectionController.getSchema);

// Execute query on connection
router.post('/:id/query', databaseConnectionController.executeQuery);

// Rotate credentials (admin only)
router.post('/:id/rotate', requireOrgAdmin, databaseConnectionController.rotateCredentials);

export default router;
