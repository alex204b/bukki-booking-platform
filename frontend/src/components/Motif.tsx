import React from 'react';

interface MotifProps {
  variant?: 'sprig' | 'tree' | 'arrow';
  className?: string;
}

// Simple SVG motifs inspired by traditional Moldovan ornaments
export const Motif: React.FC<MotifProps> = ({ variant = 'sprig', className }) => {
  if (variant === 'tree') {
    return (
      <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M32 60V36"/>
        <path d="M32 36l-12 10m12-10l12 10"/>
        <path d="M32 28l-10 8m10-8l10 8"/>
        <path d="M32 20l-8 6m8-6l8 6"/>
        <path d="M32 12l-6 4m6-4l6 4"/>
        <rect x="28" y="60" width="8" height="2" fill="currentColor" stroke="none"/>
      </svg>
    );
  }
  if (variant === 'arrow') {
    return (
      <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M32 6v52"/>
        <path d="M20 18h24l-12-12-12 12z" fill="currentColor" stroke="none"/>
        <path d="M22 38h20M18 46h28"/>
      </svg>
    );
  }
  // sprig
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M32 60V12"/>
      <path d="M32 16l-8 6m8-6l8 6"/>
      <path d="M32 26l-10 8m10-8l10 8"/>
      <path d="M32 38l-12 10m12-10l12 10"/>
      <rect x="28" y="60" width="8" height="2" fill="currentColor" stroke="none"/>
    </svg>
  );
};

export default Motif;

















