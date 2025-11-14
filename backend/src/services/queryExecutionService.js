import mongoose from 'mongoose';
import { Customer, Order, User } from '../models/index.js';
import { Logger } from '../middlewares/logger.js';

class QueryExecutionService {
  constructor() {
    this.maxPipelineStages = parseInt(process.env.MAX_PIPELINE_STAGES) || 10;
    this.maxResultRows = parseInt(process.env.MAX_RESULT_ROWS) || 10000;
    this.queryTimeout = parseInt(process.env.QUERY_TIMEOUT_MS) || 30000;
  }

  /**
   * Execute a validated MongoDB query
   */
  async executeQuery(mongoQuery, options = {}) {
    try {
      const startTime = Date.now();
      
      // Validate query structure
      this.validateQuery(mongoQuery);

      // Get collection model
      const model = this.getModel(mongoQuery.collection);
      
      if (!model) {
        throw new Error(`Invalid collection: ${mongoQuery.collection}`);
      }

      // Execute based on query type
      let results;
      let queryType;

      if (mongoQuery.find) {
        queryType = 'find';
        results = await this.executeFindQuery(model, mongoQuery.find, options);
      } else if (mongoQuery.aggregate) {
        queryType = 'aggregate';
        results = await this.executeAggregateQuery(model, mongoQuery.aggregate, options);
      } else {
        throw new Error('Query must contain find or aggregate');
      }

      const executionTime = Date.now() - startTime;

      Logger.info('Query executed successfully', {
        collection: mongoQuery.collection,
        queryType,
        resultCount: results.length,
        executionTime
      });

      return {
        success: true,
        data: results,
        metadata: {
          collection: mongoQuery.collection,
          queryType,
          rowCount: results.length,
          executionTime,
          truncated: results.length >= this.maxResultRows
        }
      };

    } catch (error) {
      Logger.error('Query execution failed', error);
      throw error;
    }
  }

  /**
   * Execute find query
   */
  async executeFindQuery(model, findQuery, options) {
    const limit = Math.min(options.limit || 100, this.maxResultRows);
    const skip = options.skip || 0;

    const query = model.find(findQuery)
      .limit(limit)
      .skip(skip)
      .maxTimeMS(this.queryTimeout)
      .lean();

    // Apply sorting if specified
    if (options.sort) {
      query.sort(options.sort);
    }

    return await query.exec();
  }

  /**
   * Execute aggregation pipeline
   */
  async executeAggregateQuery(model, pipeline, options) {
    // Validate pipeline length
    if (pipeline.length > this.maxPipelineStages) {
      throw new Error(`Pipeline exceeds maximum ${this.maxPipelineStages} stages`);
    }

    // Validate each stage
    for (const stage of pipeline) {
      this.validatePipelineStage(stage);
    }

    // Add limit to prevent excessive results
    const hasLimit = pipeline.some(stage => '$limit' in stage);
    if (!hasLimit) {
      pipeline.push({ $limit: this.maxResultRows });
    }

    const results = await model.aggregate(pipeline)
      .maxTimeMS(this.queryTimeout)
      .exec();

    return results;
  }

  /**
   * Validate query structure and safety
   */
  validateQuery(mongoQuery) {
    if (!mongoQuery || typeof mongoQuery !== 'object') {
      throw new Error('Invalid query structure');
    }

    if (!mongoQuery.collection) {
      throw new Error('Collection name is required');
    }

    // Must have either find or aggregate
    if (!mongoQuery.find && !mongoQuery.aggregate) {
      throw new Error('Query must contain find or aggregate');
    }

    // Check for disallowed operators in find query
    if (mongoQuery.find) {
      this.validateFindQuery(mongoQuery.find);
    }

    return true;
  }

  /**
   * Validate find query for dangerous operators
   */
  validateFindQuery(findQuery) {
    const disallowed = ['$where', '$function', '$accumulator', '$eval'];
    const queryStr = JSON.stringify(findQuery);

    for (const op of disallowed) {
      if (queryStr.includes(op)) {
        throw new Error(`Disallowed operator: ${op}`);
      }
    }

    // Check for JavaScript code patterns
    if (queryStr.match(/function\s*\(/) || queryStr.match(/=>/)) {
      throw new Error('JavaScript functions are not allowed in queries');
    }

    return true;
  }

  /**
   * Validate aggregation pipeline stage
   */
  validatePipelineStage(stage) {
    const allowedStages = [
      '$match', '$group', '$sort', '$limit', '$skip', '$project',
      '$lookup', '$unwind', '$count', '$addFields', '$facet', '$bucket'
    ];

    const disallowedStages = [
      '$where', '$function', '$accumulator', '$out', '$merge', '$eval'
    ];

    const stageKeys = Object.keys(stage);
    
    for (const key of stageKeys) {
      if (disallowedStages.includes(key)) {
        throw new Error(`Disallowed aggregation stage: ${key}`);
      }
      
      if (!allowedStages.includes(key)) {
        throw new Error(`Unknown or disallowed stage: ${key}`);
      }
    }

    // Additional validation for $addFields
    if (stage.$addFields) {
      const stageStr = JSON.stringify(stage.$addFields);
      if (stageStr.match(/function\s*\(/) || stageStr.match(/=>/)) {
        throw new Error('JavaScript functions are not allowed in $addFields');
      }
    }

    return true;
  }

  /**
   * Get Mongoose model by collection name
   */
  getModel(collectionName) {
    const modelMap = {
      customers: Customer,
      orders: Order,
      users: User
    };
    
    return modelMap[collectionName];
  }

  /**
   * Explain query execution plan
   */
  async explainQuery(mongoQuery) {
    try {
      const model = this.getModel(mongoQuery.collection);
      
      if (!model) {
        throw new Error(`Invalid collection: ${mongoQuery.collection}`);
      }

      let explanation;

      if (mongoQuery.find) {
        explanation = await model.find(mongoQuery.find).explain('executionStats');
      } else if (mongoQuery.aggregate) {
        explanation = await model.aggregate(mongoQuery.aggregate).explain('executionStats');
      }

      return {
        success: true,
        data: explanation
      };

    } catch (error) {
      Logger.error('Query explanation failed', error);
      throw error;
    }
  }

  /**
   * Get query complexity estimate
   */
  estimateComplexity(mongoQuery) {
    let complexity = 'low';
    
    if (mongoQuery.aggregate) {
      const pipeline = mongoQuery.aggregate;
      
      // High complexity indicators
      if (pipeline.length > 5) complexity = 'high';
      if (pipeline.some(s => s.$lookup)) complexity = 'high';
      if (pipeline.some(s => s.$facet)) complexity = 'high';
      
      // Medium complexity
      if (pipeline.length > 3) complexity = 'medium';
      if (pipeline.some(s => s.$group)) complexity = 'medium';
    }

    return complexity;
  }
}

export default new QueryExecutionService();
