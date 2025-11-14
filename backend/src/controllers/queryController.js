import { llmService, schemaService, auditService } from '../services/index.js';
import { asyncHandler } from '../middlewares/index.js';
import { Logger } from '../middlewares/logger.js';

/**
 * Translate natural language query to MongoDB query
 * POST /api/translate
 */
export const translateQuery = asyncHandler(async (req, res) => {
  const { userQuery, context } = req.body;
  const user = req.user;

  Logger.info('Translation request received', {
    userId: user._id,
    userQuery: userQuery.substring(0, 100)
  });

  // Get schema for user's role
  const schema = await schemaService.getSchemaForUser(user);

  // Call LLM to translate query
  const llmResponse = await llmService.translateQuery(
    userQuery,
    schema,
    user.role,
    context
  );

  if (!llmResponse.success) {
    return res.status(500).json({
      success: false,
      error: 'Translation failed'
    });
  }

  // Log translation to audit
  const auditEntry = await auditService.logTranslation(
    user._id,
    userQuery,
    llmResponse.data,
    llmResponse.data.safety,
    {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    }
  );

  res.json({
    success: true,
    data: {
      queryId: auditEntry._id,
      mongoQuery: llmResponse.data.mongoQuery,
      explain: llmResponse.data.explain,
      requiresIndexes: llmResponse.data.requiresIndexes,
      safety: llmResponse.data.safety,
      complexity: 'medium' // Could be calculated
    }
  });
});
