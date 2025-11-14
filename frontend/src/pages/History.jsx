import { useState, useEffect } from 'react';
import { queryService } from '../services/apiService';
import { format } from 'date-fns';

export default function History({ user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    loadHistory();
  }, [page]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await queryService.getHistory(page, 20);
      if (response.success) {
        setHistory(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Query History</h1>
        <p className="text-gray-600">View your past queries and results</p>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading...</p>
        ) : history.length > 0 ? (
          <>
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item._id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.userQuery}</p>
                      <p className="text-sm text-gray-500 mt-1">{item.explain}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.safetyPassed ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          Safe
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                          Blocked
                        </span>
                      )}
                      {item.executed && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          Executed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Collection: {item.collection}</span>
                    <span>Type: {item.queryType}</span>
                    {item.executed && (
                      <span>Results: {item.resultCount}</span>
                    )}
                    <span>
                      {format(new Date(item.timestamp), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.pages}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-center py-8">No query history yet</p>
        )}
      </div>
    </div>
  );
}
