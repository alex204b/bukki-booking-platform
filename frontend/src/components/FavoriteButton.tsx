import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { favoritesService } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface FavoriteButtonProps {
  businessId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ 
  businessId, 
  className = '',
  size = 'md'
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  const { data: favoriteData } = useQuery(
    ['favorite', businessId],
    () => favoritesService.isFavorite(businessId),
    {
      enabled: !!user && !!businessId,
      select: (response) => response.data,
    }
  );

  const isFavorite = favoriteData?.isFavorite || false;

  const addFavoriteMutation = useMutation(
    () => favoritesService.add(businessId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['favorite', businessId]);
        queryClient.invalidateQueries('favorites');
        toast.success('Added to favorites');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to add to favorites');
      },
    }
  );

  const removeFavoriteMutation = useMutation(
    () => favoritesService.remove(businessId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['favorite', businessId]);
        queryClient.invalidateQueries('favorites');
        toast.success('Removed from favorites');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to remove from favorites');
      },
    }
  );

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please log in to add favorites');
      return;
    }

    if (isFavorite) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };

  if (!user) return null;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const isLoading = addFavoriteMutation.isLoading || removeFavoriteMutation.isLoading;

  return (
    <button
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      className={`transition-all duration-200 ${className} ${
        isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={`${sizeClasses[size]} transition-all duration-200 ${
          isFavorite || isHovered
            ? 'text-red-500 fill-red-500'
            : 'text-gray-400 hover:text-red-400'
        }`}
      />
    </button>
  );
};

