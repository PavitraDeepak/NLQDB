import { useState, useEffect } from 'react';
import { schemaService } from '../services/apiService';

export default function Tables({ user }) {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const response = await schemaService.getCollections();
      if (response.success) {
        setCollections(response.data);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  const loadPreview = async (collection) => {
    setLoading(true);
    try {
      const response = await schemaService.getCollectionPreview(collection);
      if (response.success) {
        setPreview(response.data);
        setSelectedCollection(collection);
      }
    } catch (error) {
      console.error('Failed to load preview:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Tables</h1>
        <p className="text-gray-600">Browse collections and view sample data</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Collections List */}
        <div className="col-span-1">
          <div className="card">
            <h2 className="font-semibold mb-4">Collections</h2>
            <div className="space-y-2">
              {collections.map((collection) => (
                <button
                  key={collection}
                  onClick={() => loadPreview(collection)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    selectedCollection === collection
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {collection}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="col-span-3">
          {loading ? (
            <div className="card">
              <p>Loading...</p>
            </div>
          ) : preview ? (
            <div className="card">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">{preview.collection}</h2>
                
                {/* Stats */}
                <div className="flex gap-6 text-sm text-gray-600">
                  <span>Total Documents: {preview.stats.count.toLocaleString()}</span>
                  <span>Size: {(preview.stats.size / 1024).toFixed(2)} KB</span>
                  <span>Indexes: {preview.stats.indexes}</span>
                </div>
              </div>

              {/* Sample Data */}
              <h3 className="font-semibold mb-3">Sample Data</h3>
              {preview.samples.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(preview.samples[0]).map((key) => (
                          <th
                            key={key}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preview.samples.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, i) => (
                            <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {typeof value === 'object'
                                ? JSON.stringify(value).substring(0, 50) + '...'
                                : String(value).substring(0, 50)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>
          ) : (
            <div className="card">
              <p className="text-gray-500">Select a collection to view data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
