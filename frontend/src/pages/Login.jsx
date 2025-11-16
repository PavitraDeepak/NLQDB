import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiService from '../services/apiService';
import Input from '../components/Input';
import Button from '../components/Button';
import ChangePasswordModal from '../components/ChangePasswordModal';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await apiService.login({ email, password });
      console.log('Login response:', response);
      
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        console.log('Token stored');
        
        // Check if password change is required
        if (response.data.user && response.data.user.requirePasswordChange) {
          console.log('Password change required');
          setShowPasswordChange(true);
        } else {
          // Trigger auth change event for App.jsx to detect
          window.dispatchEvent(new Event('authChange'));
          navigate('/dashboard');
        }
      } else {
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeSuccess = () => {
    console.log('Password changed successfully, redirecting to dashboard');
    setShowPasswordChange(false);
    
    // Update user object to reflect password has been changed
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      user.requirePasswordChange = false;
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    // Trigger auth change event and navigate
    window.dispatchEvent(new Event('authChange'));
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-base sm:text-lg">NL</span>
            </div>
            <span className="text-xl sm:text-2xl font-semibold text-gray-900">NLQDB</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Sign in</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              Welcome back! Please enter your details.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-gray-600">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-gray-600 hover:text-black">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-black font-medium hover:underline">
              Sign up
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-8">
          © 2025 NLQDB. All rights reserved.
        </p>
      </div>

      {/* Password Change Modal */}
      <ChangePasswordModal
        isOpen={showPasswordChange}
        onClose={() => {}}
        isRequired={true}
        onSuccess={handlePasswordChangeSuccess}
      />
    </div>
  );
};

export default Login;
