import { queryExecutionService, auditService } from '../services/index.js';
import { asyncHandler } from '../middlewares/index.js';
import { Logger } from '../middlewares/logger.js';

/**
 * Execute a previously translated query
 * POST /api/execute
 */
export const executeQuery = asyncHandler(async (req, res) => {
  const { mongoQueryId, options } = req.body;
  const user = req.user;

  // Get audit entry
  const auditResult = await auditService.getAuditEntry(mongoQueryId, user._id);
  
  if (!auditResult.success) {
    return res.status(404).json({
      success: false,
      error: 'Query not found or access denied'
    });
  }

  const auditEntry = auditResult.data;

  // Check if query passed safety check
  if (!auditEntry.safetyPassed) {
    return res.status(403).json({
      success: false,
      error: 'Query did not pass safety check',
      reason: auditEntry.safetyReason
    });
  }

  // Execute query
  try {
    const executionResult = await queryExecutionService.executeQuery(
      auditEntry.generatedQuery,
      options
    );

    // Log execution
    await auditService.logExecution(
      mongoQueryId,
      executionResult.data,
      executionResult.metadata.executionTime
    );

    res.json({
      success: true,
      data: executionResult.data,
      metadata: executionResult.metadata
    });

  } catch (error) {
    // Log error
    await auditService.logExecution(mongoQueryId, null, 0, error);
    
    Logger.error('Query execution failed', error, {
      queryId: mongoQueryId,
      userId: user._id
    });

    res.status(500).json({
      success: false,
      error: 'Query execution failed',
      message: error.message
    });
  }
});

/**
 * Get query result by ID
 * GET /api/results/:id
 */
export const getQueryResult = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const result = await auditService.getQueryResult(id, user._id);

  res.json(result);
});

/**
 * Get user's query history
 * GET /api/history
 */
export const getHistory = asyncHandler(async (req, res) => {
  const user = req.user;
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    collection: req.query.collection,
    executed: req.query.executed === 'true' ? true : req.query.executed === 'false' ? false : undefined
  };

  const history = await auditService.getUserHistory(user._id, options);

  res.json(history);
});

/**
 * Get audit statistics
 * GET /api/stats
 */
export const getStatistics = asyncHandler(async (req, res) => {
  const user = req.user;
  const timeRange = req.query.timeRange || 'week';

  // Only admin can see global stats
  const userId = user.role === 'admin' ? null : user._id;

  const stats = await auditService.getStatistics(userId, timeRange);

  res.json(stats);
});
