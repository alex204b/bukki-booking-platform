import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { bookingService, reviewService } from '../services/api';
import { ReviewPrompt } from './ReviewPrompt';
import { useI18n } from '../contexts/I18nContext';

interface BookingReviewPromptProps {
  bookingId: number;
  onReviewSubmitted?: () => void;
}

export const BookingReviewPrompt: React.FC<BookingReviewPromptProps> = ({
  bookingId,
  onReviewSubmitted,
}) => {
  const { t } = useI18n();
  const [showPrompt, setShowPrompt] = useState(false);

  const { data: booking } = useQuery(
    ['booking', bookingId],
    () => bookingService.getById(bookingId.toString()),
    {
      select: (response) => response.data,
    }
  );

  const { data: existingReview } = useQuery(
    ['review', bookingId],
    () => reviewService.getByBusiness(booking?.business?.id || 0, 1, 1),
    {
      enabled: !!booking?.business?.id,
      select: (response) => {
        const reviews = response.data.reviews;
        return reviews.find((review: any) => review.bookingId === bookingId);
      },
    }
  );

  useEffect(() => {
    // Show prompt if booking is completed and no review exists
    if (booking?.checkedIn && !existingReview && booking?.status === 'completed') {
      setShowPrompt(true);
    }
  }, [booking, existingReview]);

  if (!showPrompt || !booking) {
    return null;
  }

  return (
    <ReviewPrompt
      bookingId={bookingId}
      businessId={booking.business.id}
      businessName={booking.business.name}
      onReviewSubmitted={() => {
        setShowPrompt(false);
        onReviewSubmitted?.();
      }}
      onClose={() => setShowPrompt(false)}
    />
  );
};
