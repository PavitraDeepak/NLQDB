import { SparklesIcon } from '@heroicons/react/24/solid';

export default function AnswerSummary({ answer, highlight }) {
  if (!answer) return null;

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
      <div className="flex items-start gap-2 sm:gap-3">
        <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-900 mb-1">Answer</p>
          <p className="text-sm sm:text-base text-gray-800 leading-relaxed">
            {answer}
            {highlight && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 font-semibold rounded text-xs sm:text-sm">
                {highlight}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
