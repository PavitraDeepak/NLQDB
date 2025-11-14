import { ApiKey, Organization } from '../models/index.js';
import { Logger } from '../middlewares/logger.js';

class ApiKeyService {
  /**
   * Create new API key
   */
  async createApiKey(organizationId, userId, data) {
    try {
      const { name, permissions = [], expiresAt, metadata = {} } = data;

      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Check API key limit
      const currentCount = await ApiKey.countDocuments({
        organizationId,
        status: 'active'
      });

      if (currentCount >= organization.limits.maxApiKeys && organization.plan !== 'enterprise') {
        throw new Error('API key limit reached. Please upgrade your plan.');
      }

      // Generate API key
      const { key, keyPrefix, hashedKey } = ApiKey.generateKey();

      // Create API key
      const apiKey = new ApiKey({
        organizationId,
        userId,
        name,
        key,
        keyPrefix,
        hashedKey,
        permissions: permissions.length > 0 ? permissions : [
          'query:translate',
          'query:execute',
          'schema:read'
        ],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        metadata,
        status: 'active'
      });

      await apiKey.save();

      Logger.info('API key created', {
        apiKeyId: apiKey._id,
        organizationId,
        userId,
        name
      });

      // Return key only once (it won't be shown again)
      return {
        id: apiKey._id,
        key, // Full key - show only once
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
        warning: 'Store this key securely. It will not be shown again.'
      };
    } catch (error) {
      Logger.error('Failed to create API key', error);
      throw error;
    }
  }

  /**
   * Get all API keys for organization
   */
  async getApiKeys(organizationId) {
    try {
      const apiKeys = await ApiKey.find({
        organizationId,
        status: { $ne: 'revoked' }
      })
        .select('-key -hashedKey')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 });

      return apiKeys.map(key => key.toSafeObject());
    } catch (error) {
      Logger.error('Failed to get API keys', error);
      throw error;
    }
  }

  /**
   * Get API key by ID
   */
  async getApiKey(apiKeyId, organizationId) {
    try {
      const apiKey = await ApiKey.findOne({
        _id: apiKeyId,
        organizationId
      })
        .select('-key -hashedKey')
        .populate('userId', 'name email');

      if (!apiKey) {
        throw new Error('API key not found');
      }

      return apiKey.toSafeObject();
    } catch (error) {
      Logger.error('Failed to get API key', error);
      throw error;
    }
  }

  /**
   * Update API key
   */
  async updateApiKey(apiKeyId, organizationId, updates) {
    try {
      const apiKey = await ApiKey.findOne({
        _id: apiKeyId,
        organizationId
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      if (apiKey.status === 'revoked') {
        throw new Error('Cannot update revoked API key');
      }

      // Allowed updates
      const allowedFields = ['name', 'permissions', 'metadata'];
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          if (key === 'metadata') {
            apiKey[key] = { ...apiKey[key], ...updates[key] };
          } else {
            apiKey[key] = updates[key];
          }
        }
      });

      await apiKey.save();

      Logger.info('API key updated', {
        apiKeyId,
        organizationId,
        fields: Object.keys(updates)
      });

      return apiKey.toSafeObject();
    } catch (error) {
      Logger.error('Failed to update API key', error);
      throw error;
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(apiKeyId, organizationId, userId) {
    try {
      const apiKey = await ApiKey.findOne({
        _id: apiKeyId,
        organizationId
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      await apiKey.revoke();

      Logger.info('API key revoked', {
        apiKeyId,
        organizationId,
        userId
      });

      return {
        success: true,
        message: 'API key revoked successfully'
      };
    } catch (error) {
      Logger.error('Failed to revoke API key', error);
      throw error;
    }
  }

  /**
   * Rotate API key (revoke old, create new)
   */
  async rotateApiKey(apiKeyId, organizationId, userId) {
    try {
      const oldKey = await ApiKey.findOne({
        _id: apiKeyId,
        organizationId
      });

      if (!oldKey) {
        throw new Error('API key not found');
      }

      // Create new key with same settings
      const newKeyData = {
        name: oldKey.name,
        permissions: oldKey.permissions,
        expiresAt: oldKey.expiresAt,
        metadata: {
          ...oldKey.metadata,
          rotatedFrom: oldKey._id,
          rotatedAt: new Date()
        }
      };

      const newKey = await this.createApiKey(organizationId, userId, newKeyData);

      // Revoke old key
      await oldKey.revoke();

      Logger.info('API key rotated', {
        oldKeyId: apiKeyId,
        newKeyId: newKey.id,
        organizationId,
        userId
      });

      return newKey;
    } catch (error) {
      Logger.error('Failed to rotate API key', error);
      throw error;
    }
  }

  /**
   * Get API key usage statistics
   */
  async getApiKeyStats(apiKeyId, organizationId) {
    try {
      const apiKey = await ApiKey.findOne({
        _id: apiKeyId,
        organizationId
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      return {
        id: apiKey._id,
        name: apiKey.name,
        usage: apiKey.usage,
        rateLimit: apiKey.rateLimit,
        status: apiKey.status,
        createdAt: apiKey.createdAt,
        lastUsedAt: apiKey.usage.lastUsedAt,
        totalRequests: apiKey.usage.totalRequests
      };
    } catch (error) {
      Logger.error('Failed to get API key stats', error);
      throw error;
    }
  }

  /**
   * Validate API key permissions
   */
  async validatePermission(apiKeyId, permission) {
    try {
      const apiKey = await ApiKey.findById(apiKeyId);
      if (!apiKey) {
        return false;
      }

      return apiKey.hasPermission(permission);
    } catch (error) {
      Logger.error('Failed to validate permission', error);
      return false;
    }
  }

  /**
   * Cleanup expired API keys (scheduled job)
   */
  async cleanupExpiredKeys() {
    try {
      const result = await ApiKey.updateMany(
        {
          status: 'active',
          expiresAt: { $lt: new Date() }
        },
        {
          status: 'expired'
        }
      );

      Logger.info('Expired API keys cleaned up', {
        count: result.modifiedCount
      });

      return result.modifiedCount;
    } catch (error) {
      Logger.error('Failed to cleanup expired keys', error);
      throw error;
    }
  }
}

export default new ApiKeyService();
