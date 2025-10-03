import React from 'react';
import { GeometricSymbol, SymbolSets } from './GeometricSymbols';

interface DecorativeBackgroundProps {
  density?: 'low' | 'medium' | 'high';
  symbolSet?: 'decorative' | 'geometric' | 'nature' | 'all';
  opacity?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export const DecorativeBackground: React.FC<DecorativeBackgroundProps> = ({
  density = 'medium',
  symbolSet = 'decorative',
  opacity = 0.1,
  size = 80,
  strokeWidth = 6,
  color = 'currentColor'
}) => {
  const items = density === 'high' ? 12 : density === 'medium' ? 8 : 4;
  const symbols = SymbolSets[symbolSet];
  
  const positions = Array.from({ length: items }).map((_, i) => ({
    top: `${(i * 137) % 100}%`,
    left: `${(i * 211) % 100}%`,
    rotate: (i * 37) % 360,
    variant: symbols[i % symbols.length],
    size: size + ((i * 17) % 40),
  }));

  return (
    <div 
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ opacity }}
    >
      {positions.map((p, idx) => (
        <div 
          key={idx} 
          style={{ 
            position: 'absolute', 
            top: p.top, 
            left: p.left, 
            transform: `translate(-50%, -50%) rotate(${p.rotate}deg)` 
          }}
        >
          <GeometricSymbol 
            variant={p.variant as any}
            size={p.size}
            strokeWidth={strokeWidth}
            color={color}
          />
        </div>
      ))}
    </div>
  );
};

export default DecorativeBackground;
