import React from 'react';
import { useI18n } from '../contexts/I18nContext';
import { GeometricSymbol } from './GeometricSymbols';

interface TrustScoreProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TrustScore: React.FC<TrustScoreProps> = ({
  score,
  showLabel = true,
  size = 'md',
}) => {
  const { t } = useI18n();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return 'check';
    if (score >= 60) return 'star';
    if (score >= 40) return 'sun';
    return 'cross';
  };

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={`flex items-center space-x-2 ${textSizeClasses[size]}`}>
      <div className={`${sizeClasses[size]} ${getScoreBgColor(score)} rounded-full flex items-center justify-center`}>
        <GeometricSymbol
          variant={getScoreIcon(score) as any}
          size={size === 'sm' ? 16 : size === 'md' ? 20 : 24}
          strokeWidth={2}
          color={score >= 80 ? '#16a34a' : score >= 60 ? '#eab308' : score >= 40 ? '#ea580c' : '#dc2626'}
        />
      </div>
      <div>
        <div className={`font-semibold ${getScoreColor(score)}`}>
          {score}/100
        </div>
        {showLabel && (
          <div className="text-xs text-gray-600">
            {t('trustScore')}
          </div>
        )}
      </div>
    </div>
  );
};
