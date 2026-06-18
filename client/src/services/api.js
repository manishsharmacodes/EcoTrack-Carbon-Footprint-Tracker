import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('ecotrack_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ecotrack_token');
      localStorage.removeItem('ecotrack_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data)
};

// Activities API
export const activitiesAPI = {
  create: (data) => api.post('/activities', data),
  getAll: (params) => api.get('/activities', { params }),
  getSummary: () => api.get('/activities/summary'),
  delete: (id) => api.delete(`/activities/${id}`)
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getChartData: (period) => api.get('/dashboard/chart-data', { params: { period } }),
  getProgress: () => api.get('/dashboard/progress')
};

// Goals API
export const goalsAPI = {
  create: (data) => api.post('/goals', data),
  getAll: () => api.get('/goals'),
  update: (id, data) => api.put(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`)
};

// Insights API
export const insightsAPI = {
  getAll: () => api.get('/insights'),
  getTips: () => api.get('/insights/tips')
};

// Gamification API
export const gamificationAPI = {
  getBadges: () => api.get('/gamification/badges'),
  getLeaderboard: () => api.get('/gamification/leaderboard'),
  getStreak: () => api.get('/gamification/streak')
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all')
};

export default api;
