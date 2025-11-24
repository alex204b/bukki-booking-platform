import React from 'react';
import { useQuery } from 'react-query';
import { Star } from 'lucide-react';
import { reviewService } from '../services/api';

interface ReviewStatsProps {
  businessId: string;
}

export const ReviewStats: React.FC<ReviewStatsProps> = ({ businessId }) => {
  const { data: stats, isLoading, error } = useQuery(
    ['review-stats', businessId],
    () => reviewService.getStats(businessId).then(res => res.data),
    {
      enabled: !!businessId,
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-8 w-16 bg-gray-200 rounded"></div>
          <div className="h-6 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
              <div className="h-2 w-16 bg-gray-200 rounded"></div>
              <div className="h-2 w-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <p className="text-gray-500 text-center">Unable to load review statistics</p>
      </div>
    );
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const renderRatingBar = (rating: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 w-8">
          <span className="text-sm font-medium">{rating}</span>
          <Star className="h-3 w-3 text-yellow-400 fill-current" />
        </div>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1">
          {renderStars(stats.averageRating)}
        </div>
        <div>
          <span className="text-2xl font-bold text-gray-900">
            {stats.averageRating.toFixed(1)}
          </span>
          <span className="text-sm text-gray-600 ml-1">
            out of 5
          </span>
        </div>
        <div className="text-sm text-gray-600">
          {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => (
          <div key={rating}>
            {renderRatingBar(
              rating,
              stats.ratingDistribution[rating] || 0,
              stats.totalReviews
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
