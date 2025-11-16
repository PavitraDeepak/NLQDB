import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, ArrowDownTrayIcon, ChevronUpIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';

export default function ResultsTable({ results, rowCount, executionTime, onExportCSV }) {
  const [isOpen, setIsOpen] = useState(true); // Open by default for data tables
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

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

  // Sort data
  const sortedResults = sortColumn ? [...results].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    
    // Handle null/undefined
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
    if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
    
    // Compare numbers
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    // Compare strings
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    
    if (sortDirection === 'asc') {
      return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
    } else {
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
    }
  }) : results;

  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction or clear sort
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) {
      return <ArrowsUpDownIcon className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="w-3.5 h-3.5 text-green-600" />
      : <ChevronDownIcon className="w-3.5 h-3.5 text-green-600" />;
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Collapsible Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isOpen ? (
              <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            )}
            <span className="text-xs sm:text-sm font-medium text-gray-700">View Data</span>
            <span className="text-xs text-gray-500">
              ({rowCount || results.length} rows)
            </span>
            {executionTime !== undefined && (
              <span className="text-xs text-gray-500 hidden sm:inline">
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
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      {isOpen && (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors group whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col}</span>
                      {getSortIcon(col)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedResults.slice(0, 100).map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 whitespace-nowrap"
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
          </div>
          {results.length > 100 && (
            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border-t border-gray-200 text-xs sm:text-sm text-gray-500 text-center">
              Showing first 100 of {results.length} rows
            </div>
          )}
        </div>
      )}
    </div>
  );
}
