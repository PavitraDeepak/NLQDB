import { useState } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { Lock, AlertCircle } from 'lucide-react';
import apiService from '../services/apiService';

const ChangePasswordModal = ({ isOpen, onClose, isRequired = false, onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (!isRequired && !currentPassword) {
      setError('Current password is required');
      return;
    }

    try {
      setLoading(true);
      await apiService.changePassword(currentPassword, newPassword);
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!isRequired) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isRequired ? 'Change Your Password' : 'Change Password'}
      footer={
        <div className="flex items-center justify-end gap-3">
          {!isRequired && (
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isRequired && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-900">Password Change Required</p>
              <p className="text-sm text-yellow-700 mt-1">
                You're using a temporary password. Please change it to secure your account.
              </p>
              <p className="text-sm text-yellow-600 mt-2 font-mono">
                Current password: <span className="font-bold">11111111</span>
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!isRequired && (
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
            required
            icon={<Lock className="w-4 h-4" />}
          />
        )}

        <Input
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password (min 8 characters)"
          required
          icon={<Lock className="w-4 h-4" />}
        />

        <Input
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          required
          icon={<Lock className="w-4 h-4" />}
        />

        <div className="pt-2">
          <p className="text-xs text-gray-500">
            Password requirements:
          </p>
          <ul className="text-xs text-gray-600 mt-1 space-y-1 ml-4">
            <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
              • At least 8 characters
            </li>
          </ul>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
