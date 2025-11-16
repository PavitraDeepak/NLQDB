import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export default function ExecutionStatusLoader({ stages = [] }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div key={index} className="flex items-center gap-3">
            {stage.status === 'completed' ? (
              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : stage.status === 'loading' ? (
              <ArrowPathIcon className="w-5 h-5 text-blue-600 flex-shrink-0 animate-spin" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                stage.status === 'completed' ? 'text-green-700' :
                stage.status === 'loading' ? 'text-blue-700' :
                'text-gray-500'
              }`}>
                {stage.label}
              </p>
              {stage.detail && (
                <p className="text-xs text-gray-500 mt-0.5">{stage.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
