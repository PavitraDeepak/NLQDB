import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { User, Bell, Shield, Trash2 } from 'lucide-react';

const Settings = () => {
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john@example.com',
  });
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    usageWarnings: true,
    teamInvites: true,
  });

  const handleProfileUpdate = async () => {
    // TODO: Implement profile update
    console.log('Update profile:', profile);
  };

  const handleNotificationsUpdate = async () => {
    // TODO: Implement notifications update
    console.log('Update notifications:', notifications);
  };

  return (
    <DashboardLayout>
      <div className="p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-6 max-w-3xl">
          {/* Profile Settings */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-medium text-gray-900">Profile</h2>
            </div>

            <div className="space-y-4">
              <Input
                label="Full Name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />

              <Input
                label="Email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />

              <Button variant="primary" onClick={handleProfileUpdate}>
                Save Changes
              </Button>
            </div>
          </Card>

          {/* Notifications */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={notifications.emailAlerts}
                  onChange={(e) =>
                    setNotifications({ ...notifications, emailAlerts: e.target.checked })
                  }
                  className="mt-1 rounded border-gray-300 text-black focus:ring-black"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email Alerts</p>
                  <p className="text-sm text-gray-500">
                    Receive email notifications about account activity
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={notifications.usageWarnings}
                  onChange={(e) =>
                    setNotifications({ ...notifications, usageWarnings: e.target.checked })
                  }
                  className="mt-1 rounded border-gray-300 text-black focus:ring-black"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Usage Warnings</p>
                  <p className="text-sm text-gray-500">
                    Get notified when approaching plan limits
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={notifications.teamInvites}
                  onChange={(e) =>
                    setNotifications({ ...notifications, teamInvites: e.target.checked })
                  }
                  className="mt-1 rounded border-gray-300 text-black focus:ring-black"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Team Invitations</p>
                  <p className="text-sm text-gray-500">
                    Receive notifications when invited to teams
                  </p>
                </div>
              </label>

              <Button variant="primary" onClick={handleNotificationsUpdate}>
                Save Preferences
              </Button>
            </div>
          </Card>

          {/* Security */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-medium text-gray-900">Security</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Current Password
                </label>
                <Input type="password" placeholder="••••••••" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  New Password
                </label>
                <Input type="password" placeholder="••••••••" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Confirm New Password
                </label>
                <Input type="password" placeholder="••••••••" />
              </div>

              <Button variant="primary">Change Password</Button>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <div className="flex items-center gap-3 mb-6">
              <Trash2 className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-medium text-red-900">Danger Zone</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Delete Account</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button variant="destructive">Delete Account</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
