import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { reviewService } from '../services/api';
import toast from 'react-hot-toast';

interface ReviewFormProps {
  businessId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  existingReview?: {
    id: string;
    rating: number;
    title: string;
    comment?: string;
  };
  isEditing?: boolean;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  businessId,
  onSuccess,
  onCancel,
  existingReview,
  isEditing = false,
}) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [title, setTitle] = useState(existingReview?.title || '');
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && existingReview) {
        await reviewService.update(existingReview.id, {
          rating,
          title: title.trim(),
          comment: comment.trim() || undefined,
        });
        toast.success('Review updated successfully');
      } else {
        await reviewService.create({
          businessId,
          rating,
          title: title.trim(),
          comment: comment.trim() || undefined,
        });
        toast.success('Review submitted successfully');
      }

      onSuccess?.();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit review';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReview || !isEditing) return;

    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    setIsSubmitting(true);

    try {
      await reviewService.delete(existingReview.id);
      toast.success('Review deleted successfully');
      onSuccess?.();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete review';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <button
        key={index}
        type="button"
        onClick={() => setRating(index + 1)}
        className={`transition-colors ${
          index < rating ? 'text-yellow-400' : 'text-gray-300'
        } hover:text-yellow-400`}
      >
        <Star className="h-6 w-6 fill-current" />
      </button>
    ));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Edit Review' : 'Write a Review'}
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating *
          </label>
          <div className="flex items-center gap-1">
            {renderStars()}
            <span className="ml-2 text-sm text-gray-600">
              {rating > 0 ? `${rating}/5` : 'Select rating'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarize your experience"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={255}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comment (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share more details about your experience..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            maxLength={1000}
          />
          <div className="text-right text-xs text-gray-500 mt-1">
            {comment.length}/1000
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || rating === 0 || !title.trim()}
            className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : isEditing ? 'Update Review' : 'Submit Review'}
          </button>
          
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          )}
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
