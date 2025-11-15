import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { Database, Plus, Trash2, RefreshCw, TestTube, Key, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import apiService from '../services/apiService';

const DatabaseConnections = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [testingConnection, setTestingConnection] = useState(null);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showUri, setShowUri] = useState(false);
  const [visibleDetails, setVisibleDetails] = useState({}); // Track which connection details are visible

  const [formData, setFormData] = useState({
    name: '',
    type: 'postgresql',
    connectionMethod: 'standard', // 'standard' or 'uri'
    // Standard connection fields
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    // URI-based connection field
    uri: '',
    // Common fields
    description: '',
    readOnly: true,
    ssl: {
      enabled: false,
      rejectUnauthorized: true
    }
  });

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDatabaseConnections(true);
      setConnections(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
      setError('Failed to load database connections');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type) => {
    const defaultPorts = {
      postgresql: 5432,
      mysql: 3306,
      mariadb: 3306,
      sqlserver: 1433,
      mongodb: 27017,
      oracle: 1521,
      redis: 6379,
      cassandra: 9042
    };

    // Determine default connection method based on type
    const isNoSQL = ['mongodb', 'redis', 'cassandra'].includes(type);
    const connectionMethod = isNoSQL ? 'uri' : 'standard';

    setFormData({
      ...formData,
      type,
      connectionMethod,
      port: defaultPorts[type] || 5432
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingConnection) {
        await apiService.updateDatabaseConnection(editingConnection.id, formData);
      } else {
        await apiService.createDatabaseConnection(formData);
      }

      setShowModal(false);
      resetForm();
      fetchConnections();
    } catch (err) {
      setError(err.message || 'Failed to save connection');
    }
  };

  const handleTest = async (connection) => {
    setTestingConnection(connection.id);
    try {
      const result = await apiService.testDatabaseConnection(connection.id);
      
      if (result.success) {
        alert(`Connection successful!\n${result.message}`);
      } else {
        alert(`Connection failed:\n${result.message || result.error}`);
      }
      
      fetchConnections(); // Refresh to get updated status
    } catch (err) {
      alert(`Connection test failed:\n${err.message}`);
    } finally {
      setTestingConnection(null);
    }
  };

  const handleDelete = async (connection) => {
    if (!confirm(`Are you sure you want to delete "${connection.name}"?`)) {
      return;
    }

    try {
      await apiService.deleteDatabaseConnection(connection.id);
      fetchConnections();
    } catch (err) {
      alert('Failed to delete connection: ' + err.message);
    }
  };

  const handleEdit = (connection) => {
    setEditingConnection(connection);
    setFormData({
      name: connection.name,
      type: connection.type,
      connectionMethod: connection.connectionMethod || 'standard',
      host: connection.host || '',
      port: connection.port || 5432,
      database: connection.database || '',
      username: connection.username || '',
      password: '', // Don't pre-fill password for security
      uri: '', // Don't pre-fill URI for security
      description: connection.description || '',
      readOnly: connection.readOnly,
      ssl: connection.ssl || { enabled: false, rejectUnauthorized: true }
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'postgresql',
      connectionMethod: 'standard',
      host: '',
      port: 5432,
      database: '',
      username: '',
      password: '',
      uri: '',
      description: '',
      readOnly: true,
      ssl: {
        enabled: false,
        rejectUnauthorized: true
      }
    });
    setEditingConnection(null);
    setError('');
    setShowPassword(false);
    setShowUri(false);
  };

  const toggleDetailVisibility = (connectionId) => {
    setVisibleDetails(prev => ({
      ...prev,
      [connectionId]: !prev[connectionId]
    }));
  };

  const maskValue = (value) => {
    if (!value) return '••••••••';
    if (value.length <= 8) return '••••••••';
    return value.substring(0, 4) + '••••' + value.substring(value.length - 4);
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      testing: 'bg-yellow-100 text-yellow-700',
      inactive: 'bg-gray-100 text-gray-700',
      error: 'bg-red-100 text-red-700'
    };

    const icons = {
      active: <CheckCircle className="w-3 h-3" />,
      testing: <RefreshCw className="w-3 h-3" />,
      inactive: <AlertCircle className="w-3 h-3" />,
      error: <AlertCircle className="w-3 h-3" />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {icons[status]}
        {status}
      </span>
    );
  };

  const getDatabaseIcon = (type) => {
    return <Database className="w-5 h-5 text-gray-600" />;
  };

  return (
    <DashboardLayout>
      <div className="p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Database Connections</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage external database connections for your organization
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Connection
          </Button>
        </div>

        {/* Connections Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading connections...</div>
        ) : connections.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No database connections</h3>
              <p className="text-sm text-gray-500 mb-4">
                Get started by adding your first external database connection
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                icon={<Plus className="w-4 h-4" />}
              >
                Add Connection
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map((connection) => (
              <Card key={connection.id} className="hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getDatabaseIcon(connection.type)}
                      <div>
                        <h3 className="font-medium text-gray-900">{connection.name}</h3>
                        <p className="text-xs text-gray-500 uppercase">{connection.type}</p>
                      </div>
                    </div>
                    {getStatusBadge(connection.status)}
                  </div>

                  {/* Connection Details */}
                  <div className="space-y-2 text-sm">
                    {connection.connectionMethod === 'uri' ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Method:</span>
                          <span className="text-gray-900 font-mono text-xs">URI Connection</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Database:</span>
                          <span className="text-gray-900 font-mono text-xs">{connection.database || 'default'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-500">Connection:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 font-mono text-xs truncate max-w-[120px]">
                              {visibleDetails[connection.id] ? '(Stored securely)' : 'mongodb://•••@•••/***'}
                            </span>
                            <button
                              onClick={() => toggleDetailVisibility(connection.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title={visibleDetails[connection.id] ? "Hide details" : "Show details"}
                            >
                              {visibleDetails[connection.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Host:</span>
                          <span className="text-gray-900 font-mono text-xs">{connection.host}:{connection.port}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Database:</span>
                          <span className="text-gray-900 font-mono text-xs">{connection.database}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-500">User:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 font-mono text-xs">
                              {visibleDetails[connection.id] ? connection.username : maskValue(connection.username)}
                            </span>
                            <button
                              onClick={() => toggleDetailVisibility(connection.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title={visibleDetails[connection.id] ? "Hide details" : "Show details"}
                            >
                              {visibleDetails[connection.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Mode:</span>
                      <span className={`text-xs font-medium ${connection.readOnly ? 'text-green-600' : 'text-orange-600'}`}>
                        {connection.readOnly ? 'Read-Only' : 'Read-Write'}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {connection.description && (
                    <p className="text-sm text-gray-600 pt-2 border-t border-gray-100">
                      {connection.description}
                    </p>
                  )}

                  {/* Usage Stats */}
                  {connection.usage && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Total Queries:</span>
                        <span className="font-medium text-gray-900">{connection.usage.totalQueries || 0}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(connection)}
                      disabled={testingConnection === connection.id}
                      icon={testingConnection === connection.id ? 
                        <RefreshCw className="w-4 h-4 animate-spin" /> : 
                        <TestTube className="w-4 h-4" />
                      }
                      className="flex-1"
                    >
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(connection)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(connection)}
                      icon={<Trash2 className="w-4 h-4" />}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          title={editingConnection ? 'Edit Connection' : 'Add Database Connection'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Input
              label="Connection Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Production Database"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Database Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-black focus:border-black"
                required
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="mariadb">MariaDB</option>
                <option value="sqlserver">SQL Server</option>
                <option value="mongodb">MongoDB</option>
                <option value="oracle">Oracle</option>
                <option value="redis">Redis</option>
                <option value="cassandra">Cassandra</option>
              </select>
            </div>

            {/* Connection Method Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Connection Method
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="standard"
                    checked={formData.connectionMethod === 'standard'}
                    onChange={(e) => setFormData({ ...formData, connectionMethod: e.target.value })}
                    className="mr-2"
                  />
                  <span className="text-sm">Standard (SQL)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="uri"
                    checked={formData.connectionMethod === 'uri'}
                    onChange={(e) => setFormData({ ...formData, connectionMethod: e.target.value })}
                    className="mr-2"
                  />
                  <span className="text-sm">URI (NoSQL)</span>
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {formData.connectionMethod === 'uri' 
                  ? 'Use URI for NoSQL databases like MongoDB (mongodb://user:pass@host:port/db)' 
                  : 'Use standard connection for SQL databases (PostgreSQL, MySQL, etc.)'}
              </p>
            </div>

            {/* Conditional Fields based on Connection Method */}
            {formData.connectionMethod === 'uri' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Connection URI
                </label>
                <div className="relative">
                  <input
                    type={showUri ? "text" : "password"}
                    value={formData.uri}
                    onChange={(e) => setFormData({ ...formData, uri: e.target.value })}
                    placeholder="mongodb://username:password@localhost:27017/database"
                    required
                    className="w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-black focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUri(!showUri)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showUri ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Full connection string including credentials
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <Input
                      label="Host"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      placeholder="localhost or db.example.com"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      label="Port"
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <Input
                  label="Database Name"
                  value={formData.database}
                  onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                  placeholder="my_database"
                  required
                />

                <Input
                  label="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="db_user"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingConnection ? "Leave blank to keep current" : "••••••••"}
                      required={!editingConnection}
                      className="w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-black focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {editingConnection && (
                    <p className="mt-1 text-xs text-gray-500">
                      Leave blank to keep the current password
                    </p>
                  )}
                </div>
              </>
            )}

            <Input
              label="Description (Optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Production database for customer data"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="readOnly"
                checked={formData.readOnly}
                onChange={(e) => setFormData({ ...formData, readOnly: e.target.checked })}
                className="rounded border-gray-300 text-black focus:ring-black"
              />
              <label htmlFor="readOnly" className="text-sm text-gray-700">
                Read-only mode (recommended for security)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sslEnabled"
                checked={formData.ssl.enabled}
                onChange={(e) => setFormData({
                  ...formData,
                  ssl: { ...formData.ssl, enabled: e.target.checked }
                })}
                className="rounded border-gray-300 text-black focus:ring-black"
              />
              <label htmlFor="sslEnabled" className="text-sm text-gray-700">
                Enable SSL/TLS
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                {editingConnection ? 'Update' : 'Create'} Connection
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default DatabaseConnections;
