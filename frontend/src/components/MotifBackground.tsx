import React from 'react';
import Motif from './Motif';

interface MotifBackgroundProps {
  density?: 'low' | 'medium' | 'high';
}

// Decorative background motifs placed subtly in the UI
export const MotifBackground: React.FC<MotifBackgroundProps> = ({ density = 'medium' }) => {
  const items = density === 'high' ? 14 : density === 'medium' ? 9 : 5;
  const positions = Array.from({ length: items }).map((_, i) => ({
    top: `${(i * 137) % 100}%`,
    left: `${(i * 211) % 100}%`,
    rotate: (i * 37) % 360,
    variant: (['sprig', 'tree', 'arrow'] as const)[i % 3],
    size: 60 + ((i * 17) % 40),
  }));

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 opacity-10">
      {positions.map((p, idx) => (
        <div key={idx} style={{ position: 'absolute', top: p.top, left: p.left, transform: `translate(-50%, -50%) rotate(${p.rotate}deg)` }}>
          <Motif variant={p.variant} className={`text-primary-600`} />
        </div>
      ))}
    </div>
  );
};

export default MotifBackground;



















