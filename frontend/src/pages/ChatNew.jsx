import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { Send, Loader2 } from 'lucide-react';
import apiService from '../services/apiService';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const data = await apiService.getCollections();
      console.log('Collections data:', data);
      
      // Ensure data is an array
      const collectionsArray = Array.isArray(data) ? data : [];
      setCollections(collectionsArray);
      
      if (collectionsArray.length > 0) {
        setSelectedCollection(collectionsArray[0]); // collectionsArray[0] is a string
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      setCollections([]); // Set empty array on error
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedCollection) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await apiService.translateQuery({
        query: input,
        collection: selectedCollection,
      });

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.mongoQuery,
        explanation: response.explanation,
        results: response.results,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your query.',
        error: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <DashboardLayout>
      <div className="h-screen flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-10 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Query Assistant</h1>
              <p className="text-sm text-gray-500 mt-1">
                Ask questions in natural language
              </p>
            </div>
            <div className="w-64">
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="">Select collection...</option>
                {collections.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-10 py-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Start a conversation
                </h3>
                <p className="text-sm text-gray-500">
                  Ask questions about your data in plain English.
                  I'll translate them into MongoDB queries.
                </p>
                <div className="mt-6 space-y-2">
                  <button
                    onClick={() => setInput('Show me all customers')}
                    className="block w-full px-4 py-2 text-sm text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Show me all customers
                  </button>
                  <button
                    onClick={() => setInput('Find orders from last month')}
                    className="block w-full px-4 py-2 text-sm text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Find orders from last month
                  </button>
                  <button
                    onClick={() => setInput('Count total revenue')}
                    className="block w-full px-4 py-2 text-sm text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Count total revenue
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-black text-white'
                        : message.error
                        ? 'bg-red-50 border border-red-200 text-red-900'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="text-sm leading-6 whitespace-pre-wrap">
                      {message.content}
                    </div>
                    {message.explanation && (
                      <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                        {message.explanation}
                      </div>
                    )}
                    {message.results && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">
                          {message.results.length} results
                        </p>
                        <pre className="text-xs bg-white border border-gray-200 rounded p-2 overflow-x-auto">
                          {JSON.stringify(message.results.slice(0, 3), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-gray-200 px-10 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    selectedCollection
                      ? `Ask a question about ${selectedCollection}...`
                      : 'Select a collection first...'
                  }
                  disabled={!selectedCollection || loading}
                  rows={1}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-black focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || !selectedCollection || loading}
                variant="primary"
                className="px-4 py-3"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send, Shift + Enter for new line
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chat;
