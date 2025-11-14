import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import Table from '../components/Table';
import { Database, RefreshCw, FileJson, ChevronRight } from 'lucide-react';
import apiService from '../services/apiService';

const TablesPage = () => {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [schema, setSchema] = useState(null);
  const [sampleData, setSampleData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    if (selectedCollection) {
      fetchSchema(selectedCollection);
      fetchSampleData(selectedCollection);
    }
  }, [selectedCollection]);

  const fetchCollections = async () => {
    try {
      const data = await apiService.getCollections();
      setCollections(data);
      if (data.length > 0) {
        setSelectedCollection(data[0].name);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchema = async (collectionName) => {
    try {
      const data = await apiService.getSchema(collectionName);
      setSchema(data);
    } catch (error) {
      console.error('Failed to fetch schema:', error);
    }
  };

  const fetchSampleData = async (collectionName) => {
    try {
      const data = await apiService.getSampleData(collectionName, 10);
      setSampleData(data);
    } catch (error) {
      console.error('Failed to fetch sample data:', error);
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

  // Generate table columns from schema or sample data
  const columns = schema?.fields
    ? Object.keys(schema.fields).slice(0, 5).map(key => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
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
          <Button
            variant="secondary"
            onClick={() => {
              fetchCollections();
              if (selectedCollection) {
                fetchSchema(selectedCollection);
                fetchSampleData(selectedCollection);
              }
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* Collections Sidebar */}
          <div>
            <Card title="Collections" className="h-fit">
              <div className="space-y-1">
                {collections.map((collection) => (
                  <button
                    key={collection.name}
                    onClick={() => setSelectedCollection(collection.name)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors
                      ${selectedCollection === collection.name
                        ? 'bg-gray-100 text-black font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      <span>{collection.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-3 space-y-6">
            {/* Schema Card */}
            {schema && (
              <Card title={`Schema: ${selectedCollection}`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Document Count</span>
                    <span className="font-medium text-gray-900">
                      {schema.count?.toLocaleString() || '0'}
                    </span>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-800 mb-3">Fields</p>
                    <div className="space-y-2">
                      {schema.fields && Object.entries(schema.fields).slice(0, 10).map(([key, type]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                        >
                          <div className="flex items-center gap-2">
                            <FileJson className="w-4 h-4 text-gray-400" />
                            <code className="text-xs font-mono text-gray-700">{key}</code>
                          </div>
                          <span className="text-xs text-gray-500">{type}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {schema.indexes && schema.indexes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-2">Indexes</p>
                      <div className="space-y-1">
                        {schema.indexes.map((index, i) => (
                          <div key={i} className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                            {JSON.stringify(index.key)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Sample Data Table */}
            <Card title="Sample Data">
              {sampleData.length > 0 ? (
                <Table columns={columns} data={sampleData} />
              ) : (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No data available</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TablesPage;
