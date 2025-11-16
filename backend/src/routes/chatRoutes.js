import express from 'express';
import rateLimit from 'express-rate-limit';
import chatController from '../controllers/chatController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js';
import { tenantResolver } from '../middlewares/tenantResolver.js';

const router = express.Router();

/**
 * Chat Routes - Natural Language Query Interface
 * All routes require authentication (JWT or API Key) and tenant context
 */

// Apply authentication middleware (supports both JWT and API Key)
router.use((req, res, next) => {
  // Check for API key first
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return apiKeyAuth(req, res, next);
  }
  // Fall back to JWT authentication
  return authMiddleware(req, res, next);
});

// Apply tenant resolver
router.use(tenantResolver);

// Apply rate limiting (stricter for translation/execution)
const translateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many translation requests, please try again later'
});

const executeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 executions per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many execution requests, please try again later'
});

/**
 * POST /api/chat/translate
 * Translate natural language to SQL/MongoDB query
 */
router.post(
  '/translate',
  translateLimiter,
  chatController.translate
);

/**
 * POST /api/chat/execute
 * Execute a translated query
 * 
 * Body:
 * - translation: object (required) - Translation object from /translate
 * - connectionId: string (required) - Database connection ID
 * - options: object (optional) - Execution options (limit, confirmed, forceRefresh)
 * 
 * Response:
 * - executionId: string - Unique ID for this execution
 * - results: array - Query results
 * - rowCount: number - Number of rows returned
 * - executionTime: number - Execution time in ms
 * - truncated: boolean - Whether results were truncated
 * - cached: boolean - Whether results came from cache
 */
router.post(
  '/execute',
  executeLimiter,
  chatController.execute
);

/**
 * GET /api/chat/result/:executionId
 * Get query result by execution ID
 * 
 * Params:
 * - executionId: string - Execution ID from previous execution
 * 
 * Response:
 * - Full execution result including query, results, and metadata
 */
router.get(
  '/result/:executionId',
  chatController.getResult
);

/**
 * GET /api/chat/history
 * Get query history for current user
 * 
 * Query params:
 * - limit: number (default: 50) - Number of results to return
 * - offset: number (default: 0) - Pagination offset
 * - connectionId: string (optional) - Filter by connection
 * 
 * Response:
 * - history: array - List of query executions
 * - total: number - Total count
 * - limit: number - Current limit
 * - offset: number - Current offset
 */
router.get(
  '/history',
  chatController.getHistory
);

/**
 * POST /api/chat/clarify
 * Generate clarifying questions for ambiguous queries
 * 
 * Body:
 * - query: string (required) - Natural language query
 * - connectionId: string (required) - Database connection ID
 * 
 * Response:
 * - questions: array - List of clarifying questions
 */
router.post(
  '/clarify',
  chatController.clarify
);

/**
 * POST /api/chat/cancel
 * Cancel a running query execution
 * 
 * Body:
 * - executionId: string (required) - Execution ID to cancel
 * 
 * Response:
 * - cancelled: boolean - Whether cancellation was successful
 * - executionId: string - The cancelled execution ID
 */
router.post(
  '/cancel',
  chatController.cancel
);

/**
 * POST /api/chat/explain
 * Explain query without executing (explain-only mode)
 * 
 * Body:
 * - query: string (required) - Natural language query
 * - connectionId: string (required) - Database connection ID
 * - context: array (optional) - Previous conversation messages
 * 
 * Response:
 * - explain: string - Query explanation
 * - query: object/string - Generated query
 * - estimatedCost: number - Cost estimate
 * - safety: string - Safety level
 * - explainOnly: boolean - Always true
 */
router.post(
  '/explain',
  translateLimiter,
  chatController.explain
);

/**
 * POST /api/chat/preview
 * Execute query with limited results for preview
 * 
 * Body:
 * - translation: object (required) - Translation object
 * - connectionId: string (required) - Database connection ID
 * 
 * Response:
 * - results: array - Preview results (max 10 rows)
 * - preview: boolean - Always true
 * - previewRowCount: number - Number of preview rows
 */
router.post(
  '/preview',
  chatController.preview
);

/**
 * POST /api/chat/replay
 * Replay a previous query execution with fresh data
 * 
 * Body:
 * - executionId: string (required) - Original execution ID
 * 
 * Response:
 * - results: array - Fresh query results
 * - replayed: boolean - Always true
 * - originalExecutionId: string - Original execution ID
 */
router.post(
  '/replay',
  executeLimiter,
  chatController.replay
);

/**
 * POST /api/chat/estimate
 * Get cost estimate for a query without executing
 * 
 * Body:
 * - query: string (required) - Natural language query
 * - connectionId: string (required) - Database connection ID
 * 
 * Response:
 * - estimatedCost: number - Query complexity cost (0-1)
 * - tokensUsed: number - LLM tokens used
 * - estimatedTokenCost: number - Cost in USD for tokens
 * - estimatedExecutionCost: number - Cost in USD for execution
 * - totalEstimate: number - Total cost in USD
 * - expensive: boolean - Whether query is expensive
 */
router.post(
  '/estimate',
  chatController.estimate
);

export default router;
