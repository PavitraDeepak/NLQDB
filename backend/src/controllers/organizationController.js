import organizationService from '../services/organizationService.js';
import { Logger } from '../middlewares/logger.js';

/**
 * Create new organization
 * POST /api/organizations
 */
export const createOrganization = async (req, res) => {
  try {
    const { name, slug, plan, metadata } = req.body;
    const owner = req.user;

    // Check if user already has an organization
    if (owner.organizationId) {
      return res.status(400).json({
        success: false,
        error: 'User already belongs to an organization'
      });
    }

    const organization = await organizationService.createOrganization(
      { name, slug, plan, metadata },
      owner
    );

    res.status(201).json({
      success: true,
      data: organization
    });
  } catch (error) {
    Logger.error('Create organization failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create organization'
    });
  }
};

/**
 * Get current organization
 * GET /api/organizations/current
 */
export const getCurrentOrganization = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return res.status(404).json({
        success: false,
        error: 'User does not belong to any organization'
      });
    }

    const organization = await organizationService.getOrganizationWithTeam(organizationId);

    res.json({
      success: true,
      data: organization
    });
  } catch (error) {
    Logger.error('Get organization failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get organization'
    });
  }
};

/**
 * Get organization by ID
 * GET /api/organizations/:id
 */
export const getOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const organization = await organizationService.getOrganization(id);

    res.json({
      success: true,
      data: organization
    });
  } catch (error) {
    Logger.error('Get organization failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get organization'
    });
  }
};

/**
 * Update organization
 * PUT /api/organizations/:id
 */
export const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user._id;

    const organization = await organizationService.updateOrganization(id, updates, userId);

    res.json({
      success: true,
      data: organization
    });
  } catch (error) {
    Logger.error('Update organization failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update organization'
    });
  }
};

/**
 * Get organization usage summary
 * GET /api/organizations/:id/usage
 */
export const getUsageSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const summary = await organizationService.getUsageSummary(id);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    Logger.error('Get usage summary failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage summary'
    });
  }
};

/**
 * Get team members
 * GET /api/organizations/:id/team
 */
export const getTeamMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const members = await organizationService.getTeamMembers(id);

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    Logger.error('Get team members failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team members'
    });
  }
};

/**
 * Invite team member
 * POST /api/organizations/:id/team/invite
 */
export const inviteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, name } = req.body;
    const inviterId = req.user._id;

    const member = await organizationService.inviteTeamMember(
      id,
      inviterId,
      { email, role, name }
    );

    res.status(201).json({
      success: true,
      data: member,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    Logger.error('Invite team member failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to invite team member'
    });
  }
};

/**
 * Update team member role
 * PUT /api/organizations/:id/team/:memberId/role
 */
export const updateMemberRole = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;
    const updaterId = req.user._id;

    const member = await organizationService.updateMemberRole(id, memberId, role, updaterId);

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    Logger.error('Update member role failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update member role'
    });
  }
};

/**
 * Remove team member
 * DELETE /api/organizations/:id/team/:memberId
 */
export const removeTeamMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const removerId = req.user._id;

    const result = await organizationService.removeTeamMember(id, memberId, removerId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    Logger.error('Remove team member failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove team member'
    });
  }
};

/**
 * Transfer ownership
 * POST /api/organizations/:id/transfer-ownership
 */
export const transferOwnership = async (req, res) => {
  try {
    const { id } = req.params;
    const { newOwnerId } = req.body;
    const currentOwnerId = req.user._id;

    const organization = await organizationService.transferOwnership(
      id,
      currentOwnerId,
      newOwnerId
    );

    res.json({
      success: true,
      data: organization,
      message: 'Ownership transferred successfully'
    });
  } catch (error) {
    Logger.error('Transfer ownership failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to transfer ownership'
    });
  }
};

/**
 * Delete organization
 * DELETE /api/organizations/:id
 */
export const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await organizationService.deleteOrganization(id, userId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    Logger.error('Delete organization failed', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete organization'
    });
  }
};

/**
 * Get current organization's usage (wrapper for /current/usage)
 * GET /api/organizations/current/usage
 */
export const getCurrentOrgUsage = async (req, res) => {
  try {
    // req.organization is set by tenantResolver middleware
    const organizationId = req.organization?._id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization context not found'
      });
    }

    const summary = await organizationService.getUsageSummary(organizationId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    Logger.error('Get current org usage failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage summary'
    });
  }
};

/**
 * Get current organization's team (wrapper for /current/team)
 * GET /api/organizations/current/team
 */
export const getCurrentOrgTeam = async (req, res) => {
  try {
    // req.organization is set by tenantResolver middleware
    const organizationId = req.organization?._id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization context not found'
      });
    }

    const members = await organizationService.getTeamMembers(organizationId);

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    Logger.error('Get current org team failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team members'
    });
  }
};

export default {
  createOrganization,
  getCurrentOrganization,
  getOrganization,
  updateOrganization,
  getUsageSummary,
  getTeamMembers,
  inviteTeamMember,
  updateMemberRole,
  removeTeamMember,
  transferOwnership,
  deleteOrganization,
  getCurrentOrgUsage,
  getCurrentOrgTeam
};
