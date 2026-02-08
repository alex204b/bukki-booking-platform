import React from 'react';
import { useQuery } from 'react-query';
import { offerService } from '../services/api';
import { useI18n } from '../contexts/I18nContext';
import { Tag, Calendar, Percent, DollarSign, Building2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
interface Offer {
  id: string;
  title: string;
  description: string;
  discountAmount?: number;
  discountPercentage?: number;
  discountCode?: string;
  validUntil?: string;
  isActive: boolean;
  metadata?: {
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    applicableServices?: string[];
    termsAndConditions?: string;
  };
  business: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export const Offers: React.FC = () => {
  const { t } = useI18n();

  const { data: offers, isLoading, error } = useQuery<Offer[]>(
    'userOffers',
    async () => {
      try {
        const response = await offerService.getUserOffers();
        console.log('[Offers] API Response:', response);
        // Handle both array response and object with data property
        const offersData = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
        console.log('[Offers] Processed offers:', offersData);
        return offersData;
      } catch (err: any) {
        console.error('[Offers] Error fetching offers:', err);
        throw err;
      }
    },
    {
      refetchOnWindowFocus: true,
      retry: 1,
    }
  );

  const formatDiscount = (offer: Offer) => {
    if (offer.discountAmount) {
      return `$${offer.discountAmount} off`;
    } else if (offer.discountPercentage) {
      return `${offer.discountPercentage}% off`;
    }
    return 'Special offer';
  };

  const isExpired = (offer: Offer) => {
    if (!offer.validUntil) return false;
    return new Date(offer.validUntil) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    console.error('[Offers] Error:', error);
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-2">Failed to load offers</p>
        <p className="text-sm text-gray-500 mb-4">
          {(error as any)?.response?.data?.message || 'Please try again later'}
        </p>
        <button onClick={() => window.location.reload()} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const activeOffers = offers?.filter(offer => !isExpired(offer)) || [];
  const expiredOffers = offers?.filter(offer => isExpired(offer)) || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Special Offers
          </h1>
          <p className="text-gray-600">
            Exclusive offers from businesses you've booked with
          </p>
        </div>

        {activeOffers.length === 0 && expiredOffers.length === 0 ? (
          <div className="card p-8 sm:p-12 text-center">
            <Tag className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              No offers available
            </h2>
            <div className="text-gray-600 mb-6 space-y-2">
              <p>
                You'll receive special offers from businesses you've booked with.
              </p>
              <p className="text-sm text-gray-500">
                To receive offers:
              </p>
              <ul className="text-sm text-gray-500 text-left max-w-md mx-auto space-y-1 list-disc list-inside">
                <li>Make a booking with a business</li>
                <li>Wait for the business owner to create an offer</li>
                <li>Offers will appear here automatically</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-center">
              <Link to="/" className="btn btn-primary">
                Browse Businesses
              </Link>
              <Link to="/my-bookings" className="btn btn-outline">
                View My Bookings
              </Link>
            </div>
          </div>
        ) : (
          <>
            {activeOffers.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
                  Active Offers
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {activeOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="card p-4 sm:p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-primary-500 bg-gradient-to-br from-white to-orange-50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          {offer.business?.id ? (
                            <Link
                              to={`/businesses/${offer.business.id}`}
                              className="text-sm text-primary-600 hover:text-primary-700 font-medium mb-1 flex items-center"
                            >
                              <Building2 className="h-3 w-3 mr-1" />
                              {offer.business.name || 'Business'}
                            </Link>
                          ) : (
                            <div className="text-sm text-gray-500 mb-1 flex items-center">
                              <Building2 className="h-3 w-3 mr-1" />
                              Business
                            </div>
                          )}
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                            {offer.title}
                          </h3>
                        </div>
                        <div className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs sm:text-sm font-semibold">
                          {formatDiscount(offer)}
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm sm:text-base mb-4 line-clamp-3">
                        {offer.description}
                      </p>

                      {offer.discountCode && (
                        <div className="bg-gray-100 p-2 sm:p-3 rounded mb-3">
                          <p className="text-xs text-gray-600 mb-1">Promo Code</p>
                          <p className="text-base sm:text-lg font-mono font-bold text-primary-600">
                            {offer.discountCode}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2 mb-4">
                        {offer.validUntil && (
                          <div className="flex items-center text-xs sm:text-sm text-gray-600">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                            Valid until: {new Date(offer.validUntil).toLocaleDateString()}
                          </div>
                        )}
                        {offer.metadata?.minPurchaseAmount && (
                          <div className="flex items-center text-xs sm:text-sm text-gray-600">
                            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                            Min. purchase: ${offer.metadata.minPurchaseAmount}
                          </div>
                        )}
                      </div>

                      {offer.metadata?.termsAndConditions && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500">
                            {offer.metadata.termsAndConditions}
                          </p>
                        </div>
                      )}

                      {offer.business?.id ? (
                        <Link
                          to={`/businesses/${offer.business.id}`}
                          className="btn btn-primary w-full mt-4 text-sm sm:text-base"
                        >
                          View Business
                        </Link>
                      ) : (
                        <div className="text-sm text-gray-500 mt-4 text-center">
                          Business information unavailable
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expiredOffers.length > 0 && (
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
                  Expired Offers
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {expiredOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="card p-4 sm:p-6 opacity-60 border-l-4 border-gray-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 mb-1 flex items-center">
                            <Building2 className="h-3 w-3 mr-1" />
                            {offer.business.name}
                          </p>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-700 mb-2">
                            {offer.title}
                          </h3>
                        </div>
                        <div className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs sm:text-sm font-semibold">
                          Expired
                        </div>
                      </div>

                      <p className="text-gray-500 text-sm sm:text-base mb-3">
                        {offer.description}
                      </p>

                      {offer.validUntil && (
                        <div className="flex items-center text-xs sm:text-sm text-gray-400">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          Expired on: {new Date(offer.validUntil).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
  );
};

