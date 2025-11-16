import { UserCircleIcon } from '@heroicons/react/24/solid';
import { CpuChipIcon } from '@heroicons/react/24/outline';

export default function MessageBubble({ message, isUser }) {
  const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  }) : '';

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-2xl">
          <div className="bg-green-600 text-white rounded-2xl rounded-tr-sm px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          {timestamp && (
            <span className="text-xs text-gray-400 mt-1">{timestamp}</span>
          )}
        </div>
        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center">
          <UserCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 sm:gap-3 mb-4 sm:mb-6">
      <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-100 flex items-center justify-center">
        <CpuChipIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
      </div>
      <div className="flex flex-col max-w-[85%] sm:max-w-2xl flex-1">
        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        {timestamp && (
          <span className="text-xs text-gray-400 mt-1">{timestamp}</span>
        )}
      </div>
    </div>
  );
}
