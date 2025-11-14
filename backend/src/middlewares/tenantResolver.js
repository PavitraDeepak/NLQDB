import { Organization } from '../models/index.js';
import { Logger } from './logger.js';

/**
 * Tenant Resolution Middleware
 * Attaches organization context to every request
 * Ensures tenant isolation at the middleware level
 */

export const tenantResolver = async (req, res, next) => {
  try {
    // Skip for public routes
    const publicRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/verify-email', '/api/health'];
    if (publicRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }

    // Skip for superadmin routes
    if (req.path.startsWith('/api/admin') && req.user?.isSuperAdmin) {
      return next();
    }

    // Get organization from user or API key
    let organizationId = null;
    let organization = null;

    if (req.user && req.user.organizationId) {
      // From JWT token
      organizationId = req.user.organizationId;
    } else if (req.apiKey && req.apiKey.organizationId) {
      // From API key
      organizationId = req.apiKey.organizationId;
    }

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'No organization context found. Please contact support.'
      });
    }

    // Fetch organization
    organization = await Organization.findById(organizationId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    // Check organization status
    if (organization.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Your organization has been suspended. Please contact support.'
      });
    }

    if (organization.status === 'deleted') {
      return res.status(403).json({
        success: false,
        error: 'Organization no longer exists'
      });
    }

    // Check subscription status for paid features
    if (organization.planStatus === 'canceled' || organization.planStatus === 'past_due') {
      // Allow read-only access
      if (req.method !== 'GET') {
        return res.status(402).json({
          success: false,
          error: 'Payment required. Please update your billing information.',
          planStatus: organization.planStatus
        });
      }
    }

    // Attach to request
    req.organization = organization;
    req.tenant = {
      id: organization._id,
      name: organization.name,
      plan: organization.plan,
      slug: organization.slug
    };

    Logger.debug('Tenant resolved', {
      organizationId: organization._id,
      plan: organization.plan,
      userId: req.user?._id
    });

    next();
  } catch (error) {
    Logger.error('Tenant resolution failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve organization context'
    });
  }
};

/**
 * Ensure tenant isolation in query filters
 * Automatically adds organizationId to query filters
 */
export const addTenantFilter = (req, res, next) => {
  if (!req.organization) {
    return res.status(403).json({
      success: false,
      error: 'No tenant context'
    });
  }

  // Store original query
  req.tenantFilter = {
    organizationId: req.organization._id
  };

  next();
};

/**
 * Verify user belongs to the same organization
 */
export const verifySameOrganization = (req, res, next) => {
  const targetOrganizationId = req.params.organizationId || req.body.organizationId;

  if (!targetOrganizationId) {
    return next();
  }

  if (req.user.isSuperAdmin) {
    return next();
  }

  if (req.user.organizationId.toString() !== targetOrganizationId.toString()) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Cannot access resources from another organization'
    });
  }

  next();
};

/**
 * Require organization owner
 */
export const requireOwner = (req, res, next) => {
  if (req.user.isSuperAdmin) {
    return next();
  }

  if (!req.user.isOwner || req.user.isOwner() === false) {
    return res.status(403).json({
      success: false,
      error: 'Only organization owners can perform this action'
    });
  }

  next();
};

/**
 * Require organization admin (owner or admin)
 */
export const requireOrgAdmin = (req, res, next) => {
  if (req.user.isSuperAdmin) {
    return next();
  }

  if (!req.user.isOrgAdmin || req.user.isOrgAdmin() === false) {
    return res.status(403).json({
      success: false,
      error: 'Organization admin privileges required'
    });
  }

  next();
};

export default {
  tenantResolver,
  addTenantFilter,
  verifySameOrganization,
  requireOwner,
  requireOrgAdmin
};
