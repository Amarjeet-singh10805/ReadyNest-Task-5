import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor — attach token + org context
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken, activeOrganizationId } = useAuthStore.getState();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    if (activeOrganizationId) {
      config.headers['X-Organization-Id'] = activeOrganizationId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 + token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh-token');
        const newToken = data.data.accessToken;

        useAuthStore.getState().setAccessToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Typed API helpers
export const authApi = {
  login: (data: { email: string; password: string; organizationId?: string }) =>
    api.post('/auth/login', data),
  register: (data: { email: string; password: string; firstName: string; lastName: string; organizationName?: string }) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  refreshToken: () => api.post('/auth/refresh-token'),
  resendVerification: (email: string) => api.post('/auth/resend-verification', { email }),
};

export const organizationApi = {
  getAll: (params?: Record<string, any>) => api.get('/organizations', { params }),
  getOne: (id: string) => api.get(`/organizations/${id}`),
  create: (data: any) => api.post('/organizations', data),
  update: (id: string, data: any) => api.put(`/organizations/${id}`, data),
  delete: (id: string) => api.delete(`/organizations/${id}`),
  uploadLogo: (id: string, file: File) => {
    const fd = new FormData(); fd.append('logo', file);
    return api.post(`/organizations/${id}/logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getMembers: (id: string, params?: any) => api.get(`/organizations/${id}/members`, { params }),
  updateMemberRole: (orgId: string, userId: string, role: string) =>
    api.patch(`/organizations/${orgId}/members/${userId}/role`, { role }),
  removeMember: (orgId: string, userId: string) =>
    api.delete(`/organizations/${orgId}/members/${userId}`),
};

export const projectApi = {
  getAll: (params?: Record<string, any>) => api.get('/projects', { params }),
  getOne: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  archive: (id: string) => api.patch(`/projects/${id}/archive`),
};

export const taskApi = {
  getAll: (params?: Record<string, any>) => api.get('/tasks', { params }),
  getOne: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  updatePosition: (id: string, data: { position: number; status: string }) =>
    api.patch(`/tasks/${id}/position`, data),
  addComment: (id: string, content: string, parentId?: string) =>
    api.post(`/tasks/${id}/comments`, { content, parentId }),
};

export const fileApi = {
  getAll: (params?: Record<string, any>) => api.get('/files', { params }),
  upload: (file: File, meta?: { projectId?: string; taskId?: string; folder?: string }) => {
    const fd = new FormData();
    fd.append('file', file);
    if (meta?.projectId) fd.append('projectId', meta.projectId);
    if (meta?.taskId) fd.append('taskId', meta.taskId);
    if (meta?.folder) fd.append('folder', meta.folder);
    return api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  delete: (id: string) => api.delete(`/files/${id}`),
};

export const invitationApi = {
  getAll: (params?: any) => api.get('/invitations', { params }),
  send: (data: { email: string; role: string; organizationId?: string; message?: string }) =>
    api.post('/invitations', data),
  accept: (data: { token: string; firstName?: string; lastName?: string; password?: string }) =>
    api.post('/invitations/accept', data),
  cancel: (id: string) => api.delete(`/invitations/${id}`),
  resend: (id: string) => api.post(`/invitations/${id}/resend`),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getMyTasks: () => api.get('/dashboard/my-tasks'),
};

export const notificationApi = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

export const userApi = {
  getAll: (params?: any) => api.get('/users', { params }),
  getOne: (id: string) => api.get(`/users/${id}`),
  updateProfile: (data: any) => api.put('/users/profile', data),
  uploadAvatar: (file: File) => {
    const fd = new FormData(); fd.append('avatar', file);
    return api.post('/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/users/password', { currentPassword, newPassword }),
};

export const auditApi = {
  getLogs: (params?: any) => api.get('/audit-logs', { params }),
};

export default api;
