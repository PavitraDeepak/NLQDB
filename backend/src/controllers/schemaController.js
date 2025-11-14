import { schemaService } from '../services/index.js';
import { asyncHandler } from '../middlewares/index.js';

/**
 * Get database schema for current user
 * GET /api/schema
 */
export const getSchema = asyncHandler(async (req, res) => {
  const user = req.user;

  const schema = await schemaService.getSchemaForUser(user);

  res.json({
    success: true,
    data: schema
  });
});

/**
 * Get collection preview (sample documents)
 * GET /api/tables/:collection/preview
 */
export const getCollectionPreview = asyncHandler(async (req, res) => {
  const { collection } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const user = req.user;

  // Check if user has access to this collection
  if (!schemaService.hasCollectionAccess(user.role, collection)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied to this collection'
    });
  }

  const samples = await schemaService.getSampleDocuments(collection, limit);
  const stats = await schemaService.getCollectionStats(collection);

  res.json({
    success: true,
    data: {
      collection,
      samples,
      stats
    }
  });
});

/**
 * Get collection statistics
 * GET /api/tables/:collection/stats
 */
export const getCollectionStats = asyncHandler(async (req, res) => {
  const { collection } = req.params;
  const user = req.user;

  // Check if user has access to this collection
  if (!schemaService.hasCollectionAccess(user.role, collection)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied to this collection'
    });
  }

  const stats = await schemaService.getCollectionStats(collection);

  res.json({
    success: true,
    data: stats
  });
});

/**
 * List all accessible collections
 * GET /api/tables
 */
export const listCollections = asyncHandler(async (req, res) => {
  const user = req.user;

  const allCollections = await schemaService.getCollections();
  
  const accessibleCollections = allCollections.filter(collection =>
    schemaService.hasCollectionAccess(user.role, collection)
  );

  res.json({
    success: true,
    data: accessibleCollections
  });
});
