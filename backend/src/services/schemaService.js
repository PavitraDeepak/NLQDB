import mongoose from 'mongoose';
import { Customer, Order, User } from '../models/index.js';
import { Logger } from '../middlewares/logger.js';

class SchemaService {
  /**
   * Get database schema for specified user role
   */
  async getSchemaForUser(user) {
    try {
      const collections = await this.getCollections();
      const schema = {};

      for (const collectionName of collections) {
        // Check if user has access to this collection
        if (this.hasCollectionAccess(user.role, collectionName)) {
          schema[collectionName] = await this.getCollectionSchema(collectionName, user.role);
        }
      }

      Logger.info('Schema retrieved for user', {
        userId: user._id,
        role: user.role,
        collections: Object.keys(schema)
      });

      return schema;
    } catch (error) {
      Logger.error('Failed to get schema', error);
      throw error;
    }
  }

  /**
   * Get list of collections in database
   */
  async getCollections() {
    const collections = await mongoose.connection.db.listCollections().toArray();
    return collections
      .map(c => c.name)
      .filter(name => !name.startsWith('system.')) // Exclude system collections
      .filter(name => ['customers', 'orders', 'users'].includes(name)); // Only allowed collections
  }

  /**
   * Check if user role has access to collection
   */
  hasCollectionAccess(role, collectionName) {
    const accessMatrix = {
      admin: ['customers', 'orders', 'users', 'audit_queries', 'query_results'],
      analyst: ['customers', 'orders'],
      viewer: ['customers', 'orders']
    };

    return accessMatrix[role]?.includes(collectionName) || false;
  }

  /**
   * Get schema for a specific collection
   */
  async getCollectionSchema(collectionName, userRole) {
    const model = this.getModel(collectionName);
    
    if (!model) {
      return { fields: {}, description: 'Unknown collection' };
    }

    const schema = model.schema;
    const fields = {};

    // Extract field information
    schema.eachPath((path, schemaType) => {
      // Skip internal fields
      if (path.startsWith('_') && path !== '_id') return;
      
      // Check field-level access
      if (!this.hasFieldAccess(userRole, collectionName, path)) {
        return;
      }

      fields[path] = {
        type: schemaType.instance,
        required: schemaType.isRequired || false,
        enum: schemaType.enumValues || null,
        description: this.getFieldDescription(collectionName, path)
      };
    });

    return {
      fields,
      description: this.getCollectionDescription(collectionName),
      sampleQuery: this.getSampleQuery(collectionName)
    };
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
   * Check field-level access based on role
   */
  hasFieldAccess(role, collection, field) {
    // Sensitive fields restricted for viewers
    const sensitiveFields = {
      users: ['password', 'resetPasswordToken'],
      customers: [],
      orders: []
    };

    if (role === 'viewer' && sensitiveFields[collection]?.includes(field)) {
      return false;
    }

    return true;
  }

  /**
   * Get field description for LLM context
   */
  getFieldDescription(collection, field) {
    const descriptions = {
      customers: {
        name: 'Customer full name',
        email: 'Customer email address',
        city: 'City where customer is located',
        joined_at: 'Date when customer joined',
        lifetime_value: 'Total value of all customer purchases'
      },
      orders: {
        order_id: 'Unique order identifier',
        customer_id: 'Reference to customer who placed order',
        total: 'Total order amount in dollars',
        status: 'Current order status (pending, processing, shipped, delivered, cancelled)',
        items: 'Array of ordered items with product_id, qty, price',
        created_at: 'Date when order was created',
        region: 'Geographic region for order'
      },
      users: {
        name: 'User full name',
        email: 'User email for login',
        role: 'User role: admin, analyst, or viewer'
      }
    };

    return descriptions[collection]?.[field] || '';
  }

  /**
   * Get collection description
   */
  getCollectionDescription(collection) {
    const descriptions = {
      customers: 'Customer information including contact details and lifetime value',
      orders: 'Order records with items, totals, and status',
      users: 'System users with roles and permissions'
    };

    return descriptions[collection] || '';
  }

  /**
   * Get sample query for collection
   */
  getSampleQuery(collection) {
    const samples = {
      customers: 'db.customers.find({ city: "New York", lifetime_value: { $gt: 5000 } })',
      orders: 'db.orders.find({ status: "delivered", created_at: { $gte: ISODate("2025-01-01") } })',
      users: 'db.users.find({ role: "analyst" })'
    };

    return samples[collection] || '';
  }

  /**
   * Get sample documents from collection
   */
  async getSampleDocuments(collectionName, limit = 5) {
    const model = this.getModel(collectionName);
    
    if (!model) {
      throw new Error(`Unknown collection: ${collectionName}`);
    }

    const samples = await model.find().limit(limit).lean();
    return samples;
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collectionName) {
    const model = this.getModel(collectionName);
    
    if (!model) {
      throw new Error(`Unknown collection: ${collectionName}`);
    }

    const count = await model.countDocuments();
    const stats = await mongoose.connection.db.collection(collectionName).stats();

    return {
      count,
      size: stats.size,
      avgObjSize: stats.avgObjSize,
      storageSize: stats.storageSize,
      indexes: stats.nindexes
    };
  }
}

export default new SchemaService();
