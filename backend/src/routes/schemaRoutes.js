import express from 'express';
import {
  getSchema,
  listCollections,
  getCollectionPreview,
  getCollectionStats
} from '../controllers/schemaController.js';
import { authMiddleware, requireAuth } from '../middlewares/index.js';

const router = express.Router();

// All schema routes require authentication
router.use(authMiddleware);
router.use(requireAuth);

// Get database schema for current user
router.get('/schema', getSchema);

// List all accessible collections
router.get('/tables', listCollections);

// Get collection preview
router.get('/tables/:collection/preview', getCollectionPreview);

// Get collection statistics
router.get('/tables/:collection/stats', getCollectionStats);

export default router;
