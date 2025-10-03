import React from 'react';
import { useI18n } from '../contexts/I18nContext';
import { GeometricSymbol } from './GeometricSymbols';

interface Review {
  id: number;
  rating: number;
  comment?: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface ReviewDisplayProps {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const ReviewDisplay: React.FC<ReviewDisplayProps> = ({
  reviews,
  averageRating,
  totalReviews,
  onLoadMore,
  hasMore = false,
}) => {
  const { t } = useI18n();

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Average Rating Summary */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('reviews')} ({totalReviews})
          </h3>
          <div className="absolute top-4 right-4 opacity-10">
            <GeometricSymbol variant="star" size={30} strokeWidth={3} color="#f97316" />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {averageRating.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">{t('averageRating')}</div>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {renderStars(Math.round(averageRating), 'lg')}
              <span className="text-sm text-gray-600">
                {averageRating.toFixed(1)} {t('outOf')} 5
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {totalReviews} {totalReviews === 1 ? t('review') : t('reviews')}
            </div>
          </div>
        </div>
      </div>

      {/* Individual Reviews */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">
                      {review.user.firstName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {review.user.firstName} {review.user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(review.createdAt)}
                    </div>
                  </div>
                </div>
                {renderStars(review.rating, 'sm')}
              </div>
              {review.comment && (
                <p className="text-gray-700 mt-2">{review.comment}</p>
              )}
            </div>
          ))}

          {hasMore && onLoadMore && (
            <div className="text-center">
              <button
                onClick={onLoadMore}
                className="px-4 py-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                {t('loadMoreReviews')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <GeometricSymbol variant="star" size={48} strokeWidth={2} color="#d1d5db" />
          </div>
          <p className="text-gray-500">{t('noReviewsYet')}</p>
        </div>
      )}
    </div>
  );
};
