import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import Table from '../components/Table';
import { Database, RefreshCw, FileJson, ChevronRight, Plus, AlertCircle } from 'lucide-react';
import apiService from '../services/apiService';

const TablesPage = () => {
  const [databaseConnections, setDatabaseConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schemaLoading, setSchemaLoading] = useState(false);

  useEffect(() => {
    fetchDatabaseConnections();
  }, []);

  useEffect(() => {
    if (selectedConnection) {
      fetchSchema(selectedConnection._id);
    }
  }, [selectedConnection]);

  const fetchDatabaseConnections = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDatabaseConnections(false); // Only active connections
      const connectionsArray = Array.isArray(data) ? data : [];
      setDatabaseConnections(connectionsArray);
      
      if (connectionsArray.length > 0) {
        setSelectedConnection(connectionsArray[0]);
      }
    } catch (error) {
      console.error('Failed to fetch database connections:', error);
      setDatabaseConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchema = async (connectionId) => {
    try {
      setSchemaLoading(true);
      setTables([]);
      setSelectedTable(null);
      setSchema(null);
      
      const response = await apiService.getDatabaseSchema(connectionId);
      const tablesData = response.tables || [];
      setTables(tablesData);
      
      if (tablesData.length > 0) {
        setSelectedTable(tablesData[0]);
        setSchema(tablesData[0]);
      }
    } catch (error) {
      console.error('Failed to fetch schema:', error);
      setTables([]);
    } finally {
      setSchemaLoading(false);
    }
  };

  const handleRefresh = () => {
    if (selectedConnection) {
      fetchSchema(selectedConnection._id);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-4 gap-6">
              <div className="h-96 bg-gray-200 rounded-lg"></div>
              <div className="col-span-3 h-96 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Empty state - no database connections
  if (databaseConnections.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Tables</h1>
            <p className="text-sm text-gray-500 mt-1">
              Browse your database schema and data
            </p>
          </div>

          <Card>
            <div className="text-center py-16">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Database className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No database connections found
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                To browse tables and schemas, you need to add a database connection first.
                Connect to PostgreSQL, MySQL, MongoDB, or other supported databases.
              </p>
              <Link to="/database-connections">
                <Button variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Database Connection
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Generate table columns from schema
  const columns = schema?.columns
    ? schema.columns.slice(0, 6).map(col => ({
        key: col.name,
        label: col.name.charAt(0).toUpperCase() + col.name.slice(1),
        render: (value) => (
          <span className="text-sm text-gray-700">
            {typeof value === 'object' 
              ? JSON.stringify(value).slice(0, 50) + '...'
              : String(value || '-')
            }
          </span>
        ),
      }))
    : [];

  return (
    <DashboardLayout>
      <div className="p-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Tables</h1>
            <p className="text-sm text-gray-500 mt-1">
              Browse your database schema and data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-4">
              <p className="text-xs text-gray-500">Connected to</p>
              <p className="text-sm font-medium text-gray-900">{selectedConnection?.name}</p>
            </div>
            <Button variant="secondary" onClick={handleRefresh} disabled={schemaLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${schemaLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Database Connection Selector */}
        {databaseConnections.length > 1 && (
          <div className="mb-6">
            <Card>
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
                {databaseConnections.map((conn) => (
                  <button
                    key={conn._id}
                    onClick={() => setSelectedConnection(conn)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all whitespace-nowrap
                      ${selectedConnection?._id === conn._id
                        ? 'border-black bg-gray-50 text-black'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-black'
                      }
                    `}
                  >
                    <Database className="w-4 h-4" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{conn.name}</p>
                      <p className="text-xs text-gray-500">{conn.type}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {schemaLoading ? (
          <div className="animate-pulse grid grid-cols-4 gap-6">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="col-span-3 h-96 bg-gray-200 rounded-lg"></div>
          </div>
        ) : tables.length === 0 ? (
          <Card>
            <div className="text-center py-16">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tables found
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Unable to retrieve schema from this database connection.
              </p>
              <Button variant="secondary" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-4 gap-6">
            {/* Tables Sidebar */}
            <div>
              <Card title="Tables & Collections" className="h-fit">
                <div className="space-y-1">
                  {tables.map((table) => (
                    <button
                      key={table.name}
                      onClick={() => {
                        setSelectedTable(table);
                        setSchema(table);
                      }}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors
                        ${selectedTable?.name === table.name
                          ? 'bg-gray-100 text-black font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        <span className="truncate">{table.name}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            {/* Main Content */}
            <div className="col-span-3 space-y-6">
              {/* Schema Card */}
              {schema && (
                <Card title={`Schema: ${schema.name}`}>
                  <div className="space-y-4">
                    {schema.rowCount !== undefined && (
                      <div className="flex items-center justify-between text-sm pb-4 border-b border-gray-200">
                        <span className="text-gray-600">Row Count</span>
                        <span className="font-medium text-gray-900">
                          {schema.rowCount?.toLocaleString() || '0'}
                        </span>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-3">Columns</p>
                      <div className="space-y-2">
                        {schema.columns && schema.columns.slice(0, 15).map((column) => (
                          <div
                            key={column.name}
                            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                          >
                            <div className="flex items-center gap-2">
                              <FileJson className="w-4 h-4 text-gray-400" />
                              <code className="text-xs font-mono text-gray-700">{column.name}</code>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500">{column.type}</span>
                              {column.nullable === false && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">NOT NULL</span>
                              )}
                              {column.primaryKey && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">PK</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {schema.columns && schema.columns.length > 15 && (
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          + {schema.columns.length - 15} more columns
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Info Note */}
              <Card>
                <div className="flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Sample Data Preview</p>
                    <p className="text-gray-600 text-xs">
                      Sample data preview is not yet available. Use the Chat interface to query this database
                      or execute queries directly from the Database Connections page.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TablesPage;
