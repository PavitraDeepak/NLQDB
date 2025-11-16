import pg from 'pg';
import mysql from 'mysql2/promise';
import tedious from 'tedious';
import { MongoClient } from 'mongodb';
import { DatabaseConnection } from '../models/index.js';
import { Logger } from '../middlewares/logger.js';

const { Pool: PgPool } = pg;

class ExternalDatabaseService {
  constructor() {
    this.connectionPools = new Map(); // organizationId -> connectionId -> pool
  }

  /**
   * Test database connection
   */
  async testConnection(connectionConfig) {
    try {
      const { type, connectionMethod } = connectionConfig;

      Logger.info('Testing database connection', { type, connectionMethod });

      // Handle URI-based connections
      if (connectionMethod === 'uri') {
        return await this.testConnectionByUri(connectionConfig);
      }

      // Handle standard connections
      switch (type) {
        case 'postgresql':
          return await this.testPostgreSQL(connectionConfig);
        case 'mysql':
        case 'mariadb':
          return await this.testMySQL(connectionConfig);
        case 'sqlserver':
          return await this.testSQLServer(connectionConfig);
        case 'mongodb':
          return await this.testMongoDB(connectionConfig);
        default:
          throw new Error(`Unsupported database type: ${type}`);
      }
    } catch (error) {
      Logger.error('Database connection test failed', error);
      return {
        success: false,
        message: 'Connection failed',
        error: error.message
      };
    }
  }

  /**
   * Test connection using URI (for NoSQL databases like MongoDB, Redis)
   */
  async testConnectionByUri(config) {
    const { type, uri } = config;

    switch (type) {
      case 'mongodb': {
        const client = new MongoClient(uri, {
          serverSelectionTimeoutMS: 10000
        });

        try {
          await client.connect();
          await client.db().admin().ping();
          const admin = client.db().admin();
          const serverInfo = await admin.serverInfo();
          await client.close();
          
          return {
            success: true,
            message: 'Connection successful',
            version: serverInfo.version
          };
        } catch (error) {
          try { await client.close(); } catch (e) {}
          throw error;
        }
      }
      
      case 'redis': {
        // Redis support can be added here
        throw new Error('Redis support not yet implemented');
      }

      default:
        throw new Error(`URI-based connection not supported for ${type}`);
    }
  }

  async testPostgreSQL(config) {
    const client = new PgPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl?.enabled ? { rejectUnauthorized: config.ssl.rejectUnauthorized } : false,
      max: 1,
      connectionTimeoutMillis: 10000
    });

    try {
      const result = await client.query('SELECT version()');
      await client.end();
      
      return {
        success: true,
        message: 'Connection successful',
        version: result.rows[0].version
      };
    } catch (error) {
      await client.end();
      throw error;
    }
  }

  async testMySQL(config) {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl?.enabled ? { rejectUnauthorized: config.ssl.rejectUnauthorized } : false,
      connectTimeout: 10000
    });

    try {
      const [rows] = await connection.execute('SELECT VERSION() as version');
      await connection.end();
      
      return {
        success: true,
        message: 'Connection successful',
        version: rows[0].version
      };
    } catch (error) {
      await connection.end();
      throw error;
    }
  }

  async testSQLServer(config) {
    return new Promise((resolve, reject) => {
      const connection = new tedious.Connection({
        server: config.host,
        authentication: {
          type: 'default',
          options: {
            userName: config.username,
            password: config.password
          }
        },
        options: {
          database: config.database,
          port: config.port,
          encrypt: config.ssl?.enabled || false,
          trustServerCertificate: !config.ssl?.rejectUnauthorized
        }
      });

      connection.on('connect', (err) => {
        if (err) {
          reject(err);
        } else {
          connection.close();
          resolve({
            success: true,
            message: 'Connection successful'
          });
        }
      });

      connection.connect();
    });
  }

  async testMongoDB(config) {
    const uri = `mongodb://${config.username}:${encodeURIComponent(config.password)}@${config.host}:${config.port}/${config.database}`;
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      ssl: config.ssl?.enabled
    });

    try {
      await client.connect();
      await client.db().admin().ping();
      await client.close();
      
      return {
        success: true,
        message: 'Connection successful'
      };
    } catch (error) {
      await client.close();
      throw error;
    }
  }

  /**
   * Get or create connection pool for a database connection
   */
  async getPool(connectionId, organizationId) {
    const poolKey = `${organizationId}:${connectionId}`;
    
    if (this.connectionPools.has(poolKey)) {
      return this.connectionPools.get(poolKey);
    }

    const connection = await DatabaseConnection.findOne({
      _id: connectionId,
      organizationId,
      status: 'active'
    }).select('+encryptedPassword +encryptionIV +encryptedUri +uriEncryptionIV');

    if (!connection) {
      throw new Error('Database connection not found or inactive');
    }

    const pool = await this.createPool(connection);
    this.connectionPools.set(poolKey, pool);

    return pool;
  }

  async createPool(connection) {
    // URI-based connection
    if (connection.connectionMethod === 'uri') {
      const uri = connection.decryptUri();
      
      switch (connection.type) {
        case 'mongodb':
          return new MongoClient(uri, {
            maxPoolSize: connection.connectionOptions?.maxConnections || 5,
            serverSelectionTimeoutMS: connection.connectionOptions?.connectionTimeout || 30000
          });
        
        default:
          throw new Error(`URI-based pooling not implemented for ${connection.type}`);
      }
    }

    // Standard connection
    const password = connection.decryptPassword();

    switch (connection.type) {
      case 'postgresql':
        return new PgPool({
          host: connection.host,
          port: connection.port,
          database: connection.database,
          user: connection.username,
          password: password,
          ssl: connection.ssl?.enabled ? { rejectUnauthorized: connection.ssl.rejectUnauthorized } : false,
          max: connection.connectionOptions.maxConnections,
          idleTimeoutMillis: connection.connectionOptions.idleTimeout,
          connectionTimeoutMillis: connection.connectionOptions.connectionTimeout
        });

      case 'mysql':
      case 'mariadb':
        return mysql.createPool({
          host: connection.host,
          port: connection.port,
          database: connection.database,
          user: connection.username,
          password: password,
          ssl: connection.ssl?.enabled ? { rejectUnauthorized: connection.ssl.rejectUnauthorized } : false,
          connectionLimit: connection.connectionOptions.maxConnections,
          connectTimeout: connection.connectionOptions.connectionTimeout,
          waitForConnections: true,
          queueLimit: 0
        });

      default:
        throw new Error(`Connection pooling not implemented for ${connection.type}`);
    }
  }

  /**
   * Execute query on external database
   */
  async executeQuery(connectionId, organizationId, query, params = []) {
    const connection = await DatabaseConnection.findOne({
      _id: connectionId,
      organizationId,
      status: 'active'
    }).select('+encryptedPassword +encryptionIV +encryptedUri +uriEncryptionIV');

    if (!connection) {
      throw new Error('Database connection not found or inactive');
    }

    // Enforce read-only mode
    if (connection.readOnly && !this.isReadOnlyQuery(query)) {
      throw new Error('Only SELECT queries are allowed in read-only mode');
    }

    Logger.info('Executing query on external database', {
      connectionId,
      organizationId,
      type: connection.type,
      connectionMethod: connection.connectionMethod,
      queryLength: query.length
    });

    let result;

    // Handle URI-based connections
    if (connection.connectionMethod === 'uri') {
      switch (connection.type) {
        case 'mongodb':
          result = await this.executeMongoDBQueryByUri(connection, query, params);
          break;
        default:
          throw new Error(`Query execution not implemented for URI-based ${connection.type}`);
      }
    } else {
      // Handle standard connections
      switch (connection.type) {
        case 'postgresql':
          result = await this.executePostgreSQLQuery(connection, query, params);
          break;
        case 'mysql':
        case 'mariadb':
          result = await this.executeMySQLQuery(connection, query, params);
          break;
        case 'mongodb':
          result = await this.executeMongoDBQuery(connection, query);
          break;
        default:
          throw new Error(`Query execution not implemented for ${connection.type}`);
      }
    }

    // Update usage stats
    await DatabaseConnection.updateOne(
      { _id: connectionId },
      {
        $inc: { 'usage.totalQueries': 1 },
        $set: {
          'usage.lastUsedAt': new Date(),
          'usage.lastQueryAt': new Date()
        }
      }
    );

    return result;
  }

  async executePostgreSQLQuery(connection, query, params) {
    const pool = await this.createPool(connection);
    
    try {
      const startTime = Date.now();
      const result = await pool.query(query, params);
      const executionTime = Date.now() - startTime;

      await pool.end();

      return {
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields?.map(f => ({
          name: f.name,
          dataType: f.dataTypeID
        })),
        executionTime
      };
    } catch (error) {
      await pool.end();
      throw error;
    }
  }

  async executeMySQLQuery(connection, query, params) {
    const pool = await this.createPool(connection);
    
    try {
      const startTime = Date.now();
      const [rows, fields] = await pool.execute(query, params);
      const executionTime = Date.now() - startTime;

      await pool.end();

      return {
        rows: Array.isArray(rows) ? rows : [rows],
        rowCount: Array.isArray(rows) ? rows.length : 1,
        fields: fields?.map(f => ({
          name: f.name,
          dataType: f.type
        })),
        executionTime
      };
    } catch (error) {
      await pool.end();
      throw error;
    }
  }

  async executeMongoDBQuery(connection, queryObj) {
    const password = connection.decryptPassword();
    const uri = `mongodb://${connection.username}:${encodeURIComponent(password)}@${connection.host}:${connection.port}/${connection.database}`;
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: connection.connectionOptions.connectionTimeout,
      ssl: connection.ssl?.enabled
    });

    try {
      await client.connect();
      const db = client.db(connection.database);
      
      const startTime = Date.now();
      const { collection, operation, filter, options } = queryObj;
      
      let result;
      switch (operation) {
        case 'find':
          result = await db.collection(collection).find(filter, options).toArray();
          break;
        case 'findOne':
          result = await db.collection(collection).findOne(filter, options);
          break;
        case 'aggregate':
          result = await db.collection(collection).aggregate(filter, options).toArray();
          break;
        case 'count':
          result = await db.collection(collection).countDocuments(filter);
          break;
        default:
          throw new Error(`Unsupported MongoDB operation: ${operation}`);
      }
      
      const executionTime = Date.now() - startTime;
      await client.close();

      return {
        rows: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : 1,
        executionTime
      };
    } catch (error) {
      await client.close();
      throw error;
    }
  }

  async executeMongoDBQueryByUri(connection, queryObj) {
    const uri = connection.decryptUri();
    if (!uri) {
      throw new Error('MongoDB URI is not configured for this connection. Please update the connection settings.');
    }
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: connection.connectionOptions?.connectionTimeout || 30000
    });

    try {
      await client.connect();
      // Extract database name from URI or use connection.database if available
      const dbName = connection.database || client.db().databaseName;
      const db = client.db(dbName);
      
      const startTime = Date.now();
      const { collection, operation, filter, options } = queryObj;
      
      let result;
      switch (operation) {
        case 'find':
          result = await db.collection(collection).find(filter, options).toArray();
          break;
        case 'findOne':
          result = await db.collection(collection).findOne(filter, options);
          break;
        case 'aggregate':
          result = await db.collection(collection).aggregate(filter, options).toArray();
          break;
        case 'count':
          result = await db.collection(collection).countDocuments(filter);
          break;
        default:
          throw new Error(`Unsupported MongoDB operation: ${operation}`);
      }
      
      const executionTime = Date.now() - startTime;
      await client.close();

      return {
        rows: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : 1,
        executionTime
      };
    } catch (error) {
      try { await client.close(); } catch (e) {}
      throw error;
    }
  }

  normalizeMongoQuery(query, { collection, limit } = {}) {
    const ensureLimitStage = (pipeline) => {
      if (!limit) {
        return pipeline;
      }
      const hasLimit = pipeline.some(stage => Object.prototype.hasOwnProperty.call(stage, '$limit'));
      if (hasLimit) {
        return pipeline;
      }
      return [...pipeline, { $limit: limit }];
    };

    if (Array.isArray(query)) {
      if (!collection) {
        throw new Error('Collection name is required for MongoDB aggregation execution');
      }
      return {
        collection,
        operation: 'aggregate',
        filter: ensureLimitStage(query),
        options: {}
      };
    }

    if (typeof query === 'object' && query !== null) {
      const normalized = {
        collection: query.collection || collection,
        operation: query.operation || (query.aggregate ? 'aggregate' : query.find ? 'find' : 'find'),
        filter: query.filter || query.query || query.criteria || null,
        options: query.options || {}
      };

      if (Array.isArray(query.aggregate)) {
        normalized.operation = 'aggregate';
        normalized.filter = ensureLimitStage(query.aggregate);
      } else if (Array.isArray(query.pipeline)) {
        normalized.operation = 'aggregate';
        normalized.filter = ensureLimitStage(query.pipeline);
      } else if (query.find) {
        normalized.operation = 'find';
        normalized.filter = query.find;
        if (limit && !normalized.options.limit) {
          normalized.options.limit = limit;
        }
      }

      if (!normalized.collection) {
        throw new Error('Collection name is required for MongoDB execution');
      }

      if (!normalized.filter) {
        normalized.filter = {};
      }

      return normalized;
    }

    throw new Error('Unsupported MongoDB query format generated by translator');
  }

  async executeMongoQuery(connection, query, { limit, collection, metadata } = {}) {
    const normalized = this.normalizeMongoQuery(query, { collection, limit });

    if (connection.connectionMethod === 'uri') {
      return this.executeMongoDBQueryByUri(connection, normalized);
    }

    return this.executeMongoDBQuery(connection, normalized);
  }

  async executeSQLQuery(connection, query, { limit, params = [] } = {}) {
    const textQuery = typeof query === 'string' ? query.trim() : '';

    if (!textQuery) {
      throw new Error('SQL query text is required');
    }

    const enforcedQuery = this.ensureSqlLimit(textQuery, limit);

    if (connection.type === 'postgresql') {
      return this.executePostgreSQLQuery(connection, enforcedQuery, params);
    }

    if (connection.type === 'mysql' || connection.type === 'mariadb') {
      return this.executeMySQLQuery(connection, enforcedQuery, params);
    }

    throw new Error(`SQL execution not implemented for ${connection.type}`);
  }

  ensureSqlLimit(query, limit) {
    if (!limit) {
      return query;
    }

    const lower = query.toLowerCase();
    if (lower.includes(' limit ')) {
      return query;
    }

    return `${query.replace(/;\s*$/, '')} LIMIT ${limit}`;
  }

  /**
   * Check if query is read-only (SELECT only)
   */
  isReadOnlyQuery(query) {
    const normalizedQuery = query.trim().toUpperCase();
    const readOnlyKeywords = ['SELECT', 'SHOW', 'DESCRIBE', 'EXPLAIN'];
    const writeKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE'];

    // Check if starts with write keyword
    for (const keyword of writeKeywords) {
      if (normalizedQuery.startsWith(keyword)) {
        return false;
      }
    }

    // Check if starts with read keyword
    for (const keyword of readOnlyKeywords) {
      if (normalizedQuery.startsWith(keyword)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get schema from external database
   */
  async introspectSchema(connectionId, organizationId) {
    const connection = await DatabaseConnection.findOne({
      _id: connectionId,
      organizationId,
      status: { $in: ['active', 'testing'] }
    }).select('+encryptedPassword +encryptionIV +encryptedUri +uriEncryptionIV');

    if (!connection) {
      throw new Error('Database connection not found');
    }

    Logger.info('Introspecting database schema', {
      connectionId,
      type: connection.type,
      connectionMethod: connection.connectionMethod
    });

    let schema;

    // Handle URI-based connections
    if (connection.connectionMethod === 'uri') {
      switch (connection.type) {
        case 'mongodb':
          schema = await this.introspectMongoDBByUri(connection);
          break;
        default:
          throw new Error(`URI-based schema introspection not implemented for ${connection.type}`);
      }
    } else {
      // Handle standard connections
      switch (connection.type) {
        case 'postgresql':
          schema = await this.introspectPostgreSQL(connection);
          break;
        case 'mysql':
        case 'mariadb':
          schema = await this.introspectMySQL(connection);
          break;
        case 'mongodb':
          schema = await this.introspectMongoDB(connection);
          break;
        default:
          throw new Error(`Schema introspection not implemented for ${connection.type}`);
      }
    }

    // Update schema cache
    await DatabaseConnection.updateOne(
      { _id: connectionId },
      {
        $set: {
          'schemaCache.lastUpdated': new Date(),
          'schemaCache.tables': schema
        }
      }
    );

    return schema;
  }

  async introspectPostgreSQL(connection) {
    const pool = await this.createPool(connection);

    try {
      const query = `
        SELECT 
          t.table_schema,
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
          CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key
        FROM information_schema.tables t
        JOIN information_schema.columns c 
          ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        LEFT JOIN (
          SELECT ku.table_schema, ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.table_schema = pk.table_schema 
          AND c.table_name = pk.table_name 
          AND c.column_name = pk.column_name
        LEFT JOIN (
          SELECT ku.table_schema, ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
        ) fk ON c.table_schema = fk.table_schema 
          AND c.table_name = fk.table_name 
          AND c.column_name = fk.column_name
        WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
          AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_schema, t.table_name, c.ordinal_position
      `;

      const result = await pool.query(query);
      await pool.end();

      return this.groupSchemaByTable(result.rows);
    } catch (error) {
      await pool.end();
      throw error;
    }
  }

  async introspectMySQL(connection) {
    const pool = await this.createPool(connection);

    try {
      const query = `
        SELECT 
          TABLE_SCHEMA as table_schema,
          TABLE_NAME as table_name,
          COLUMN_NAME as column_name,
          DATA_TYPE as data_type,
          IS_NULLABLE as is_nullable,
          COLUMN_KEY as column_key
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME, ORDINAL_POSITION
      `;

      const [rows] = await pool.execute(query, [connection.database]);
      await pool.end();

      return this.groupSchemaByTable(rows.map(row => ({
        ...row,
        is_primary_key: row.column_key === 'PRI',
        is_foreign_key: row.column_key === 'MUL'
      })));
    } catch (error) {
      await pool.end();
      throw error;
    }
  }

  async introspectMongoDB(connection) {
    const password = connection.decryptPassword();
    const uri = `mongodb://${connection.username}:${encodeURIComponent(password)}@${connection.host}:${connection.port}/${connection.database}`;
    const client = new MongoClient(uri);

    try {
      await client.connect();
      const db = client.db(connection.database);
      const collections = await db.listCollections().toArray();

      const schema = [];

      for (const coll of collections) {
        const sampleDocs = await db.collection(coll.name).find().limit(100).toArray();
        const fields = this.inferMongoDBSchema(sampleDocs);

        schema.push({
          name: coll.name,
          schema: connection.database,
          columns: fields
        });
      }

      await client.close();
      return schema;
    } catch (error) {
      await client.close();
      throw error;
    }
  }

  async introspectMongoDBByUri(connection) {
    const uri = connection.decryptUri();
    const client = new MongoClient(uri);

    try {
      await client.connect();
      // Extract database name from URI or use connection.database if available
      const dbName = connection.database || client.db().databaseName;
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();

      const schema = [];

      for (const coll of collections) {
        const sampleDocs = await db.collection(coll.name).find().limit(100).toArray();
        const fields = this.inferMongoDBSchema(sampleDocs);

        schema.push({
          name: coll.name,
          schema: dbName,
          columns: fields
        });
      }

      await client.close();
      return schema;
    } catch (error) {
      try { await client.close(); } catch (e) {}
      throw error;
    }
  }

  inferMongoDBSchema(documents) {
    const fields = new Map();

    for (const doc of documents) {
      for (const [key, value] of Object.entries(doc)) {
        if (!fields.has(key)) {
          fields.set(key, {
            name: key,
            type: typeof value,
            nullable: false,
            primaryKey: key === '_id',
            foreignKey: false
          });
        }
      }
    }

    const result = Array.from(fields.values());
    
    // If no fields found (empty collection), return array with at least _id field
    if (result.length === 0) {
      return [{
        name: '_id',
        type: 'ObjectId',
        nullable: false,
        primaryKey: true,
        foreignKey: false
      }];
    }

    return result;
  }

  groupSchemaByTable(rows) {
    const tables = new Map();

    for (const row of rows) {
      const tableName = row.table_name;
      
      if (!tables.has(tableName)) {
        tables.set(tableName, {
          name: tableName,
          schema: row.table_schema,
          columns: []
        });
      }

      tables.get(tableName).columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES' || row.is_nullable === true,
        primaryKey: row.is_primary_key === true,
        foreignKey: row.is_foreign_key === true
      });
    }

    return Array.from(tables.values());
  }

  /**
   * Close all connection pools
   */
  async closeAll() {
    for (const [key, pool] of this.connectionPools.entries()) {
      try {
        if (pool.end) {
          await pool.end();
        }
        Logger.info('Closed connection pool', { key });
      } catch (error) {
        Logger.error('Error closing connection pool', { key, error: error.message });
      }
    }
    this.connectionPools.clear();
  }
}

export default new ExternalDatabaseService();
