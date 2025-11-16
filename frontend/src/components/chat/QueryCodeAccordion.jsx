import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function QueryCodeAccordion({ query, dbType }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatQuery = (q) => {
    if (!q) return 'No query available';
    
    if (typeof q === 'string') {
      return q;
    }
    
    if (Array.isArray(q) || typeof q === 'object') {
      return JSON.stringify(q, null, 2);
    }
    
    return String(q);
  };

  const formattedQuery = formatQuery(query);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
          {isOpen ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          View Query Code
        </span>
        {dbType && (
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded font-mono">
            {dbType.toUpperCase()}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="border-t border-gray-200">
          <div className="relative">
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors text-xs flex items-center gap-1"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-3 h-3" />
                  Copied
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
            <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-xs leading-relaxed font-mono">
              <code>{formattedQuery}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
