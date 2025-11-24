import React from 'react';
import { Star, Calendar, User } from 'lucide-react';

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    title: string;
    comment?: string;
    createdAt: string;
    user?: {
      firstName: string;
      lastName: string;
    };
  };
  showUser?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  showUser = true,
  onEdit,
  onDelete,
  canEdit = false,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1">
              {renderStars(review.rating)}
            </div>
            <span className="text-sm font-medium text-gray-900">
              {review.rating}/5
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {review.title}
          </h3>
          {showUser && review.user && (
            <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
              <User className="h-4 w-4" />
              <span>
                {review.user.firstName} {review.user.lastName}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(review.createdAt)}</span>
        </div>
      </div>

      {review.comment && (
        <p className="text-gray-700 text-sm leading-relaxed mb-3">
          {review.comment}
        </p>
      )}

      {canEdit && (onEdit || onDelete) && (
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};
