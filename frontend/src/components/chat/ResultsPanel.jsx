import { ArrowDownTrayIcon, ArrowPathIcon, TableCellsIcon } from '@heroicons/react/24/outline';

export default function ResultsPanel({ 
  results, 
  rowCount, 
  executionTime, 
  truncated,
  onViewFull,
  onExportCSV,
  onRunAgain 
}) {
  const formatResults = (data) => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return 'No results returned.';
    }

    // Special handling for count aggregations (e.g., [{totalTransactions: 41}])
    if (Array.isArray(data) && data.length === 1 && typeof data[0] === 'object') {
      const keys = Object.keys(data[0]);
      if (keys.length === 1 && typeof data[0][keys[0]] === 'number') {
        return `Count: ${data[0][keys[0]].toLocaleString()}`;
      }
    }

    const preview = Array.isArray(data) ? data.slice(0, 3) : data;
    return JSON.stringify(preview, null, 2);
  };

  const hasMoreResults = Array.isArray(results) && results.length > 3;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TableCellsIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {rowCount !== undefined ? rowCount : (Array.isArray(results) ? results.length : 0)} rows
              </span>
            </div>
            {executionTime !== undefined && (
              <span className="text-xs text-gray-500">
                Execution time: {executionTime}ms
              </span>
            )}
            {truncated && (
              <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                Truncated
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onExportCSV && (
              <button
                onClick={onExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
            {onRunAgain && (
              <button
                onClick={onRunAgain}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                Run Again
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="p-4">
        <pre className="text-xs text-gray-800 leading-relaxed font-mono overflow-x-auto">
          {formatResults(results)}
        </pre>
        {hasMoreResults && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={onViewFull}
              className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
            >
              View Full Results →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
