import { DatabaseConnection } from '../models/index.js';
import externalDatabaseService from '../services/externalDatabaseService.js';
import { Logger } from '../middlewares/logger.js';

/**
 * Create database connection
 * POST /api/database-connections
 */
export const createConnection = async (req, res) => {
  try {
    const { 
      name, type, connectionMethod, uri,
      host, port, database, username, password, 
      ssl, connectionOptions, description, tags, readOnly 
    } = req.body;
    const organizationId = req.organization._id;
    const userId = req.user._id;

    // Check if connection with same name exists
    const existing = await DatabaseConnection.findOne({ organizationId, name });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A connection with this name already exists'
      });
    }

    // Validate connection method and required fields
    if (connectionMethod === 'uri') {
      if (!uri) {
        return res.status(400).json({
          success: false,
          error: 'URI is required for URI-based connections'
        });
      }
    } else {
      if (!host || !port || !database || !username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Host, port, database, username, and password are required for standard connections'
        });
      }
    }

    // Test connection first
    Logger.info('Testing new database connection', { name, type, connectionMethod });
    
    const testConfig = connectionMethod === 'uri' 
      ? { type, connectionMethod, uri }
      : { type, connectionMethod: 'standard', host, port, database, username, password, ssl };
    
    const testResult = await externalDatabaseService.testConnection(testConfig);

    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Connection test failed',
        details: testResult
      });
    }

    // Create connection with encrypted credentials
    const connection = new DatabaseConnection({
      organizationId,
      name,
      type,
      connectionMethod: connectionMethod || 'standard',
      ssl,
      connectionOptions,
      description,
      tags,
      readOnly: readOnly !== false, // Default to true for security
      status: 'testing',
      lastTestedAt: new Date(),
      lastTestStatus: testResult,
      createdBy: userId
    });

    // Encrypt credentials based on connection method
    if (connectionMethod === 'uri') {
      connection.encryptUri(uri);
      // Extract database name from URI if possible for display
      try {
        const urlObj = new URL(uri.replace(/^mongodb\+srv:/, 'http:').replace(/^mongodb:/, 'http:'));
        connection.database = urlObj.pathname.substring(1).split('?')[0] || 'default';
      } catch (e) {
        connection.database = 'default';
      }
    } else {
      connection.host = host;
      connection.port = port;
      connection.database = database;
      connection.username = username;
      connection.encryptPassword(password);
    }

    await connection.save();

    // Introspect schema
    try {
      Logger.info('Introspecting schema for new connection', { connectionId: connection._id });
      await externalDatabaseService.introspectSchema(connection._id, organizationId);
      
      // Update status to active after successful schema introspection
      connection.status = 'active';
      await connection.save();
    } catch (error) {
      Logger.error('Schema introspection failed', error);
      // Keep status as 'testing' but connection is still created
    }

    Logger.info('Database connection created', {
      connectionId: connection._id,
      organizationId,
      name,
      type
    });

    res.status(201).json({
      success: true,
      message: 'Database connection created successfully',
      data: connection.getSafeInfo()
    });
  } catch (error) {
    Logger.error('Create database connection failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create database connection',
      details: error.message
    });
  }
};

/**
 * Get all database connections for organization
 * GET /api/database-connections
 */
export const getConnections = async (req, res) => {
  try {
    const organizationId = req.organization._id;
    const includeInactive = req.query.includeInactive === 'true';

    const connections = await DatabaseConnection.findByOrganization(organizationId, includeInactive);

    res.json({
      success: true,
      data: connections.map(conn => conn.getSafeInfo())
    });
  } catch (error) {
    Logger.error('Get database connections failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve database connections'
    });
  }
};

/**
 * Get single database connection
 * GET /api/database-connections/:id
 */
export const getConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organization._id;

    const connection = await DatabaseConnection.findOne({ _id: id, organizationId });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Database connection not found'
      });
    }

    res.json({
      success: true,
      data: connection.getSafeInfo()
    });
  } catch (error) {
    Logger.error('Get database connection failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve database connection'
    });
  }
};

/**
 * Update database connection
 * PUT /api/database-connections/:id
 */
export const updateConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, connectionMethod, uri,
      host, port, database, username, password, 
      ssl, connectionOptions, description, tags, readOnly, status 
    } = req.body;
    const organizationId = req.organization._id;

    const connection = await DatabaseConnection.findOne({ _id: id, organizationId })
      .select('+encryptedPassword +encryptionIV +encryptedUri +uriEncryptionIV');

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Database connection not found'
      });
    }

    // Track if credentials changed for testing
    let credentialsChanged = false;

    // Update fields
    if (name) connection.name = name;
    if (ssl !== undefined) connection.ssl = ssl;
    if (connectionOptions) connection.connectionOptions = { ...connection.connectionOptions, ...connectionOptions };
    if (description !== undefined) connection.description = description;
    if (tags) connection.tags = tags;
    if (readOnly !== undefined) connection.readOnly = readOnly;
    if (status) connection.status = status;

    // Handle connection method changes
    if (connectionMethod && connectionMethod !== connection.connectionMethod) {
      connection.connectionMethod = connectionMethod;
      credentialsChanged = true;
    }

    // Update credentials based on connection method
    if (connection.connectionMethod === 'uri') {
      if (uri) {
        connection.encryptUri(uri);
        credentialsChanged = true;
        // Extract database name from URI if possible
        try {
          const urlObj = new URL(uri.replace(/^mongodb\+srv:/, 'http:').replace(/^mongodb:/, 'http:'));
          connection.database = urlObj.pathname.substring(1).split('?')[0] || 'default';
        } catch (e) {
          connection.database = 'default';
        }
      }
    } else {
      // Standard connection updates
      if (host) {
        connection.host = host;
        credentialsChanged = true;
      }
      if (port) {
        connection.port = port;
        credentialsChanged = true;
      }
      if (database) {
        connection.database = database;
        credentialsChanged = true;
      }
      if (username) {
        connection.username = username;
        credentialsChanged = true;
      }
      if (password) {
        connection.encryptPassword(password);
        credentialsChanged = true;
      }
    }

    // If credentials changed, test the connection
    if (credentialsChanged) {
      const testConfig = connection.connectionMethod === 'uri'
        ? { type: connection.type, connectionMethod: 'uri', uri: uri || connection.decryptUri() }
        : { 
            type: connection.type, 
            connectionMethod: 'standard',
            host: connection.host,
            port: connection.port,
            database: connection.database,
            username: connection.username,
            password: password || connection.decryptPassword(),
            ssl: connection.ssl
          };
      
      const testResult = await externalDatabaseService.testConnection(testConfig);

      connection.lastTestedAt = new Date();
      connection.lastTestStatus = testResult;

      if (!testResult.success) {
        connection.status = 'error';
      }
    }

    await connection.save();

    Logger.info('Database connection updated', {
      connectionId: connection._id,
      organizationId
    });

    res.json({
      success: true,
      message: 'Database connection updated successfully',
      data: connection.getSafeInfo()
    });
  } catch (error) {
    Logger.error('Update database connection failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update database connection'
    });
  }
};

/**
 * Delete database connection
 * DELETE /api/database-connections/:id
 */
export const deleteConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organization._id;

    const connection = await DatabaseConnection.findOneAndDelete({ _id: id, organizationId });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Database connection not found'
      });
    }

    Logger.info('Database connection deleted', {
      connectionId: id,
      organizationId
    });

    res.json({
      success: true,
      message: 'Database connection deleted successfully'
    });
  } catch (error) {
    Logger.error('Delete database connection failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete database connection'
    });
  }
};

/**
 * Test database connection
 * POST /api/database-connections/:id/test
 */
export const testConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organization._id;

    const connection = await DatabaseConnection.findOne({ _id: id, organizationId })
      .select('+encryptedPassword +encryptionIV +encryptedUri +uriEncryptionIV');

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Database connection not found'
      });
    }

    // Build test config based on connection method
    const testConfig = connection.connectionMethod === 'uri'
      ? {
          type: connection.type,
          connectionMethod: 'uri',
          uri: connection.decryptUri()
        }
      : {
          type: connection.type,
          connectionMethod: 'standard',
          host: connection.host,
          port: connection.port,
          database: connection.database,
          username: connection.username,
          password: connection.decryptPassword(),
          ssl: connection.ssl
        };

    const testResult = await externalDatabaseService.testConnection(testConfig);

    // Update test status
    connection.lastTestedAt = new Date();
    connection.lastTestStatus = testResult;
    
    if (testResult.success) {
      connection.status = 'active';
    } else {
      connection.status = 'error';
    }

    await connection.save();

    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    Logger.error('Test database connection failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test database connection'
    });
  }
};

/**
 * Get schema for database connection
 * GET /api/database-connections/:id/schema
 */
export const getSchema = async (req, res) => {
  try {
    const { id } = req.params;
    const { refresh } = req.query;
    const organizationId = req.organization._id;

    const connection = await DatabaseConnection.findOne({ _id: id, organizationId });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Database connection not found'
      });
    }

    // Use cached schema if available and not forcing refresh
    if (!refresh && connection.schemaCache?.tables?.length > 0) {
      return res.json({
        success: true,
        data: {
          tables: connection.schemaCache.tables,
          lastUpdated: connection.schemaCache.lastUpdated,
          cached: true
        }
      });
    }

    // Introspect fresh schema
    const schema = await externalDatabaseService.introspectSchema(id, organizationId);

    res.json({
      success: true,
      data: {
        tables: schema,
        lastUpdated: new Date(),
        cached: false
      }
    });
  } catch (error) {
    Logger.error('Get database schema failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve database schema'
    });
  }
};

/**
 * Execute query on database connection
 * POST /api/database-connections/:id/query
 */
export const executeQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { query, params } = req.body;
    const organizationId = req.organization._id;
    const userId = req.user._id;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    Logger.info('Executing query on external database', {
      connectionId: id,
      organizationId,
      userId,
      queryLength: query.length
    });

    const result = await externalDatabaseService.executeQuery(id, organizationId, query, params);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    Logger.error('Execute query failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute query',
      details: error.message
    });
  }
};

/**
 * Rotate credentials for database connection
 * POST /api/database-connections/:id/rotate
 */
export const rotateCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const organizationId = req.organization._id;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password is required'
      });
    }

    const connection = await DatabaseConnection.findOne({ _id: id, organizationId })
      .select('+encryptedPassword +encryptionIV');

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Database connection not found'
      });
    }

    // Test new credentials first
    const testResult = await externalDatabaseService.testConnection({
      type: connection.type,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: newPassword,
      ssl: connection.ssl
    });

    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: 'New credentials failed connection test',
        details: testResult
      });
    }

    // Update password
    connection.encryptPassword(newPassword);
    connection.lastTestedAt = new Date();
    connection.lastTestStatus = testResult;
    connection.status = 'active';

    await connection.save();

    Logger.info('Database credentials rotated', {
      connectionId: id,
      organizationId
    });

    res.json({
      success: true,
      message: 'Credentials rotated successfully'
    });
  } catch (error) {
    Logger.error('Rotate credentials failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rotate credentials'
    });
  }
};

export default {
  createConnection,
  getConnections,
  getConnection,
  updateConnection,
  deleteConnection,
  testConnection,
  getSchema,
  executeQuery,
  rotateCredentials
};
