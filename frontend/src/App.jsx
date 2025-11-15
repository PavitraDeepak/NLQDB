import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ChatNew from './pages/ChatNew';
import TablesNew from './pages/TablesNew';
import HistoryNew from './pages/HistoryNew';
import ApiKeys from './pages/ApiKeys';
import Billing from './pages/Billing';
import Organization from './pages/Organization';
import Settings from './pages/Settings';
import StyleGuide from './pages/StyleGuide';

function App() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication on mount and storage changes
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
      setLoading(false);
    };

    checkAuth();

    // Listen for storage events (when localStorage changes in other tabs)
    window.addEventListener('storage', checkAuth);
    
    // Custom event for same-tab localStorage changes
    window.addEventListener('authChange', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('authChange', checkAuth);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 bg-black rounded-md flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">NL</span>
          </div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to="/dashboard" />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
      />
      <Route
        path="/chat"
        element={isAuthenticated ? <ChatNew /> : <Navigate to="/login" />}
      />
      <Route
        path="/tables"
        element={isAuthenticated ? <TablesNew /> : <Navigate to="/login" />}
      />
      <Route
        path="/history"
        element={isAuthenticated ? <HistoryNew /> : <Navigate to="/login" />}
      />
      <Route
        path="/api-keys"
        element={isAuthenticated ? <ApiKeys /> : <Navigate to="/login" />}
      />
      <Route
        path="/billing"
        element={isAuthenticated ? <Billing /> : <Navigate to="/login" />}
      />
      <Route
        path="/organization"
        element={isAuthenticated ? <Organization /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings"
        element={isAuthenticated ? <Settings /> : <Navigate to="/login" />}
      />
      <Route
        path="/style-guide"
        element={isAuthenticated ? <StyleGuide /> : <Navigate to="/login" />}
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
    </Routes>
  );
}

export default App;
