import axios from 'axios';
import * as authStorageModule from '../utils/authStorage';

const authStorage = authStorageModule.authStorage;

// Dynamic import for Capacitor (works in both web and native contexts)
let Capacitor: any = null;
try {
  // Try to get Capacitor from window first (available in native apps)
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    Capacitor = (window as any).Capacitor;
  } else {
    // Fallback to require (works in build context)
    Capacitor = require('@capacitor/core').Capacitor;
  }
} catch (e) {
  // Capacitor not available (web context or not installed)
  console.log('[API] Capacitor not available, assuming web context');
}

// ============================================================
// MOBILE APP IP ADDRESS CONFIGURATION
// ============================================================
// For mobile apps, we need to use your computer's IP address
// Get your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)
// Look for "IPv4 Address" under your WiFi adapter
// Change this to your computer's IP address when testing on mobile
// Current IPv4: 192.168.1.19
const MOBILE_API_IP = '192.168.1.137';
const MOBILE_API_URL = `http://${MOBILE_API_IP}:3000`;
// ============================================================

const getApiUrl = () => {
  // Safety check - ensure window and navigator are available
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return process.env.REACT_APP_API_URL || 'http://localhost:3000';
  }

  // Check if we're running in Capacitor (mobile app) - multiple detection methods for reliability
  let isMobileApp = false;
  const detectionMethods: string[] = [];
  
  // Method 1: Use Capacitor's official API if available
  if (Capacitor && typeof Capacitor.isNativePlatform === 'function') {
    try {
      isMobileApp = Capacitor.isNativePlatform();
      if (isMobileApp) detectionMethods.push('Capacitor.isNativePlatform()');
    } catch (e) {
      // Fall through to other detection methods
    }
  }
  
  // Method 2: Check for Capacitor global object
  if (!isMobileApp) {
    // @ts-ignore - Capacitor global
    const hasCapacitor = !!(window.Capacitor || (window as any).Capacitor);
    if (hasCapacitor) {
      isMobileApp = true;
      detectionMethods.push('window.Capacitor');
    }
  }
  
  // Method 3: Check for Capacitor protocol
  if (!isMobileApp) {
    const protocol = window.location?.protocol || '';
    if (protocol === 'capacitor:' || protocol === 'capacitor') {
      isMobileApp = true;
      detectionMethods.push('capacitor protocol');
    }
  }
  
  // Method 4: Check for other Capacitor indicators
  if (!isMobileApp) {
    const hasCapacitorWeb = !!(window as any).CapacitorWeb;
    if (hasCapacitorWeb) {
      isMobileApp = true;
      detectionMethods.push('CapacitorWeb');
    }
  }
  
  // Detect mobile browser (not just Capacitor app)
  const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  const currentHost = window.location?.hostname || '';
  const isLocalhost = currentHost === 'localhost' || 
                     currentHost === '127.0.0.1' ||
                     currentHost === '';
  
  // Check for IP address pattern (e.g., 192.168.1.100)
  const isIPAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(currentHost);
  
  // CRITICAL: If we're on Android/iOS and hostname is localhost/empty, we MUST be in a mobile app
  // This is a safety check - native apps should never use localhost
  const isAndroidOrIOS = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  if (!isMobileApp && isAndroidOrIOS && (isLocalhost || currentHost === '')) {
    isMobileApp = true;
    detectionMethods.push('Android/iOS + localhost fallback');
    console.warn('[API] ⚠️  Detected Android/iOS with localhost - forcing mobile app mode to prevent localhost connection');
  }
  
  // Log detection results for debugging
  console.log('[API] Mobile app detection:', {
    isMobileApp,
    detectionMethods,
    userAgent: navigator.userAgent?.substring(0, 50),
    hostname: currentHost,
    protocol: window.location?.protocol,
    hasCapacitor: !!(window as any).Capacitor,
  });
  
  // For mobile app (Capacitor), use IP address directly
  if (isMobileApp) {
    // Option 1: Use environment variable if set (works for both USB + ADB reverse and WiFi)
    const envUrl = process.env.REACT_APP_API_URL;
    
    // If an env URL is provided, always prefer it (can be localhost for USB/ADB or IP for WiFi)
    if (envUrl) {
      console.log('[API] Mobile app: Using API URL from environment:', envUrl);
      return envUrl;
    }
    
    // Option 2: Use hardcoded IP address from constant above
    console.log('[API] Mobile app detected. Using IP address:', MOBILE_API_URL);
    console.log('[API] Computer IP:', MOBILE_API_IP);
    console.log('[API] If this doesn\'t work, check that:');
    console.log('[API] 1. Backend is running on port 3000');
    console.log('[API] 2. Computer IP address is correct:', MOBILE_API_IP);
    console.log('[API] 3. Phone and computer are on the same WiFi network');
    console.log('[API] 4. Firewall allows connections on port 3000');
    console.log('[API] 5. To change IP, edit MOBILE_API_IP constant at top of api.ts');
    
    return MOBILE_API_URL;
  }
  
  // For ANY browser: if accessing via IP address, use that IP for API
  // This allows LAN access from other devices
  if (isIPAddress) {
    console.log(`[API] Detected IP access: ${currentHost}, using same IP for API`);
    return `http://${currentHost}:3000`;
  }

  // For localhost access: use environment variable or localhost
  if (isLocalhost) {
    const envUrl = process.env.REACT_APP_API_URL;

    // CRITICAL SAFETY CHECK: Never use localhost on Android/iOS devices
    // If we're on a mobile device and somehow got here, use IP address instead
    if (isAndroidOrIOS && (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      console.error('[API] ⚠️  CRITICAL: Prevented localhost connection on mobile device!');
      console.error('[API] Using IP address instead:', MOBILE_API_URL);
      console.error('[API] If this IP is wrong, update MOBILE_API_IP constant at top of api.ts');
      return MOBILE_API_URL;
    }

    // Use env URL if it exists and is not localhost
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      console.log('[API] Using API URL from environment:', envUrl);
      return envUrl;
    }

    // Default to localhost for local development (web browser only)
    console.log('[API] Using localhost for local development (web browser)');
    return 'http://localhost:3000';
  }

  // Fallback: use environment variable or localhost
  // But NEVER localhost on mobile devices
  const fallbackUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  if (isAndroidOrIOS && (fallbackUrl.includes('localhost') || fallbackUrl.includes('127.0.0.1'))) {
    console.error('[API] ⚠️  CRITICAL: Fallback URL is localhost on mobile device!');
    console.error('[API] Using IP address instead:', MOBILE_API_URL);
    return MOBILE_API_URL;
  }
  return fallbackUrl;
};

// Get API URL safely (only when needed, not at module load)
// This function is called dynamically to ensure Capacitor is initialized
const getApiBaseUrl = () => {
  try {
    const url = getApiUrl();
    console.log('[API] Resolved API base URL:', url);
    return url;
  } catch (error) {
    console.error('[API] Error getting API URL:', error);
    // CRITICAL: Never use localhost on mobile devices, even in error case
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    if (isMobile) {
      console.error('[API] Error occurred on mobile device, using IP address:', MOBILE_API_URL);
      return MOBILE_API_URL;
    }
    // Fallback for web
    return process.env.REACT_APP_API_URL || 'http://localhost:3000';
  }
};

// Create a function to get the current API URL (dynamic, not cached)
export const getCurrentApiUrl = () => {
  return getApiBaseUrl();
};

// Initialize with a default, but we'll use interceptors to set it dynamically
const initialUrl = getApiBaseUrl();
console.log('[API] Initial API base URL:', initialUrl);

export const authApi = axios.create({
  baseURL: initialUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

export const api = axios.create({
  baseURL: initialUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add request interceptor to dynamically update baseURL (in case Capacitor wasn't ready at module load)
api.interceptors.request.use((config) => {
  // Re-check the API URL on each request to ensure we have the correct one
  const currentUrl = getCurrentApiUrl();
  
  // CRITICAL SAFETY CHECK: Never allow localhost on mobile devices
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  if (isMobile && (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1'))) {
    console.error('[API] 🚨 BLOCKED: Attempted to use localhost on mobile device!');
    console.error('[API] Forcing use of IP address:', MOBILE_API_URL);
    config.baseURL = MOBILE_API_URL;
    return config;
  }
  
  if (config.baseURL !== currentUrl) {
    console.log('[API] Updating baseURL from', config.baseURL, 'to', currentUrl);
    config.baseURL = currentUrl;
  }
  return config;
});

authApi.interceptors.request.use((config) => {
  // Re-check the API URL on each request to ensure we have the correct one
  const currentUrl = getCurrentApiUrl();
  
  // CRITICAL SAFETY CHECK: Never allow localhost on mobile devices
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  if (isMobile && (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1'))) {
    console.error('[API] 🚨 BLOCKED: Attempted to use localhost on mobile device!');
    console.error('[API] Forcing use of IP address:', MOBILE_API_URL);
    config.baseURL = MOBILE_API_URL;
    return config;
  }
  
  if (config.baseURL !== currentUrl) {
    console.log('[API] Updating authApi baseURL from', config.baseURL, 'to', currentUrl);
    config.baseURL = currentUrl;
  }
  return config;
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    try {
      const token = authStorage.getToken();
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
    } catch (error) {
      console.error('[API] Error reading token:', error);
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
            const { authStorage } = require('../utils/authStorage');
            console.warn('[API] Token exists but request failed with 401. Clearing auth state.');
            authStorage.clear();
          } catch (storageError) {
            console.error('[API] Error clearing auth storage:', storageError);
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
  requestUnsuspension: (id: string, reason: string) => api.post(`/businesses/${id}/request-unsuspension`, { reason }),
  getStats: (id: string) => api.get(`/businesses/${id}/stats`),
  // Team members
  inviteMember: (id: string, email: string, message?: string) =>
    api.post(`/businesses/${id}/members`, { email, message: message || undefined }),
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
  getAvailableSlots: (id: string, date: string, partySize?: number) => 
    api.get(`/services/${id}/available-slots`, { params: { date, partySize } }),
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
  markConversationAsRead: (businessId: string, customerId?: string) =>
    api.patch(`/messages/chat/${businessId}/read`, customerId ? { customerId } : {}),
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
  updateStatus: (id: string, status: string, reason?: string, resourceId?: string, assignToUserId?: string) =>
    api.patch(`/bookings/${id}/status`, { status, reason, resourceId, assignToUserId }),
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

// Resources API (staff, tables, etc.)
export const resourceService = {
  getAll: (businessId?: string) =>
    api.get('/resources', { params: businessId ? { businessId } : {} }),
  getById: (id: string) => api.get(`/resources/${id}`),
  create: (data: any) => api.post('/resources', data),
  update: (id: string, data: any) => api.patch(`/resources/${id}`, data),
  delete: (id: string) => api.delete(`/resources/${id}`),
  linkToService: (resourceId: string, serviceId: string) =>
    api.post(`/resources/${resourceId}/services/${serviceId}`),
  unlinkFromService: (resourceId: string, serviceId: string) =>
    api.delete(`/resources/${resourceId}/services/${serviceId}`),
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
