import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  className = '',
  showText = true 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        {/* Logo image */}
        <img
          src="/logo.png"
          alt="BUKKi Logo"
          className={`w-full h-full object-contain`}
          onError={(e) => {
            // Fallback if logo doesn't exist
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            if (target.nextElementSibling) {
              (target.nextElementSibling as HTMLElement).style.display = 'flex';
            }
          }}
        />
      </div>
      {/* Fallback if image doesn't load */}
      <div 
        className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center hidden`}
        style={{ display: 'none' }}
      >
        <span className="text-white font-bold text-xs">BK</span>
      </div>
      {showText && (
        <span className={`font-bold text-primary-600 ${textSizeClasses[size]}`}>
          BUKKi
        </span>
      )}
    </div>
  );
};

// Export a version for white text (for dark backgrounds like footer)
export const LogoWhite: React.FC<LogoProps> = ({ 
  size = 'md', 
  className = '',
  showText = true 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        {/* Logo image */}
        <img
          src="/logo.png"
          alt="BUKKi Logo"
          className={`w-full h-full object-contain`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            if (target.nextElementSibling) {
              (target.nextElementSibling as HTMLElement).style.display = 'flex';
            }
          }}
        />
      </div>
      <div 
        className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center hidden`}
        style={{ display: 'none' }}
      >
        <span className="text-white font-bold text-xs">BK</span>
      </div>
      {showText && (
        <span className={`font-bold text-white ${textSizeClasses[size]}`}>
          BUKKi
        </span>
      )}
    </div>
  );
};

