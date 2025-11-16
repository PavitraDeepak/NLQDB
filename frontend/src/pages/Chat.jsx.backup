import { useState } from 'react';
import { queryService } from '../services/apiService';

export default function Chat({ user }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleTranslate = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setTranslation(null);
    setResults(null);

    try {
      const response = await queryService.translate(query);
      if (response.success) {
        setTranslation(response.data);
      } else {
        setError(response.error || 'Translation failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to translate query');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!translation) return;

    setLoading(true);
    setError('');

    try {
      const response = await queryService.execute(translation.queryId);
      if (response.success) {
        setResults(response);
      } else {
        setError(response.error || 'Execution failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    "Show customers from New York with lifetime value over 5000",
    "Top 5 cities by total orders",
    "Orders delivered in the last 30 days",
    "Customers who joined in 2024"
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ask a Question</h1>
        <p className="text-gray-600">Query your database using natural language</p>
      </div>

      {/* Query Input */}
      <div className="card mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleTranslate()}
            placeholder="e.g., Show me customers from New York..."
            className="input flex-1"
            disabled={loading}
          />
          <button
            onClick={handleTranslate}
            disabled={loading || !query.trim()}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Translate'}
          </button>
        </div>

        {/* Example Queries */}
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((example, index) => (
              <button
                key={index}
                onClick={() => setQuery(example)}
                className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card bg-red-50 border-red-200 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Translation Result */}
      {translation && (
        <div className="card mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Generated Query</h2>
              <p className="text-gray-600">{translation.explain}</p>
            </div>
            {translation.safety.allowed ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                ✓ Safe
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                ✗ Blocked
              </span>
            )}
          </div>

          {/* MongoDB Query */}
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
            <pre className="text-sm">
              {JSON.stringify(translation.mongoQuery, null, 2)}
            </pre>
          </div>

          {/* Metadata */}
          {translation.requiresIndexes?.length > 0 && (
            <div className="text-sm text-gray-600 mb-4">
              <strong>Suggested indexes:</strong> {translation.requiresIndexes.join(', ')}
            </div>
          )}

          {/* Execute Button */}
          {translation.safety.allowed ? (
            <button
              onClick={handleExecute}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Executing...' : 'Execute Query'}
            </button>
          ) : (
            <div className="text-red-600">
              <strong>Query blocked:</strong> {translation.safety.reason}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          
          {/* Metadata */}
          <div className="flex gap-4 mb-4 text-sm text-gray-600">
            <span>Rows: {results.metadata.rowCount}</span>
            <span>Time: {results.metadata.executionTime}ms</span>
            <span>Collection: {results.metadata.collection}</span>
          </div>

          {/* Data Table */}
          {results.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(results.data[0]).map((key) => (
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
                  {results.data.slice(0, 50).map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, i) => (
                        <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No results found</p>
          )}
        </div>
      )}
    </div>
  );
}
