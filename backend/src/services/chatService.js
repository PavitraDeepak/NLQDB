import { OpenAI } from 'openai';
import { GoogleGenAI } from '@google/genai';
import { DatabaseConnection, QueryResult, AuditQuery, User } from '../models/index.js';
import { Logger } from '../middlewares/logger.js';
import externalDatabaseService from './externalDatabaseService.js';
import usageService from './usageService.js';
import schemaAggregationService from './schemaAggregationService.js';
import crypto from 'crypto';

/**
 * Chat Service - Natural Language Query Translation and Execution
 * Handles multi-tenant query translation, validation, execution, and results caching
 * Supports both OpenAI and Google AI
 */
class ChatService {
  constructor() {
    // Initialize LLM client (prefer OpenAI, fallback to Google AI)
    if (process.env.OPENAI_API_KEY) {
      this.llmProvider = 'openai';
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      Logger.info('Chat service initialized with OpenAI');
    } else if (process.env.GOOGLE_AI_API_KEY) {
      this.llmProvider = 'google';
      this.googleClient = new GoogleGenAI({
        apiKey: process.env.GOOGLE_AI_API_KEY
      });
      const preferredModel = process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash';
      this._setGoogleModel(preferredModel);
    } else {
      throw new Error('No LLM API key configured. Set OPENAI_API_KEY or GOOGLE_AI_API_KEY');
    }
    
    // Cache for translations and results (in-memory, could be Redis)
    this.translationCache = new Map();
    this.resultCache = new Map();
    this.executionJobs = new Map(); // Track running queries for cancellation
    
    // Safety configuration
    this.DESTRUCTIVE_SQL_KEYWORDS = [
      'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 
      'UPDATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE'
    ];
    
    this.BLACKLISTED_MONGO_STAGES = [
      '$out', '$merge', '$planCacheStats', '$currentOp', '$indexStats'
    ];
    
    this.MAX_ROWS = 10000;
    this.MAX_EXECUTION_TIME_MS = 30000; // 30 seconds
    this.EXPENSIVE_QUERY_THRESHOLD = 0.7; // Cost > 0.7 = expensive
  }

  _setGoogleModel(modelName) {
    this.googleModelName = modelName;
    this.googleGenerationConfig = {
      temperature: 0,
      maxOutputTokens: 1000
    };
    Logger.info(`Chat service configured Google AI model ${modelName}`);
  }

  _getGoogleModelPriority() {
    const preference = process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash';
    const ordered = [
      preference,
      'gemini-2.5-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro'
    ];
    return [...new Set(ordered)];
  }

  _isGoogleModelNotFound(error) {
    if (!error || !error.message) {
      return false;
    }
    const msg = error.message.toLowerCase();
    return msg.includes('not found') && msg.includes('models');
  }

  _switchToNextGoogleModel() {
    const priority = this._getGoogleModelPriority();
    const currentIndex = priority.indexOf(this.googleModelName);
    const nextModel = priority.slice(currentIndex + 1).find(Boolean);
    if (!nextModel) {
      return false;
    }
    Logger.warn(`Google AI model ${this.googleModelName} unavailable, falling back to ${nextModel}`);
    this._setGoogleModel(nextModel);
    return true;
  }

  /**
   * Generate comprehensive system prompt with full schema awareness
   */
  _generateSystemPrompt(schema, dbType, tableName, databaseName) {
    // Handle different schema formats (array of columns or table structure)
    let columns = [];
    if (Array.isArray(schema)) {
      columns = schema;
    } else if (schema && Array.isArray(schema.tables)) {
      // Find the matching table or use all columns from all tables
      const allColumns = [];
      schema.tables.forEach(table => {
        if (table.columns && Array.isArray(table.columns)) {
          allColumns.push(...table.columns);
        }
      });
      columns = allColumns;
    } else {
      columns = [];
    }

    // Build detailed schema description with all columns
    const schemaDescription = columns.length > 0 
      ? columns.map(col => {
          const attributes = [];
          attributes.push(`type: ${col.type}`);
          if (col.nullable) attributes.push('nullable');
          if (col.primaryKey) attributes.push('PRIMARY KEY');
          if (col.foreignKey) attributes.push('FOREIGN KEY');
          if (col.unique) attributes.push('UNIQUE');
          if (col.defaultValue) attributes.push(`default: ${col.defaultValue}`);
          
          return `  - ${col.name}: ${attributes.join(', ')}`;
        }).join('\n')
      : '  (Schema information not available - query all fields with *)';

    const exampleQueries = this._getExampleQueries(dbType, tableName, columns);

    return `You are an expert database query translator specialized in converting natural language to precise ${dbType.toUpperCase()} queries.

=== DATABASE INFORMATION ===
Database Type: ${dbType}
Database Name: ${databaseName}
Table/Collection: ${tableName}

=== COMPLETE SCHEMA ===
${schemaDescription}

=== STRICT SAFETY RULES ===
1. ✅ ALLOWED: Only SELECT queries (SQL) or read operations (MongoDB)
2. ❌ FORBIDDEN: DROP, DELETE, TRUNCATE, ALTER, CREATE, INSERT, UPDATE, GRANT, REVOKE, EXEC, EXECUTE
3. ✅ MongoDB: ONLY use $match, $project, $sort, $limit, $skip, $count, $group, $lookup (for joins)
4. ❌ MongoDB: NEVER use $out, $merge, $planCacheStats, $currentOp, $indexStats
5. ⚠️  Always add LIMIT clause (max 1000 rows) for safety
6. ⚠️  Use parameterized queries to prevent SQL injection
7. ⚠️  All date filters must use ISO 8601 format (YYYY-MM-DD or full ISO timestamp)
8. ⚠️  Field names must exactly match the schema above

=== QUERY TRANSLATION GUIDELINES ===
- Use the EXACT column/field names from the schema
- For aggregations (count, sum, avg), use appropriate SQL/MongoDB functions
- For date ranges, use BETWEEN or $gte/$lte operators
- For text search, use LIKE (SQL) or $regex (MongoDB) with case-insensitive flag
- For sorting, always specify ASC or DESC explicitly
- Consider indexes when suggesting complex queries

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown, no code blocks, no extra text):
{
  "${dbType === 'mongodb' ? 'mongoQuery' : 'sqlQuery'}": "<your generated query>",
  "${dbType === 'mongodb' ? 'collection' : 'table'}": "<exact name of the target collection/table>",
  "explain": "<brief explanation of what the query does>",
  "requiresIndexes": ["<list of columns/fields that should be indexed for performance>"],
  "estimatedCost": <number between 0-1, where 1 is most expensive>,
  "safety": "<safe|warning|unsafe>",
  "warningMessage": "<optional: warning if query is risky or expensive>"
}

=== EXAMPLE TRANSLATIONS ===
${exampleQueries}

IMPORTANT: Generate queries based ONLY on the schema provided above. If a requested column doesn't exist, mark the query as unsafe.`;
  }

  /**
   * Generate example queries based on database type and schema
   */
  _getExampleQueries(dbType, tableName, schema) {
    const hasId = schema.some(col => col.name === '_id' || col.name === 'id');
    const hasStatus = schema.some(col => col.name === 'status');
    const hasCreatedAt = schema.some(col => col.name === 'createdAt' || col.name === 'created_at');
    const hasName = schema.some(col => col.name === 'name');

    if (dbType === 'mongodb') {
      const examples = [];
      
      if (hasStatus) {
        examples.push(`User: "Show me all active records"
Response: {
  "mongoQuery": [
    { "$match": { "status": "active" } },
    { "$limit": 100 }
  ],
  "explain": "Retrieves all active records, limited to 100 for safety",
  "requiresIndexes": ["status"],
  "estimatedCost": 0.3,
  "safety": "safe"
}`);
      }

      if (hasCreatedAt) {
        examples.push(`User: "Count records by month"
Response: {
  "mongoQuery": [
    { "$group": { "_id": { "$month": "$createdAt" }, "count": { "$sum": 1 } } },
    { "$sort": { "_id": 1 } }
  ],
  "explain": "Groups records by creation month and counts them, sorted chronologically",
  "requiresIndexes": ["createdAt"],
  "estimatedCost": 0.5,
  "safety": "safe"
}`);
      }

      return examples.join('\n\n');
    } else {
      // SQL examples
      const examples = [];
      
      if (hasStatus) {
        examples.push(`User: "Show me all active records"
Response: {
  "sqlQuery": "SELECT * FROM ${tableName} WHERE status = 'active' LIMIT 100",
  "explain": "Retrieves all active records, limited to 100 rows for safety",
  "requiresIndexes": ["status"],
  "estimatedCost": 0.3,
  "safety": "safe"
}`);
      }

      if (hasName) {
        examples.push(`User: "Find records with 'test' in the name"
Response: {
  "sqlQuery": "SELECT * FROM ${tableName} WHERE name LIKE '%test%' LIMIT 100",
  "explain": "Searches for records with 'test' in the name using pattern matching",
  "requiresIndexes": ["name"],
  "estimatedCost": 0.6,
  "safety": "safe"
}`);
      }

      return examples.join('\n\n');
    }
  }

  /**
   * Translate natural language to SQL/MongoDB query
   * Supports automatic database/table detection when connectionId is not provided
   */
  async translateQuery(naturalLanguageQuery, connectionId, organizationId, userId, context = []) {
    try {
      Logger.info('Translating query', { 
        organizationId, 
        userId, 
        connectionId,
        queryLength: naturalLanguageQuery.length,
        autoDetect: !connectionId
      });

      // Auto-detect database and table if connectionId not provided
      let detectedConnection = null;
      let detectedTable = null;
      let alternativeMatches = [];
      
      if (!connectionId) {
        const matches = await schemaAggregationService.findMatchingTables(
          organizationId,
          naturalLanguageQuery,
          { recentTables: context.recentTables || [] }
        );
        
        if (matches.length === 0) {
          throw new Error('No matching tables found across your databases. Please connect a database first.');
        }
        
        // Use best match
        const bestMatch = matches[0];
        connectionId = bestMatch.connectionId;
        detectedConnection = bestMatch;
        detectedTable = bestMatch.table;
        
        // Store alternative matches for user review
        alternativeMatches = matches.slice(1, 4).map(m => ({
          connectionId: m.connectionId,
          connectionName: m.connectionName,
          database: m.database,
          table: m.table,
          score: m.score,
          matchReasons: m.matchReasons.slice(0, 2)
        }));
        
        Logger.info('Auto-detected database and table', {
          connectionId,
          table: detectedTable,
          score: bestMatch.score,
          alternativeCount: alternativeMatches.length
        });
      }

      // Check cache
      const cacheKey = this._getCacheKey(naturalLanguageQuery, connectionId, context);
      if (this.translationCache.has(cacheKey)) {
        const cachedTranslation = this.translationCache.get(cacheKey);
        const locationField = cachedTranslation?.dbType === 'mongodb' ? 'collection' : 'table';
        if (!cachedTranslation?.[locationField]) {
          Logger.debug('Discarding stale cached translation missing location metadata', { cacheKey });
          this.translationCache.delete(cacheKey);
        } else {
          Logger.debug('Translation cache hit', { cacheKey });
          return { ...cachedTranslation, cached: true };
        }
      }

      // Get database connection and schema
      const connection = await DatabaseConnection.findOne({
        _id: connectionId,
        organizationId
      }).select('+encryptedPassword +encryptionIV +encryptedUri +uriEncryptionIV');

      if (!connection) {
        throw new Error('Database connection not found or access denied');
      }

      // Extract schema from schemaCache
      const schema = connection.schemaCache || { tables: [] };
      const dbType = connection.type;
      const tableName = connection.database;
      const databaseName = connection.database;

      // Build conversation context with comprehensive schema information
      const systemPrompt = this._generateSystemPrompt(schema, dbType, tableName, databaseName);
      
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      // Add context from previous messages (multi-turn)
      if (context && context.length > 0) {
        context.slice(-4).forEach(msg => { // Last 4 messages for context
          messages.push({
            role: msg.role,
            content: msg.content
          });
        });
      }

      // Add current query
      messages.push({
        role: 'user',
        content: naturalLanguageQuery
      });

      // Call LLM with strict parameters
      const startTime = Date.now();
      let llmResponse, tokensUsed;
      
      if (this.llmProvider === 'openai') {
        const completion = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages,
          temperature: 0, // Deterministic
          max_tokens: 1000,
          response_format: { type: 'json_object' }
        });
        llmResponse = completion.choices[0].message.content;
        tokensUsed = completion.usage.total_tokens;
      } else {
        // Google AI
        const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
        const maxAttempts = this._getGoogleModelPriority().length;
        let attempt = 0;

        while (attempt < maxAttempts) {
          try {
            const result = await this.googleClient.models.generateContent({
              model: this.googleModelName,
              contents: prompt,
              generationConfig: this.googleGenerationConfig
            });

            llmResponse = result?.response?.text ?? result?.text ?? '';

            if (!llmResponse && result?.response?.candidates?.length) {
              const candidate = result.response.candidates[0];
              const partWithText = candidate?.content?.parts?.find(part => part.text);
              if (partWithText?.text) {
                llmResponse = partWithText.text;
              }
            }

            if (llmResponse) {
              break;
            }

            throw new Error('Empty response from Google AI');
          } catch (error) {
            if (this._isGoogleModelNotFound(error) && this._switchToNextGoogleModel()) {
              attempt += 1;
              continue;
            }
            Logger.error('Google AI generation failed', { error: error.message });
            throw error;
          }
        }

        if (!llmResponse) {
          throw new Error('No response received from Google AI');
        }

        // Clean up response if it has markdown code blocks
        llmResponse = llmResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        tokensUsed = 0; // Google AI doesn't provide token count in same way
      }

      const llmResponseTime = Date.now() - startTime;

      // Parse JSON response
      let translation;
      try {
        translation = JSON.parse(llmResponse);
      } catch (parseError) {
        Logger.error('Failed to parse LLM response', { llmResponse, parseError });
        throw new Error('Invalid response format from AI model');
      }

      // Validate translation
      const validation = this._validateTranslation(translation, dbType);
      if (!validation.valid) {
        throw new Error(`Query validation failed: ${validation.reason}`);
      }

      // Generate signature for audit trail
      const signature = this._signTranslation(translation, userId, organizationId);

      const rawQuery = translation[dbType === 'mongodb' ? 'mongoQuery' : 'sqlQuery'];
      const initialCollection = translation.collection
        || translation.table
        || rawQuery?.collection
        || translation.targetCollection
        || translation.metadata?.collection
        || null;

      const resolvedCollection = dbType === 'mongodb'
        ? this._resolveMongoCollection({
            candidate: initialCollection,
            translation: {
              ...translation,
              query: rawQuery
            },
            schema,
            naturalLanguageQuery,
            databaseName
          })
        : initialCollection;

      const normalizedFallback = this._normalizeCollectionName(initialCollection);
      const schemaCollectionMatch = dbType === 'mongodb'
        ? this._findCollectionMatch(schema?.tables || [], normalizedFallback)
        : null;

      const finalCollection = resolvedCollection
        || schemaCollectionMatch
        || normalizedFallback
        || translation.metadata?.collection
        || null;

      // Prepare result
      const result = {
        translationId: crypto.randomUUID(),
        query: rawQuery,
        explain: translation.explain,
        requiresIndexes: translation.requiresIndexes || [],
        estimatedCost: translation.estimatedCost || 0.5,
        safety: translation.safety || 'safe',
        warningMessage: translation.warningMessage,
        dbType,
        connectionId,
        collection: finalCollection || 'unknown',
        table: translation.table || null,
        signature,
        tokensUsed,
        llmResponseTime,
        cached: false,
        timestamp: new Date(),
        autoDetected: !!detectedConnection,
        detectedFrom: detectedConnection ? {
          connectionName: detectedConnection.connectionName,
          database: detectedConnection.database,
          table: detectedTable,
          score: detectedConnection.score,
          matchReasons: detectedConnection.matchReasons,
          alternatives: alternativeMatches
        } : null,
        metadata: {
          ...(translation.metadata || {}),
          collection: finalCollection || translation.metadata?.collection || null,
          table: translation.table || null,
          autoDetected: !!detectedConnection
        },
        originalQuery: naturalLanguageQuery
      };

      // Cache translation
      this.translationCache.set(cacheKey, result);
      
      // Expire cache after 1 hour
      setTimeout(() => this.translationCache.delete(cacheKey), 3600000);

      // Record usage for billing
      await usageService.recordQueryTranslation(organizationId, userId, tokensUsed);

      // Audit log
      await this._auditTranslation(result, naturalLanguageQuery, organizationId, userId);

      Logger.info('Query translated successfully', { 
        translationId: result.translationId,
        safety: result.safety,
        tokensUsed 
      });

      return result;
    } catch (error) {
      Logger.error('Query translation failed', error);
      throw error;
    }
  }

  /**
   * Execute translated query with full safety pipeline
   */
  async executeQuery(translationId, translation, connectionId, organizationId, userId, options = {}) {
    const executionId = crypto.randomUUID();
    
    try {
      Logger.info('Executing query', { 
        executionId,
        translationId,
        organizationId, 
        userId, 
        connectionId 
      });

      // Verify signature
      const signatureValid = this._verifySignature(translation, userId, organizationId);
      if (!signatureValid) {
        throw new Error('Query signature verification failed - possible tampering detected');
      }

      // Check if translation is marked unsafe
      if (translation.safety === 'unsafe') {
        throw new Error(`Query execution denied: ${translation.warningMessage || 'Unsafe operation detected'}`);
      }

      // Get database connection with RBAC check
      const connection = await DatabaseConnection.findOne({
        _id: connectionId,
        organizationId
      }).select('+encryptedPassword +encryptionIV +encryptedUri +uriEncryptionIV');

      if (!connection) {
        throw new Error('Database connection not found or access denied');
      }

      // Check user permissions
      const user = await User.findById(userId);
      if (!user || (user.organizationRole !== 'owner' && user.organizationRole !== 'admin' && user.organizationRole !== 'member')) {
        throw new Error('Insufficient permissions to execute queries');
      }

      // Check cache for results
      const resultCacheKey = this._getResultCacheKey(translation.query, connectionId);
      if (this.resultCache.has(resultCacheKey) && !options.forceRefresh) {
        Logger.debug('Result cache hit', { resultCacheKey });
        const cachedResult = this.resultCache.get(resultCacheKey);
        return { ...cachedResult, cached: true };
      }

      // Create execution job for cancellation support
      this.executionJobs.set(executionId, {
        status: 'running',
        startTime: Date.now(),
        organizationId,
        userId
      });

      // Execute query with timeout and row limits
      const startTime = Date.now();
      let results;
      
      try {
        results = await Promise.race([
          this._executeWithLimits(connection, translation, options),
          this._timeoutPromise(this.MAX_EXECUTION_TIME_MS)
        ]);
      } catch (execError) {
        if (execError.message === 'Query execution timeout') {
          throw new Error(`Query execution exceeded ${this.MAX_EXECUTION_TIME_MS / 1000}s time limit`);
        }
        throw execError;
      }

      const executionTime = Date.now() - startTime;

      // Apply row limit
      if (results.rows && results.rows.length > this.MAX_ROWS) {
        results.rows = results.rows.slice(0, this.MAX_ROWS);
        results.truncated = true;
        results.totalRows = results.rows.length;
      }

      // Apply column masking based on RBAC (mask sensitive fields)
      if (user.organizationRole === 'member') {
        results.rows = this._maskSensitiveColumns(results.rows, connection.schema);
      }

      // Prepare execution result
      const executionResult = {
        executionId,
        translationId,
        results: results.rows || results,
        rowCount: results.rows ? results.rows.length : 0,
        truncated: results.truncated || false,
        executionTime,
        connectionId,
        collection: translation.collection || null,
        timestamp: new Date(),
        cached: false
      };

      // Cache results
      this.resultCache.set(resultCacheKey, executionResult);
      setTimeout(() => this.resultCache.delete(resultCacheKey), 1800000); // 30 min cache

      // Store in database for history
      await QueryResult.create({
        executionId,
        translationId,
        organizationId,
        userId,
        connectionId,
        query: translation.query,
        explain: translation.explain,
        results: results.rows || results,
        data: results.rows || results,
        rowCount: executionResult.rowCount,
        executionTime,
        status: 'success',
        truncated: executionResult.truncated,
        cached: executionResult.cached,
        metadata: {
          dbType: translation.dbType,
          estimatedCost: translation.estimatedCost,
          tokensUsed: translation.tokensUsed,
          collection: translation.collection || null
        }
      });

      // Record usage for billing
      await usageService.recordQueryExecution(organizationId, userId, executionResult.rowCount);

      // Audit log
      await this._auditExecution(executionResult, translation, organizationId, userId);

      // Remove from active jobs
      this.executionJobs.delete(executionId);

      Logger.info('Query executed successfully', { 
        executionId,
        rowCount: executionResult.rowCount,
        executionTime 
      });

      return executionResult;
    } catch (error) {
      // Clean up job
      this.executionJobs.delete(executionId);
      
      // Log failed execution
      await QueryResult.create({
        executionId,
        translationId,
        organizationId,
        userId,
        connectionId,
        query: translation?.query || '',
        explain: translation?.explain || '',
        results: [],
        data: [],
        rowCount: 0,
        executionTime: 0,
        status: 'failed',
        error: error.message
      });

      Logger.error('Query execution failed', { executionId, error });
      throw error;
    }
  }

  /**
   * Execute query with row/time limits
   */
  async _executeWithLimits(connection, translation, options = {}) {
    const limit = Math.min(options.limit || this.MAX_ROWS, this.MAX_ROWS);

    if (translation.dbType === 'mongodb') {
      // MongoDB query execution
      return await externalDatabaseService.executeMongoQuery(
        connection,
        translation.query,
        {
          limit,
          collection: translation.collection,
          metadata: translation.metadata || {}
        }
      );
    } else if (translation.dbType === 'postgresql' || translation.dbType === 'mysql') {
      // SQL query execution
      return await externalDatabaseService.executeSQLQuery(
        connection,
        translation.query,
        { limit }
      );
    } else {
      throw new Error(`Unsupported database type: ${translation.dbType}`);
    }
  }

  /**
   * Timeout promise helper
   */
  _timeoutPromise(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query execution timeout')), ms);
    });
  }

  /**
   * Validate translated query for safety
   */
  _validateTranslation(translation, dbType) {
    // Check required fields
    const queryField = dbType === 'mongodb' ? 'mongoQuery' : 'sqlQuery';
    if (!translation[queryField]) {
      return { valid: false, reason: 'Missing query in translation' };
    }

    if (!translation.explain) {
      return { valid: false, reason: 'Missing explanation' };
    }

    const locationField = dbType === 'mongodb' ? 'collection' : 'table';
    if (!translation[locationField] || typeof translation[locationField] !== 'string') {
      return { valid: false, reason: `Missing ${locationField} name in translation` };
    }

    // SQL validation
    if (dbType !== 'mongodb') {
      const query = translation.sqlQuery.toUpperCase();
      
      // Check for destructive keywords
      for (const keyword of this.DESTRUCTIVE_SQL_KEYWORDS) {
        if (query.includes(keyword)) {
          return { valid: false, reason: `Destructive keyword detected: ${keyword}` };
        }
      }

      // Must be SELECT query
      if (!query.trim().startsWith('SELECT')) {
        return { valid: false, reason: 'Only SELECT queries are allowed' };
      }
    } else {
      // MongoDB validation
      const query = Array.isArray(translation.mongoQuery) 
        ? translation.mongoQuery 
        : [translation.mongoQuery];

      for (const stage of query) {
        const stageKeys = Object.keys(stage);
        for (const key of stageKeys) {
          if (this.BLACKLISTED_MONGO_STAGES.includes(key)) {
            return { valid: false, reason: `Blacklisted MongoDB stage: ${key}` };
          }
        }
      }
    }

    return { valid: true };
  }

  /**
   * Sign translation for audit trail
   */
  _signTranslation(translation, userId, organizationId) {
    const data = JSON.stringify({ translation, userId, organizationId, ts: Date.now() });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify translation signature
   */
  _verifySignature(translation, userId, organizationId) {
    // In production, implement proper signature verification
    return translation.signature && translation.signature.length === 64;
  }

  /**
   * Mask sensitive columns for non-admin users
   */
  _maskSensitiveColumns(rows, schema) {
    const sensitiveFields = ['password', 'ssn', 'credit_card', 'api_key', 'secret', 'token'];
    
    return rows.map(row => {
      const masked = { ...row };
      Object.keys(masked).forEach(key => {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          masked[key] = '***REDACTED***';
        }
      });
      return masked;
    });
  }

  /**
   * Generate cache keys
   */
  _getCacheKey(query, connectionId, context) {
    const contextStr = context.map(c => c.content).join('|');
    return crypto.createHash('md5').update(`${query}:${connectionId}:${contextStr}`).digest('hex');
  }

  _getResultCacheKey(query, connectionId) {
    return crypto.createHash('md5').update(`${JSON.stringify(query)}:${connectionId}`).digest('hex');
  }

  _normalizeCollectionName(name) {
    if (!name || typeof name !== 'string') {
      return null;
    }

    const sanitized = name.trim().replace(/[`'"\\]/g, '');
    if (!sanitized) {
      return null;
    }

    const finalSegment = sanitized.split('.').pop();
    if (!finalSegment) {
      return null;
    }

    const normalized = finalSegment.trim().toLowerCase();
    if (!normalized || normalized === 'unknown' || normalized === 'undefined') {
      return null;
    }

    return finalSegment.trim();
  }

  _findCollectionMatch(tables, candidate) {
    if (!candidate) {
      return null;
    }

    const normalizedCandidate = candidate.toLowerCase();
    const match = tables.find(table => {
      if (!table?.name || typeof table.name !== 'string') {
        return false;
      }
      return table.name.toLowerCase() === normalizedCandidate;
    });

    return match?.name || null;
  }

  _extractMongoFieldCandidates(query) {
    const fields = new Set();

    const visit = value => {
      if (!value) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(item => visit(item));
        return;
      }

      if (typeof value !== 'object') {
        return;
      }

      Object.entries(value).forEach(([key, val]) => {
        if (typeof key === 'string' && !key.startsWith('$')) {
          const rootKey = key.split('.')[0];
          fields.add(rootKey);
        }
        visit(val);
      });
    };

    visit(query);
    return fields;
  }

  _resolveMongoCollection({ candidate, translation = {}, schema = {}, naturalLanguageQuery = '', databaseName }) {
    const tables = Array.isArray(schema.tables) ? schema.tables : [];

    if (!tables.length) {
      return this._normalizeCollectionName(candidate);
    }

    const normalizedCandidate = this._normalizeCollectionName(candidate);
    const candidateMatch = this._findCollectionMatch(tables, normalizedCandidate);
    if (candidateMatch) {
      return candidateMatch;
    }

    const alternativeCandidates = [
      translation.collection,
      translation.table,
      translation.targetCollection,
      translation.metadata?.collection,
      translation.metadata?.table,
      translation.metadata?.tableName
    ];

    for (const alt of alternativeCandidates) {
      const normalized = this._normalizeCollectionName(alt);
      const match = this._findCollectionMatch(tables, normalized);
      if (match) {
        return match;
      }
    }

    const fieldCandidates = this._extractMongoFieldCandidates(translation.query);
    (translation.requiresIndexes || []).forEach(field => {
      if (typeof field === 'string') {
        fieldCandidates.add(field.split('.')[0]);
      }
    });

    let bestMatch = null;
    let bestScore = -1;
    const normalizedQueryText = naturalLanguageQuery.toLowerCase();

    tables.forEach(table => {
      if (!table?.name) {
        return;
      }

      const tableName = table.name;
      const columnSet = new Set((table.columns || []).map(col => col?.name).filter(Boolean));
      let score = 0;

      fieldCandidates.forEach(field => {
        if (!field) {
          return;
        }
        if (columnSet.has(field)) {
          score += 3;
        } else if (columnSet.has(field.split('.')[0])) {
          score += 2;
        }
      });

      if (normalizedQueryText.includes(tableName.toLowerCase())) {
        score += 5;
      }

      if (databaseName && tableName === databaseName) {
        score -= 2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = tableName;
      }
    });

    if (bestScore > 0 && bestMatch) {
      return bestMatch;
    }

    return tables[0]?.name || candidateMatch || normalizedCandidate || null;
  }

  /**
   * Cancel running query
   */
  async cancelQuery(executionId, organizationId, userId) {
    const job = this.executionJobs.get(executionId);
    
    if (!job) {
      throw new Error('Query execution not found or already completed');
    }

    if (job.organizationId !== organizationId || job.userId !== userId) {
      throw new Error('Not authorized to cancel this query');
    }

    job.status = 'cancelled';
    this.executionJobs.delete(executionId);

    Logger.info('Query cancelled', { executionId, organizationId, userId });

    return { cancelled: true, executionId };
  }

  /**
   * Get query history
   */
  async getHistory(organizationId, userId, options = {}) {
    const { limit = 50, offset = 0, connectionId } = options;

    const filter = { organizationId, userId };
    if (connectionId) {
      filter.connectionId = connectionId;
    }

    const history = await QueryResult.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset)
      .select('-results'); // Don't return full results in history list

    const total = await QueryResult.countDocuments(filter);

    return {
      history,
      total,
      limit,
      offset
    };
  }

  /**
   * Get specific query result
   */
  async getResult(executionId, organizationId, userId) {
    const result = await QueryResult.findOne({
      executionId,
      organizationId,
      userId
    });

    if (!result) {
      throw new Error('Query result not found or access denied');
    }

    return result;
  }

  /**
   * Generate clarifying questions
   */
  async generateClarifyingQuestions(naturalLanguageQuery, connectionId, organizationId) {
    try {
      const connection = await DatabaseConnection.findOne({
        _id: connectionId,
        organizationId
      });

      if (!connection) {
        throw new Error('Database connection not found');
      }

      const schema = connection.schema || [];
      const schemaDescription = schema.map(col => `${col.name} (${col.type})`).join(', ');

      const prompt = `Given this database schema: ${schemaDescription}

And this user query: "${naturalLanguageQuery}"

Generate 3 clarifying questions to help refine the query. Return only a JSON array of strings.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });

      const response = JSON.parse(completion.choices[0].message.content);
      return response.questions || [];
    } catch (error) {
      Logger.error('Failed to generate clarifying questions', error);
      return [];
    }
  }

  /**
   * Audit translation
   */
  async _auditTranslation(translation, naturalLanguageQuery, organizationId, userId) {
    try {
      if (!translation || !naturalLanguageQuery) {
        return;
      }

      const rawQuery = translation.query
        || translation.mongoQuery
        || translation.sqlQuery
        || translation.metadata?.query
        || null;

      const queryPayload = rawQuery ?? {};
      const collectionName = translation.collection
        || translation.table
        || queryPayload?.collection
        || translation.metadata?.tableName
        || null;

      const isAggregate = translation.dbType === 'mongodb' && (
        Array.isArray(queryPayload)
        || Array.isArray(queryPayload?.aggregate)
        || !!queryPayload?.aggregate
      );

      const safetyInfo = translation.safety;
      const safetyPassed = typeof safetyInfo === 'object'
        ? safetyInfo.allowed !== false
        : safetyInfo === true || safetyInfo === 'safe' || safetyInfo === undefined;

      const safetyReason = typeof safetyInfo === 'object'
        ? safetyInfo.reason
        : translation.warningMessage || '';

      await AuditQuery.create({
        organizationId,
        userId,
        type: 'translation',
        translationId: translation.translationId,
        userQuery: naturalLanguageQuery,
        generatedQuery: queryPayload,
        queryType: translation.dbType === 'mongodb'
          ? (isAggregate ? 'aggregate' : 'find')
          : 'select',
        collection: collectionName || 'unknown',
        executed: false,
        safetyPassed,
        safetyReason,
        explain: translation.explain || '',
        requiresIndexes: (translation.requiresIndexes || []).map(idx => String(idx)),
        tokensUsed: translation.tokensUsed || 0,
        metadata: {
          dbType: translation.dbType,
          connectionId: translation.connectionId,
          estimatedCost: translation.estimatedCost,
          table: translation.table || null,
          collection: collectionName || null
        },
        success: true
      });
    } catch (error) {
      Logger.error('Failed to audit translation', error);
    }
  }

  /**
   * Audit execution
   */
  async _auditExecution(execution, translation, organizationId, userId) {
    try {
      if (!execution || !translation) {
        return;
      }

      const resultCount = Array.isArray(execution.results)
        ? execution.results.length
        : execution.rowCount || 0;

      const safetyInfo = translation.safety;
      const safetyPassed = typeof safetyInfo === 'object'
        ? safetyInfo.allowed !== false
        : safetyInfo === true || safetyInfo === 'safe' || safetyInfo === undefined;

      const update = {
        executed: true,
        executionTime: execution.executionTime,
        resultCount,
        success: true,
        metadata: {
          ...(translation.metadata || {}),
          executionId: execution.executionId,
          connectionId: execution.connectionId,
          cached: execution.cached
        }
      };

      const updated = await AuditQuery.findOneAndUpdate(
        {
          translationId: translation.translationId,
          userId
        },
        update,
        { new: true }
      );

      if (!updated) {
        const inferredQueryType = translation.dbType === 'mongodb'
          ? (Array.isArray(translation.query) ? 'aggregate' : 'find')
          : 'select';

        await AuditQuery.create({
          organizationId,
          userId,
          type: 'execution',
          translationId: translation.translationId,
          userQuery: translation.originalQuery || '',
          generatedQuery: translation.query || {},
          queryType: inferredQueryType,
          collection: translation.collection
            || translation.query?.collection
            || translation.table
            || 'unknown',
          executed: true,
          executionTime: execution.executionTime,
          resultCount,
          safetyPassed,
          safetyReason: typeof safetyInfo === 'object' ? safetyInfo.reason : translation.warningMessage || '',
          explain: translation.explain || '',
          requiresIndexes: (translation.requiresIndexes || []).map(idx => String(idx)),
          tokensUsed: translation.tokensUsed || 0,
          metadata: {
            executionId: execution.executionId,
            connectionId: execution.connectionId,
            cached: execution.cached,
            dbType: translation.dbType
          },
          success: true
        });
      }
    } catch (error) {
      Logger.error('Failed to audit execution', error);
    }
  }

  /**
   * Clear caches (useful for testing or maintenance)
   */
  clearCaches() {
    this.translationCache.clear();
    this.resultCache.clear();
    Logger.info('Chat service caches cleared');
  }
}

export const chatService = new ChatService();
export default chatService;
