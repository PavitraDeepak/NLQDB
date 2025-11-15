import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiService from '../services/apiService';
import Input from '../components/Input';
import Button from '../components/Button';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await apiService.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        organizationName: formData.organizationName,
      });
      console.log('Signup response:', response);
      // Registration successful, redirect to login
      navigate('/login', { state: { message: 'Account created successfully. Please log in.' } });
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-black rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-lg">NL</span>
            </div>
            <span className="text-2xl font-semibold text-gray-900">NLQDB</span>
          </div>
        </div>

        {/* Signup Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Create an account</h1>
            <p className="text-sm text-gray-500 mt-2">
              Get started with your free account today.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
            />

            <Input
              label="Organization name"
              type="text"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              placeholder="Acme Corporation"
              helperText="Your company or team name"
              required
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              helperText="Must be at least 8 characters"
              required
            />

            <Input
              label="Confirm password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />

            <div className="pt-2">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  required
                  className="mt-0.5 rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-gray-600">
                  I agree to the{' '}
                  <Link to="/terms" className="text-black font-medium hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-black font-medium hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-black font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-8">
          © 2025 NLQDB. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Signup;
