import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Attach JWT to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('qa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 → clear auth
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('qa_token');
      localStorage.removeItem('qa_user');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (data) => api.put('/auth/change-password', data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const verifyOtp = (email, otp) => api.post('/auth/verify-otp', { email, otp });
export const resetPassword = (email, otp, newPassword) => api.post('/auth/reset-password', { email, otp, newPassword });

// Projects
export const getProjects = (params) => api.get('/projects', { params });
export const getProject = (id) => api.get(`/projects/${id}`);
export const getProjectStats = () => api.get('/projects/stats');
export const getSprintData = () => api.get('/projects/sprints');
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// Bugs
export const getBugs = (params) => api.get('/bugs', { params });
export const getBug = (id) => api.get(`/bugs/${id}`);
export const createBug = (data) => api.post('/bugs', data);
export const updateBug = (id, data) => api.put(`/bugs/${id}`, data);
export const deleteBug = (id) => api.delete(`/bugs/${id}`);

// Test Cases
export const getTestCases = (params) => api.get('/test-cases', { params });
export const getCategorySummary = (params) => api.get('/test-cases/category-summary', { params });
export const getDetailedAnalysis = (params) => api.get('/test-cases/detailed-analysis', { params });
export const createTestCase = (data) => api.post('/test-cases', data);
export const updateTestCase = (id, data) => api.put(`/test-cases/${id}`, data);
export const deleteTestCase = (id) => api.delete(`/test-cases/${id}`);

// Executions
export const getExecutions = (params) => api.get('/test-cases/executions', { params });
export const getExecutionSummary = (params) => api.get('/test-cases/execution-summary', { params });
export const createExecution = (data) => api.post('/test-cases/executions', data);

// Meetings
export const getMeetings = (params) => api.get('/meetings', { params });
export const createMeeting = (data) => api.post('/meetings', data);
export const updateMeeting = (id, data) => api.put(`/meetings/${id}`, data);
export const deleteMeeting = (id) => api.delete(`/meetings/${id}`);

// Analytics
export const getDashboardStats = () => api.get('/analytics/dashboard');
export const getSprintOverview = () => api.get('/analytics/sprints');
export const getActivityFeed = (limit = 10) => api.get('/analytics/activity', { params: { limit } });

// Upload
export const uploadFile = (formData) => api.post('/uploads/import', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  timeout: 60000,
});
export const previewFile = (formData) => api.post('/uploads/preview', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

// QA Agent
export const getQAAgentConfig = () => api.get('/qa-agent/config');
export const saveQAAgentConfig = (data) => api.put('/qa-agent/config', data);
export const clearQAAgentConfig = () => api.delete('/qa-agent/config');
export const listQAAgentRuns = (params) => api.get('/qa-agent/runs', { params });
export const getQAAgentRun = (id) => api.get(`/qa-agent/runs/${id}`);
export const createQAAgentRun = (data) => api.post('/qa-agent/runs', data);
export const deleteQAAgentRun = (id) => api.delete(`/qa-agent/runs/${id}`);
export const clearQAAgentRuns = () => api.delete('/qa-agent/runs');
export const crawlQAAgentSite = (data) => api.post('/qa-agent/crawl', data);

// Search
export const globalSearch = (q) => api.get('/search', { params: { q } });

// Chat Bot
export const sendChatMessage = (message, history) => api.post('/chat', { message, history }, { timeout: 30000 });
export const getChatStats = () => api.get('/chat/stats');
export const getChatDailyDigest = () => api.get('/chat/daily-digest');

// Notifications
export const getNotifications = (params) => api.get('/chat/notifications', { params });
export const getUnreadNotifCount = () => api.get('/chat/notifications/unread-count');
export const markNotifRead = (id) => api.put(`/chat/notifications/${id}/read`);

// Audit Logs
export const getAuditLogs = (params) => api.get('/chat/audit-logs', { params });

// Flakiness Tracker
export const getFlakinessData = (projectId) => api.get('/flakiness', { params: { projectId } });

// Integrations (Webhooks)
export const createWebhook = (data) => api.post('/integrations/webhook', data);
export const getWebhooks = () => api.get('/integrations/webhooks');
export const updateWebhook = (id, data) => api.put(`/integrations/webhooks/${id}`, data);
export const deleteWebhook = (id) => api.delete(`/integrations/webhooks/${id}`);
export const testWebhook = (id) => api.post(`/integrations/webhooks/${id}/test`);

export default api;
