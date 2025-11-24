import React from 'react';
import { useQuery } from 'react-query';
import { userService } from '../services/api';
import { TrustScore } from './TrustScore';
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface TrustScoreBreakdownProps {
  userId?: string;
}

export const TrustScoreBreakdown: React.FC<TrustScoreBreakdownProps> = ({ userId }) => {
  const { data: breakdown, isLoading } = useQuery(
    ['trust-score', userId],
    () => userId ? userService.getUserTrustScore(userId) : userService.getTrustScore(),
    {
      select: (response) => response.data,
    }
  );

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!breakdown) {
    return null;
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'text-green-600 bg-green-100';
      case 'good':
        return 'text-yellow-600 bg-yellow-100';
      case 'fair':
        return 'text-orange-600 bg-orange-100';
      case 'poor':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'fair':
        return 'Fair';
      case 'poor':
        return 'Poor';
      case 'very_poor':
        return 'Very Poor';
      default:
        return level;
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Trust Score</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(breakdown.level)}`}>
          {getLevelLabel(breakdown.level)}
        </span>
      </div>

      <div className="mb-6">
        <TrustScore score={breakdown.score} size="lg" />
      </div>

      {breakdown.breakdown.details.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Score Breakdown</h4>
          <div className="space-y-2">
            {breakdown.breakdown.details.map((detail: string, index: number) => {
              const isPositive = detail.startsWith('+');
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded ${
                    isPositive ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center">
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 mr-2" />
                    )}
                    <span className={`text-sm ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                      {detail}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded">
          <div className="text-2xl font-bold text-blue-600">{breakdown.factors.completedBookings}</div>
          <div className="text-xs text-blue-700">Completed</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded">
          <div className="text-2xl font-bold text-red-600">{breakdown.factors.noShows}</div>
          <div className="text-xs text-red-700">No-Shows</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded">
          <div className="text-2xl font-bold text-orange-600">{breakdown.factors.lateCancellations}</div>
          <div className="text-xs text-orange-700">Late Cancels</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded">
          <div className="text-2xl font-bold text-yellow-600">{breakdown.factors.earlyCancellations}</div>
          <div className="text-xs text-yellow-700">Early Cancels</div>
        </div>
      </div>

      {breakdown.score < 40 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Low Trust Score</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Your trust score is below 40. Complete bookings on time and avoid cancellations to improve your score.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

