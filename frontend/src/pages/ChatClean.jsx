import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import ChatHeader from '../components/chat/ChatHeader';
import ChatSidebar from '../components/chat/ChatSidebar';
import MessageBubble from '../components/chat/MessageBubble';
import QueryExplanationBox from '../components/chat/QueryExplanationBox';
import QueryCodeAccordion from '../components/chat/QueryCodeAccordion';
import ExecutionStatusLoader from '../components/chat/ExecutionStatusLoader';
import AnswerSummary from '../components/chat/AnswerSummary';
import ResultsPanel from '../components/chat/ResultsPanel';
import ResultsTable from '../components/chat/ResultsTable';
import ChatInput from '../components/chat/ChatInput';
import AutoDetectionBadge from '../components/chat/AutoDetectionBadge';
import AlternativeMatchesHint from '../components/chat/AlternativeMatchesHint';
import apiService from '../services/apiService';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [currentTranslation, setCurrentTranslation] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [executionStages, setExecutionStages] = useState([]);
  const [executionError, setExecutionError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConnections();
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentTranslation, executionResult, executionStages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = () => {
    // Load from localStorage or API
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      try {
        setChatHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load chat history', e);
      }
    }
  };

  const saveChatHistory = (history) => {
    localStorage.setItem('chatHistory', JSON.stringify(history));
  };

  const fetchConnections = async () => {
    try {
      const data = await apiService.getDatabaseConnections();
      const connectionsArray = Array.isArray(data) ? data : [];
      setConnections(connectionsArray);
    } catch (error) {
      console.error('Failed to fetch database connections:', error);
      setConnections([]);
    }
  };

  const generateAnswer = (result, translation) => {
    if (!result || !result.results) {
      return "Query executed successfully.";
    }

    const rowCount = result.rowCount || (Array.isArray(result.results) ? result.results.length : 0);
    
    // Try to extract a meaningful answer
    if (Array.isArray(result.results) && result.results.length === 1) {
      const firstResult = result.results[0];
      const keys = Object.keys(firstResult);
      
      // Check for aggregation results with common patterns
      if (keys.length <= 2) {
        for (const key of keys) {
          const value = firstResult[key];
          if (typeof value === 'number' && key !== '_id') {
            // Determine what type of aggregation based on key name
            if (key.toLowerCase().includes('average') || key.toLowerCase().includes('avg')) {
              return `The average ${key.replace(/average|avg/gi, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()} is ${value.toLocaleString()}.`;
            }
            if (key.toLowerCase().includes('total') || key.toLowerCase().includes('sum')) {
              return `The total ${key.replace(/total|sum/gi, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()} is ${value.toLocaleString()}.`;
            }
            if (key.toLowerCase().includes('count')) {
              return `The count is ${value.toLocaleString()}.`;
            }
            if (key.toLowerCase().includes('min') || key.toLowerCase().includes('minimum')) {
              return `The minimum ${key.replace(/min|minimum/gi, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()} is ${value.toLocaleString()}.`;
            }
            if (key.toLowerCase().includes('max') || key.toLowerCase().includes('maximum')) {
              return `The maximum ${key.replace(/max|maximum/gi, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()} is ${value.toLocaleString()}.`;
            }
            // Generic numeric result
            return `The ${key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()} is ${value.toLocaleString()}.`;
          }
        }
      }
      
      // Check for specific aggregate fields
      if (keys.includes('totalRevenue')) {
        return `The total revenue is $${firstResult.totalRevenue.toLocaleString()}.`;
      }
    }

    // Default messages
    if (rowCount === 0) {
      return "No results found matching your query.";
    } else if (rowCount === 1) {
      return "Found 1 result.";
    } else {
      return `Found ${rowCount.toLocaleString()} results.`;
    }
  };

  const handleSend = async (userMessage) => {
    if (!userMessage.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    // Reset states
    setCurrentTranslation(null);
    setExecutionResult(null);
    setExecutionError(null);
    setExecutionStages([]);
    setLoading(true);

    try {
      // Stage 1: Analyzing query
      setExecutionStages([
        { label: 'Analyzing query...', status: 'loading' }
      ]);

      // Translate query
      const translationResponse = await apiService.translateQuery({
        query: userMessage,
        connectionId: selectedConnection || null
      });

      const translation = translationResponse.data; // Unwrap response
      setCurrentTranslation(translation);

      // Stage 2: Generating code
      setExecutionStages([
        { label: 'Analyzing query...', status: 'completed' },
        { label: 'Generating code...', status: 'loading' }
      ]);

      await new Promise(resolve => setTimeout(resolve, 300));

      // Stage 3: Executing
      setExecutionStages([
        { label: 'Analyzing query...', status: 'completed' },
        { label: 'Generating code...', status: 'completed' },
        { label: 'Executing...', status: 'loading' }
      ]);

      setExecuting(true);

      // Execute query
      const executeResponse = await apiService.executeQuery({
        translationId: translation.translationId,
        translation: {
          ...translation,
          query: translation.query,
          dbType: translation.dbType,
          collection: translation.collection,
          table: translation.table
        },
        connectionId: translation.connectionId
      });

      const result = executeResponse.data; // Unwrap response

      setExecutionStages([
        { label: 'Analyzing query...', status: 'completed' },
        { label: 'Generating code...', status: 'completed' },
        { label: 'Executing...', status: 'completed' }
      ]);

      setExecutionResult(result);

      // Generate answer summary
      const answer = generateAnswer(result, translation);

      // Add assistant message with results
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: translation.explain || 'Query executed successfully',
        timestamp: new Date(),
        translation,
        result,
        answer
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Save to history
      const newChat = {
        id: currentChatId || `chat-${Date.now()}`,
        title: userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : ''),
        timestamp: new Date(),
        messages: [...messages, userMsg, assistantMsg]
      };
      
      const updatedHistory = chatHistory.filter(c => c.id !== newChat.id);
      updatedHistory.unshift(newChat);
      setChatHistory(updatedHistory);
      saveChatHistory(updatedHistory);
      setCurrentChatId(newChat.id);

    } catch (error) {
      console.error('Query failed:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Query execution failed';
      setExecutionError(errorMsg);
      
      setExecutionStages([
        { label: 'Building query...', status: 'completed' },
        { label: 'Validating...', status: 'completed' },
        { label: 'Executing...', status: 'error' }
      ]);

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${errorMsg}`,
        timestamp: new Date(),
        error: true
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
      setExecuting(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentTranslation(null);
    setExecutionResult(null);
    setExecutionError(null);
    setExecutionStages([]);
    setCurrentChatId(null);
  };

  const handleSelectChat = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages || []);
      setCurrentChatId(chatId);
      // Extract last translation and result if available
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage?.translation) {
        setCurrentTranslation(lastMessage.translation);
      }
      if (lastMessage?.result) {
        setExecutionResult(lastMessage.result);
      }
    }
  };

  const handleDeleteChat = (chatId) => {
    const updatedHistory = chatHistory.filter(c => c.id !== chatId);
    setChatHistory(updatedHistory);
    saveChatHistory(updatedHistory);
    if (currentChatId === chatId) {
      handleNewChat();
    }
  };

  const handleExportCSV = () => {
    if (!executionResult?.results) return;
    
    const results = Array.isArray(executionResult.results) 
      ? executionResult.results 
      : [executionResult.results];
    
    if (results.length === 0) return;

    // Convert to CSV
    const headers = Object.keys(results[0]);
    const csv = [
      headers.join(','),
      ...results.map(row => 
        headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
      )
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-results-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const currentChat = chatHistory.find(c => c.id === currentChatId);

  return (
    <DashboardLayout>
      <div className="h-screen flex bg-gray-50">
        {/* Sidebar */}
        <ChatSidebar
          chatHistory={chatHistory}
          currentChatId={currentChatId}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <ChatHeader
            currentChat={currentChat || { 
              title: messages.length > 0 ? messages[0].content.slice(0, 50) + '...' : 'New Chat',
              description: 'Ask questions about your data'
            }}
            onNewChat={handleNewChat}
            onSettings={() => {}}
          />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-4xl mx-auto">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Start a conversation
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Ask questions about your data in plain English.
                      I'll automatically find the right table and generate the query.
                    </p>
                    
                    {/* Example queries */}
                    <div className="space-y-2">
                      {[
                        'What were the total sales for the last 7 days?',
                        'Show me active customers',
                        'Count subscription revenue'
                      ].map((example, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(example)}
                          className="block w-full px-4 py-3 text-sm text-left bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div key={message.id}>
                      <MessageBubble
                        message={message}
                        isUser={message.role === 'user'}
                      />
                      
                      {/* Show query details for assistant messages */}
                      {message.role === 'assistant' && message.translation && (
                        <div className="ml-11 mb-6">
                          {/* Auto-detection badge */}
                          {message.translation.autoDetected && message.translation.detectedFrom && (
                            <AutoDetectionBadge detectedFrom={message.translation.detectedFrom} />
                          )}
                          
                          {/* Alternative matches hint */}
                          {message.translation.detectedFrom?.alternatives && (
                            <AlternativeMatchesHint alternatives={message.translation.detectedFrom.alternatives} />
                          )}
                          
                          <QueryExplanationBox
                            explanation={message.translation.explain}
                            dbType={message.translation.dbType}
                          />
                          
                          <QueryCodeAccordion
                            query={message.translation.query}
                            dbType={message.translation.dbType}
                          />

                          {message.answer && (
                            <AnswerSummary answer={message.answer} />
                          )}

                          {message.result && (
                            <ResultsTable
                              results={message.result.results}
                              rowCount={message.result.rowCount}
                              executionTime={message.result.executionTime}
                              onExportCSV={handleExportCSV}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Show loading state */}
                  {loading && (
                    <div className="ml-11 mb-6">
                      {currentTranslation && (
                        <>
                          {/* Auto-detection badge */}
                          {currentTranslation.autoDetected && currentTranslation.detectedFrom && (
                            <AutoDetectionBadge detectedFrom={currentTranslation.detectedFrom} />
                          )}
                          
                          {/* Alternative matches hint */}
                          {currentTranslation.detectedFrom?.alternatives && (
                            <AlternativeMatchesHint alternatives={currentTranslation.detectedFrom.alternatives} />
                          )}
                          
                          <QueryExplanationBox
                            explanation={currentTranslation.explain}
                            dbType={currentTranslation.dbType}
                          />
                          
                          <QueryCodeAccordion
                            query={currentTranslation.query}
                            dbType={currentTranslation.dbType}
                          />
                        </>
                      )}

                      {executionStages.length > 0 && (
                        <ExecutionStatusLoader stages={executionStages} />
                      )}

                      {executionError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-red-800">{executionError}</p>
                        </div>
                      )}

                      {executionResult && !executionError && (
                        <>
                          <AnswerSummary 
                            answer={generateAnswer(executionResult, currentTranslation)} 
                          />
                          
                          <ResultsTable
                            results={executionResult.results}
                            rowCount={executionResult.rowCount}
                            executionTime={executionResult.executionTime}
                            onExportCSV={handleExportCSV}
                          />
                        </>
                      )}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            disabled={loading || connections.length === 0}
            placeholder={
              connections.length === 0
                ? 'Connect a database first...'
                : 'Ask a question about your data...'
            }
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chat;
