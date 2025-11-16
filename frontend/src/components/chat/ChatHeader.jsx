import { PlusIcon, Cog6ToothIcon, Bars3Icon } from '@heroicons/react/24/outline';

export default function ChatHeader({ currentChat, onNewChat, onSettings, onToggleSidebar, showSidebarToggle, sidebarPosition = 'left' }) {
  return (
    <div className="h-14 sm:h-16 border-b border-gray-200 bg-white px-3 sm:px-4 md:px-6 flex items-center flex-shrink-0 relative z-10">
      {/* Title Section */}
      <div className="flex-1 min-w-0 pr-20 sm:pr-28">
        <h1 className="text-sm sm:text-base md:text-lg font-medium text-gray-900 truncate">
          {currentChat?.title || 'New Chat'}
        </h1>
        {currentChat?.description && (
          <p className="text-xs sm:text-sm text-gray-500 truncate hidden sm:block">{currentChat.description}</p>
        )}
      </div>

      {/* Button Section - Always visible */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto">
        <button
          onClick={onNewChat}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors active:scale-95"
        >
          <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
        <button
          onClick={onSettings}
          className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors hidden sm:block"
          aria-label="Settings"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
        {/* Chat history toggle button */}
        {showSidebarToggle && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
            aria-label="Toggle chat history"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
