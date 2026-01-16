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
      select: (response) => response.data?.filter((b: any) => b.status === 'approved' && b.isActive) || [],
      retry: 1,
      onError: (error: any) => {
        console.error('[AIAssistant] Failed to fetch businesses:', error);
      },
    }
  );

  // Service type mappings with keywords
  const serviceKeywords: { [key: string]: { keywords: string[], category: string, estimatedDuration: number } } = {
    haircut: {
      keywords: ['haircut', 'hair', 'barber', 'barbershop', 'cut', 'trim', 'styling'],
      category: 'haircut',
      estimatedDuration: 30
    },
    restaurant: {
      keywords: ['restaurant', 'food', 'eat', 'dining', 'meal', 'lunch', 'dinner', 'breakfast', 'cafe', 'restaurant'],
      category: 'restaurant',
      estimatedDuration: 60
    },
    mechanic: {
      keywords: ['mechanic', 'car', 'auto', 'repair', 'fix', 'vehicle', 'automotive', 'garage'],
      category: 'mechanic',
      estimatedDuration: 120
    },
    tailor: {
      keywords: ['tailor', 'alteration', 'sew', 'clothing', 'tailoring'],
      category: 'tailor',
      estimatedDuration: 45
    },
    fitness: {
      keywords: ['gym', 'fitness', 'workout', 'exercise', 'trainer', 'training'],
      category: 'fitness',
      estimatedDuration: 60
    },
    healthcare: {
      keywords: ['doctor', 'health', 'medical', 'clinic', 'dentist', 'appointment'],
      category: 'healthcare',
      estimatedDuration: 30
    },
    beauty_salon: {
      keywords: ['beauty', 'salon', 'spa', 'nails', 'manicure', 'pedicure', 'massage'],
      category: 'beauty_salon',
      estimatedDuration: 60
    },
  };

  // Extract multiple services from query
  const parseMultiStepQuery = (userQuery: string): PlanStep[] => {
    const lowerQuery = userQuery.toLowerCase();
    const detectedServices: PlanStep[] = [];
    let stepNumber = 1;

    // Check for sequential indicators
    const sequentialKeywords = ['then', 'and then', 'after', 'after that', 'next', 'followed by', 'and'];
    const hasSequential = sequentialKeywords.some(keyword => lowerQuery.includes(keyword));

    // Split query by sequential keywords if present
    let queryParts: string[] = [];
    if (hasSequential) {
      // Split by sequential keywords
      const splitRegex = new RegExp(`(${sequentialKeywords.join('|')})`, 'i');
      queryParts = userQuery.split(splitRegex).filter(part => part.trim() && !sequentialKeywords.includes(part.toLowerCase().trim()));
    } else {
      // Check if multiple services are mentioned without explicit sequencing
      queryParts = [userQuery];
    }

    // Detect services in each part
    for (const part of queryParts) {
      const lowerPart = part.toLowerCase();
      
      for (const [serviceType, config] of Object.entries(serviceKeywords)) {
        if (config.keywords.some(keyword => lowerPart.includes(keyword))) {
          detectedServices.push({
            step: stepNumber++,
            serviceType,
            serviceName: config.keywords.find(k => lowerPart.includes(k)) || serviceType,
            businesses: [],
            estimatedDuration: config.estimatedDuration,
          });
          break; // Only one service per part
        }
      }
    }

    // If no services detected, try to detect single service
    if (detectedServices.length === 0) {
      for (const [serviceType, config] of Object.entries(serviceKeywords)) {
        if (config.keywords.some(keyword => lowerQuery.includes(keyword))) {
          detectedServices.push({
            step: 1,
            serviceType,
            serviceName: config.keywords.find(k => lowerQuery.includes(k)) || serviceType,
            businesses: [],
            estimatedDuration: config.estimatedDuration,
          });
          break;
        }
      }
    }

    return detectedServices;
  };

  // Extract time preference
  const extractTimePreference = (userQuery: string): string => {
    const lowerQuery = userQuery.toLowerCase();
    const timeKeywords = {
      now: ['now', 'right now', 'immediately', 'asap', 'urgent'],
      today: ['today', 'this day'],
      tomorrow: ['tomorrow'],
      soon: ['soon', 'quick', 'fast'],
    };

    for (const [time, keywords] of Object.entries(timeKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        return time;
      }
    }
    return 'soon';
  };

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
      };

      // Try AI parsing, but always have keyword matching as reliable fallback
      try {
        console.log('[AIAssistant] ===== STARTING SEARCH =====');
        console.log('[AIAssistant] Query:', query);
        
        // Try AI with timeout to prevent hanging
        try {
          const aiResponse = await Promise.race([
            aiService.parseQuery(query),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('AI timeout')), 5000)
            )
          ]) as any;
          
          // Handle both success and error responses from axios
          const data = aiResponse?.data || (aiResponse?.response?.data ? aiResponse.response.data : null);
          
          // Only use AI result if it has valid services
          if (data && Array.isArray(data.services) && data.services.length > 0) {
            const validServices = data.services.filter((s: any) => s && s.type && s.name);
            if (validServices.length > 0) {
              parsedResult = {
                services: validServices,
                timePreference: data.timePreference || 'soon',
                intent: data.intent || query,
                isMultiStep: data.isMultiStep || validServices.length > 1,
              };
              console.log('[AIAssistant] AI parsing successful:', parsedResult);
            } else {
              throw new Error('AI returned invalid services');
            }
          } else {
            console.log('[AIAssistant] AI returned empty or invalid services, using fallback');
            throw new Error('AI returned empty services');
          }
        } catch (aiError: any) {
          // Log error but don't show to user - we'll use fallback
          console.log('[AIAssistant] AI parsing failed, using keyword matching:', aiError.message);
          throw aiError;
        }
      } catch (aiError: any) {
        // Always use keyword matching - it's reliable and works offline
        console.log('[AIAssistant] Using keyword matching (reliable fallback)');
        const planSteps = parseMultiStepQuery(query);
        parsedResult = {
          services: planSteps.map(step => ({
            type: step.serviceType,
            name: step.serviceName,
            step: step.step,
          })),
          timePreference: extractTimePreference(query),
          intent: query,
          isMultiStep: planSteps.length > 1,
        };
      }

      // Validate parsedResult has services - if not, use fallback parsing
      if (!parsedResult.services || parsedResult.services.length === 0) {
        console.warn('[AIAssistant] AI returned no services, using fallback keyword matching');
        const fallbackSteps = parseMultiStepQuery(query);
        parsedResult = {
          services: fallbackSteps.map(step => ({
            type: step.serviceType,
            name: step.serviceName,
            step: step.step,
          })),
          timePreference: extractTimePreference(query),
          intent: query,
          isMultiStep: fallbackSteps.length > 1,
        };
        
        // If fallback also finds nothing, show helpful error
        if (parsedResult.services.length === 0) {
          setError('Could not understand your request. Please try searching for a service type like: "haircut", "restaurant", "mechanic", "gym", "beauty salon", "tailor", or "healthcare".');
          toast.error('Could not understand your request. Try: "haircut", "restaurant", "mechanic", etc.');
          setIsProcessing(false);
          return;
        }
      }

      const planSteps = parsedResult.services
        .filter(s => {
          // Validate service type exists in our keywords
          const isValid = s && s.type && s.name && serviceKeywords[s.type];
          if (!isValid && s?.type) {
            console.warn(`[AIAssistant] Unknown service type: ${s.type}, skipping`);
          }
          return isValid;
        })
        .map(s => ({
          step: s.step || 1,
          serviceType: s.type,
          serviceName: s.name,
          businesses: [] as BusinessRecommendation[],
          estimatedDuration: serviceKeywords[s.type]?.estimatedDuration || 30,
        }));
      
      // If all services were filtered out, try fallback one more time
      if (planSteps.length === 0) {
        console.warn('[AIAssistant] All services filtered out, trying fallback parsing');
        const fallbackSteps = parseMultiStepQuery(query);
        if (fallbackSteps.length > 0) {
          // Use fallback results
          const fallbackPlanSteps = fallbackSteps.map(step => ({
            step: step.step,
            serviceType: step.serviceType,
            serviceName: step.serviceName,
            businesses: [] as BusinessRecommendation[],
            estimatedDuration: serviceKeywords[step.serviceType]?.estimatedDuration || 30,
          }));
          
          // Continue with fallback plan steps
          const timePreference = extractTimePreference(query);
          
          if (fallbackPlanSteps.length > 1) {
            // Multi-step with fallback
            const fullPlan: PlanStep[] = [];
            for (const step of fallbackPlanSteps) {
              let results: any[] = [];
              try {
                const allBusinessesRes = await businessService.getAll();
                const allBusinesses = allBusinessesRes.data || [];
                const lowerCategory = step.serviceType.toLowerCase();
                results = allBusinesses.filter((b: any) => 
                  b.status === 'approved' && b.isActive &&
                  (b.category?.toLowerCase() === lowerCategory ||
                   b.category?.toLowerCase().includes(lowerCategory) ||
                   b.name?.toLowerCase().includes(step.serviceName.toLowerCase()))
                );
              } catch (err) {
                console.error('[AIAssistant] Error in fallback search:', err);
                results = [];
              }
              
              const businesses: BusinessRecommendation[] = await Promise.all(
                results.slice(0, 3).map(async (b: any) => {
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
              
              businesses.sort((a, b) => {
                if (b.rating !== a.rating) return b.rating - a.rating;
                return b.reviewCount - a.reviewCount;
              });
              
              fullPlan.push({ ...step, businesses });
            }
            
            setPlan(fullPlan);
            setShowPlan(true);
            toast.success(`Created a ${fullPlan.length}-step plan for you!`);
            setIsProcessing(false);
            return;
          } else {
            // Single service with fallback - continue to single service logic below
            planSteps.push(...fallbackPlanSteps);
          }
        } else {
          toast.error('Could not understand your request. Try: "haircut", "restaurant", "mechanic", etc.');
          setIsProcessing(false);
          return;
        }
      }
      
      const timePreference = parsedResult.timePreference;

      if (planSteps.length > 1) {
        // Multi-step request - create a plan
        const fullPlan: PlanStep[] = [];
        
        for (const step of planSteps) {
          // Search for businesses matching this step
          let results: any[] = [];
          
          try {
            console.log(`[AIAssistant] Searching for service type: ${step.serviceType}`);
            const searchResults = await businessService.search('', step.serviceType, '');
            results = searchResults.data || [];
            console.log(`[AIAssistant] Search returned ${results.length} businesses`);
          } catch (searchError: any) {
            console.warn(`[AIAssistant] Search failed, using getAll fallback:`, searchError.message);
            // Fallback to getAll and filter
            try {
              const allBusinessesRes = await businessService.getAll();
              const allBusinesses = allBusinessesRes.data || [];
              console.log(`[AIAssistant] getAll returned ${allBusinesses.length} total businesses`);
              const lowerCategory = step.serviceType.toLowerCase();
              results = allBusinesses.filter((b: any) => {
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
          if (step.serviceType) {
            console.log(`[AIAssistant] Searching for single service: ${step.serviceType}`);
            const searchResults = await businessService.search('', step.serviceType, '');
            results = searchResults.data || [];
            console.log(`[AIAssistant] Single service search returned ${results.length} businesses`);
          } else if (query.trim()) {
            console.log(`[AIAssistant] Searching with query: ${query}`);
            const searchResults = await businessService.search(query, '', '');
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
        const recommendations: BusinessRecommendation[] = await Promise.all(
          results
            .filter((b: any) => b.status === 'approved' && b.isActive)
            .slice(0, 5)
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
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-[#330007]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E7001E] rounded-full flex items-center justify-center shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{t('aiAssistant')}</h3>
              <p className="text-xs text-gray-300">{t('aiAssistantSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input Section */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('aiPlaceholder')}
              className="flex-1 px-4 py-3 border-2 border-[#E7001E] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#330007] focus:border-[#330007] bg-white"
              disabled={isProcessing}
            />
            <button
              onClick={handleSearch}
              disabled={!query.trim() || isProcessing}
              className="px-6 py-3 bg-[#E7001E] text-white rounded-lg hover:bg-[#330007] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg font-semibold"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {t('aiExamples')}
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
              <div className="w-12 h-12 border-4 border-[#E7001E] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[#330007] font-semibold">{t('aiFindingOptions')}</p>
              <p className="text-sm text-gray-500 mt-1">{t('aiPleaseWait')}</p>
            </div>
          ) : showPlan && plan.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4 bg-[#330007] p-3 rounded-lg">
                <ListChecks className="h-5 w-5 text-white" />
                <h4 className="font-semibold text-white text-lg">{t('aiYourPlan')}</h4>
              </div>
              {plan.map((step, index) => (
                <div key={step.step} className="border-2 border-[#E7001E] rounded-lg p-4 bg-white shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#330007] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 shadow-lg text-lg">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-[#330007] capitalize mb-1 text-lg">
                        {step.serviceName.replace('_', ' ')}
                      </h5>
                      {step.estimatedDuration && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>~{step.estimatedDuration} {t('aiMinutes')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {step.businesses.length > 0 ? (
                    <div className="space-y-2 ml-13">
                      {step.businesses.map((business) => (
                        <div key={business.id} className="bg-gray-50 rounded-lg p-3 border-2 border-gray-300 hover:border-[#E7001E] hover:bg-white transition-all shadow-sm hover:shadow-md">
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
                                    <span>{Number(business.rating || 0).toFixed(1)}</span>
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
                                  className="w-full text-left px-3 py-2 bg-white hover:bg-[#E7001E] rounded-lg border-2 border-[#E7001E] flex items-center justify-between group transition-all shadow-sm hover:shadow-md"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-[#330007] group-hover:text-white">{service.name}</p>
                                    <p className="text-xs text-gray-600 group-hover:text-gray-100">
                                      {service.duration} min • ${service.price.toFixed(2)}
                                    </p>
                                  </div>
                                  <ExternalLink className="h-4 w-4 text-[#E7001E] group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" />
                                </button>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => handleSelectBusiness(business.id)}
                            className="mt-2 text-sm text-[#E7001E] hover:text-[#330007] font-semibold hover:underline transition-colors"
                          >
                            {t('aiViewAllServices')}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 ml-11">{t('aiNoBusinesses')}</p>
                  )}
                </div>
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="space-y-3">
              <div className="bg-[#330007] p-3 rounded-lg mb-4">
                <h4 className="font-semibold text-white">
                  {t('aiRecommendedBusinesses')} ({recommendations.length})
                </h4>
              </div>
              {recommendations.map((business) => (
                <div
                  key={business.id}
                  className="border-2 border-[#E7001E] rounded-lg p-4 bg-white hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-gray-900">{business.name}</h5>
                        {business.rating > 0 && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <span className="text-yellow-500">★</span>
                            <span>{Number(business.rating || 0).toFixed(1)}</span>
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
                            <span>{t('aiAvailableNow')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectBusiness(business.id)}
                      className="ml-2 p-2 bg-[#E7001E] text-white hover:bg-[#330007] rounded-lg transition-all shadow-md"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {business.services && business.services.length > 0 && (
                    <div className="mt-3 pt-3 border-t-2 border-gray-200">
                      <p className="text-xs font-semibold text-[#330007] mb-2">{t('aiAvailableServices')}</p>
                      <div className="space-y-2">
                        {business.services.map((service) => (
                          <button
                            key={service.id}
                            onClick={() => handleBookService(service.id)}
                            className="w-full text-left px-3 py-2 bg-white hover:bg-[#E7001E] rounded-lg border-2 border-[#E7001E] flex items-center justify-between group transition-all shadow-sm hover:shadow-md"
                          >
                            <div>
                              <p className="text-sm font-semibold text-[#330007] group-hover:text-white">{service.name}</p>
                              <p className="text-xs text-gray-600 group-hover:text-gray-100">
                                {service.duration} min • ${service.price.toFixed(2)}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-[#E7001E] group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" />
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
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-[#330007] font-semibold mb-2">{t('aiNoResults')}</p>
              <p className="text-sm text-gray-500">
                {t('aiTrySearching')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-[#330007] rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <p className="text-[#330007] mb-2 font-bold text-lg">{t('aiHowCanIHelp')}</p>
              <p className="text-sm text-gray-600 max-w-md">
                {t('aiSearchExample')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
