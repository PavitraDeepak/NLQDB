import { DatabaseConnection } from '../models/index.js';
import { Logger } from '../middlewares/logger.js';
import externalDatabaseService from './externalDatabaseService.js';

/**
 * Schema Aggregation Service
 * Aggregates schema information across all connected databases for intelligent query routing
 */
class SchemaAggregationService {
  constructor() {
    this.schemaIndex = new Map(); // organizationId -> aggregated schema
    this.cacheExpiry = 3600000; // 1 hour
  }

  /**
   * Get aggregated schema for all databases in an organization
   */
  async getAggregatedSchema(organizationId, forceRefresh = false) {
    try {
      const cacheKey = organizationId.toString();
      
      // Check cache
      if (!forceRefresh && this.schemaIndex.has(cacheKey)) {
        const cached = this.schemaIndex.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          Logger.debug('Schema cache hit', { organizationId });
          return cached.schema;
        }
      }

      Logger.info('Building aggregated schema', { organizationId });

      // Get all connections for the organization
      const connections = await DatabaseConnection.find({ 
        organizationId,
        status: 'active'
      }).select('+encryptedPassword +encryptionIV +encryptedUri +uriEncryptionIV');

      if (!connections.length) {
        return { databases: [] };
      }

      // Build aggregated schema
      const databases = [];

      for (const connection of connections) {
        try {
          // Use existing schemaCache or introspect if missing
          let schema = connection.schemaCache;
          
          if (!schema || !schema.tables || schema.tables.length === 0) {
            Logger.info('Schema cache missing, introspecting', { 
              connectionId: connection._id,
              type: connection.type 
            });
            
            // Introspect based on database type
            if (connection.type === 'mongodb') {
              schema = await externalDatabaseService.introspectMongoDB(connection);
            } else {
              schema = await externalDatabaseService.introspectDatabase(connection);
            }
            
            // Update connection with fresh schema
            connection.schemaCache = schema;
            await connection.save();
          }

          databases.push({
            connectionId: connection._id.toString(),
            connectionName: connection.name,
            type: connection.type,
            database: connection.database,
            host: connection.host,
            tables: schema.tables || [],
            collections: schema.tables || [], // Alias for MongoDB
            metadata: {
              lastIntrospected: connection.lastIntrospected || new Date(),
              tableCount: (schema.tables || []).length,
              totalColumns: (schema.tables || []).reduce((sum, t) => sum + (t.columns?.length || 0), 0)
            }
          });

          Logger.debug('Added database to schema index', {
            connectionId: connection._id,
            tableCount: (schema.tables || []).length
          });
        } catch (error) {
          Logger.error('Failed to load schema for connection', {
            connectionId: connection._id,
            error: error.message
          });
          // Continue with other connections even if one fails
        }
      }

      const aggregatedSchema = {
        organizationId,
        databases,
        totalDatabases: databases.length,
        totalTables: databases.reduce((sum, db) => sum + db.metadata.tableCount, 0),
        timestamp: new Date()
      };

      // Cache the result
      this.schemaIndex.set(cacheKey, {
        schema: aggregatedSchema,
        timestamp: Date.now()
      });

      // Auto-expire cache
      setTimeout(() => this.schemaIndex.delete(cacheKey), this.cacheExpiry);

      Logger.info('Aggregated schema built successfully', {
        organizationId,
        databaseCount: databases.length,
        tableCount: aggregatedSchema.totalTables
      });

      return aggregatedSchema;
    } catch (error) {
      Logger.error('Failed to build aggregated schema', error);
      throw error;
    }
  }

  /**
   * Search for matching tables/collections across all databases
   * Returns ranked matches based on field overlap, name similarity, and context
   */
  async findMatchingTables(organizationId, query, context = {}) {
    try {
      const aggregatedSchema = await this.getAggregatedSchema(organizationId);
      const matches = [];
      const normalizedQuery = query.toLowerCase();

      // Extract potential field names and keywords from query
      const fieldCandidates = this._extractFieldCandidates(normalizedQuery);
      const keywords = this._extractKeywords(normalizedQuery);

      for (const database of aggregatedSchema.databases) {
        for (const table of database.tables) {
          const score = this._scoreTableMatch(table, database, {
            query: normalizedQuery,
            fieldCandidates,
            keywords,
            context
          });

          if (score > 0) {
            matches.push({
              score,
              connectionId: database.connectionId,
              connectionName: database.connectionName,
              dbType: database.type,
              database: database.database,
              table: table.name,
              columns: table.columns || [],
              matchReasons: this._getMatchReasons(table, database, {
                query: normalizedQuery,
                fieldCandidates,
                keywords
              })
            });
          }
        }
      }

      // Sort by score (highest first)
      matches.sort((a, b) => b.score - a.score);

      Logger.info('Table matching complete', {
        organizationId,
        query,
        matchCount: matches.length,
        topScore: matches[0]?.score || 0,
        topMatches: matches.slice(0, 3).map(m => ({
          table: m.table,
          score: m.score,
          connection: m.connectionName
        }))
      });

      return matches;
    } catch (error) {
      Logger.error('Failed to find matching tables', error);
      throw error;
    }
  }

  /**
   * Score a table's relevance to the query
   */
  _scoreTableMatch(table, database, { query, fieldCandidates, keywords, context }) {
    let score = 0;

    const tableName = (table.name || '').toLowerCase();
    const columns = table.columns || [];
    const columnNames = columns.map(col => (col.name || '').toLowerCase());
    const columnSet = new Set(columnNames);

    // 1. Direct table name match (highest priority)
    if (query.includes(tableName)) {
      score += 20;
    }

    // 2. Partial table name match
    const tableWords = tableName.split(/[_\s-]/);
    for (const word of tableWords) {
      if (word && query.includes(word)) {
        score += 10;
      }
    }

    // 3. Field name matches (very important)
    let fieldMatchCount = 0;
    for (const field of fieldCandidates) {
      if (columnSet.has(field)) {
        score += 8;
        fieldMatchCount++;
      } else if (columnNames.some(col => col.includes(field))) {
        score += 4;
        fieldMatchCount++;
      } else if (columnNames.some(col => field.includes(col))) {
        score += 2;
      }
    }
    
    // Bonus for tables with multiple matching fields (indicates strong relevance)
    if (fieldMatchCount >= 2) {
      score += 10 * fieldMatchCount; // Strong boost for multi-field matches
    }

    // 4. Keyword relevance (common business terms)
    for (const keyword of keywords) {
      if (tableName.includes(keyword)) {
        score += 5;
      }
      if (columnNames.some(col => col.includes(keyword))) {
        score += 3;
      }
    }

    // 4b. Revenue-specific boosting
    if (query.includes('revenue') || query.includes('income') || query.includes('earnings')) {
      if (tableName.includes('subscription') || tableName.includes('plan')) {
        score += 15; // Strong boost for subscription tables
      }
      if (columnNames.some(col => col.includes('mrr') || col.includes('arr') || col.includes('recurring'))) {
        score += 10; // Boost for recurring revenue fields
      }
    }

    // 5. Column count (more columns = more likely to be relevant)
    if (columns.length > 5) {
      score += 2;
    }

    // 6. Context hints (previous queries, selected connection)
    if (context.preferredConnectionId === database.connectionId) {
      score += 15;
    }

    if (context.recentTables && context.recentTables.includes(table.name)) {
      score += 10;
    }

    return score;
  }

  /**
   * Extract potential field names from natural language query
   */
  _extractFieldCandidates(query) {
    const fields = new Set();
    
    // Common field patterns - expanded to catch more domain-specific terms
    const patterns = [
      /\b(id|name|email|status|price|amount|total|count|date|time|created|updated|deleted)\b/gi,
      /\b(user|customer|order|product|transaction|payment|invoice|address|restaurant|venue|store)\b/gi,
      /\b(rating|review|feedback|comment|score|stars|rank)\b/gi,
      /\b(quantity|qty|items|description|notes|title|category|type)\b/gi,
      /\b(\w+_id|\w+_name|\w+_at|\w+_by)\b/gi
    ];

    for (const pattern of patterns) {
      const matches = query.match(pattern);
      if (matches) {
        matches.forEach(m => fields.add(m.toLowerCase()));
      }
    }

    // Extract nouns and potential field names (words that might be column names)
    // Look for words between "of", "the", "in", "for", etc.
    const nounPatterns = [
      /(?:average|total|sum|count|number|list|show|get|find|fetch)\s+(?:of\s+)?(?:the\s+)?(\w+)/gi,
      /(\w+)\s+(?:of|in|from|for)\s+(?:the\s+)?(\w+)/gi,
    ];

    for (const pattern of nounPatterns) {
      const matches = [...query.matchAll(pattern)];
      matches.forEach(match => {
        // Add both captured groups as potential fields
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            fields.add(match[i].toLowerCase());
          }
        }
      });
    }

    // Semantic field mapping - domain-specific synonyms
    const semanticMappings = {
      'revenue': ['price', 'amount', 'total', 'mrr', 'arr', 'subscription', 'plan'],
      'income': ['price', 'amount', 'total', 'revenue', 'earnings'],
      'sales': ['order', 'transaction', 'purchase', 'total', 'amount'],
      'users': ['customer', 'account', 'profile', 'member'],
      'transactions': ['order', 'payment', 'purchase', 'invoice'],
      'rating': ['rating', 'score', 'stars', 'review', 'feedback'],
      'reviews': ['review', 'rating', 'comment', 'feedback', 'score'],
      'restaurant': ['restaurant', 'venue', 'store', 'shop', 'location']
    };

    // Apply semantic mappings
    for (const [keyword, relatedFields] of Object.entries(semanticMappings)) {
      if (query.toLowerCase().includes(keyword)) {
        relatedFields.forEach(field => fields.add(field));
      }
    }

    return Array.from(fields);
  }

  /**
   * Extract business keywords from query
   */
  _extractKeywords(query) {
    const businessKeywords = [
      'user', 'customer', 'order', 'product', 'transaction', 'payment',
      'invoice', 'sale', 'purchase', 'inventory', 'account', 'profile',
      'address', 'contact', 'subscription', 'plan', 'report', 'analytics',
      'log', 'audit', 'history', 'record', 'entry', 'item', 'category',
      'tag', 'comment', 'review', 'rating', 'feedback'
    ];

    return businessKeywords.filter(keyword => query.includes(keyword));
  }

  /**
   * Get human-readable match reasons
   */
  _getMatchReasons(table, database, { query, fieldCandidates, keywords }) {
    const reasons = [];
    const tableName = (table.name || '').toLowerCase();
    const columnNames = (table.columns || []).map(col => (col.name || '').toLowerCase());

    if (query.includes(tableName)) {
      reasons.push(`Table name "${table.name}" matches query`);
    }

    const matchingFields = fieldCandidates.filter(f => columnNames.includes(f));
    if (matchingFields.length > 0) {
      reasons.push(`Has matching fields: ${matchingFields.join(', ')}`);
    }

    const matchingKeywords = keywords.filter(k => tableName.includes(k) || columnNames.some(col => col.includes(k)));
    if (matchingKeywords.length > 0) {
      reasons.push(`Contains relevant keywords: ${matchingKeywords.join(', ')}`);
    }

    if (reasons.length === 0) {
      reasons.push('Partial match based on schema similarity');
    }

    return reasons;
  }

  /**
   * Clear cache for an organization
   */
  clearCache(organizationId) {
    if (organizationId) {
      this.schemaIndex.delete(organizationId.toString());
    } else {
      this.schemaIndex.clear();
    }
    Logger.info('Schema cache cleared', { organizationId });
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedOrganizations: this.schemaIndex.size,
      entries: Array.from(this.schemaIndex.entries()).map(([orgId, data]) => ({
        organizationId: orgId,
        databaseCount: data.schema.databases.length,
        tableCount: data.schema.totalTables,
        age: Math.floor((Date.now() - data.timestamp) / 1000)
      }))
    };
  }
}

export const schemaAggregationService = new SchemaAggregationService();
export default schemaAggregationService;
