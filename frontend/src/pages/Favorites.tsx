import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { favoritesService } from '../services/api';
import { MapPin, Star, Clock, Heart } from 'lucide-react';
import { EmptyFavorites } from '../components/EmptyState';
import { ListSkeleton } from '../components/LoadingSkeleton';
import { useI18n } from '../contexts/I18nContext';
import { useNavigate } from 'react-router-dom';

export const Favorites: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const { data: favorites, isLoading, error } = useQuery(
    'favorites',
    () => favoritesService.getAll(),
    {
      select: (response) => response.data,
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
        <ListSkeleton count={6} />
      </div>
    );
  }

  if (error || !favorites || favorites.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
        <EmptyFavorites onBrowse={() => navigate('/businesses')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
        <p className="text-gray-600 mt-2">
          {favorites.length} {favorites.length === 1 ? 'favorite business' : 'favorite businesses'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((favorite: any) => {
          const business = favorite.business;
          return (
            <Link
              key={favorite.id}
              to={`/businesses/${business.id}`}
              className="card p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {business.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {business.category?.split('_').map((word: string) => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </p>
                </div>
                <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              </div>
              
              {business.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {business.description}
                </p>
              )}
              
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{business.city}, {business.state}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                  <span>{business.rating?.toFixed(1) || 'N/A'}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{business.services?.length || 0} services</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

