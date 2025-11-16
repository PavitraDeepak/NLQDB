import { chatService } from '../services/chatService.js';
import { Logger } from '../middlewares/logger.js';
import { asyncHandler } from '../middlewares/index.js';
import crypto from 'crypto';

/**
 * Chat Controller - Natural Language Query Interface
 * Handles translation, execution, history, and clarification requests
 */

/**
 * Translate natural language to SQL/MongoDB query
 * POST /api/chat/translate
 */
export const translate = asyncHandler(async (req, res) => {
  const { query, connectionId, context } = req.body;
  const organizationId = req.tenant.id;
  const userId = req.user._id;

  if (!query || !query.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Query text is required'
    });
  }

  if (!connectionId) {
    return res.status(400).json({
      success: false,
      error: 'Database connection ID is required'
    });
  }

  Logger.info('Translate request', { 
    organizationId, 
    userId, 
    connectionId,
    queryLength: query.length 
  });

  const translation = await chatService.translateQuery(
    query,
    connectionId,
    organizationId,
    userId,
    context || []
  );

  res.json({
    success: true,
    data: translation,
    message: translation.cached ? 'Translation retrieved from cache' : 'Query translated successfully'
  });
});

/**
 * Execute translated query
 * POST /api/chat/execute
 */
export const execute = asyncHandler(async (req, res) => {
  const { translation, connectionId, options } = req.body;
  const organizationId = req.tenant.id;
  const userId = req.user._id;

  if (!translation) {
    return res.status(400).json({
      success: false,
      error: 'Translation object is required'
    });
  }

  if (!connectionId) {
    return res.status(400).json({
      success: false,
      error: 'Database connection ID is required'
    });
  }

  // Check for expensive query warning
  if (translation.estimatedCost > chatService.EXPENSIVE_QUERY_THRESHOLD && !options?.confirmed) {
    return res.status(200).json({
      success: false,
      requiresConfirmation: true,
      message: `This query is estimated to be expensive (cost: ${translation.estimatedCost}). Please confirm execution.`,
      estimatedCost: translation.estimatedCost
    });
  }

  Logger.info('Execute request', { 
    organizationId, 
    userId, 
    connectionId,
    translationId: translation.translationId 
  });

  const result = await chatService.executeQuery(
    translation.translationId,
    translation,
    connectionId,
    organizationId,
    userId,
    options || {}
  );

  res.json({
    success: true,
    data: result,
    message: result.cached ? 'Results retrieved from cache' : 'Query executed successfully'
  });
});

/**
 * Get query result by ID
 * GET /api/chat/result/:executionId
 */
export const getResult = asyncHandler(async (req, res) => {
  const { executionId } = req.params;
  const organizationId = req.tenant.id;
  const userId = req.user._id;

  if (!executionId) {
    return res.status(400).json({
      success: false,
      error: 'Execution ID is required'
    });
  }

  const result = await chatService.getResult(executionId, organizationId, userId);

  res.json({
    success: true,
    data: result
  });
});

/**
 * Get query history
 * GET /api/chat/history
 */
export const getHistory = asyncHandler(async (req, res) => {
  const organizationId = req.tenant.id;
  const userId = req.user._id;
  const { limit, offset, connectionId } = req.query;

  const options = {
    limit: limit ? parseInt(limit) : 50,
    offset: offset ? parseInt(offset) : 0,
    connectionId
  };

  const history = await chatService.getHistory(organizationId, userId, options);

  res.json({
    success: true,
    data: history
  });
});

/**
 * Generate clarifying questions
 * POST /api/chat/clarify
 */
export const clarify = asyncHandler(async (req, res) => {
  const { query, connectionId } = req.body;
  const organizationId = req.tenant.id;

  if (!query || !query.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Query text is required'
    });
  }

  if (!connectionId) {
    return res.status(400).json({
      success: false,
      error: 'Database connection ID is required'
    });
  }

  const questions = await chatService.generateClarifyingQuestions(
    query,
    connectionId,
    organizationId
  );

  res.json({
    success: true,
    data: { questions }
  });
});

/**
 * Cancel running query
 * POST /api/chat/cancel
 */
export const cancel = asyncHandler(async (req, res) => {
  const { executionId } = req.body;
  const organizationId = req.tenant.id;
  const userId = req.user._id;

  if (!executionId) {
    return res.status(400).json({
      success: false,
      error: 'Execution ID is required'
    });
  }

  const result = await chatService.cancelQuery(executionId, organizationId, userId);

  res.json({
    success: true,
    data: result,
    message: 'Query cancelled successfully'
  });
});

/**
 * Explain query without executing (preview mode)
 * POST /api/chat/explain
 */
export const explain = asyncHandler(async (req, res) => {
  const { query, connectionId, context } = req.body;
  const organizationId = req.tenant.id;
  const userId = req.user._id;

  if (!query || !query.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Query text is required'
    });
  }

  if (!connectionId) {
    return res.status(400).json({
      success: false,
      error: 'Database connection ID is required'
    });
  }

  // Same as translate, but explicitly for explain-only mode
  const translation = await chatService.translateQuery(
    query,
    connectionId,
    organizationId,
    userId,
    context || []
  );

  // Return only explanation and metadata, no execution
  res.json({
    success: true,
    data: {
      explain: translation.explain,
      query: translation.query,
      estimatedCost: translation.estimatedCost,
      requiresIndexes: translation.requiresIndexes,
      safety: translation.safety,
      warningMessage: translation.warningMessage,
      explainOnly: true
    },
    message: 'Query explained (not executed)'
  });
});

/**
 * Get sample data preview before execution
 * POST /api/chat/preview
 */
export const preview = asyncHandler(async (req, res) => {
  const { translation, connectionId } = req.body;
  const organizationId = req.tenant.id;
  const userId = req.user._id;

  if (!translation) {
    return res.status(400).json({
      success: false,
      error: 'Translation object is required'
    });
  }

  if (!connectionId) {
    return res.status(400).json({
      success: false,
      error: 'Database connection ID is required'
    });
  }

  Logger.info('Preview request', { 
    organizationId, 
    userId, 
    connectionId,
    translationId: translation.translationId 
  });

  // Execute with limit of 10 rows for preview
  const result = await chatService.executeQuery(
    translation.translationId,
    translation,
    connectionId,
    organizationId,
    userId,
    { limit: 10, preview: true }
  );

  res.json({
    success: true,
    data: {
      ...result,
      preview: true,
      previewRowCount: result.rowCount
    },
    message: 'Preview generated (limited to 10 rows)'
  });
});

/**
 * Replay previous query
 * POST /api/chat/replay
 */
export const replay = asyncHandler(async (req, res) => {
  const { executionId } = req.body;
  const organizationId = req.tenant.id;
  const userId = req.user._id;

  if (!executionId) {
    return res.status(400).json({
      success: false,
      error: 'Execution ID is required'
    });
  }

  // Get original query result
  const originalResult = await chatService.getResult(executionId, organizationId, userId);

  if (!originalResult) {
    return res.status(404).json({
      success: false,
      error: 'Original query not found'
    });
  }

  // Re-execute with fresh data
  const translation = {
    translationId: originalResult.translationId,
    query: originalResult.query,
    explain: originalResult.explain,
    estimatedCost: originalResult.metadata?.estimatedCost || 0.5,
    safety: 'safe',
    dbType: originalResult.metadata?.dbType,
    signature: crypto.randomBytes(32).toString('hex') // New signature for replay
  };

  const result = await chatService.executeQuery(
    translation.translationId,
    translation,
    originalResult.connectionId,
    organizationId,
    userId,
    { forceRefresh: true }
  );

  res.json({
    success: true,
    data: {
      ...result,
      replayed: true,
      originalExecutionId: executionId
    },
    message: 'Query replayed successfully'
  });
});

/**
 * Get cost estimate for query
 * POST /api/chat/estimate
 */
export const estimate = asyncHandler(async (req, res) => {
  const { query, connectionId } = req.body;
  const organizationId = req.tenant.id;
  const userId = req.user._id;

  if (!query || !query.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Query text is required'
    });
  }

  if (!connectionId) {
    return res.status(400).json({
      success: false,
      error: 'Database connection ID is required'
    });
  }

  // Get translation to estimate cost
  const translation = await chatService.translateQuery(
    query,
    connectionId,
    organizationId,
    userId,
    []
  );

  // Calculate estimated costs
  const estimatedTokenCost = translation.tokensUsed * 0.00002; // Example: $0.00002 per token
  const estimatedExecutionCost = translation.estimatedCost * 0.001; // Example: up to $0.001 for expensive queries
  const totalEstimate = estimatedTokenCost + estimatedExecutionCost;

  res.json({
    success: true,
    data: {
      estimatedCost: translation.estimatedCost,
      tokensUsed: translation.tokensUsed,
      estimatedTokenCost,
      estimatedExecutionCost,
      totalEstimate,
      currency: 'USD',
      expensive: translation.estimatedCost > chatService.EXPENSIVE_QUERY_THRESHOLD
    },
    message: 'Cost estimate calculated'
  });
});

export default {
  translate,
  execute,
  getResult,
  getHistory,
  clarify,
  cancel,
  explain,
  preview,
  replay,
  estimate
};
