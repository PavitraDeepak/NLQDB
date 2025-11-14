import apiKeyService from '../services/apiKeyService.js';
import { Logger } from '../middlewares/logger.js';

/**
 * Create API key
 * POST /api/apikeys
 */
export const createApiKey = async (req, res) => {
  try {
    const { name, permissions, expiresAt, metadata } = req.body;
    const organizationId = req.organization._id;
    const userId = req.user._id;

    const apiKey = await apiKeyService.createApiKey(
      organizationId,
      userId,
      { name, permissions, expiresAt, metadata }
    );

    res.status(201).json({
      success: true,
      data: apiKey
    });
  } catch (error) {
    Logger.error('Create API key failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create API key'
    });
  }
};

/**
 * Get all API keys
 * GET /api/apikeys
 */
export const getApiKeys = async (req, res) => {
  try {
    const organizationId = req.organization._id;
    const apiKeys = await apiKeyService.getApiKeys(organizationId);

    res.json({
      success: true,
      data: apiKeys
    });
  } catch (error) {
    Logger.error('Get API keys failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API keys'
    });
  }
};

/**
 * Get API key by ID
 * GET /api/apikeys/:id
 */
export const getApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organization._id;

    const apiKey = await apiKeyService.getApiKey(id, organizationId);

    res.json({
      success: true,
      data: apiKey
    });
  } catch (error) {
    Logger.error('Get API key failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API key'
    });
  }
};

/**
 * Update API key
 * PUT /api/apikeys/:id
 */
export const updateApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const organizationId = req.organization._id;

    const apiKey = await apiKeyService.updateApiKey(id, organizationId, updates);

    res.json({
      success: true,
      data: apiKey
    });
  } catch (error) {
    Logger.error('Update API key failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update API key'
    });
  }
};

/**
 * Revoke API key
 * POST /api/apikeys/:id/revoke
 */
export const revokeApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organization._id;
    const userId = req.user._id;

    const result = await apiKeyService.revokeApiKey(id, organizationId, userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    Logger.error('Revoke API key failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to revoke API key'
    });
  }
};

/**
 * Rotate API key
 * POST /api/apikeys/:id/rotate
 */
export const rotateApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organization._id;
    const userId = req.user._id;

    const newKey = await apiKeyService.rotateApiKey(id, organizationId, userId);

    res.json({
      success: true,
      data: newKey
    });
  } catch (error) {
    Logger.error('Rotate API key failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to rotate API key'
    });
  }
};

/**
 * Get API key stats
 * GET /api/apikeys/:id/stats
 */
export const getApiKeyStats = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organization._id;

    const stats = await apiKeyService.getApiKeyStats(id, organizationId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    Logger.error('Get API key stats failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API key stats'
    });
  }
};

export default {
  createApiKey,
  getApiKeys,
  getApiKey,
  updateApiKey,
  revokeApiKey,
  rotateApiKey,
  getApiKeyStats
};
