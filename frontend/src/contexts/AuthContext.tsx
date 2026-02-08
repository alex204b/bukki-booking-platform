import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, api } from '../services/api';
import { authStorage } from '../utils/authStorage';
import toast from 'react-hot-toast';
import { pushNotificationService } from '../services/pushNotificationService';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'business_owner' | 'employee' | 'super_admin';
  phone?: string;
  avatar?: string;
  emailVerified?: boolean;
  trustScore?: number;
  // Optional profile fields used by Profile page
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ user: User; token: string; requiresVerification?: boolean }>;
  register: (userData: RegisterData) => Promise<any>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'customer' | 'business_owner';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      if (typeof sessionStorage === 'undefined') {
        setLoading(false);
        return;
      }

      const storedToken = authStorage.getToken();
      const storedUser = authStorage.getUser();

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          authApi.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // Initialize push notifications asynchronously (don't block)
          // Only try if we're on native platform and Firebase might be available
          if (pushNotificationService.isSupported()) {
            // Delay to ensure app is fully loaded
            setTimeout(() => {
              pushNotificationService.initialize().catch((error) => {
                // Silently fail - push notifications are optional
                // Firebase might not be configured, which is fine
                console.warn('Push notifications not available (optional feature)');
              });
            }, 1000); // Increased delay to ensure Firebase initialization completes
          }
        } catch (parseError) {
          // Clear corrupted data
          authStorage.clear();
        }
      }
    } catch (error) {
      // Silently handle errors during initialization
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Clear any existing session FIRST to prevent logging into wrong account
      setUser(null);
      setToken(null);
      authStorage.clear();
      delete authApi.defaults.headers.common['Authorization'];
      delete api.defaults.headers.common['Authorization'];

      // Normalize email (lowercase and trim)
      const normalizedEmail = email.toLowerCase().trim();
      // Don't trim password - passwords are stored as-is during registration
      
      console.log('[FRONTEND LOGIN] Attempting login:', { email: normalizedEmail, passwordLength: password.length });
      
      const response = await authApi.post('/auth/login', { 
        email: normalizedEmail, 
        password: password // Send password as-is, no trimming
      });
      const { user: userData, token: userToken, requiresVerification } = response.data;

      // Sanity check: ensure we got the user we logged in as (prevent wrong-account bug)
      const returnedEmail = (userData?.email || '').toLowerCase().trim();
      if (returnedEmail !== normalizedEmail) {
        console.error('[FRONTEND LOGIN] Wrong user returned! Expected:', normalizedEmail, 'Got:', returnedEmail);
        setUser(null);
        setToken(null);
        authStorage.clear();
        delete authApi.defaults.headers.common['Authorization'];
        delete api.defaults.headers.common['Authorization'];
        toast.error('Login returned wrong account. Please try again.');
        throw new Error('Wrong account returned from server');
      }

      setUser(userData);
      setToken(userToken);
      authStorage.setToken(userToken);
      authStorage.setUser(JSON.stringify(userData));
      authApi.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
      
      // Also set token in the main api instance for authenticated requests
      api.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;

      // Initialize push notifications after successful login (with timeout)
      try {
        if (pushNotificationService.isSupported()) {
          // Set timeout for push notification initialization (3 seconds)
          await Promise.race([
            pushNotificationService.initialize(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Push notification init timeout')), 3000)
            )
          ]).catch((error) => {
            if (error.message !== 'Push notification init timeout') {
              throw error;
            }
            console.warn('[AUTH] Push notification initialization timed out, continuing...');
          });
        }
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
        // Don't show error to user - push notifications are optional
      }

      if (requiresVerification) {
        toast('Login successful — please verify your email', { icon: '✉️' });
      } else {
        toast.success('Login successful!');
      }

      // Return user data for navigation logic
      return { user: userData, token: userToken, requiresVerification };
    } catch (error: any) {
      console.error('[FRONTEND LOGIN] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        code: error.code,
        isNetworkError: !error.response,
      });
      
      let message = 'Login failed';
      
      // Network error (no response from server)
      if (!error.response) {
        const baseURL = error.config?.baseURL || 'unknown';
        const isMobile = window.location.protocol === 'capacitor:' || (window as any).Capacitor;
        
        if (isMobile) {
          message = `Cannot connect to server at ${baseURL}. Make sure:\n1. Backend is running on port 3000\n2. ADB reverse is set: adb reverse tcp:3000 tcp:3000\n3. Phone is connected via USB`;
        } else {
          message = `Cannot connect to server at ${baseURL}. Please check:\n1. Backend is running (npm start in backend folder)\n2. Backend is accessible at ${baseURL}\n3. No firewall is blocking the connection`;
        }
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message, { duration: 5000 });
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await authApi.post('/auth/register', userData);
      const data = response.data;

      // If backend requires email verification, don't set auth state yet
      if (data?.requiresVerification) {
        toast.success(data.message || 'Registration successful! Please verify your email.');
        return data;
      }

      const { user: newUser, token: userToken } = data;

      if (newUser && userToken) {
        setUser(newUser);
        setToken(userToken);
        authStorage.setToken(userToken);
        authStorage.setUser(JSON.stringify(newUser));
        authApi.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
        toast.success('Registration successful!');
      }
      return data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    // Unregister push notifications
    try {
      await pushNotificationService.unregister();
    } catch (error) {
      console.error('Failed to unregister push notifications:', error);
    }

    setUser(null);
    setToken(null);
    authStorage.clear();
    delete authApi.defaults.headers.common['Authorization'];
    delete api.defaults.headers.common['Authorization'];
    toast.success('Logged out successfully');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
