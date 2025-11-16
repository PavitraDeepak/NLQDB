import { SparklesIcon } from '@heroicons/react/24/solid';

export default function AnswerSummary({ answer, highlight }) {
  if (!answer) return null;

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <SparklesIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 mb-1">Answer</p>
          <p className="text-base text-gray-800 leading-relaxed">
            {answer}
            {highlight && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 font-semibold rounded">
                {highlight}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
