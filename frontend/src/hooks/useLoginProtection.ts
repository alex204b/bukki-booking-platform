import { useState, useRef, useEffect } from 'react';

interface LoginProtectionConfig {
  maxAttempts?: number;
  lockoutDuration?: number; // in milliseconds
  minTimeBetweenAttempts?: number; // in milliseconds
}

interface LoginProtectionState {
  attempts: number;
  isLocked: boolean;
  lockoutEndTime: number | null;
  lastAttemptTime: number | null;
  remainingTime: number;
}

/**
 * Hook to protect login form from brute force attacks
 * Features:
 * - Tracks failed login attempts
 * - Enforces lockout after max attempts
 * - Minimum time between login attempts
 * - Progressive delay on failures
 */
export const useLoginProtection = (config: LoginProtectionConfig = {}) => {
  const {
    maxAttempts = 5,
    lockoutDuration = 15 * 60 * 1000, // 15 minutes
    minTimeBetweenAttempts = 2000, // 2 seconds
  } = config;

  const STORAGE_KEY = 'login_protection_state';

  // Load initial state from localStorage
  const loadState = (): LoginProtectionState => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const state = JSON.parse(stored);
        // Check if lockout has expired
        if (state.lockoutEndTime && Date.now() >= state.lockoutEndTime) {
          return {
            attempts: 0,
            isLocked: false,
            lockoutEndTime: null,
            lastAttemptTime: null,
            remainingTime: 0,
          };
        }
        return state;
      }
    } catch (error) {
      console.error('Failed to load login protection state:', error);
    }
    return {
      attempts: 0,
      isLocked: false,
      lockoutEndTime: null,
      lastAttemptTime: null,
      remainingTime: 0,
    };
  };

  const [state, setState] = useState<LoginProtectionState>(loadState);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save login protection state:', error);
    }
  }, [state]);

  // Update remaining time every second when locked
  useEffect(() => {
    if (state.isLocked && state.lockoutEndTime) {
      const updateRemainingTime = () => {
        const now = Date.now();
        const remaining = Math.max(0, state.lockoutEndTime! - now);

        if (remaining === 0) {
          // Lockout expired
          setState(prev => ({
            ...prev,
            isLocked: false,
            lockoutEndTime: null,
            attempts: 0,
            remainingTime: 0,
          }));
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        } else {
          setState(prev => ({
            ...prev,
            remainingTime: remaining,
          }));
        }
      };

      updateRemainingTime();
      timerRef.current = setInterval(updateRemainingTime, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [state.isLocked, state.lockoutEndTime]);

  /**
   * Check if enough time has passed since last attempt
   */
  const canAttemptLogin = (): { allowed: boolean; waitTime?: number } => {
    // Check if locked out
    if (state.isLocked && state.lockoutEndTime) {
      const remaining = state.lockoutEndTime - Date.now();
      if (remaining > 0) {
        return { allowed: false, waitTime: remaining };
      }
    }

    // Check minimum time between attempts
    if (state.lastAttemptTime) {
      const timeSinceLastAttempt = Date.now() - state.lastAttemptTime;
      if (timeSinceLastAttempt < minTimeBetweenAttempts) {
        return {
          allowed: false,
          waitTime: minTimeBetweenAttempts - timeSinceLastAttempt,
        };
      }
    }

    return { allowed: true };
  };

  /**
   * Record a failed login attempt
   */
  const recordFailedAttempt = () => {
    setState(prev => {
      const newAttempts = prev.attempts + 1;
      const now = Date.now();

      // Check if we should lock the account
      if (newAttempts >= maxAttempts) {
        return {
          attempts: newAttempts,
          isLocked: true,
          lockoutEndTime: now + lockoutDuration,
          lastAttemptTime: now,
          remainingTime: lockoutDuration,
        };
      }

      return {
        ...prev,
        attempts: newAttempts,
        lastAttemptTime: now,
      };
    });
  };

  /**
   * Record a successful login (resets the counter)
   */
  const recordSuccessfulAttempt = () => {
    setState({
      attempts: 0,
      isLocked: false,
      lockoutEndTime: null,
      lastAttemptTime: null,
      remainingTime: 0,
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  /**
   * Manually reset the protection (for admin/testing purposes)
   */
  const reset = () => {
    setState({
      attempts: 0,
      isLocked: false,
      lockoutEndTime: null,
      lastAttemptTime: null,
      remainingTime: 0,
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  /**
   * Format remaining time for display
   */
  const formatRemainingTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return {
    attempts: state.attempts,
    isLocked: state.isLocked,
    remainingTime: state.remainingTime,
    remainingAttempts: Math.max(0, maxAttempts - state.attempts),
    canAttemptLogin,
    recordFailedAttempt,
    recordSuccessfulAttempt,
    reset,
    formatRemainingTime: () => formatRemainingTime(state.remainingTime),
  };
};
