import express from 'express';
import { translateQuery } from '../controllers/queryController.js';
import { executeQuery, getQueryResult, getHistory, getStatistics } from '../controllers/executionController.js';
import {
  authMiddleware,
  validate,
  queryLimiter,
  dailyQueryLimiter,
  requireAuth
} from '../middlewares/index.js';

const router = express.Router();

// All query routes require authentication
router.use(authMiddleware);
router.use(requireAuth);

// Translate natural language to MongoDB query
router.post(
  '/translate',
  queryLimiter,
  dailyQueryLimiter,
  validate('translateQuery'),
  translateQuery
);

// Execute a validated query
router.post(
  '/execute',
  queryLimiter,
  dailyQueryLimiter,
  validate('executeQuery'),
  executeQuery
);

// Get query result by ID
router.get('/results/:id', getQueryResult);

// Get query history (support both /history and /query/history)
router.get('/history', getHistory);
router.get('/query/history', getHistory);

// Get statistics
router.get('/stats', getStatistics);

export default router;
