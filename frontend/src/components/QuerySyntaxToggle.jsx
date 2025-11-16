import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, CodeBracketIcon } from '@heroicons/react/24/outline';

/**
 * QuerySyntaxToggle Component
 * Displays generated query syntax with collapsible toggle
 * Shows database/table auto-detection information
 */
export default function QuerySyntaxToggle({ translation, className = '' }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!translation) {
    return null;
  }

  const { query, dbType, explain, autoDetected, detectedFrom, collection, table } = translation;

  // Format query for display
  const formatQuery = (q) => {
    if (!q) return 'No query available';
    
    if (typeof q === 'string') {
      return q;
    }
    
    // MongoDB pipeline
    if (Array.isArray(q)) {
      return JSON.stringify(q, null, 2);
    }
    
    // MongoDB object query
    if (typeof q === 'object') {
      return JSON.stringify(q, null, 2);
    }
    
    return String(q);
  };

  const formattedQuery = formatQuery(query);
  const targetLocation = collection || table || 'unknown';

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-700">
            {isExpanded ? (
              <ChevronDownIcon className="w-5 h-5" />
            ) : (
              <ChevronRightIcon className="w-5 h-5" />
            )}
            <CodeBracketIcon className="w-5 h-5" />
            <span className="font-medium">Generated Query</span>
          </div>
          
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
            {dbType?.toUpperCase() || 'SQL'}
          </span>
          
          {autoDetected && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
              Auto-detected
            </span>
          )}
        </div>

        <span className="text-sm text-gray-500">
          {isExpanded ? 'Hide' : 'Show'} syntax
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Auto-detection info */}
          {autoDetected && detectedFrom && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-2 h-2 mt-1.5 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">
                    Automatically detected target
                    {detectedFrom.score !== undefined && (
                      <span className="ml-2 text-xs font-normal text-green-700">
                        (Match confidence: {Math.round(detectedFrom.score)}%)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    <span className="font-medium">{detectedFrom.connectionName}</span>
                    {' → '}
                    <span className="font-medium">{detectedFrom.database}</span>
                    {' → '}
                    <span className="font-mono bg-green-100 px-2 py-0.5 rounded">
                      {detectedFrom.table}
                    </span>
                  </p>
                  {detectedFrom.matchReasons && detectedFrom.matchReasons.length > 0 && (
                    <ul className="mt-2 text-xs text-green-600 space-y-1">
                      {detectedFrom.matchReasons.slice(0, 2).map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {/* Alternative matches */}
                  {detectedFrom.alternatives && detectedFrom.alternatives.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-xs font-medium text-green-800 mb-2">
                        Other possible matches:
                      </p>
                      <div className="space-y-1">
                        {detectedFrom.alternatives.map((alt, idx) => (
                          <div key={idx} className="text-xs text-green-700 flex items-center gap-2">
                            <span className="font-mono bg-green-100 px-2 py-0.5 rounded">
                              {alt.table}
                            </span>
                            <span className="text-green-600">
                              ({alt.connectionName})
                            </span>
                            {alt.score !== undefined && (
                              <span className="text-green-600">
                                {Math.round(alt.score)}%
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-green-600 mt-2 italic">
                        To use a different table, select the database from the dropdown above
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Target location */}
          {!autoDetected && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Target:</span>
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                {targetLocation}
              </span>
            </div>
          )}

          {/* Explanation */}
          {explain && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-900">
                <span className="font-medium">What this query does:</span>
                {' '}
                {explain}
              </p>
            </div>
          )}

          {/* Query syntax */}
          <div className="relative">
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={() => navigator.clipboard.writeText(formattedQuery)}
                className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
              <code>{formattedQuery}</code>
            </pre>
          </div>

          {/* Query metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {translation.estimatedCost !== undefined && (
              <div className="flex items-center gap-1">
                <span>Cost:</span>
                <span className={`font-medium ${
                  translation.estimatedCost > 0.7 ? 'text-red-600' :
                  translation.estimatedCost > 0.4 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {(translation.estimatedCost * 100).toFixed(0)}%
                </span>
              </div>
            )}
            {translation.safety && (
              <div className="flex items-center gap-1">
                <span>Safety:</span>
                <span className={`font-medium ${
                  translation.safety === 'safe' ? 'text-green-600' :
                  translation.safety === 'warning' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {translation.safety}
                </span>
              </div>
            )}
            {translation.requiresIndexes && translation.requiresIndexes.length > 0 && (
              <div className="flex items-center gap-1">
                <span>Suggested indexes:</span>
                <span className="font-mono">{translation.requiresIndexes.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
