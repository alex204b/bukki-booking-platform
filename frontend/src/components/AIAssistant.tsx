import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, MapPin, Clock, Calendar, ArrowRight, CheckCircle2, ExternalLink, ListChecks } from 'lucide-react';
import { useQuery } from 'react-query';
import { businessService, serviceService, aiService } from '../services/api';
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
  services?: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
  }>;
}

interface PlanStep {
  step: number;
  serviceType: string;
  serviceName: string;
  businesses: BusinessRecommendation[];
  estimatedDuration?: number;
  suggestedTime?: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState<BusinessRecommendation[]>([]);
  const [plan, setPlan] = useState<PlanStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      select: (response) => {
        // Handle paginated response - extract the data array
        let businesses: any[] = [];
        if (Array.isArray(response.data)) {
          businesses = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          businesses = response.data.data;
        }
        return businesses.filter((b: any) => b.status === 'approved' && b.isActive) || [];
      },
      retry: 1,
      onError: (error: any) => {
        console.error('[AIAssistant] Failed to fetch businesses:', error);
      },
    }
  );

  // Estimated durations for different service types (used for display only)
  const serviceDurations: { [key: string]: number } = {
    beauty_salon: 60,
    restaurant: 60,
    mechanic: 120,
    tailor: 45,
    fitness: 60,
    healthcare: 30,
    education: 60,
    consulting: 60,
    other: 60,
  };

  // REMOVED: All hardcoded parsing functions - now using AI only

  // Fetch services for a business
  const fetchBusinessServices = async (businessId: string) => {
    try {
      const response = await serviceService.getByBusiness(businessId);
      return response.data || [];
    } catch (error) {
      console.error(`[AIAssistant] Failed to fetch services for business ${businessId}:`, error);
      return [];
    }
  };

  const handleSearch = async () => {
    if (!query.trim() || isProcessing) return;

    setIsProcessing(true);
    setShowPlan(false);
    setPlan([]);
    setRecommendations([]);
    setError(null);

    try {
      // Try AI parsing first, fallback to keyword matching
      let parsedResult: {
        services: Array<{ type: string; name: string; step: number }>;
        timePreference: string;
        intent: string;
        isMultiStep: boolean;
        filters?: {
          priceRange?: string;
          minRating?: number | null;
          maxDistance?: number | null;
          location?: string | null;
          features?: string[];
        };
      };

      // Use AI only - no hardcoded fallbacks
      console.log('[AIAssistant] ===== STARTING AI SEARCH =====');
      console.log('[AIAssistant] Query:', query);
      
      try {
        const aiResponse = await Promise.race([
          aiService.parseQuery(query),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI request timed out after 10 seconds')), 10000)
          )
        ]) as any;
        
        // Handle both success and error responses from axios
        const data = aiResponse?.data || (aiResponse?.response?.data ? aiResponse.response.data : null);
        
        // Check if response contains an error
        if (data?.error) {
          throw new Error(data.error);
        }
        
        // Validate AI response
        if (!data || !Array.isArray(data.services) || data.services.length === 0) {
          throw new Error('AI did not return any services. Please try rephrasing your query.');
        }
        
        const validServices = data.services.filter((s: any) => s && s.type && s.name);
        if (validServices.length === 0) {
          throw new Error('AI returned invalid service data. Please try rephrasing your query.');
        }
        
        parsedResult = {
          services: validServices,
          timePreference: data.timePreference || 'soon',
          intent: data.intent || query,
          isMultiStep: data.isMultiStep || validServices.length > 1,
          filters: data.filters || {
            priceRange: 'any',
            minRating: null,
            maxDistance: null,
            location: null,
            features: [],
          },
        };

        console.log('[AIAssistant] ✅ AI parsing successful:', parsedResult);
      } catch (aiError: any) {
        console.error('[AIAssistant] ❌ AI parsing failed:', aiError);
        
        // Extract error message from response
        const errorData = aiError.response?.data;
        let errorMessage = errorData?.error || aiError.message || 'Failed to understand your request.';
        
        // Make error message more user-friendly
        if (errorMessage.includes('not configured') || errorMessage.includes('API key')) {
          errorMessage = '⚠️ AI service is not configured. Please add GEMINI_API_KEY (recommended) or HUGGINGFACE_API_KEY to your backend .env file. Only ONE is needed.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
          errorMessage = '⏱️ AI request timed out. Please try again.';
        } else if (!errorData || (errorData.services && errorData.services.length === 0)) {
          errorMessage = '❌ No services found. Please try rephrasing your query (e.g., "I need a haircut" or "Find me a restaurant").';
        }
        
        console.error('[AIAssistant] Error details:', { errorMessage, errorData, aiError });
        setError(errorMessage);
        toast.error(errorMessage, { duration: 5000 });
        setIsProcessing(false);
        return;
      }

      // Validate AI response has services
      if (!parsedResult.services || parsedResult.services.length === 0) {
        setError('AI did not return any services. Please try rephrasing your query.');
        toast.error('Could not understand your request. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Convert AI response to plan steps (AI returns database categories directly)
      const planSteps = parsedResult.services
        .filter(s => s && s.type && s.name) // Basic validation only
        .map(s => ({
          step: s.step || 1,
          serviceType: s.type, // AI returns database category directly (e.g., "beauty_salon")
          serviceName: s.name,
          businesses: [] as BusinessRecommendation[],
          estimatedDuration: serviceDurations[s.type] || 60,
        }));
      
      if (planSteps.length === 0) {
        setError('AI returned invalid service data. Please try rephrasing your query.');
        toast.error('Could not understand your request. Please try again.');
        setIsProcessing(false);
        return;
      }
      
      const timePreference = parsedResult.timePreference;

      if (planSteps.length > 1) {
        // Multi-step request - create a plan
        const fullPlan: PlanStep[] = [];
        
        for (const step of planSteps) {
          // Search for businesses matching this step
          let results: any[] = [];
          
          try {
            // Use the mapped category from serviceKeywords (e.g., "haircut" -> "beauty_salon")
            // AI returns database category directly
            const searchCategory = step.serviceType;
            console.log(`[AIAssistant] 🔍 Searching ALL available businesses for: ${step.serviceType} (category: ${searchCategory})`);
            console.log(`[AIAssistant] Filters:`, parsedResult.filters);
            console.log(`[AIAssistant] This searches the entire database, not just your bookings`);

            // Build search options from AI filters
            const searchOptions = {
              amenities: parsedResult.filters?.features || [],
              priceRange: parsedResult.filters?.priceRange || 'any',
              minRating: parsedResult.filters?.minRating || undefined,
            };

            const searchResults = await businessService.search(
              '',
              searchCategory,
              parsedResult.filters?.location || '',
              searchOptions
            );
            results = searchResults.data || [];
            console.log(`[AIAssistant] ✅ Found ${results.length} available businesses (all businesses, not just your bookings)`);
          } catch (searchError: any) {
            console.warn(`[AIAssistant] Search failed, using getAll fallback:`, searchError.message);
            // Fallback to getAll and filter
            try {
              const allBusinessesRes = await businessService.getAll();
              const allBusinesses = allBusinessesRes.data || [];
              console.log(`[AIAssistant] getAll returned ${allBusinesses.length} total businesses`);
              const lowerCategory = step.serviceType.toLowerCase();
              // Filter for approved, active businesses matching the category
              results = allBusinesses.filter((b: any) => {
                // Must be approved and active
                if (b.status !== 'approved' || !b.isActive) return false;
                
                // Match by category or name
                const matches = b.category?.toLowerCase() === lowerCategory ||
                  b.category?.toLowerCase().includes(lowerCategory) ||
                  b.name?.toLowerCase().includes(step.serviceName.toLowerCase());
                return matches;
              });
              console.log(`[AIAssistant] Filtered to ${results.length} businesses for ${step.serviceType}`);
            } catch (getAllError: any) {
              console.error(`[AIAssistant] getAll also failed:`, getAllError.message);
              results = [];
            }
          }

          // Get top businesses for this step
          const businesses: BusinessRecommendation[] = await Promise.all(
            results
              .filter((b: any) => b.status === 'approved' && b.isActive)
              .slice(0, 3)
              .map(async (b: any) => {
                const services = await fetchBusinessServices(b.id);
                return {
                  id: b.id,
                  name: b.name,
                  category: b.category,
                  address: b.address,
                  city: b.city,
                  state: b.state,
                  rating: b.rating || 0,
                  reviewCount: b.reviewCount || 0,
                  availableNow: timePreference === 'now',
                  services: services.slice(0, 3).map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    duration: s.duration || step.estimatedDuration || 30,
                    price: s.price || 0,
                  })),
                };
              })
          );

          // Sort by rating
          businesses.sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            return b.reviewCount - a.reviewCount;
          });

          fullPlan.push({
            ...step,
            businesses,
          });
        }

        setPlan(fullPlan);
        setShowPlan(true);
        toast.success(`Created a ${fullPlan.length}-step plan for you!`);
      } else if (planSteps.length === 1) {
        // Single service request
        const step = planSteps[0];
        let results: any[] = [];
        
        try {
          // Build search options from AI filters
          const searchOptions = {
            amenities: parsedResult.filters?.features || [],
            priceRange: parsedResult.filters?.priceRange || 'any',
            minRating: parsedResult.filters?.minRating || undefined,
          };

          if (step.serviceType) {
            // AI returns database category directly
            console.log(`[AIAssistant] 🔍 Searching ALL available businesses for category: ${step.serviceType}`);
            console.log(`[AIAssistant] Filters:`, parsedResult.filters);
            console.log(`[AIAssistant] This searches the entire database, not just your bookings`);
            const searchResults = await businessService.search(
              '',
              step.serviceType,
              parsedResult.filters?.location || '',
              searchOptions
            );
            results = searchResults.data || [];
            console.log(`[AIAssistant] ✅ Found ${results.length} available businesses (all businesses, not just your bookings)`);
          } else if (query.trim()) {
            console.log(`[AIAssistant] Searching with query: ${query}`);
            console.log(`[AIAssistant] Filters:`, parsedResult.filters);
            const searchResults = await businessService.search(
              query,
              '',
              parsedResult.filters?.location || '',
              searchOptions
            );
            results = searchResults.data || [];
            console.log(`[AIAssistant] Query search returned ${results.length} businesses`);
          }
        } catch (searchError: any) {
          console.warn(`[AIAssistant] Search failed, using getAll fallback:`, searchError.message);
          try {
            const allBusinessesRes = await businessService.getAll();
            const allBusinesses = allBusinessesRes.data || [];
            console.log(`[AIAssistant] getAll returned ${allBusinesses.length} total businesses`);
            const lowerQuery = query.toLowerCase();
            results = allBusinesses.filter((b: any) => 
              b.name?.toLowerCase().includes(lowerQuery) ||
              b.category?.toLowerCase().includes(lowerQuery) ||
              b.description?.toLowerCase().includes(lowerQuery)
            );
            console.log(`[AIAssistant] Filtered to ${results.length} businesses`);
          } catch (getAllError: any) {
            console.error(`[AIAssistant] getAll also failed:`, getAllError.message);
            results = [];
          }
        }

        // Fetch services for each business
        // IMPORTANT: This searches ALL available businesses, not just user's bookings
        console.log(`[AIAssistant] Processing ${results.length} businesses for single service search`);
        const approvedResults = results.filter((b: any) => {
          const isApproved = b.status === 'approved' && b.isActive;
          if (!isApproved) {
            console.log(`[AIAssistant] Skipping business ${b.name} - status: ${b.status}, active: ${b.isActive}`);
          }
          return isApproved;
        });
        console.log(`[AIAssistant] ${approvedResults.length} approved businesses found`);
        
        const recommendations: BusinessRecommendation[] = await Promise.all(
          approvedResults
            .slice(0, 5) // Get top 5 available businesses
            .map(async (b: any) => {
              const services = await fetchBusinessServices(b.id);
              console.log(`[AIAssistant] Business: ${b.name}, Services: ${services.length}`);
              return {
                id: b.id,
                name: b.name,
                category: b.category,
                address: b.address,
                city: b.city,
                state: b.state,
                rating: b.rating || 0,
                reviewCount: b.reviewCount || 0,
                availableNow: timePreference === 'now',
                services: services.slice(0, 3).map((s: any) => ({
                  id: s.id,
                  name: s.name,
                  duration: s.duration || 30,
                  price: s.price || 0,
                })),
              };
            })
        );

        recommendations.sort((a, b) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          return b.reviewCount - a.reviewCount;
        });

        setRecommendations(recommendations);

        if (recommendations.length === 0) {
          console.warn('[AIAssistant] No recommendations found for single service');
          toast('No businesses found matching your request. Try a different search.', { icon: 'ℹ️' });
        } else {
          toast.success(`Found ${recommendations.length} ${recommendations.length === 1 ? 'business' : 'businesses'} for you!`);
        }
      } else {
        // No service detected - general search
        console.log('[AIAssistant] No service detected, doing general search');
        let results: any[] = [];
        
        try {
          console.log('[AIAssistant] Attempting general search with query:', query);
          const searchResults = await businessService.search(query, '', '');
          results = searchResults.data || [];
          console.log('[AIAssistant] General search returned:', results.length, 'businesses');
        } catch (searchError: any) {
          console.warn('[AIAssistant] General search failed, using getAll:', searchError.message);
          try {
            const allBusinessesRes = await businessService.getAll();
            const allBusinesses = allBusinessesRes.data || [];
            console.log('[AIAssistant] getAll returned:', allBusinesses.length, 'total businesses');
            const lowerQuery = query.toLowerCase();
            results = allBusinesses.filter((b: any) => 
              b.name?.toLowerCase().includes(lowerQuery) ||
              b.category?.toLowerCase().includes(lowerQuery) ||
              b.description?.toLowerCase().includes(lowerQuery)
            );
            console.log('[AIAssistant] Filtered to:', results.length, 'businesses');
          } catch (getAllError: any) {
            console.error('[AIAssistant] getAll also failed:', getAllError);
            toast.error('Failed to search businesses. Please check your connection.');
            setIsProcessing(false);
            return;
          }
        }

        const recommendations: BusinessRecommendation[] = results
          .filter((b: any) => b.status === 'approved' && b.isActive)
          .slice(0, 5)
          .map((b: any) => ({
            id: b.id,
            name: b.name,
            category: b.category,
            address: b.address,
            city: b.city,
            state: b.state,
            rating: b.rating || 0,
            reviewCount: b.reviewCount || 0,
            availableNow: false,
          }))
          .sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            return b.reviewCount - a.reviewCount;
          });

        setRecommendations(recommendations);
      }
    } catch (error: any) {
      console.error('[AIAssistant] CRITICAL ERROR in handleSearch:', {
        error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
        name: error.name,
      });
      
      // Show user-friendly error message with more details
      let errorMessage = 'Failed to search businesses. ';
      if (error.response?.status === 401) {
        errorMessage += 'Please log in again.';
      } else if (error.response?.status === 404) {
        errorMessage += 'Service not found. Please check if backend is running.';
      } else if (error.response?.status >= 500) {
        errorMessage += 'Server error. Please try again later.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      toast.error(errorMessage, { duration: 5000 });
      
      setRecommendations([]);
      setPlan([]);
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

  const handleBookService = (serviceId: string) => {
    navigate(`/book/${serviceId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
              <p className="text-xs text-gray-500">I can help you find and book services</p>
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
              placeholder="e.g., I need a haircut, then lunch"
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
            Examples: "barbershop", "fix my car then eat", "haircut and restaurant"
          </p>
        </div>

        {/* Results Section */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-semibold mb-1">⚠️ Error</p>
              <p className="text-red-600 text-sm">{error}</p>
              <p className="text-red-500 text-xs mt-2">Check browser console (F12) for details</p>
            </div>
          )}
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500">Finding the best options for you...</p>
            </div>
          ) : showPlan && plan.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="h-5 w-5 text-primary-600" />
                <h4 className="font-semibold text-gray-900 text-lg">Your Plan</h4>
              </div>
              {plan.map((step, index) => (
                <div key={step.step} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-orange-50 to-white">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 capitalize mb-1">
                        {step.serviceName.replace('_', ' ')}
                      </h5>
                      {step.estimatedDuration && (
                        <p className="text-xs text-gray-500">~{step.estimatedDuration} min</p>
                      )}
                    </div>
                  </div>
                  
                  {step.businesses.length > 0 ? (
                    <div className="space-y-2 ml-11">
                      {step.businesses.map((business) => (
                        <div key={business.id} className="bg-white rounded-lg p-3 border border-gray-200 hover:border-primary-500 transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h6 className="font-semibold text-gray-900">{business.name}</h6>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <MapPin className="h-3 w-3" />
                                <span>{business.city}, {business.state}</span>
                                {business.rating > 0 && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <span className="text-yellow-500">★</span>
                                    <span>{business.rating.toFixed(1)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {business.services && business.services.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {business.services.map((service) => (
                                <button
                                  key={service.id}
                                  onClick={() => handleBookService(service.id)}
                                  className="w-full text-left px-3 py-2 bg-primary-50 hover:bg-primary-100 rounded border border-primary-200 flex items-center justify-between group transition-colors"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {service.duration} min • ${service.price.toFixed(2)}
                                    </p>
                                  </div>
                                  <ExternalLink className="h-4 w-4 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </div>
                          )}
                          
                          <button
                            onClick={() => handleSelectBusiness(business.id)}
                            className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                          >
                            View all services →
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 ml-11">No businesses found for this service</p>
                  )}
                </div>
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 mb-3">
                Recommended Businesses ({recommendations.length})
              </h4>
              {recommendations.map((business) => (
                <div
                  key={business.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
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
                    <button
                      onClick={() => handleSelectBusiness(business.id)}
                      className="ml-2 p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {business.services && business.services.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">Quick Book:</p>
                      <div className="space-y-1">
                        {business.services.map((service) => (
                          <button
                            key={service.id}
                            onClick={() => handleBookService(service.id)}
                            className="w-full text-left px-3 py-2 bg-primary-50 hover:bg-primary-100 rounded border border-primary-200 flex items-center justify-between group transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{service.name}</p>
                              <p className="text-xs text-gray-500">
                                {service.duration} min • ${service.price.toFixed(2)}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : query && !isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 mb-2">No results found</p>
              <p className="text-sm text-gray-400">
                Try searching for: "barbershop", "restaurant", "mechanic", etc.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-primary-300 mb-4" />
              <p className="text-gray-500 mb-2">How can I help you?</p>
              <p className="text-sm text-gray-400">
                Try: "I need a haircut" or "fix my car then eat something"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
