import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import QuerySyntaxToggle from '../components/QuerySyntaxToggle';
import { Send, Loader2 } from 'lucide-react';
import apiService from '../services/apiService';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [currentTranslation, setCurrentTranslation] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [executionError, setExecutionError] = useState(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const formatCost = (value) => {
    if (typeof value !== 'number') {
      return 'N/A';
    }
    return value.toFixed(2);
  };

  const getQueryFromTranslation = (translationLike) => {
    if (!translationLike) {
      return null;
    }
    return (
      translationLike.query ||
      translationLike.mongoQuery ||
      translationLike.sqlQuery ||
      null
    );
  };

  const formatQueryContent = (translationLike) => {
    const query = getQueryFromTranslation(translationLike);
    if (!query) {
      return 'No query generated';
    }
    if (typeof query === 'string') {
      return query;
    }
    return JSON.stringify(query, null, 2);
  };

  const formatResultsPreview = (results) => {
    if (!results || (Array.isArray(results) && results.length === 0)) {
      return 'No results returned.';
    }

    const trimmed = Array.isArray(results) ? results.slice(0, 5) : results;
    return JSON.stringify(trimmed, null, 2);
  };

  const getSafetyBadgeClasses = (level) => {
    switch ((level || 'safe').toLowerCase()) {
      case 'unsafe':
        return 'bg-red-100 text-red-700 border border-red-200';
      case 'warning':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      default:
        return 'bg-green-100 text-green-700 border border-green-200';
    }
  };

  const selectedConnectionInfo = connections.find(
    (conn) => conn._id === selectedConnection
  );
  const hasAdditionalResults =
    Array.isArray(executionResult?.results) && executionResult.results.length > 5;

  const fetchConnections = async () => {
    try {
      const data = await apiService.getDatabaseConnections();
      
      // Ensure data is an array
      const connectionsArray = Array.isArray(data) ? data : [];
      setConnections(connectionsArray);
      
      if (connectionsArray.length > 0) {
        const firstConnectionId = connectionsArray[0]._id;
        setSelectedConnection(firstConnectionId); // Use connection _id
        setCurrentTranslation(null);
        setExecutionResult(null);
        setPendingConfirmation(null);
        setExecutionError(null);
      }
    } catch (error) {
      console.error('Failed to fetch database connections:', error);
      setConnections([]); // Set empty array on error
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedConnection) return;

    const contextPayload = messages
      .slice(-6)
      .map((msg) => ({ role: msg.role, content: msg.content }));

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
        connectionId: selectedConnection,
        context: contextPayload,
      });
      if (!response?.success) {
        throw new Error(response?.error || 'Translation failed');
      }

      const translation = response.data;
      const formattedQuery = formatQueryContent(translation);

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: formattedQuery || 'No query generated',
        explanation: translation?.explain,
        safety: translation?.safety,
        warningMessage: translation?.warningMessage,
        metadata: {
          estimatedCost: translation?.estimatedCost,
          requiresIndexes: translation?.requiresIndexes || []
        },
        translation,
        timestamp: new Date(),
      };

      setCurrentTranslation(translation);
      setExecutionResult(null);
      setPendingConfirmation(null);
      setExecutionError(null);
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

  const handleExecute = async (options = {}) => {
    if (!currentTranslation || !selectedConnection) {
      return;
    }

    setExecuting(true);
    setExecutionError(null);
    setPendingConfirmation(null);

    try {
      const response = await apiService.executeQuery({
        translation: currentTranslation,
        connectionId: selectedConnection,
        options
      });

      if (response?.requiresConfirmation) {
        setPendingConfirmation({
          message: response.message,
          estimatedCost: response.estimatedCost
        });
        return;
      }

      if (!response?.success) {
        throw new Error(response?.error || 'Query execution failed');
      }

      const resultData = response.data;
      setExecutionResult(resultData);
      setPendingConfirmation(null);
    } catch (error) {
      const errMessage =
        error?.response?.data?.error || error?.message || 'Query execution failed';
      setExecutionError(errMessage);
    } finally {
      setExecuting(false);
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
                value={selectedConnection}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedConnection(value);
                  setCurrentTranslation(null);
                  setExecutionResult(null);
                  setPendingConfirmation(null);
                  setExecutionError(null);
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-black focus:border-black"
              >
                <option key="auto" value="">Auto-detect from all databases</option>
                {connections.map((conn) => (
                  <option key={conn._id} value={conn._id}>
                    {conn.name}
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
                  I'll automatically find the right table and generate the query.
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
                    {(message.explanation || message.warningMessage || typeof message.metadata?.estimatedCost === 'number' || message.results) && (
                      <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                        {message.explanation && (
                          <div className="text-sm text-gray-600">
                            {message.explanation}
                          </div>
                        )}
                        {message.warningMessage && (
                          <div className="text-sm text-amber-700">
                            {message.warningMessage}
                          </div>
                        )}
                        {typeof message.metadata?.estimatedCost === 'number' && (
                          <div className="text-xs text-gray-500">
                            Estimated cost: {formatCost(message.metadata.estimatedCost)}
                          </div>
                        )}
                        {message.results && (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">
                              {Array.isArray(message.results) ? message.results.length : 1} results
                            </p>
                            <pre className="text-xs bg-white border border-gray-200 rounded p-2 overflow-x-auto">
                              {JSON.stringify(
                                Array.isArray(message.results)
                                  ? message.results.slice(0, 3)
                                  : message.results,
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        )}
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
              {currentTranslation && (
                <div className="space-y-4">
                  {/* Query Syntax Toggle - Always show syntax with toggle */}
                  <QuerySyntaxToggle translation={currentTranslation} />
                  
                  {/* Execution Controls */}
                  <Card>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleExecute()}
                          disabled={executing || loading}
                          variant="primary"
                          className="flex items-center gap-2"
                        >
                          {executing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Execute Query'
                          )}
                        </Button>
                      </div>
                      {executing && !pendingConfirmation && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Running query...</span>
                        </div>
                      )}
                      {pendingConfirmation && (
                        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
                          <p className="text-sm text-amber-700">{pendingConfirmation.message}</p>
                          {typeof pendingConfirmation.estimatedCost === 'number' && (
                            <p className="text-xs text-amber-700">
                              Estimated cost: {formatCost(pendingConfirmation.estimatedCost)}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleExecute({ confirmed: true })}
                              disabled={executing}
                              variant="destructive"
                              className="flex items-center gap-2"
                            >
                              {executing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Run Anyway'
                              )}
                            </Button>
                            <Button
                              onClick={() => setPendingConfirmation(null)}
                              disabled={executing}
                              variant="secondary"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                      {executionError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {executionError}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}
              {executionResult && (
                <Card
                  key={executionResult.executionId}
                  title="Execution Output"
                  description="Results returned from your database."
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">
                        {executionResult.rowCount ?? (Array.isArray(executionResult.results) ? executionResult.results.length : 0)} rows
                      </span>
                      {typeof executionResult.executionTime === 'number' && (
                        <span>Execution time: {executionResult.executionTime}ms</span>
                      )}
                      {executionResult.cached && (
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-600">
                          Cached result
                        </span>
                      )}
                      {executionResult.truncated && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                          Truncated
                        </span>
                      )}
                    </div>
                    {executionResult.executionId && (
                      <div className="text-xs text-gray-500">
                        Execution ID:{' '}
                        <span className="font-mono text-gray-700">{executionResult.executionId}</span>
                      </div>
                    )}
                    <pre className="max-h-96 overflow-x-auto overflow-y-auto rounded-lg bg-gray-900 p-4 text-sm leading-6 text-green-200">
                      {formatResultsPreview(executionResult.results)}
                    </pre>
                    {hasAdditionalResults && !executionResult.truncated && (
                      <p className="text-xs text-gray-500">
                        Showing first 5 rows. Refine your query or export full results from history.
                      </p>
                    )}
                    {executionResult.truncated && (
                      <p className="text-xs text-amber-700">
                        Results truncated to protect the workspace. Apply filters or limits for smaller result sets.
                      </p>
                    )}
                  </div>
                </Card>
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
                    connections.length === 0
                      ? 'Connect a database first...'
                      : 'Ask a question about your data...'
                  }
                  disabled={connections.length === 0 || loading}
                  rows={1}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-black focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || connections.length === 0 || loading}
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
