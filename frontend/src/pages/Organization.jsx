import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Table from '../components/Table';
import { 
  Users, 
  Mail, 
  UserPlus, 
  Trash2, 
  Crown, 
  Shield, 
  User 
} from 'lucide-react';
import apiService from '../services/apiService';

const Organization = () => {
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  const fetchOrganizationData = async () => {
    try {
      const [orgData, membersData] = await Promise.all([
        apiService.getCurrentOrganization(),
        apiService.getTeamMembers()
      ]);
      setOrganization(orgData);
      setMembers(membersData);
    } catch (error) {
      console.error('Failed to fetch organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    try {
      await apiService.inviteTeamMember({
        email: inviteEmail,
        role: inviteRole
      });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      fetchOrganizationData();
    } catch (error) {
      console.error('Failed to invite member:', error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      await apiService.removeTeamMember(memberId);
      fetchOrganizationData();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      await apiService.updateMemberRole(memberId, newRole);
      fetchOrganizationData();
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Member',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {value?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{value || 'Unknown'}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'organizationRole',
      label: 'Role',
      render: (value) => (
        <div className="flex items-center gap-2">
          {getRoleIcon(value)}
          <span className="text-sm text-gray-700 capitalize">{value}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        row.organizationRole !== 'owner' && (
          <div className="flex items-center gap-2">
            <select
              value={row.organizationRole}
              onChange={(e) => handleUpdateRole(row._id, e.target.value)}
              className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={() => handleRemoveMember(row._id)}
              className="p-1 text-gray-400 hover:text-red-600"
              title="Remove member"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Organization</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your organization settings and team members
          </p>
        </div>

        {/* Organization Info */}
        <Card className="mb-6" title="Organization Details">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Organization Name
              </label>
              <Input
                value={organization?.name || ''}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Slug
              </label>
              <Input
                value={organization?.slug || ''}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Plan
              </label>
              <Input
                value={(organization?.plan || 'free').toUpperCase()}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Created
              </label>
              <Input
                value={new Date(organization?.createdAt).toLocaleDateString()}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
        </Card>

        {/* Team Members Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
            <p className="text-sm text-gray-500 mt-1">
              {members.length} of {organization?.limits?.maxTeamMembers || '∞'} members
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </div>

        {/* Members Table */}
        <Table columns={columns} data={members} />

        {/* Invite Member Modal */}
        <Modal
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            setInviteEmail('');
            setInviteRole('member');
          }}
          title="Invite Team Member"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setShowInviteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleInviteMember}
                disabled={!inviteEmail}
              >
                Send Invitation
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
            />

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="member">Member - Can query and view data</option>
                <option value="admin">Admin - Can manage team and settings</option>
              </select>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-xs text-gray-600">
                An invitation email will be sent to this address. They'll need to accept the invitation to join your organization.
              </p>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default Organization;
