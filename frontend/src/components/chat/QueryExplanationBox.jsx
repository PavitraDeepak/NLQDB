import { InformationCircleIcon } from '@heroicons/react/24/outline';

export default function QueryExplanationBox({ explanation, dbType }) {
  if (!explanation) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 mb-1">
            Query Plan
          </p>
          <p className="text-sm text-blue-800 leading-relaxed">
            {explanation}
          </p>
          {dbType && (
            <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
              {dbType.toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
