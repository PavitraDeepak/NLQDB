import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { Plus, Key, Trash2, RotateCw, Copy, Check } from 'lucide-react';
import apiService from '../services/apiService';

const ApiKeys = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState({ name: '', permissions: [] });
  const [createdKey, setCreatedKey] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const data = await apiService.getApiKeys();
      setApiKeys(data);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    try {
      const response = await apiService.createApiKey(newKeyData);
      setCreatedKey(response.key); // Full key shown only once
      setNewKeyData({ name: '', permissions: [] });
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleRevokeKey = async (id) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    
    try {
      await apiService.revokeApiKey(id);
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  };

  const handleRotateKey = async (id) => {
    if (!confirm('This will generate a new key and revoke the old one. Continue?')) return;
    
    try {
      const response = await apiService.rotateApiKey(id);
      setCreatedKey(response.newKey);
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to rotate API key:', error);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (value) => (
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">{value}</span>
        </div>
      ),
    },
    {
      key: 'prefix',
      label: 'Key',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
            {value}•••••••
          </code>
          {row.status === 'active' && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              Active
            </span>
          )}
          {row.status === 'revoked' && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              Revoked
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'lastUsed',
      label: 'Last Used',
      render: (value) => (
        value ? new Date(value).toLocaleDateString() : 'Never'
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.status === 'active' && (
            <>
              <button
                onClick={() => handleRotateKey(row._id)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Rotate key"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleRevokeKey(row._id)}
                className="p-1 text-gray-400 hover:text-red-600"
                title="Revoke key"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">API Keys</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage API keys for programmatic access
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create API Key
          </Button>
        </div>

        {/* Info Card */}
        <Card className="mb-6 bg-gray-50">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-gray-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Authenticate your requests
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Use API keys to authenticate requests to the NLQDB API. Include the key in your request headers as <code className="bg-white px-1 py-0.5 rounded">X-API-Key</code>.
              </p>
            </div>
          </div>
        </Card>

        {/* API Keys Table */}
        {loading ? (
          <Card>
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </Card>
        ) : (
          <Table columns={columns} data={apiKeys} />
        )}

        {/* Create API Key Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setNewKeyData({ name: '', permissions: [] });
          }}
          title="Create API Key"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateKey}
                disabled={!newKeyData.name}
              >
                Create Key
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Key Name"
              value={newKeyData.name}
              onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
              placeholder="Production API Key"
              helperText="A descriptive name for this API key"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Permissions
              </label>
              <div className="space-y-2">
                {['query:read', 'query:write', 'schema:read'].map(perm => (
                  <label key={perm} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newKeyData.permissions.includes(perm)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewKeyData({
                            ...newKeyData,
                            permissions: [...newKeyData.permissions, perm]
                          });
                        } else {
                          setNewKeyData({
                            ...newKeyData,
                            permissions: newKeyData.permissions.filter(p => p !== perm)
                          });
                        }
                      }}
                      className="rounded border-gray-300 text-black focus:ring-black"
                    />
                    <span className="text-sm text-gray-700">{perm}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Modal>

        {/* Show Created Key Modal */}
        <Modal
          isOpen={!!createdKey}
          onClose={() => setCreatedKey(null)}
          title="API Key Created"
          footer={
            <Button
              variant="primary"
              onClick={() => setCreatedKey(null)}
            >
              Done
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-900">
                Save this key now!
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                This is the only time you'll see the full key. Store it securely.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Your API Key
              </label>
              <div className="flex gap-2">
                <Input
                  value={createdKey || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="secondary"
                  onClick={() => copyToClipboard(createdKey, 'new')}
                >
                  {copiedId === 'new' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default ApiKeys;
