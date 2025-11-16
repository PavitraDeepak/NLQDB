import express from 'express';
import authRoutes from './authRoutes.js';
import queryRoutes from './queryRoutes.js';
import schemaRoutes from './schemaRoutes.js';
import organizationRoutes from './organizationRoutes.js';
import billingRoutes from './billingRoutes.js';
import apiKeyRoutes from './apiKeyRoutes.js';
import databaseConnectionRoutes from './databaseConnectionRoutes.js';
import chatRoutes from './chatRoutes.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'NLQDB API is running',
    timestamp: new Date().toISOString()
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/billing', billingRoutes);
router.use('/apikeys', apiKeyRoutes);
router.use('/database-connections', databaseConnectionRoutes);
router.use('/chat', chatRoutes); // Chat routes at /api/chat/*
router.use('/', queryRoutes); // Query routes at /api/translate, /api/execute, etc.
router.use('/', schemaRoutes); // Schema routes at /api/schema, /api/tables, etc.

export default router;
