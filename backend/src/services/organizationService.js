import { Organization, User } from '../models/index.js';
import { Logger } from '../middlewares/logger.js';
import crypto from 'crypto';
import EmailService from './emailService.js';

class OrganizationService {
  /**
   * Create new organization
   */
  async createOrganization(data, owner) {
    try {
      const { name, slug, plan = 'free', metadata = {} } = data;

      // Generate slug if not provided
      const orgSlug = slug || this.generateSlug(name);

      // Check if slug is available
      const existing = await Organization.findOne({ slug: orgSlug });
      if (existing) {
        throw new Error('Organization slug already taken');
      }

      // Create organization
      const organization = new Organization({
        name,
        slug: orgSlug,
        ownerUserId: owner._id,
        plan,
        planStatus: 'active',
        metadata,
        status: 'active'
      });

      // Set plan limits
      await organization.updatePlan(plan);
      await organization.save();

      // Update owner's organization
      owner.organizationId = organization._id;
      owner.organizationRole = 'owner';
      await owner.save();

      Logger.info('Organization created', {
        organizationId: organization._id,
        name,
        ownerId: owner._id
      });

      return organization;
    } catch (error) {
      Logger.error('Failed to create organization', error);
      throw error;
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(organizationId) {
    try {
      const organization = await Organization.findById(organizationId)
        .populate('ownerUserId', 'name email');

      if (!organization) {
        throw new Error('Organization not found');
      }

      return organization;
    } catch (error) {
      Logger.error('Failed to get organization', error);
      throw error;
    }
  }

  /**
   * Get organization with team members
   */
  async getOrganizationWithTeam(organizationId) {
    try {
      const organization = await this.getOrganization(organizationId);
      const members = await User.findByOrganization(organizationId);

      return {
        ...organization.toObject(),
        team: members.map(u => u.toSafeObject())
      };
    } catch (error) {
      Logger.error('Failed to get organization with team', error);
      throw error;
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(organizationId, updates, userId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Check permission
      const user = await User.findById(userId);
      if (!user.isOwner() && !user.isSuperAdmin) {
        throw new Error('Only organization owners can update settings');
      }

      // Allowed updates
      const allowedFields = ['name', 'settings', 'metadata'];
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          if (key === 'settings' || key === 'metadata') {
            organization[key] = { ...organization[key], ...updates[key] };
          } else {
            organization[key] = updates[key];
          }
        }
      });

      await organization.save();

      Logger.info('Organization updated', {
        organizationId,
        userId,
        fields: Object.keys(updates)
      });

      return organization;
    } catch (error) {
      Logger.error('Failed to update organization', error);
      throw error;
    }
  }

  /**
   * Invite team member
   */
  async inviteTeamMember(organizationId, inviterUserId, memberData) {
    try {
      const { email, role = 'member', name } = memberData;

      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Check team size limit
      const currentSize = await User.countDocuments({
        organizationId,
        isActive: true
      });

      if (currentSize >= organization.limits.maxTeamMembers && organization.plan !== 'enterprise') {
        throw new Error('Team member limit reached. Please upgrade your plan.');
      }

      // Check if user already exists
      let user = await User.findOne({ email });
      
      if (user) {
        // User exists, add to organization
        if (user.organizationId) {
          throw new Error('User already belongs to another organization');
        }
        user.organizationId = organizationId;
        user.organizationRole = role;
        user.invitedBy = inviterUserId;
        user.invitedAt = new Date();
        await user.save();
      } else {
        // Create new user (pending)
        const tempPassword = crypto.randomBytes(16).toString('hex');
        const verificationToken = crypto.randomBytes(32).toString('hex');

        user = new User({
          name: name || email.split('@')[0],
          email,
          password: tempPassword,
          organizationId,
          organizationRole: role,
          role: 'viewer',
          invitedBy: inviterUserId,
          invitedAt: new Date(),
          emailVerificationToken: verificationToken,
          emailVerified: false,
          isActive: false
        });

        await user.save();
      }

      // Send invitation email
      const inviter = await User.findById(inviterUserId);
      await EmailService.sendTeamInvitation(user, organization, inviter);

      Logger.info('Team member invited', {
        organizationId,
        inviterId: inviterUserId,
        newUserId: user._id,
        email
      });

      return user.toSafeObject();
    } catch (error) {
      Logger.error('Failed to invite team member', error);
      throw error;
    }
  }

  /**
   * Remove team member
   */
  async removeTeamMember(organizationId, memberUserId, removerId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Check permission
      const remover = await User.findById(removerId);
      if (!remover.isOrgAdmin() && !remover.isSuperAdmin) {
        throw new Error('Only organization admins can remove team members');
      }

      const member = await User.findById(memberUserId);
      if (!member || member.organizationId.toString() !== organizationId.toString()) {
        throw new Error('Team member not found');
      }

      // Cannot remove owner
      if (member.isOwner()) {
        throw new Error('Cannot remove organization owner');
      }

      // Remove from organization
      member.organizationId = null;
      member.organizationRole = 'member';
      member.isActive = false;
      await member.save();

      Logger.info('Team member removed', {
        organizationId,
        removerId,
        removedUserId: memberUserId
      });

      return { success: true, message: 'Team member removed successfully' };
    } catch (error) {
      Logger.error('Failed to remove team member', error);
      throw error;
    }
  }

  /**
   * Update team member role
   */
  async updateMemberRole(organizationId, memberUserId, newRole, updaterId) {
    try {
      // Check permission
      const updater = await User.findById(updaterId);
      if (!updater.isOwner() && !updater.isSuperAdmin) {
        throw new Error('Only organization owners can update roles');
      }

      const member = await User.findById(memberUserId);
      if (!member || member.organizationId.toString() !== organizationId.toString()) {
        throw new Error('Team member not found');
      }

      // Cannot change owner role
      if (member.isOwner()) {
        throw new Error('Cannot change owner role');
      }

      const oldRole = member.organizationRole;
      member.organizationRole = newRole;
      await member.save();

      Logger.info('Team member role updated', {
        organizationId,
        memberUserId,
        oldRole,
        newRole
      });

      return member.toSafeObject();
    } catch (error) {
      Logger.error('Failed to update member role', error);
      throw error;
    }
  }

  /**
   * Get team members
   */
  async getTeamMembers(organizationId) {
    try {
      const members = await User.findByOrganization(organizationId)
        .select('-password -emailVerificationToken -passwordResetToken');

      return members.map(m => m.toSafeObject());
    } catch (error) {
      Logger.error('Failed to get team members', error);
      throw error;
    }
  }

  /**
   * Delete organization (soft delete)
   */
  async deleteOrganization(organizationId, userId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Check permission
      const user = await User.findById(userId);
      if (!user.isOwner() && !user.isSuperAdmin) {
        throw new Error('Only organization owners can delete the organization');
      }

      // Soft delete
      organization.status = 'deleted';
      organization.planStatus = 'canceled';
      await organization.save();

      // Deactivate all members
      await User.updateMany(
        { organizationId },
        { isActive: false }
      );

      Logger.info('Organization deleted', {
        organizationId,
        userId
      });

      return { success: true, message: 'Organization deleted successfully' };
    } catch (error) {
      Logger.error('Failed to delete organization', error);
      throw error;
    }
  }

  /**
   * Generate unique slug from name
   */
  generateSlug(name) {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${baseSlug}-${randomSuffix}`;
  }

  /**
   * Get organization usage summary
   */
  async getUsageSummary(organizationId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const usage = organization.usage;
      const limits = organization.limits;

      return {
        plan: organization.plan,
        planStatus: organization.planStatus,
        queries: {
          used: usage.queriesThisMonth,
          limit: limits.queriesPerMonth,
          percentage: limits.queriesPerMonth > 0 
            ? Math.round((usage.queriesThisMonth / limits.queriesPerMonth) * 100)
            : 0,
          remaining: Math.max(0, limits.queriesPerMonth - usage.queriesThisMonth)
        },
        tokens: {
          used: usage.tokensUsed,
          limit: limits.tokensPerMonth,
          percentage: limits.tokensPerMonth > 0
            ? Math.round((usage.tokensUsed / limits.tokensPerMonth) * 100)
            : 0,
          remaining: Math.max(0, limits.tokensPerMonth - usage.tokensUsed)
        },
        storage: {
          used: usage.storageMB,
          limit: limits.storageLimitMB,
          percentage: limits.storageLimitMB > 0
            ? Math.round((usage.storageMB / limits.storageLimitMB) * 100)
            : 0,
          remaining: Math.max(0, limits.storageLimitMB - usage.storageMB)
        },
        apiRequests: {
          used: usage.apiRequestsThisMonth,
          limit: organization.plan === 'enterprise' ? -1 : 10000
        },
        resetDate: usage.queriesLastReset
      };
    } catch (error) {
      Logger.error('Failed to get usage summary', error);
      throw error;
    }
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(organizationId, currentOwnerId, newOwnerId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const currentOwner = await User.findById(currentOwnerId);
      const newOwner = await User.findById(newOwnerId);

      if (!currentOwner || !newOwner) {
        throw new Error('User not found');
      }

      if (!currentOwner.isOwner()) {
        throw new Error('Only current owner can transfer ownership');
      }

      if (newOwner.organizationId.toString() !== organizationId.toString()) {
        throw new Error('New owner must be a member of the organization');
      }

      // Update roles
      currentOwner.organizationRole = 'admin';
      newOwner.organizationRole = 'owner';
      organization.ownerUserId = newOwnerId;

      await Promise.all([
        currentOwner.save(),
        newOwner.save(),
        organization.save()
      ]);

      Logger.info('Ownership transferred', {
        organizationId,
        fromUserId: currentOwnerId,
        toUserId: newOwnerId
      });

      return organization;
    } catch (error) {
      Logger.error('Failed to transfer ownership', error);
      throw error;
    }
  }
}

export default new OrganizationService();
