import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import Table from '../components/Table';
import { Clock, MessageSquare, Database } from 'lucide-react';
import apiService from '../services/apiService';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await apiService.getQueryHistory();
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'naturalLanguageQuery',
      label: 'Query',
      render: (value) => (
        <div className="max-w-md">
          <p className="text-sm text-gray-900 truncate">{value}</p>
        </div>
      ),
    },
    {
      key: 'collection',
      label: 'Collection',
      render: (value) => (
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{value}</span>
        </div>
      ),
    },
    {
      key: 'resultCount',
      label: 'Results',
      render: (value) => (
        <span className="text-sm text-gray-700">{value || 0}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Executed',
      render: (value) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span
          className={`
            text-xs font-medium px-2 py-1 rounded-md
            ${value === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
            }
          `}
        >
          {value}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Query History</h1>
          <p className="text-sm text-gray-500 mt-1">
            View your past queries and results
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Queries</p>
                <p className="text-3xl font-semibold text-gray-900 mt-2">
                  {history.length}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <MessageSquare className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Successful</p>
                <p className="text-3xl font-semibold text-gray-900 mt-2">
                  {history.filter(q => q.status === 'success').length}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-3xl font-semibold text-gray-900 mt-2">
                  {history.filter(q => q.status === 'error').length}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <Clock className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* History Table */}
        {loading ? (
          <Card>
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </Card>
        ) : (
          <Table 
            columns={columns} 
            data={history}
            onRowClick={(row) => console.log('Query details:', row)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default History;
