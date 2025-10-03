import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authService = {
  login: (email: string, password: string) => authApi.post('/auth/login', { email, password }),
  register: (userData: any) => authApi.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (oldPassword: string, newPassword: string) => 
    api.post('/auth/change-password', { oldPassword, newPassword }),
  forgotPassword: (email: string) => authApi.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => 
    authApi.post('/auth/reset-password', { token, newPassword }),
};

// Users API calls
export const userService = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.patch('/users/profile', data),
  getAllUsers: () => api.get('/users'),
  getUserById: (id: string) => api.get(`/users/${id}`),
  updateUser: (id: string, data: any) => api.patch(`/users/${id}`, data),
  deactivateUser: (id: string) => api.delete(`/users/${id}`),
  activateUser: (id: string) => api.post(`/users/${id}/activate`),
};

// Businesses API calls
export const businessService = {
  create: (data: any) => api.post('/businesses', data),
  getAll: (status?: string) => api.get('/businesses', { params: { status } }),
  getById: (id: string) => api.get(`/businesses/${id}`),
  update: (id: string, data: any) => api.patch(`/businesses/${id}`, data),
  search: (query: string, category?: string, location?: string) => 
    api.get('/businesses/search', { params: { q: query, category, location } }),
  getNearby: (lat: number, lng: number, radius?: number, availableNow?: boolean) => 
    api.get('/businesses/nearby', { params: { lat, lng, radius, availableNow } }),
  getMyBusiness: () => api.get('/businesses/my-business'),
  approve: (id: string) => api.post(`/businesses/${id}/approve`),
  reject: (id: string, reason?: string) => api.post(`/businesses/${id}/reject`, { reason }),
  suspend: (id: string) => api.post(`/businesses/${id}/suspend`),
  getStats: (id: string) => api.get(`/businesses/${id}/stats`),
  // Team members
  inviteMember: (id: string, email: string) => api.post(`/businesses/${id}/members`, { email }),
  listMembers: (id: string) => api.get(`/businesses/${id}/members`),
  removeMember: (id: string, memberId: string) => api.delete(`/businesses/${id}/members/${memberId}`),
  acceptInvite: (id: string, email: string) => api.post(`/businesses/${id}/members/accept`, { email }),
  myInvites: () => api.get('/businesses/invites/mine'),
  // Contacts
  addContact: (id: string, email: string, name?: string) => api.post(`/businesses/${id}/contacts`, { email, name }),
  listContacts: (id: string) => api.get(`/businesses/${id}/contacts`),
  removeContact: (id: string, contactId: string) => api.delete(`/businesses/${id}/contacts/${contactId}`),
  sendCampaign: (id: string, subject: string, html: string) => api.post(`/businesses/${id}/contacts/send`, { subject, html }),
};

// Services API calls
export const serviceService = {
  create: (data: any) => api.post('/services', data),
  getAll: (businessId?: string) => api.get('/services', { params: { businessId } }),
  getById: (id: string) => api.get(`/services/${id}`),
  update: (id: string, data: any) => api.patch(`/services/${id}`, data),
  delete: (id: string) => api.delete(`/services/${id}`),
  search: (query: string, category?: string, location?: string) => 
    api.get('/services/search', { params: { q: query, category, location } }),
  getPopular: (limit?: number) => api.get('/services/popular', { params: { limit } }),
  getByBusiness: (businessId: string) => api.get(`/services/business/${businessId}`),
  getAvailableSlots: (id: string, date: string) => 
    api.get(`/services/${id}/available-slots`, { params: { date } }),
};

// Bookings API calls
export const bookingService = {
  create: (data: any) => api.post('/bookings', data),
  getAll: () => api.get('/bookings'),
  getById: (id: string) => api.get(`/bookings/${id}`),
  updateStatus: (id: string, status: string, reason?: string) => 
    api.patch(`/bookings/${id}/status`, { status, reason }),
  checkIn: (id: string, businessId: string) => 
    api.post(`/bookings/${id}/checkin`, { businessId }),
  cancel: (id: string, reason?: string) => 
    api.delete(`/bookings/${id}`, { data: { reason } }),
  getByDate: (businessId: string, date: string) => 
    api.get(`/bookings/business/${businessId}/date/${date}`),
  getStats: (businessId: string, period?: string) => 
    api.get(`/bookings/business/${businessId}/stats`, { params: { period } }),
};

// Reviews API calls
export const reviewService = {
  create: (data: { businessId: number; bookingId: number; rating: number; comment?: string }) => 
    api.post('/reviews', data),
  getByBusiness: (businessId: number, page = 1, limit = 10) => 
    api.get(`/reviews/business/${businessId}?page=${page}&limit=${limit}`),
  getTrustScore: () => api.get('/reviews/trust-score'),
};

export const reportService = {
  create: (data: { 
    type: 'user' | 'business'; 
    reason: 'no-show' | 'false-info' | 'inappropriate' | 'spam' | 'other'; 
    details: string; 
    reportedUserId?: number; 
    reportedBusinessId?: number; 
  }) => api.post('/reports', data),
  getAll: (page = 1, limit = 10) => api.get(`/reports?page=${page}&limit=${limit}`),
};

export const feedbackService = {
  create: (data: { 
    type?: 'general' | 'bug_report' | 'feature_request' | 'improvement'; 
    rating: number; 
    content: string; 
    userEmail?: string; 
    userName?: string; 
  }) => api.post('/feedback', data),
  getAll: (page = 1, limit = 10) => api.get(`/feedback?page=${page}&limit=${limit}`),
  getStats: () => api.get('/feedback/stats'),
};
