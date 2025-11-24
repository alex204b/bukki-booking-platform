/**
 * User-friendly error message handler
 * Converts technical errors into user-friendly messages
 */
export const getErrorMessage = (error: any): string => {
  // Network errors
  if (!error.response) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    if (error.message?.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    return 'Network error. Please check your connection and try again.';
  }

  // HTTP status errors
  const status = error.response?.status;
  const message = error.response?.data?.message;

  if (message) {
    // Return server message if available
    return Array.isArray(message) ? message.join(', ') : message;
  }

  // Default messages based on status
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'You are not authorized. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This action conflicts with existing data. Please refresh and try again.';
    case 422:
      return 'Invalid data provided. Please check your input.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Please try again later.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: any): boolean => {
  if (!error.response) {
    // Network errors are retryable
    return true;
  }

  const status = error.response?.status;
  // Retry on 5xx errors and 429 (rate limit)
  return status >= 500 || status === 429;
};

/**
 * Get retry delay in milliseconds
 */
export const getRetryDelay = (attempt: number): number => {
  // Exponential backoff: 1s, 2s, 4s, 8s...
  return Math.min(1000 * Math.pow(2, attempt), 10000);
};

