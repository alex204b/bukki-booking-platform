import React from 'react';

interface GeometricSymbolProps {
  variant: 'diamond' | 'hourglass' | 'cross' | 'zigzag' | 'stepped' | 'layered' | 'grid' | 'totem' | 'infinity' | 'arrow' | 'leaf' | 'wave' | 'spiral' | 'mountain' | 'sun' | 'moon' | 'star' | 'check';
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

export const GeometricSymbol: React.FC<GeometricSymbolProps> = ({
  variant,
  size = 100,
  strokeWidth = 8,
  className = '',
  color = 'currentColor'
}) => {
  const symbols = {
    diamond: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path d="M50 10 L80 50 L50 90 L20 50 Z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round"/>
        <path d="M50 10 L50 90 M20 50 L80 50" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
        <circle cx="50" cy="50" r="8" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    hourglass: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path d="M30 10 L70 10 L50 30 L30 10 M30 90 L70 90 L50 70 L30 90" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round"/>
        <path d="M30 10 L50 50 L70 10 M30 90 L50 50 L70 90" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M35 45 L65 45 M40 55 L60 55" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    cross: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <rect x="40" y="10" width="20" height="80" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <rect x="10" y="40" width="80" height="20" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M25 25 L75 75 M75 25 L25 75" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    zigzag: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path d="M10 20 L30 40 L50 20 L70 40 L90 20" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M10 60 L30 80 L50 60 L70 80 L90 60" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M20 10 L40 30 L60 10 L80 30" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    stepped: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path d="M10 10 L30 10 L30 30 L50 30 L50 50 L70 50 L70 70 L90 70 L90 90 L10 90 Z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round"/>
        <path d="M20 20 L40 20 L40 40 L60 40 L60 60 L80 60" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    layered: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <rect x="20" y="20" width="60" height="60" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <rect x="30" y="30" width="40" height="40" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <rect x="40" y="40" width="20" height="20" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M50 20 L50 80 M20 50 L80 50" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    grid: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path d="M10 10 L90 10 L90 90 L10 90 Z" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M10 30 L90 30 M10 50 L90 50 M10 70 L90 70" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
        <path d="M30 10 L30 90 M50 10 L50 90 M70 10 L70 90" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
        <path d="M25 25 L75 75 M75 25 L25 75" fill="none" stroke={color} strokeWidth={strokeWidth/3}/>
      </svg>
    ),
    
    totem: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <rect x="40" y="10" width="20" height="20" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <rect x="35" y="30" width="30" height="15" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <rect x="30" y="45" width="40" height="20" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <rect x="25" y="65" width="50" height="25" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M50 10 L50 90" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    infinity: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path d="M20 50 Q30 30 50 50 Q70 30 80 50 Q70 70 50 50 Q30 70 20 50" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <circle cx="30" cy="50" r="8" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
        <circle cx="70" cy="50" r="8" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    arrow: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path d="M20 50 L70 50 M60 40 L70 50 L60 60" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M30 30 L50 50 L30 70 M50 30 L70 50 L50 70" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
        <circle cx="50" cy="50" r="5" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    leaf: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path d="M50 10 Q30 30 50 50 Q70 30 50 10" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M50 50 Q30 70 50 90 Q70 70 50 50" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M50 10 L50 90 M30 30 L70 30 M30 70 L70 70" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    wave: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path d="M10 30 Q30 10 50 30 Q70 10 90 30 L90 70 Q70 50 50 70 Q30 50 10 70 Z" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M20 40 Q40 20 60 40 Q80 20 100 40" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    spiral: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path d="M50 50 Q50 30 70 30 Q90 30 90 50 Q90 70 70 70 Q50 70 50 50" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M50 50 Q50 40 60 40 Q70 40 70 50 Q70 60 60 60 Q50 60 50 50" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    mountain: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path d="M10 80 L30 40 L50 60 L70 20 L90 80 Z" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M20 70 L40 50 L60 30 L80 70" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
        <circle cx="50" cy="30" r="3" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    sun: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <circle cx="50" cy="50" r="20" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M50 10 L50 5 M50 95 L50 90 M10 50 L5 50 M95 50 L90 50" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M25 25 L20 20 M80 25 L85 20 M25 75 L20 80 M80 75 L85 80" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
        <path d="M75 25 L80 20 M20 25 L15 20 M75 75 L80 80 M20 75 L15 80" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    moon: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path d="M50 20 Q30 20 30 50 Q30 80 50 80 Q70 80 70 50 Q70 20 50 20" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M40 30 Q35 40 40 50 Q45 60 40 70" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
        <circle cx="60" cy="40" r="3" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
      </svg>
    ),
    
    star: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path d="M50 10 L60 40 L90 40 L70 60 L80 90 L50 70 L20 90 L30 60 L10 40 L40 40 Z" fill="none" stroke={color} strokeWidth={strokeWidth}/>
        <path d="M50 20 L55 35 L70 35 L60 45 L65 60 L50 50 L35 60 L40 45 L30 35 L45 35 Z" fill="none" stroke={color} strokeWidth={strokeWidth/2}/>
        <circle cx="50" cy="50" r="8" fill="none" stroke={color} strokeWidth={strokeWidth/3}/>
      </svg>
    ),

    check: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path d="M20 55 L40 75 L80 30" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15 50 L40 78 L85 25" fill="none" stroke={color} strokeWidth={strokeWidth/2} strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  };

  return symbols[variant] || symbols.diamond;
};

// Predefined symbol sets for different contexts
export const SymbolSets = {
  decorative: ['diamond', 'hourglass', 'cross', 'zigzag', 'stepped'] as const,
  geometric: ['layered', 'grid', 'totem', 'infinity', 'arrow'] as const,
  nature: ['leaf', 'wave', 'spiral', 'mountain', 'sun', 'moon', 'star'] as const,
  all: ['diamond', 'hourglass', 'cross', 'zigzag', 'stepped', 'layered', 'grid', 'totem', 'infinity', 'arrow', 'leaf', 'wave', 'spiral', 'mountain', 'sun', 'moon', 'star', 'check'] as const
};

export default GeometricSymbol;
