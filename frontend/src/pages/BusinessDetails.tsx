import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { MapPin, Phone, Mail, Clock, Star, Plus, Calendar, AlertCircle, MessageCircle } from 'lucide-react';
import { FavoriteButton } from '../components/FavoriteButton';
import { businessService, reviewService, serviceService } from '../services/api';
import { ReviewForm } from '../components/ReviewForm';
import { ReviewList } from '../components/ReviewList';
import { ReviewStats } from '../components/ReviewStats';
import { BusinessGallery } from '../components/BusinessGallery';
import { Review } from '../types/reviews';
import { useI18n } from '../contexts/I18nContext';
import toast from 'react-hot-toast';

export const BusinessDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  const { data: business, isLoading, error } = useQuery(
    ['business', id],
    () => businessService.getById(id!).then(res => res.data),
    {
      enabled: !!id,
    }
  );

  const { data: services, isLoading: servicesLoading } = useQuery(
    ['services', id],
    () => serviceService.getByBusiness(id!),
    {
      enabled: !!id,
      select: (response) => response.data,
      staleTime: 0,
      refetchOnMount: 'always',
    }
  );

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setEditingReview(null);
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setShowReviewForm(true);
  };

  const handleDeleteReview = async (review: Review) => {
    if (window.confirm(t('delete') + '?')) {
      try {
        await reviewService.delete(review.id);
        toast.success(t('reviewDeletedSuccessfully') || 'Review deleted successfully');
      } catch (error) {
        console.error('Failed to delete review:', error);
        toast.error(t('failedToDeleteReview') || 'Failed to delete review');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 w-1/2 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-6">
                <div className="h-48 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('businessNotFound')}</h1>
            <p className="text-gray-600 mb-8">{t('businessDoesNotExist')}</p>
            <Link 
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-[#E7001E] rounded-md hover:bg-[#c50018] transition-colors"
            >
              {t('backToBusinesses')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check if business is approved and active
  const isBusinessApproved = business.status === 'approved' && business.isActive !== false;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-5 w-5 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] bg-gray-50 pt-4 pb-20 sm:pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Link to="/" className="hover:text-accent-600">Businesses</Link>
            <span>/</span>
            <span className="text-gray-900">{business.name}</span>
          </div>

          {/* Business Status Warning */}
          {!isBusinessApproved && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    {business.status === 'pending' ? 'Business Under Review' : 'Business Not Available'}
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    {business.status === 'pending' 
                      ? 'This business is currently under review and will be available for booking once approved.'
                      : 'This business is currently not accepting bookings.'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
                <FavoriteButton businessId={business.id} size="lg" />
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{business.address}, {business.city}</span>
                </div>
                {business.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{business.phone}</span>
                  </div>
                )}
                {business.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{business.email}</span>
                  </div>
                )}
              </div>
            </div>
            {isBusinessApproved && (
              <button
                onClick={() => navigate(`/chat/${business.id}`)}
                className="inline-flex items-center gap-2 btn btn-secondary"
              >
                <MessageCircle className="h-4 w-4" />
                {t('message') || 'Message'}
              </button>
            )}
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {renderStars(Math.floor(business.rating || 0))}
              </div>
              <span className="text-sm font-medium text-gray-900">
                {Number(business.rating || 0).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Photo Gallery */}
            {business.images && Array.isArray(business.images) && business.images.length > 0 && (
              <BusinessGallery images={business.images} businessName={business.name} />
            )}

            {/* Business Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Category</h3>
                  <p className="text-gray-900 capitalize">{business.category}</p>
                </div>
                {business.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
                    <p className="text-gray-900">{business.description}</p>
                  </div>
                )}
                {business.hours && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Hours</h3>
                    <div className="flex items-center gap-1 text-gray-900">
                      <Clock className="h-4 w-4" />
                      <span>{business.hours}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Services Section */}
            {isBusinessApproved && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Services</h2>
                {servicesLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : services && services.length > 0 ? (
                  <div className="space-y-4">
                    {services.map((service: any) => (
                      <div key={service.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {service.name}
                            </h3>
                            {service.description && (
                              <p className="text-gray-600 mb-2">{service.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{service.duration} min</span>
                              </div>
                            </div>
                          </div>
                          <Link
                            to={`/book/${service.id}`}
                            className="ml-4 inline-flex items-center gap-2 px-4 py-2 text-white bg-[#E7001E] rounded-md hover:bg-[#c50018] transition-colors"
                          >
                            <Calendar className="h-4 w-4" />
                            Book Now
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-4">No services available at this time.</p>
                    {isBusinessApproved && (
                      <p className="text-sm mb-4">
                        {['restaurant', 'restaurants', 'food'].some(c => 
                          (business.category || '').toLowerCase().includes(c)
                        )
                          ? (t('contactToReserveTable') || 'Contact the business to reserve a table.')
                          : (t('contactForBooking') || 'Contact the business to inquire about booking.')}
                      </p>
                    )}
                    {isBusinessApproved && (
                      <div className="flex flex-wrap justify-center gap-3">
                        {business.phone && (
                          <a
                            href={`tel:${business.phone}`}
                            className="inline-flex items-center gap-2 px-4 py-2 text-white bg-[#E7001E] rounded-md hover:bg-[#c50018] transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                            {t('callToReserve') || 'Call to reserve'}
                          </a>
                        )}
                        <button
                          onClick={() => navigate(`/chat/${business.id}`)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-white bg-[#E7001E] rounded-md hover:bg-[#c50018] transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {t('messageToReserve') || 'Message to reserve'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Reviews Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-white bg-[#E7001E] rounded-md hover:bg-[#c50018] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Write Review
                </button>
              </div>

              {showReviewForm && (
                <div className="mb-6">
                  <ReviewForm
                    businessId={business.id}
                    existingReview={editingReview || undefined}
                    isEditing={!!editingReview}
                    onSuccess={handleReviewSuccess}
                    onCancel={() => {
                      setShowReviewForm(false);
                      setEditingReview(null);
                    }}
                  />
                </div>
              )}

              <ReviewList
                businessId={business.id}
                canEdit={true}
                onEdit={handleEditReview}
                onDelete={handleDeleteReview}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Review Stats */}
            <ReviewStats businessId={business.id} />

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-white bg-[#E7001E] rounded-md hover:bg-[#c50018] transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    {t('callBusiness')}
                  </a>
                )}
                {isBusinessApproved && (
                  <button
                    onClick={() => navigate(`/chat/${business.id}`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-white bg-[#E7001E] rounded-md hover:bg-[#c50018] transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t('sendMessage')}
                  </button>
                )}
                {business.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address + ', ' + business.city)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-white bg-[#E7001E] rounded-md hover:bg-[#c50018] transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    {t('location')}
                  </a>
                )}
              </div>
            </div>

            {/* Business Hours */}
            {business.hours && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Hours</h3>
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="h-4 w-4" />
                  <span>{business.hours}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
