import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function ResultsTable({ results, rowCount, executionTime, onExportCSV }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!results || (Array.isArray(results) && results.length === 0)) {
    return null;
  }

  // Check if it's a count result
  const isCountResult = Array.isArray(results) && results.length === 1 && 
    typeof results[0] === 'object' && Object.keys(results[0]).length === 1 &&
    typeof results[0][Object.keys(results[0])[0]] === 'number';

  if (isCountResult) {
    return null; // Count results are shown in the answer summary, no need for table
  }

  const columns = Array.isArray(results) && results.length > 0 
    ? Object.keys(results[0]) 
    : [];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Collapsible Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            )}
            <span className="text-sm font-medium text-gray-700">View Data</span>
            <span className="text-xs text-gray-500">
              ({rowCount || results.length} rows)
            </span>
            {executionTime !== undefined && (
              <span className="text-xs text-gray-500">
                • {executionTime}ms
              </span>
            )}
          </div>
          {onExportCSV && isOpen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExportCSV();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      {isOpen && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.slice(0, 100).map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                    >
                      {typeof row[col] === 'object' && row[col] !== null
                        ? JSON.stringify(row[col])
                        : String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {results.length > 100 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500 text-center">
              Showing first 100 of {results.length} rows
            </div>
          )}
        </div>
      )}
    </div>
  );
}
