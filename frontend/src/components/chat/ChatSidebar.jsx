import { useState } from 'react';
import { ChatBubbleLeftIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function ChatSidebar({ chatHistory = [], currentChatId, onSelectChat, onDeleteChat }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = chatHistory.filter(chat =>
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-64 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Chat History</h2>
        <input
          type="text"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No chat history yet
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredHistory.map((chat) => (
              <div
                key={chat.id}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors group cursor-pointer ${
                  currentChatId === chat.id
                    ? 'bg-green-50 text-green-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div 
                    className="flex items-start gap-2 flex-1 min-w-0"
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <ChatBubbleLeftIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{chat.title}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
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
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity flex-shrink-0"
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
