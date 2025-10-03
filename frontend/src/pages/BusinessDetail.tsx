import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { businessService, serviceService, reviewService } from '../services/api';
import { MapPin, Phone, Star, Clock, Calendar, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { ReviewDisplay } from '../components/ReviewDisplay';
import { useI18n } from '../contexts/I18nContext';

export const BusinessDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [selectedService, setSelectedService] = useState<any>(null);
  const [reviewsPage, setReviewsPage] = useState(1);

  const { data: business, isLoading: businessLoading } = useQuery(
    ['business', id],
    () => businessService.getById(id!),
    {
      enabled: !!id,
      select: (response) => response.data,
    }
  );

  const { data: services, isLoading: servicesLoading } = useQuery(
    ['services', id],
    () => serviceService.getByBusiness(id!),
    {
      enabled: !!id,
      select: (response) => response.data,
    }
  );

  const { data: reviews, isLoading: reviewsLoading } = useQuery(
    ['reviews', id, reviewsPage],
    () => reviewService.getByBusiness(parseInt(id!), reviewsPage, 10),
    {
      enabled: !!id,
      select: (response) => response.data,
    }
  );

  const formatCategory = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (businessLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Business not found</h2>
        <Link to="/businesses" className="btn btn-primary">
          Back to Businesses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link to="/businesses" className="btn btn-ghost">
        ← Back to Businesses
      </Link>

      {/* Business Header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {business.name}
                </h1>
                <p className="text-lg text-gray-600 mb-2">
                  {formatCategory(business.category)}
                </p>
                <div className="flex items-center mb-4">
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  <span className="text-lg font-medium text-gray-900 ml-1">
                    {business.rating.toFixed(1)}
                  </span>
                  <span className="text-gray-500 ml-2">
                    ({business.reviewCount} reviews)
                  </span>
                </div>
              </div>
            </div>
            
            {business.description && (
              <p className="text-gray-600 mb-4">{business.description}</p>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center text-gray-600">
                <MapPin className="h-5 w-5 mr-2" />
                <span>{business.address}, {business.city}, {business.state} {business.zipCode}</span>
              </div>
              
              {business.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="h-5 w-5 mr-2" />
                  <a href={`tel:${business.phone}`} className="hover:text-primary-600">
                    {business.phone}
                  </a>
                </div>
              )}
              
              {business.email && (
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">📧</span>
                  <a href={`mailto:${business.email}`} className="hover:text-primary-600">
                    {business.email}
                  </a>
                </div>
              )}
              
              {business.website && (
                <div className="flex items-center text-gray-600">
                  <ExternalLink className="h-5 w-5 mr-2" />
                  <a 
                    href={business.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary-600"
                  >
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          </div>
          
          {business.logo && (
            <div className="md:w-48">
              <img
                src={business.logo}
                alt={business.name}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}
        </div>
      </div>

      {/* Services */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Services</h2>
        
        {servicesLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services?.map((service: any) => (
              <div key={service.id} className="card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {service.name}
                    </h3>
                    <div className="flex items-center text-gray-600 mb-2">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{formatDuration(service.duration)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">
                      {formatPrice(service.price)}
                    </p>
                  </div>
                </div>
                
                {service.description && (
                  <p className="text-gray-600 mb-4">{service.description}</p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                    <span>{service.rating.toFixed(1)}</span>
                    <span className="ml-1">({service.reviewCount} reviews)</span>
                  </div>
                  
                  <Link
                    to={`/book/${service.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {services?.length === 0 && !servicesLoading && (
          <div className="text-center py-8">
            <p className="text-gray-600">No services available at this time.</p>
          </div>
        )}
      </div>

      {/* Working Hours */}
      {business.workingHours && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Working Hours</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(business.workingHours).map(([day, hours]: [string, any]) => (
              <div key={day} className="flex justify-between">
                <span className="font-medium text-gray-900 capitalize">{day}</span>
                <span className="text-gray-600">
                  {hours.isOpen 
                    ? `${hours.openTime} - ${hours.closeTime}`
                    : 'Closed'
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Section */}
      {reviews && (
        <div className="card p-6">
          <ReviewDisplay
            reviews={reviews.reviews}
            averageRating={reviews.averageRating}
            totalReviews={reviews.total}
            onLoadMore={() => setReviewsPage(prev => prev + 1)}
            hasMore={reviews.reviews.length < reviews.total}
          />
        </div>
      )}
    </div>
  );
};
