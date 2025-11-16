import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { 
  MessageSquare, Send, Database, Zap, AlertTriangle, 
  CheckCircle, Clock, RefreshCw, X, FileText, Eye,
  DollarSign, ChevronDown, ChevronUp
} from 'lucide-react';
import Button from '../components/Button';
import apiService from '../services/apiService';

/**
 * Chat Page - Natural Language Query Interface
 * Supabase-style white theme with professional spacing
 */
const Chat = () => {
  // State management
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [currentTranslation, setCurrentTranslation] = useState(null);
  const [currentResults, setCurrentResults] = useState(null);
  const [showQueryInspector, setShowQueryInspector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [costEstimate, setCostEstimate] = useState(null);
  const [showExpensiveWarning, setShowExpensiveWarning] = useState(false);
  const [pendingExecution, setPendingExecution] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load database connections on mount
  useEffect(() => {
    loadConnections();
    loadHistory();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConnections = async () => {
    try {
      const response = await apiService.getDatabaseConnections();
      setConnections(response.data || []);
      if (response.data && response.data.length > 0) {
        setSelectedConnection(response.data[0]._id);
      }
    } catch (err) {
      console.error('Failed to load connections:', err);
      setError('Failed to load database connections');
    }
  };

  const loadHistory = async () => {
    try {
      const response = await apiService.getChatHistory({ limit: 20 });
      setHistory(response.data?.history || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedConnection) return;
    if (loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setError('');
    setCurrentTranslation(null);
    setCurrentResults(null);

    try {
      // Get translation
      const context = messages.slice(-6); // Last 6 messages for context
      const translationResponse = await apiService.translateQuery({
        query: userMessage.content,
        connectionId: selectedConnection,
        context: context.map(m => ({ role: m.role, content: m.content }))
      });

      const translation = translationResponse.data;

      // Add AI response with translation
      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: translation.explain,
        translation,
        timestamp: new Date(),
        safety: translation.safety,
        estimatedCost: translation.estimatedCost
      };

      setMessages(prev => [...prev, aiMessage]);
      setCurrentTranslation(translation);
      setShowQueryInspector(true);

      // Check if expensive
      if (translation.estimatedCost > 0.7) {
        setShowExpensiveWarning(true);
        setPendingExecution({ translation, connectionId: selectedConnection });
      }

    } catch (err) {
      console.error('Translation error:', err);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'error',
        content: err.response?.data?.error || err.message || 'Failed to translate query',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteQuery = async (confirmed = false) => {
    if (!currentTranslation || !selectedConnection) return;
    if (loading) return;

    setLoading(true);
    setError('');
    setShowExpensiveWarning(false);

    try {
      const executionResponse = await apiService.executeQuery({
        translation: currentTranslation,
        connectionId: selectedConnection,
        options: { confirmed }
      });

      // Check if requires confirmation
      if (executionResponse.data?.requiresConfirmation) {
        setShowExpensiveWarning(true);
        setPendingExecution({ 
          translation: currentTranslation, 
          connectionId: selectedConnection 
        });
        return;
      }

      const results = executionResponse.data;

      // Add results message
      const resultsMessage = {
        id: Date.now() + 2,
        role: 'results',
        content: `Query executed successfully. ${results.rowCount} rows returned in ${results.executionTime}ms.`,
        results,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, resultsMessage]);
      setCurrentResults(results);
      loadHistory(); // Refresh history

    } catch (err) {
      console.error('Execution error:', err);
      const errorMessage = {
        id: Date.now() + 2,
        role: 'error',
        content: err.response?.data?.error || err.message || 'Failed to execute query',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setPendingExecution(null);
    }
  };

  const handleConfirmExpensive = () => {
    handleExecuteQuery(true);
  };

  const handleCancelExpensive = () => {
    setShowExpensiveWarning(false);
    setPendingExecution(null);
  };

  const handleExplainOnly = async () => {
    if (!inputValue.trim() || !selectedConnection) return;
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await apiService.explainQuery({
        query: inputValue,
        connectionId: selectedConnection
      });

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.explain,
        translation: response.data,
        timestamp: new Date(),
        explainOnly: true
      };

      setMessages(prev => [...prev, aiMessage]);
      setInputValue('');

    } catch (err) {
      console.error('Explain error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!currentTranslation || !selectedConnection) return;
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await apiService.previewQuery({
        translation: currentTranslation,
        connectionId: selectedConnection
      });

      const previewMessage = {
        id: Date.now() + 2,
        role: 'preview',
        content: `Preview: First ${response.data.previewRowCount} rows`,
        results: response.data,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, previewMessage]);

    } catch (err) {
      console.error('Preview error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReplayQuery = async (executionId) => {
    setLoading(true);
    setError('');

    try {
      const response = await apiService.replayQuery({ executionId });
      
      const replayMessage = {
        id: Date.now(),
        role: 'results',
        content: `Query replayed successfully. ${response.data.rowCount} rows returned.`,
        results: response.data,
        timestamp: new Date(),
        replayed: true
      };

      setMessages(prev => [...prev, replayMessage]);
      setCurrentResults(response.data);

    } catch (err) {
      console.error('Replay error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (message) => {
    if (message.role === 'user') {
      return (
        <div key={message.id} className="flex justify-end mb-4">
          <div className="bg-black text-white px-4 py-3 rounded-lg max-w-2xl">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            <span className="text-xs text-gray-400 mt-1 block">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      );
    }

    if (message.role === 'assistant') {
      return (
        <div key={message.id} className="flex justify-start mb-4">
          <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-lg max-w-2xl">
            <div className="flex items-start gap-2 mb-2">
              <MessageSquare className="w-4 h-4 mt-0.5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm text-gray-900">{message.content}</p>
                {message.safety && (
                  <div className="flex items-center gap-2 mt-2">
                    {message.safety === 'safe' && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
                        <CheckCircle className="w-3 h-3" />
                        Safe
                      </span>
                    )}
                    {message.safety === 'warning' && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded">
                        <AlertTriangle className="w-3 h-3" />
                        Warning
                      </span>
                    )}
                    {message.safety === 'unsafe' && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-50 text-red-700 rounded">
                        <X className="w-3 h-3" />
                        Unsafe
                      </span>
                    )}
                    {message.estimatedCost !== undefined && (
                      <span className="text-xs text-gray-500">
                        Cost: {(message.estimatedCost * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      );
    }

    if (message.role === 'results' || message.role === 'preview') {
      return (
        <div key={message.id} className="mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-900">{message.content}</span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            {message.results && (
              <ResultsTable 
                results={message.results.results} 
                rowCount={message.results.rowCount}
                executionTime={message.results.executionTime}
                truncated={message.results.truncated}
              />
            )}
          </div>
        </div>
      );
    }

    if (message.role === 'error') {
      return (
        <div key={message.id} className="mb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-900">{message.content}</p>
                <span className="text-xs text-red-600 mt-1 block">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Natural Language Chat</h1>
              <p className="text-sm text-gray-500 mt-1">
                Ask questions in plain English about your data
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Database Connection Selector */}
              <select
                value={selectedConnection || ''}
                onChange={(e) => setSelectedConnection(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">Select Database</option>
                {connections.map(conn => (
                  <option key={conn._id} value={conn._id}>
                    {conn.name} ({conn.type})
                  </option>
                ))}
              </select>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <Clock className="w-4 h-4 mr-2" />
                History
              </Button>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-900">{error}</span>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Start a conversation
                    </h3>
                    <p className="text-sm text-gray-500 max-w-md">
                      Ask questions about your data in natural language. For example:<br/>
                      "Show me all orders from last month"<br/>
                      "Count active users by region"
                    </p>
                  </div>
                </div>
              )}
              
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </div>

            {/* Query Inspector */}
            {showQueryInspector && currentTranslation && (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <QueryInspector 
                  translation={currentTranslation}
                  onExecute={handleExecuteQuery}
                  onPreview={handlePreview}
                  loading={loading}
                />
              </div>
            )}

            {/* Input Area */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question about your data..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-black text-sm"
                    rows={2}
                    disabled={loading || !selectedConnection}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleExplainOnly}
                    disabled={loading || !inputValue.trim() || !selectedConnection}
                    title="Explain without executing"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSendMessage}
                    disabled={loading || !inputValue.trim() || !selectedConnection}
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* History Sidebar */}
          {showHistory && (
            <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto">
              <HistorySidebar 
                history={history}
                onReplay={handleReplayQuery}
                onClose={() => setShowHistory(false)}
              />
            </div>
          )}
        </div>

        {/* Expensive Query Warning Modal */}
        {showExpensiveWarning && (
          <ExpensiveWarningModal
            estimatedCost={pendingExecution?.translation?.estimatedCost}
            onConfirm={handleConfirmExpensive}
            onCancel={handleCancelExpensive}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

/**
 * Query Inspector Component
 * Shows translated query and execution controls
 */
const QueryInspector = ({ translation, onExecute, onPreview, loading }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">Generated Query</span>
          {translation.safety === 'safe' && (
            <CheckCircle className="w-4 h-4 text-green-600" />
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-3">
          <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs overflow-x-auto">
            <pre>{JSON.stringify(translation.query, null, 2)}</pre>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-600">
              {translation.estimatedCost !== undefined && (
                <span>Cost: {(translation.estimatedCost * 100).toFixed(0)}%</span>
              )}
              {translation.tokensUsed && (
                <span>Tokens: {translation.tokensUsed}</span>
              )}
              {translation.requiresIndexes?.length > 0 && (
                <span title={`Indexes: ${translation.requiresIndexes.join(', ')}`}>
                  ⚡ {translation.requiresIndexes.length} indexes recommended
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onPreview}
                disabled={loading}
              >
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onExecute()}
                disabled={loading || translation.safety === 'unsafe'}
              >
                <Zap className="w-3 h-3 mr-1" />
                Execute
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Results Table Component
 * Displays query results in a clean table
 */
const ResultsTable = ({ results, rowCount, executionTime, truncated }) => {
  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No results found
      </div>
    );
  }

  const columns = Object.keys(results[0]);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap"
                  >
                    {row[col] !== null && row[col] !== undefined
                      ? String(row[col])
                      : <span className="text-gray-400">null</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600 pt-2">
        <div className="flex items-center gap-4">
          <span>{rowCount} rows</span>
          <span>{executionTime}ms</span>
          {truncated && (
            <span className="text-yellow-600">Results truncated</span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * History Sidebar Component
 */
const HistorySidebar = ({ history, onReplay, onClose }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <h3 className="text-sm font-medium text-gray-900">Query History</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No history yet
          </div>
        )}

        {history.map((item) => (
          <div
            key={item.executionId}
            className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-medium text-gray-900">
                {item.explain?.substring(0, 60)}...
              </span>
              <span className="text-xs text-gray-500">
                {new Date(item.timestamp).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>{item.rowCount} rows</span>
                <span>{item.executionTime}ms</span>
              </div>
              <button
                onClick={() => onReplay(item.executionId)}
                className="text-xs text-black hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Replay
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Expensive Query Warning Modal
 */
const ExpensiveWarningModal = ({ estimatedCost, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Expensive Query Warning
              </h3>
              <p className="text-sm text-gray-600">
                This query has an estimated cost of{' '}
                <span className="font-semibold">{(estimatedCost * 100).toFixed(0)}%</span>.
                It may take longer to execute and consume more resources.
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
            <p className="text-xs text-yellow-900">
              Consider adding indexes to the recommended fields or refining your query to improve performance.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              className="flex-1"
            >
              Execute Anyway
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
