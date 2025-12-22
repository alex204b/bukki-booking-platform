import axios from 'axios';

// For mobile devices, use the computer's IP address instead of localhost
// Get your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)
// Look for "IPv4 Address" under your WiFi adapter
const getApiUrl = () => {
  // Safety check - ensure window and navigator are available
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return process.env.REACT_APP_API_URL || 'http://localhost:3000';
  }

  // Check if we're running in Capacitor (mobile app)
  // @ts-ignore - Capacitor global
  const isCapacitor = window.Capacitor || (window as any).Capacitor;
  const isCapacitorProtocol = window.location?.protocol === 'capacitor:' || 
                               window.location?.protocol === 'capacitor';
  const isMobileApp = isCapacitor || isCapacitorProtocol;
  
  // Detect mobile browser (not just Capacitor app)
  const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  const currentHost = window.location?.hostname || '';
  const isLocalhost = currentHost === 'localhost' || 
                     currentHost === '127.0.0.1' ||
                     currentHost === '';
  
  // Check for IP address pattern (e.g., 192.168.1.100)
  const isIPAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(currentHost);
  
  // For mobile app (Capacitor), check if we should use IP or localhost
  if (isMobileApp) {
    // Option 1: Use environment variable if set (for WiFi testing)
    const envUrl = process.env.REACT_APP_API_URL;
    
    // Try to extract IP from environment variable or use it directly
    if (envUrl) {
      // If it's an IP address (not localhost), use it
      if (!envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        console.log('[API] Mobile app: Using API URL from environment:', envUrl);
        return envUrl;
      }
    }
    
    // Option 2: Try localhost first (for USB debugging with ADB reverse)
    // This is the easiest method - just run: adb reverse tcp:3000 tcp:3000
    console.log('[API] Mobile app detected. Trying localhost first (requires ADB reverse for USB).');
    console.log('[API] If this fails, run: adb reverse tcp:3000 tcp:3000');
    console.log('[API] Or rebuild app with current IP in .env.local file');
    
    // Return localhost - user should use ADB reverse for USB debugging
    // For WiFi, they need to rebuild with the correct IP in .env.local
    return 'http://localhost:3000';
  }
  
  // For mobile browser: if accessing via IP address, use that IP for API
  if (isMobileBrowser && isIPAddress) {
    return `http://${currentHost}:3000`;
  }
  
  // For mobile browser accessing via localhost, check environment variable
  if (isMobileBrowser && isLocalhost) {
    // Try to get IP from environment variable first
    const envUrl = process.env.REACT_APP_API_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }
    
    // Fallback: show helpful error message
    console.error('[API] Mobile browser detected but no IP address configured.');
    console.error('[API] Please set REACT_APP_API_URL environment variable to your computer\'s IP address.');
    console.error('[API] Example: REACT_APP_API_URL=http://192.168.1.100:3000');
    console.error('[API] Or access the app via: http://YOUR_COMPUTER_IP:3001');
    console.error('[API] To find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)');
    
    // Return localhost as fallback (will fail, but at least we tried)
    return 'http://localhost:3000';
  }
  
  // For desktop web browser, use environment variable or localhost
  return process.env.REACT_APP_API_URL || 'http://localhost:3000';
};

// Get API URL safely (only when needed, not at module load)
const getApiBaseUrl = () => {
  try {
    return getApiUrl();
  } catch (error) {
    // Fallback if there's an error getting the URL
    return process.env.REACT_APP_API_URL || 'http://localhost:3000';
  }
};

const API_BASE_URL = getApiBaseUrl();

// Log the API URL being used (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('[API] Using base URL:', API_BASE_URL);
}

export const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    try {
      if (typeof localStorage !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          // Log warning if token is missing for protected routes
          const isProtectedRoute = !config.url?.includes('/auth/login') && 
                                  !config.url?.includes('/auth/register') &&
                                  !config.url?.includes('/auth/forgot-password');
          if (isProtectedRoute) {
            console.warn('[API] Request to protected route without token:', config.url);
          }
        }
      }
    } catch (error) {
      console.error('[API] Error reading token from localStorage:', error);
      // Continue without token - request will fail with 401 if auth is required
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
    // Log network errors for debugging
    if (!error.response) {
      const isMobile = window.location.protocol === 'capacitor:' || (window as any).Capacitor;
      console.error('[API] Network error:', {
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        code: error.code,
        isMobile,
        fullURL: `${error.config?.baseURL}${error.config?.url}`,
      });
      
      // Provide helpful error message
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        const baseURL = error.config?.baseURL || 'unknown';
        console.error('[API] Connection refused. Troubleshooting:');
        console.error('  1. Is the backend running? Check: cd backend && npm start');
        console.error('  2. Is the backend accessible? Try opening:', baseURL);
        if (isMobile) {
          console.error('  3. For mobile: Is ADB reverse set? Run: adb reverse tcp:3000 tcp:3000');
          console.error('  4. Is phone connected via USB? Check: adb devices');
        }
      }
    }
    
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const requestUrl = error.config?.url || '';
      
      // Don't logout on 401 for auth endpoints (login, register, etc.) - these are expected
      const isAuthEndpoint = requestUrl.includes('/auth/login') || 
                            requestUrl.includes('/auth/register') ||
                            requestUrl.includes('/auth/forgot-password') ||
                            requestUrl.includes('/auth/reset-password') ||
                            requestUrl.includes('/auth/verify');
      
      // Don't logout if we're already on login/register pages
      const isOnAuthPage = currentPath === '/login' || currentPath === '/register';
      
      // Check if this is a token validation error (user not found, inactive, etc.)
      const errorMessage = error.response?.data?.message || '';
      const isTokenError = errorMessage.includes('Unauthorized') || 
                          errorMessage.includes('invalid') ||
                          errorMessage.includes('expired') ||
                          errorMessage.includes('not found');
      
      // Only logout if:
      // 1. Not an auth endpoint
      // 2. Not already on auth page
      // 3. It's a token validation error (not a permission issue)
      if (!isAuthEndpoint && !isOnAuthPage) {
        console.error('[API] 401 Unauthorized error:', {
          url: requestUrl,
          path: currentPath,
          message: errorMessage,
          willLogout: isTokenError,
        });
        
        // Only logout if it's clearly a token/auth issue, not a permission issue
        if (isTokenError || !errorMessage) {
          try {
            if (typeof localStorage !== 'undefined') {
              const token = localStorage.getItem('token');
              console.warn('[API] Token exists but request failed with 401. Clearing auth state.');
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          } catch (storageError) {
            console.error('[API] Error clearing localStorage:', storageError);
          }
          
          // Only redirect if not already navigating away
          if (!window.location.href.includes('/login')) {
            // Add a small delay to prevent race conditions
            setTimeout(() => {
              if (!window.location.href.includes('/login')) {
                window.location.href = '/login';
              }
            }, 100);
          }
        } else {
          // Permission issue - don't logout, just log it
          console.warn('[API] 401 error appears to be a permission issue, not auth failure:', errorMessage);
        }
      }
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
  verifyResetCode: (email: string, code: string) => 
    authApi.post('/auth/verify-reset-code', { email, code }),
  resetPassword: (email: string, code: string, newPassword: string) => 
    authApi.post('/auth/reset-password', { email, code, newPassword }),
  oauthLogin: (provider: string, idToken: string, accessToken?: string) => 
    authApi.post('/auth/oauth', { provider, idToken, accessToken }),
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
  getTrustScore: () => api.get('/users/profile/trust-score'),
  getUserTrustScore: (id: string) => api.get(`/users/${id}/trust-score`),
};

// Businesses API calls
export const businessService = {
  create: (data: any) => api.post('/businesses', data),
  getAll: (status?: string) => api.get('/businesses', { params: { status } }),
  getById: (id: string) => api.get(`/businesses/${id}`),
  update: (id: string, data: any) => api.patch(`/businesses/${id}`, data),
  uploadImages: (id: string, files: FileList | File[]) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('images', file);
    });
    return api.post(`/businesses/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteImage: (id: string, imageIndex: number) => api.delete(`/businesses/${id}/images/${imageIndex}`),
  search: (
    query: string,
    category?: string,
    location?: string,
    options?: {
      amenities?: string[];
      priceRange?: string;
      minRating?: number;
      verified?: boolean;
    }
  ) => {
    const params: any = { q: query, category, location };
    if (options?.amenities && options.amenities.length > 0) {
      params.amenities = options.amenities.join(',');
    }
    if (options?.priceRange && options.priceRange !== 'any') {
      params.priceRange = options.priceRange;
    }
    if (options?.minRating) {
      params.minRating = options.minRating;
    }
    if (options?.verified !== undefined) {
      params.verified = options.verified;
    }
    return api.get('/businesses/search', { params });
  },
  getNearby: (lat: number, lng: number, radius?: number, availableNow?: boolean) => 
    api.get('/businesses/nearby', { params: { lat, lng, radius, availableNow } }),
  getMyBusiness: () => api.get('/businesses/my-business'),
  approve: (id: string) => api.post(`/businesses/${id}/approve`),
  reject: (id: string, reason?: string) => api.post(`/businesses/${id}/reject`, { reason }),
  suspend: (id: string, reason?: string) => api.post(`/businesses/${id}/suspend`, { reason }),
  unsuspend: (id: string) => api.post(`/businesses/${id}/unsuspend`),
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
  getCategoryCounts: () => api.get('/businesses/categories/counts'),
  getPastCustomers: (id: string) => api.get(`/messages/business/${id}/past-customers`),
  sendPromotionalOffer: (id: string, data: {
    customerIds: string[];
    subject: string;
    content: string;
    offerCode?: string;
    discount?: number;
    validUntil?: string;
  }) => api.post(`/messages/business/${id}/send-promotional-offer`, data),
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

// Messages API calls
export const messageService = {
  getMessages: (status?: string) => api.get('/messages', { params: status ? { status } : {} }),
  markAsRead: (id: string) => api.patch(`/messages/${id}/read`),
  archiveMessage: (id: string) => api.patch(`/messages/${id}/archive`),
  // Chat endpoints
  sendChatMessage: (businessId: string, content: string, bookingId?: string) =>
    api.post(`/messages/chat/${businessId}`, { content, bookingId }),
  getConversation: (businessId: string) => api.get(`/messages/chat/${businessId}/conversation`),
  getConversations: () => api.get('/messages/chat/conversations'),
  markConversationAsRead: (businessId: string) => api.patch(`/messages/chat/${businessId}/read`),
};

// Bookings API calls
export const bookingService = {
  create: (data: any) => api.post('/bookings', data),
  getAll: () => api.get('/bookings'),
  // Waitlist API calls
  joinWaitlist: (businessId: string, serviceId: string, preferredDate?: string, notes?: string) =>
    api.post('/waitlist/join', { businessId, serviceId, preferredDate, notes }),
  leaveWaitlist: (waitlistId: string) => api.delete(`/waitlist/${waitlistId}`),
  getMyWaitlist: () => api.get('/waitlist/my-waitlist'),
  getBusinessWaitlist: (businessId: string) => api.get(`/waitlist/business/${businessId}`),
  notifyWaitlist: (businessId: string, serviceId: string, availableDate: string) =>
    api.post(`/waitlist/notify/${businessId}/${serviceId}`, { availableDate }),
  getById: (id: string) => api.get(`/bookings/${id}`),
  update: (id: string, data: any) => api.patch(`/bookings/${id}`, data),
  updateStatus: (id: string, status: string, reason?: string) => 
    api.patch(`/bookings/${id}/status`, { status, reason }),
  checkIn: (id: string, businessId: string) => 
    api.post(`/bookings/${id}/checkin`, { businessId }),
  validateQR: (qrData: string) => 
    api.post('/bookings/validate-qr', { qrData }),
  cancel: (id: string, reason?: string) => 
    api.delete(`/bookings/${id}`, { data: { reason } }),
  getByDate: (businessId: string, date: string) => 
    api.get(`/bookings/business/${businessId}/date/${date}`),
  getStats: (businessId: string, period?: string) => 
    api.get(`/bookings/business/${businessId}/stats`, { params: { period } }),
};

// Reviews API calls
export const reviewService = {
  create: (data: { businessId: string; rating: number; title: string; comment?: string }) => 
    api.post('/reviews', data),
  getByBusiness: (businessId: string) => 
    api.get(`/reviews/business/${businessId}`),
  getByUser: (userId: string) => 
    api.get(`/reviews/user/${userId}`),
  getMyReviews: () => 
    api.get('/reviews/my-reviews'),
  getStats: (businessId: string) => 
    api.get(`/reviews/business/${businessId}/stats`),
  getById: (id: string) => 
    api.get(`/reviews/${id}`),
  update: (id: string, data: { rating?: number; title?: string; comment?: string }) => 
    api.patch(`/reviews/${id}`, data),
  delete: (id: string) => 
    api.delete(`/reviews/${id}`),
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
};

// Offers API calls
export const offerService = {
  create: (businessId: string, data: {
    title: string;
    description: string;
    discountAmount?: number;
    discountPercentage?: number;
    discountCode?: string;
    validUntil?: string;
    isActive?: boolean;
    metadata?: {
      minPurchaseAmount?: number;
      maxDiscountAmount?: number;
      applicableServices?: string[];
      termsAndConditions?: string;
    };
  }) => api.post(`/offers/business/${businessId}`, data),
  getUserOffers: () => api.get('/offers/user'),
  getBusinessOffers: (businessId: string) => api.get(`/offers/business/${businessId}`),
  updateStatus: (offerId: string, businessId: string, isActive: boolean) =>
    api.patch(`/offers/${offerId}/business/${businessId}/status?isActive=${isActive}`),
  delete: (offerId: string, businessId: string) => api.delete(`/offers/${offerId}/business/${businessId}`),
  getAll: (page = 1, limit = 10) => api.get(`/feedback?page=${page}&limit=${limit}`),
  getStats: () => api.get('/feedback/stats'),
};

// Calendar API calls
export const calendarService = {
  downloadICal: (bookingId: string) => 
    api.get(`/calendar/booking/${bookingId}/ical`, { responseType: 'blob' }),
  downloadBusinessICal: (businessId: string) => 
    api.get(`/calendar/business/${businessId}/ical`, { responseType: 'blob' }),
  getGoogleCalendarUrl: (bookingId: string) => 
    api.get(`/calendar/booking/${bookingId}/google`),
};

// Favorites API calls
export const favoritesService = {
  add: (businessId: string) => api.post('/favorites', { businessId }),
  remove: (businessId: string) => api.delete(`/favorites/${businessId}`),
  getAll: () => api.get('/favorites'),
  isFavorite: (businessId: string) => api.get(`/favorites/${businessId}`),
};

// AI API calls
export const aiService = {
  parseQuery: (query: string) => api.post('/ai/parse-query', { query }),
};
