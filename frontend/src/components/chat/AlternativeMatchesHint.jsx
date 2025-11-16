import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function AlternativeMatchesHint({ alternatives }) {
  if (!alternatives || alternatives.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-medium text-amber-900 mb-1">
            Other possible matches found
          </p>
          <div className="space-y-1">
            {alternatives.slice(0, 2).map((alt, idx) => (
              <div key={idx} className="text-xs text-amber-800">
                • <span className="font-mono font-medium">{alt.table}</span>
                {' in '}
                <span className="font-medium">{alt.connectionName}</span>
                {alt.score && (
                  <span className="text-amber-600 ml-1">
                    ({Math.round(alt.score)}% match)
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-700 mt-2 italic">
            To query a different table, be more specific or select a database manually
          </p>
        </div>
      </div>
    </div>
  );
}
