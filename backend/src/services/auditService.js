import { AuditQuery, QueryResult } from '../models/index.js';
import { Logger } from '../middlewares/logger.js';

class AuditService {
  /**
   * Create audit log entry for translation
   */
  async logTranslation(userId, userQuery, generatedQuery, safetyInfo, metadata = {}) {
    try {
      const auditEntry = await AuditQuery.create({
        userId,
        userQuery,
        generatedQuery: generatedQuery.mongoQuery,
        queryType: generatedQuery.mongoQuery.find ? 'find' : 'aggregate',
        collection: generatedQuery.mongoQuery.collection,
        executed: false,
        safetyPassed: generatedQuery.safety.allowed,
        safetyReason: generatedQuery.safety.reason,
        explain: generatedQuery.explain,
        requiresIndexes: generatedQuery.requiresIndexes || [],
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      });

      Logger.info('Translation logged', {
        auditId: auditEntry._id,
        userId,
        collection: generatedQuery.mongoQuery.collection
      });

      return auditEntry;
    } catch (error) {
      Logger.error('Failed to log translation', error);
      throw error;
    }
  }

  /**
   * Update audit entry after execution
   */
  async logExecution(auditId, results, executionTime, error = null) {
    try {
      const update = {
        executed: true,
        executionTime,
        resultCount: results?.length || 0,
        error: error ? error.message : null
      };

      const auditEntry = await AuditQuery.findByIdAndUpdate(
        auditId,
        update,
        { new: true }
      );

      if (!auditEntry) {
        throw new Error('Audit entry not found');
      }

      // Save results if successful
      if (results && !error) {
        const queryResult = await QueryResult.create({
          auditQueryId: auditId,
          userId: auditEntry.userId,
          data: results,
          rowCount: results.length,
          metadata: {
            executionTime,
            collection: auditEntry.collection,
            queryType: auditEntry.queryType,
            cached: false
          }
        });

        auditEntry.resultId = queryResult._id;
        await auditEntry.save();
      }

      Logger.info('Execution logged', {
        auditId,
        resultCount: results?.length || 0,
        executionTime,
        success: !error
      });

      return auditEntry;
    } catch (error) {
      Logger.error('Failed to log execution', error);
      throw error;
    }
  }

  /**
   * Get query history for user
   */
  async getUserHistory(userId, options = {}) {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const filter = { userId };

      // Filter by collection if specified
      if (options.collection) {
        filter.collection = options.collection;
      }

      // Filter by execution status
      if (options.executed !== undefined) {
        filter.executed = options.executed;
      }

      // Filter by safety
      if (options.safetyPassed !== undefined) {
        filter.safetyPassed = options.safetyPassed;
      }

      const [history, total] = await Promise.all([
        AuditQuery.find(filter)
          .sort({ timestamp: -1 })
          .limit(limit)
          .skip(skip)
          .lean(),
        AuditQuery.countDocuments(filter)
      ]);

      return {
        success: true,
        data: history,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      Logger.error('Failed to get user history', error);
      throw error;
    }
  }

  /**
   * Get query result by ID
   */
  async getQueryResult(resultId, userId) {
    try {
      const result = await QueryResult.findOne({
        _id: resultId,
        userId
      }).lean();

      if (!result) {
        throw new Error('Query result not found or access denied');
      }

      return {
        success: true,
        data: result.data,
        metadata: result.metadata
      };
    } catch (error) {
      Logger.error('Failed to get query result', error);
      throw error;
    }
  }

  /**
   * Get audit entry by ID
   */
  async getAuditEntry(auditId, userId = null) {
    try {
      const filter = { _id: auditId };
      
      // Non-admin users can only see their own entries
      if (userId) {
        filter.userId = userId;
      }

      const entry = await AuditQuery.findOne(filter)
        .populate('userId', 'name email role')
        .lean();

      if (!entry) {
        throw new Error('Audit entry not found or access denied');
      }

      return {
        success: true,
        data: entry
      };
    } catch (error) {
      Logger.error('Failed to get audit entry', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics(userId = null, timeRange = 'week') {
    try {
      const now = new Date();
      let startDate;

      switch (timeRange) {
        case 'day':
          startDate = new Date(now.setDate(now.getDate() - 1));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(0);
      }

      const filter = {
        timestamp: { $gte: startDate }
      };

      if (userId) {
        filter.userId = userId;
      }

      const stats = await AuditQuery.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalQueries: { $sum: 1 },
            executedQueries: {
              $sum: { $cond: ['$executed', 1, 0] }
            },
            safeQueries: {
              $sum: { $cond: ['$safetyPassed', 1, 0] }
            },
            avgExecutionTime: {
              $avg: '$executionTime'
            }
          }
        }
      ]);

      return {
        success: true,
        data: stats[0] || {
          totalQueries: 0,
          executedQueries: 0,
          safeQueries: 0,
          avgExecutionTime: 0
        }
      };
    } catch (error) {
      Logger.error('Failed to get statistics', error);
      throw error;
    }
  }

  /**
   * Delete old audit entries (cleanup)
   */
  async cleanupOldEntries(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await AuditQuery.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      Logger.info('Cleanup completed', {
        deletedCount: result.deletedCount,
        cutoffDate
      });

      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      Logger.error('Cleanup failed', error);
      throw error;
    }
  }
}

export default new AuditService();
