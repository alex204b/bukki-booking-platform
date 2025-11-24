import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, MapPin, Clock, Calendar, ArrowRight } from 'lucide-react';
import { useQuery } from 'react-query';
import { businessService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import toast from 'react-hot-toast';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BusinessRecommendation {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  state: string;
  rating: number;
  reviewCount: number;
  distance?: number;
  availableNow?: boolean;
  nextAvailableSlot?: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState<BusinessRecommendation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useI18n();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Fetch all businesses for AI search (only when modal is open)
  const { data: allBusinesses = [] } = useQuery(
    'all-businesses-for-ai',
    () => businessService.getAll(),
    {
      enabled: isOpen,
      select: (response) => response.data?.filter((b: any) => b.status === 'approved' && b.isActive) || [],
      retry: 1,
      onError: (error: any) => {
        console.error('[AIAssistant] Failed to fetch businesses:', error);
        // Don't show toast here - it will be shown when user searches
      },
    }
  );

  const parseQuery = (userQuery: string) => {
    const lowerQuery = userQuery.toLowerCase();
    
    // Extract service type
    const serviceKeywords: { [key: string]: string[] } = {
      haircut: ['haircut', 'hair', 'barber', 'barbershop', 'cut'],
      restaurant: ['restaurant', 'food', 'eat', 'dining', 'meal', 'lunch', 'dinner'],
      mechanic: ['mechanic', 'car', 'auto', 'repair', 'fix', 'vehicle'],
      tailor: ['tailor', 'alteration', 'sew', 'clothing'],
      fitness: ['gym', 'fitness', 'workout', 'exercise', 'trainer'],
      healthcare: ['doctor', 'health', 'medical', 'clinic', 'dentist'],
      beauty_salon: ['beauty', 'salon', 'spa', 'nails', 'manicure', 'pedicure'],
    };

    let detectedCategory = '';
    for (const [category, keywords] of Object.entries(serviceKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        detectedCategory = category;
        break;
      }
    }

    // Extract time preference
    const timeKeywords = {
      now: ['now', 'right now', 'immediately', 'asap', 'today'],
      today: ['today', 'this day'],
      tomorrow: ['tomorrow'],
      soon: ['soon', 'quick', 'fast'],
    };

    let timePreference = 'soon';
    for (const [time, keywords] of Object.entries(timeKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        timePreference = time;
        break;
      }
    }

    return { category: detectedCategory, timePreference, originalQuery: userQuery };
  };

  const handleSearch = async () => {
    if (!query.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const { category, timePreference } = parseQuery(query);
      
      // Search businesses
      let results: any[] = [];
      
      try {
        if (category) {
          // Search by category
          const searchResults = await businessService.search('', category, '');
          results = searchResults.data || [];
        } else if (query.trim()) {
          // Search by query text
          const searchResults = await businessService.search(query, '', '');
          results = searchResults.data || [];
        }
      } catch (searchError: any) {
        // If search fails (e.g., 404), fallback to getAll and filter client-side
        console.warn('[AIAssistant] Search endpoint failed, using getAll as fallback:', searchError);
        try {
          const allBusinessesRes = await businessService.getAll();
          const allBusinesses = allBusinessesRes.data || [];
          
          // Filter client-side
          if (category) {
            results = allBusinesses.filter((b: any) => 
              b.category?.toLowerCase() === category.toLowerCase()
            );
          } else if (query.trim()) {
            const lowerQuery = query.toLowerCase();
            results = allBusinesses.filter((b: any) => 
              b.name?.toLowerCase().includes(lowerQuery) ||
              b.category?.toLowerCase().includes(lowerQuery) ||
              b.description?.toLowerCase().includes(lowerQuery)
            );
          } else {
            results = allBusinesses;
          }
        } catch (getAllError: any) {
          console.error('[AIAssistant] Failed to get businesses:', getAllError);
          throw getAllError;
        }
      }

      // Filter and sort results
      let recommendations: BusinessRecommendation[] = results
        .filter((b: any) => b.status === 'approved' && b.isActive)
        .map((b: any) => ({
          id: b.id,
          name: b.name,
          category: b.category,
          address: b.address,
          city: b.city,
          state: b.state,
          rating: b.rating || 0,
          reviewCount: b.reviewCount || 0,
          availableNow: timePreference === 'now', // Simplified - would check actual availability
        }))
        .sort((a, b) => {
          // Sort by rating first, then by review count
          if (b.rating !== a.rating) return b.rating - a.rating;
          return b.reviewCount - a.reviewCount;
        })
        .slice(0, 5); // Top 5 recommendations

      setRecommendations(recommendations);

      if (recommendations.length === 0) {
        toast('No businesses found matching your request. Try a different search.', { icon: 'ℹ️' });
      } else {
        toast.success(`Found ${recommendations.length} ${recommendations.length === 1 ? 'business' : 'businesses'} for you!`);
      }
    } catch (error: any) {
      console.error('[AIAssistant] Error searching:', error);
      toast.error(error.response?.data?.message || 'Failed to search businesses. Please try again.');
      setRecommendations([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSelectBusiness = (businessId: string) => {
    navigate(`/businesses/${businessId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
              <p className="text-xs text-gray-500">Ask me to find businesses for you</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input Section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., I need a haircut right now"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isProcessing}
            />
            <button
              onClick={handleSearch}
              disabled={!query.trim() || isProcessing}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Examples: "haircut right now", "restaurant nearby", "mechanic today"
          </p>
        </div>

        {/* Results Section */}
        <div className="flex-1 overflow-y-auto p-4">
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 mb-3">
                Recommended Businesses ({recommendations.length})
              </h4>
              {recommendations.map((business) => (
                <button
                  key={business.id}
                  onClick={() => handleSelectBusiness(business.id)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-gray-900">{business.name}</h5>
                        {business.rating > 0 && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <span className="text-yellow-500">★</span>
                            <span>{business.rating.toFixed(1)}</span>
                            {business.reviewCount > 0 && (
                              <span className="text-gray-400">({business.reviewCount})</span>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 capitalize mb-2">
                        {business.category.replace('_', ' ')}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{business.city}, {business.state}</span>
                        </div>
                        {business.availableNow && (
                          <div className="flex items-center gap-1 text-green-600">
                            <Clock className="h-3 w-3" />
                            <span>Available now</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          ) : query && !isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 mb-2">No results found</p>
              <p className="text-sm text-gray-400">
                Try searching for: "haircut", "restaurant", "mechanic", etc.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-primary-300 mb-4" />
              <p className="text-gray-500 mb-2">How can I help you?</p>
              <p className="text-sm text-gray-400">
                Try: "I need a haircut right now" or "Find me a restaurant nearby"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

