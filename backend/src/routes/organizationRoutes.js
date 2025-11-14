import express from 'express';
import organizationController from '../controllers/organizationController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantResolver, requireOwner, requireOrgAdmin } from '../middlewares/tenantResolver.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Organization Management
 */

// Create organization (no tenant context needed yet)
router.post('/', organizationController.createOrganization);

// Get current user's organization
router.get('/current', tenantResolver, organizationController.getCurrentOrganization);

// Get organization by ID
router.get('/:id', tenantResolver, organizationController.getOrganization);

// Update organization (owner only)
router.put('/:id', tenantResolver, requireOwner, organizationController.updateOrganization);

// Delete organization (owner only)
router.delete('/:id', tenantResolver, requireOwner, organizationController.deleteOrganization);

/**
 * Usage & Analytics
 */

// Get usage summary
router.get('/:id/usage', tenantResolver, organizationController.getUsageSummary);

/**
 * Team Management
 */

// Get team members
router.get('/:id/team', tenantResolver, organizationController.getTeamMembers);

// Invite team member (admin or owner)
router.post('/:id/team/invite', tenantResolver, requireOrgAdmin, organizationController.inviteTeamMember);

// Update member role (owner only)
router.put('/:id/team/:memberId/role', tenantResolver, requireOwner, organizationController.updateMemberRole);

// Remove team member (admin or owner)
router.delete('/:id/team/:memberId', tenantResolver, requireOrgAdmin, organizationController.removeTeamMember);

/**
 * Ownership
 */

// Transfer ownership (owner only)
router.post('/:id/transfer-ownership', tenantResolver, requireOwner, organizationController.transferOwnership);

export default router;
