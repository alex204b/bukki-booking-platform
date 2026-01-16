import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { bookingService, reviewService } from '../services/api';
import { ReviewPrompt } from './ReviewPrompt';

interface BookingReviewPromptProps {
  bookingId: number;
  onReviewSubmitted?: () => void;
}

export const BookingReviewPrompt: React.FC<BookingReviewPromptProps> = ({
  bookingId,
  onReviewSubmitted,
}) => {
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
    () => reviewService.getByBusiness(booking?.business?.id || ''),
    {
      enabled: !!booking?.business?.id,
      select: (response) => {
        const reviews = Array.isArray(response.data) ? response.data : [];
        // For now, we'll check if user has any review for this business
        // In a real implementation, you might want to link reviews to bookings
        return reviews.find((review: any) => review.businessId === booking?.business?.id);
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
