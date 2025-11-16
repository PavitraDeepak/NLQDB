import { useState } from 'react';
import { ChatBubbleLeftIcon, ClockIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ChatSidebar({ chatHistory = [], currentChatId, onSelectChat, onDeleteChat, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = chatHistory.filter(chat =>
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-64 sm:w-72 lg:w-80 border-l border-gray-200 bg-white flex flex-col h-full shadow-lg lg:shadow-none">
      {/* Sidebar Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Chat History</h2>
          {/* Close button for mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        <input
          type="text"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {filteredHistory.length === 0 ? (
          <div className="p-4 text-center text-xs sm:text-sm text-gray-500">
            No chat history yet
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredHistory.map((chat) => (
              <div
                key={chat.id}
                className={`w-full text-left px-3 py-2.5 sm:py-2 rounded-md transition-all group cursor-pointer active:scale-[0.98] ${
                  currentChatId === chat.id
                    ? 'bg-green-50 text-green-900 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div 
                    className="flex items-start gap-2 sm:gap-2.5 flex-1 min-w-0"
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <ChatBubbleLeftIcon className="w-4 h-4 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate leading-tight">{chat.title}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <ClockIcon className="w-3 h-3" />
                        {new Date(chat.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {onDeleteChat && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 sm:opacity-100 lg:opacity-0 p-1.5 sm:p-1 text-gray-400 hover:text-red-600 transition-all flex-shrink-0 active:scale-90"
                      aria-label="Delete chat"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
