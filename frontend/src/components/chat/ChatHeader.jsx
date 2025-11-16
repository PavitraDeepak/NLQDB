import { PlusIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function ChatHeader({ currentChat, onNewChat, onSettings }) {
  return (
    <div className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-medium text-gray-900">
          {currentChat?.title || 'New Chat'}
        </h1>
        {currentChat?.description && (
          <p className="text-sm text-gray-500">{currentChat.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onNewChat}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          New Chat
        </button>
        <button
          onClick={onSettings}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
