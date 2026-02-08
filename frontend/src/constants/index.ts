/**
 * Frontend Constants
 * 
 * Centralized constants for colors, breakpoints, and other shared values
 * across the application.
 */

// ============================================
// BRAND COLORS
// ============================================
export const COLORS = {
  // Primary brand colors
  burgundy: '#330007',
  brandRed: '#E7001E', // Primary brand red
  white: '#FFFFFF',
  
  // Social media colors
  facebook: {
    primary: '#1877F2',
    hover: '#1565C0',
    active: '#0d5aa7',
  },
  
  // UI colors (for use with Tailwind classes or inline styles)
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',  // red-600
    700: '#b91c1c',  // red-700
    800: '#991b1b',  // red-800
  },
} as const;

// ============================================
// RESPONSIVE BREAKPOINTS
// ============================================
// These match Tailwind CSS breakpoints for consistency
export const BREAKPOINTS = {
  sm: 640,   // Large phones
  md: 768,   // Tablets
  lg: 1024,  // Laptops
  xl: 1280,  // Desktops
  '2xl': 1536, // Large monitors
} as const;

// Screen size categories based on breakpoints
export type ScreenSize = 'mobile' | 'tablet' | 'laptop' | 'desktop';

export const getScreenSize = (width: number): ScreenSize => {
  if (width < BREAKPOINTS.sm) return 'mobile';   // Phones (0-639px)
  if (width < BREAKPOINTS.lg) return 'tablet';    // Tablets (640px-1023px)
  if (width < BREAKPOINTS.xl) return 'laptop';   // Laptops (1024px-1279px)
  return 'desktop';                                // Desktops (1280px+)
};

// ============================================
// LOGIN BACKGROUND CONFIGURATION
// ============================================
export const LOGIN_BACKGROUND_CONFIG = {
  mobile: {
    image: '/phoneLogIn.jpg',
    formStart: 90, // Where forms should start (px from top)
  },
  tablet: {
    image: '/laptopLogIn.png', // Placeholder: reuse laptop for now
    formStart: 90,
  },
  laptop: {
    image: '/laptopLogIn.png',
    formStart: 90,
  },
  desktop: {
    image: '/laptopLogIn.png', // Placeholder: reuse laptop for now
    formStart: 90,
  },
} as const;

// ============================================
// SPACING & SIZING
// ============================================
export const SPACING = {
  formPadding: {
    mobile: '1rem',
    tablet: '1.5rem',
    desktop: '2rem',
  },
} as const;

// ============================================
// ANIMATION DURATIONS
// ============================================
export const ANIMATIONS = {
  transition: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
} as const;

