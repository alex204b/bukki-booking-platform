import React, { useEffect, useState, useCallback } from 'react';
import { COLORS, BREAKPOINTS, getScreenSize, LOGIN_BACKGROUND_CONFIG, type ScreenSize } from '../constants';

interface LoginBackgroundProps {
  children?: React.ReactNode;
}

export const LoginBackground: React.FC<LoginBackgroundProps> = ({ children }) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const updateDimensions = useCallback(() => {
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, [updateDimensions]);

  const { width, height } = dimensions;

  // Show burgundy background while loading
  if (width === 0 || height === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-start p-0 relative overflow-hidden"
        style={{ backgroundColor: COLORS.burgundy }}
      >
        <div className="relative z-10 w-full">{children}</div>
      </div>
    );
  }

  // ============================================
  // DETERMINE SCREEN SIZE (Breakpoint-based)
  // ============================================

  const screenSize = getScreenSize(width);
  const backgroundConfig = LOGIN_BACKGROUND_CONFIG[screenSize] ?? LOGIN_BACKGROUND_CONFIG.laptop;

  // For now we only distinguish phones vs. everything else for layout.
  // You can later tweak formStart per breakpoint in BACKGROUND_CONFIG if needed.
  const formStartY = backgroundConfig.formStart;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start p-0 relative overflow-hidden"
      style={{
        // Expose values as CSS variables for form positioning
        '--form-start': `${formStartY}px`,
        // Background image from public folder
        backgroundImage: `url(${backgroundConfig.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: COLORS.burgundy,
      } as React.CSSProperties}
    >
      {/* Content overlay (forms, buttons, etc.) */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};

export default LoginBackground;
