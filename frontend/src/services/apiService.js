import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  }
};

export const queryService = {
  translate: async (userQuery, context = {}) => {
    const response = await api.post('/translate', { userQuery, context });
    return response.data;
  },

  execute: async (mongoQueryId, options = {}) => {
    const response = await api.post('/execute', { mongoQueryId, options });
    return response.data;
  },

  getHistory: async (page = 1, limit = 20) => {
    const response = await api.get('/history', { params: { page, limit } });
    return response.data;
  },

  getResult: async (resultId) => {
    const response = await api.get(`/results/${resultId}`);
    return response.data;
  },

  getStatistics: async (timeRange = 'week') => {
    const response = await api.get('/stats', { params: { timeRange } });
    return response.data;
  }
};

export const schemaService = {
  getSchema: async () => {
    const response = await api.get('/schema');
    return response.data;
  },

  getCollections: async () => {
    const response = await api.get('/tables');
    return response.data;
  },

  getCollectionPreview: async (collection, limit = 10) => {
    const response = await api.get(`/tables/${collection}/preview`, { params: { limit } });
    return response.data;
  },

  getCollectionStats: async (collection) => {
    const response = await api.get(`/tables/${collection}/stats`);
    return response.data;
  }
};
