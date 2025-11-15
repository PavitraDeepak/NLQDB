import axios from 'axios';

// Use environment variable if set, otherwise fall back to relative URL for proxy
const API_URL = import.meta.env.VITE_API_URL || '/api';

console.log('[API Service] Using API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Trigger auth change event
      window.dispatchEvent(new Event('authChange'));
      
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
