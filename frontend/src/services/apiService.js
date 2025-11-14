import api from './api';

const apiService = {
  // Auth
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  // Organizations
  getCurrentOrganization: async () => {
    const response = await api.get('/organizations/current');
    return response.data;
  },

  getUsageSummary: async () => {
    const response = await api.get('/organizations/current/usage');
    return response.data;
  },

  getTeamMembers: async () => {
    const response = await api.get('/organizations/current/team');
    return response.data;
  },

  inviteTeamMember: async (data) => {
    const response = await api.post('/organizations/current/team/invite', data);
    return response.data;
  },

  removeTeamMember: async (memberId) => {
    const response = await api.delete(`/organizations/current/team/${memberId}`);
    return response.data;
  },

  updateMemberRole: async (memberId, role) => {
    const response = await api.put(`/organizations/current/team/${memberId}`, { role });
    return response.data;
  },

  // Billing
  getCurrentSubscription: async () => {
    const response = await api.get('/billing/subscription');
    return response.data;
  },

  getPlans: async () => {
    const response = await api.get('/billing/plans');
    return response.data;
  },

  upgradePlan: async (planId) => {
    const response = await api.post('/billing/upgrade', { planId });
    return response.data;
  },

  createPortalSession: async () => {
    const response = await api.post('/billing/portal');
    return response.data;
  },

  // API Keys
  getApiKeys: async () => {
    const response = await api.get('/apikeys');
    return response.data;
  },

  createApiKey: async (data) => {
    const response = await api.post('/apikeys', data);
    return response.data;
  },

  revokeApiKey: async (id) => {
    const response = await api.post(`/apikeys/${id}/revoke`);
    return response.data;
  },

  rotateApiKey: async (id) => {
    const response = await api.post(`/apikeys/${id}/rotate`);
    return response.data;
  },

  // Queries
  translateQuery: async (data) => {
    const response = await api.post('/query/translate', data);
    return response.data;
  },

  executeQuery: async (data) => {
    const response = await api.post('/query/execute', data);
    return response.data;
  },

  getQueryHistory: async () => {
    const response = await api.get('/query/history');
    return response.data;
  },

  // Schema
  getCollections: async () => {
    const response = await api.get('/schema/collections');
    return response.data;
  },

  getSchema: async (collection) => {
    const response = await api.get(`/schema/collections/${collection}`);
    return response.data;
  },

  getSampleData: async (collection, limit = 10) => {
    const response = await api.get(`/schema/collections/${collection}/sample`, {
      params: { limit }
    });
    return response.data;
  },
};

export default apiService;
