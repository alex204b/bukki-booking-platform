import React from 'react';
import { useQuery } from 'react-query';
import { ReviewCard } from './ReviewCard';
import { reviewService } from '../services/api';
import { Review } from '../types/reviews';

interface ReviewListProps {
  businessId: string;
  showUser?: boolean;
  canEdit?: boolean;
  onEdit?: (review: Review) => void;
  onDelete?: (review: Review) => void;
}

export const ReviewList: React.FC<ReviewListProps> = ({
  businessId,
  showUser = true,
  canEdit = false,
  onEdit,
  onDelete,
}) => {
  const { data: reviews, isLoading, error, refetch } = useQuery(
    ['reviews', businessId],
    () => reviewService.getByBusiness(businessId).then(res => {
      // Handle paginated response - extract the data array
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    }),
    {
      enabled: !!businessId,
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
              <div className="h-4 w-16 bg-gray-200 rounded"></div>
            </div>
            <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-1/2 bg-gray-200 rounded mb-3"></div>
            <div className="h-4 w-full bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Failed to load reviews</p>
        <button
          onClick={() => refetch()}
          className="btn btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No reviews yet</p>
        <p className="text-sm text-gray-400">Be the first to share your experience!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review: Review) => (
        <ReviewCard
          key={review.id}
          review={review}
          showUser={showUser}
          canEdit={canEdit}
          onEdit={onEdit ? () => onEdit(review) : undefined}
          onDelete={onDelete ? () => onDelete(review) : undefined}
        />
      ))}
    </div>
  );
};
