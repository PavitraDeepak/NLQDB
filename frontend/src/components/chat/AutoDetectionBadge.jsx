import { CircleStackIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function AutoDetectionBadge({ detectedFrom }) {
  if (!detectedFrom) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full mb-4">
      <CheckCircleIcon className="w-4 h-4 text-green-600" />
      <div className="flex items-center gap-1.5 text-xs">
        <CircleStackIcon className="w-3.5 h-3.5 text-green-600" />
        <span className="text-green-700 font-medium">
          {detectedFrom.connectionName}
        </span>
        <span className="text-green-600">→</span>
        <span className="text-green-700 font-medium">
          {detectedFrom.table}
        </span>
        {detectedFrom.score && (
          <span className="ml-1 text-green-600">
            ({Math.round(detectedFrom.score)}% match)
          </span>
        )}
      </div>
    </div>
  );
}
