import express from 'express';
import authRoutes from './authRoutes.js';
import queryRoutes from './queryRoutes.js';
import schemaRoutes from './schemaRoutes.js';

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
router.use('/', queryRoutes); // Query routes at /api/translate, /api/execute, etc.
router.use('/', schemaRoutes); // Schema routes at /api/schema, /api/tables, etc.

export default router;
