import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, MapPin, Clock, ArrowRight, History, ExternalLink, RotateCcw } from 'lucide-react';
import { businessService, serviceService, aiService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency } from '../contexts/CurrencyContext';
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
  availableNow?: boolean;
  reviewSummary?: string;
  services?: Array<{ id: string; name: string; duration: number; price: number; priceMax?: number }>;
}

interface PlanStep {
  step: number;
  serviceType: string;
  serviceName: string;
  businesses: BusinessRecommendation[];
  estimatedDuration: number;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  recommendations?: BusinessRecommendation[];
  plan?: PlanStep[];
  options?: Array<{ id: string; label: string; value: any }>;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose }) => {
  const { formatPrice, formatPriceRange } = useCurrency();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationState, setConversationState] = useState<any>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('ai_recent_searches') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    if (isOpen && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const serviceKeywords: Record<string, { keywords: string[]; category: string; estimatedDuration: number }> = {
    beauty_salon_hair: { keywords: ['haircut', 'hair', 'barber', 'barbershop', 'cut', 'trim', 'styling'], category: 'beauty_salon', estimatedDuration: 30 },
    restaurant: { keywords: ['restaurant', 'food', 'eat', 'dining', 'meal', 'lunch', 'dinner', 'breakfast', 'cafe', 'pizza'], category: 'restaurant', estimatedDuration: 60 },
    mechanic: { keywords: ['mechanic', 'car', 'auto', 'repair', 'fix', 'vehicle', 'automotive', 'garage'], category: 'mechanic', estimatedDuration: 120 },
    tailor: { keywords: ['tailor', 'alteration', 'sew', 'clothing', 'tailoring'], category: 'tailor', estimatedDuration: 45 },
    fitness: { keywords: ['gym', 'fitness', 'workout', 'exercise', 'trainer', 'training'], category: 'fitness', estimatedDuration: 60 },
    healthcare: { keywords: ['doctor', 'health', 'medical', 'clinic', 'dentist', 'appointment'], category: 'healthcare', estimatedDuration: 30 },
    beauty_salon: { keywords: ['beauty', 'salon', 'spa', 'nails', 'manicure', 'pedicure', 'massage'], category: 'beauty_salon', estimatedDuration: 60 },
  };

  const typeAliases: Record<string, string> = {
    haircut: 'beauty_salon', hair: 'beauty_salon', barber: 'beauty_salon',
    auto: 'mechanic', car_repair: 'mechanic',
    gym: 'fitness', doctor: 'healthcare', medical: 'healthcare',
    food: 'restaurant', dining: 'restaurant',
  };
  const resolveType = (type: string) => typeAliases[type] || type;

  const suggestions = [
    lang === 'ro' ? 'Tunsoare în apropiere' : lang === 'ru' ? 'Стрижка рядом' : 'Haircut nearby',
    lang === 'ro' ? 'Restaurant diseară' : lang === 'ru' ? 'Ресторан на вечер' : 'Restaurant tonight',
    lang === 'ro' ? 'Sală de sport' : lang === 'ru' ? 'Спортзал рядом' : 'Gym nearby',
    lang === 'ro' ? 'Mecanic auto' : lang === 'ru' ? 'Автомеханик' : 'Car mechanic',
    lang === 'ro' ? 'Salon de frumusețe' : lang === 'ru' ? 'Салон красоты' : 'Beauty salon',
    lang === 'ro' ? 'Programare doctor' : lang === 'ru' ? 'Запись к врачу' : 'Doctor appointment',
  ];

  const addRecentSearch = useCallback((q: string) => {
    setRecentSearches(prev => {
      const updated = [q, ...prev.filter(s => s !== q)].slice(0, 5);
      sessionStorage.setItem('ai_recent_searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    sessionStorage.removeItem('ai_recent_searches');
  }, []);

  const parseMultiStepQuery = (userQuery: string): PlanStep[] => {
    const lowerQuery = userQuery.toLowerCase();
    const detected: PlanStep[] = [];
    let stepNum = 1;
    const splitKws = ['then', 'and then', 'after', 'after that', 'next', 'followed by', 'and'];
    const hasMultiple = splitKws.some(k => lowerQuery.includes(k));
    const parts = hasMultiple
      ? userQuery.split(new RegExp(`(${splitKws.join('|')})`, 'i')).filter(p => p.trim() && !splitKws.includes(p.toLowerCase().trim()))
      : [userQuery];

    for (const part of parts) {
      const lp = part.toLowerCase();
      for (const [key, cfg] of Object.entries(serviceKeywords)) {
        if (cfg.keywords.some(k => lp.includes(k))) {
          detected.push({ step: stepNum++, serviceType: key, serviceName: cfg.keywords.find(k => lp.includes(k)) || key, businesses: [], estimatedDuration: cfg.estimatedDuration });
          break;
        }
      }
    }
    if (detected.length === 0) {
      for (const [key, cfg] of Object.entries(serviceKeywords)) {
        if (cfg.keywords.some(k => lowerQuery.includes(k))) {
          detected.push({ step: 1, serviceType: key, serviceName: cfg.keywords.find(k => lowerQuery.includes(k)) || key, businesses: [], estimatedDuration: cfg.estimatedDuration });
          break;
        }
      }
    }
    return detected;
  };

  // Extract city/location from natural language query
  const extractLocation = (userQuery: string): string => {
    // Patterns: "in Bucharest", "near Ialoveni", "în București", "в Кишинёве", etc.
    const patterns = [
      /\b(?:in|near|at|around|from|within)\s+([A-ZĂÂÎȘȚ][a-zăâîșț]+(?:\s+[A-ZĂÂÎȘȚ][a-zăâîșț]+)*)/,
      /\b(?:în|la|din|lângă|aproape\s+de)\s+([A-ZĂÂÎȘȚ][a-zăâîșț]+(?:\s+[A-ZĂÂÎȘȚ][a-zăâîșț]+)*)/i,
      /\b(?:в|около|у|рядом\s+с|из)\s+([А-ЯЁа-яё]+(?:\s+[А-ЯЁа-яё]+)*)/i,
      // lowercase fallback: "in bucharest"
      /\b(?:in|near|at|around|from)\s+([a-zăâîșț]{3,}(?:\s+[a-zăâîșț]{3,})?)/i,
    ];
    for (const pattern of patterns) {
      const match = userQuery.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  };

  const fetchServices = async (businessId: string) => {
    try { const r = await serviceService.getByBusiness(businessId); return r.data || []; }
    catch { return []; }
  };

  const fetchReviewSummary = async (businessId: string): Promise<string> => {
    try { const r = await aiService.getReviewSummary(businessId, lang); return r.data?.summary || ''; }
    catch { return ''; }
  };

  const pushAssistant = (text: string, extras?: Partial<Message>) => {
    setMessages(prev => [...prev, { role: 'assistant', text, ...extras }]);
  };

  const handleSend = async (overrideQuery?: string) => {
    const input = (overrideQuery || query).trim();
    if (!input || isProcessing) return;

    setQuery('');
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setIsProcessing(true);

    const isGreeting = /^(hello|hi|hey|salut|bun[aă]|привет|здравствуйте|hei|yo|sup)\b/i.test(input);
    if (!isGreeting) addRecentSearch(input);

    try {
      // Greeting
      if (isGreeting) {
        await new Promise(r => setTimeout(r, 400));
        pushAssistant(t('aiGreeting'));
        return;
      }

      // Step 1: AI parse query
      let parsedServices: Array<{ type: string; name: string; step: number }> = [];
      let timePreference = 'soon';

      try {
        const aiRes = await Promise.race([
          aiService.parseQuery(input, lang),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]) as any;
        const data = aiRes?.data;
        if (data?.services?.length > 0) {
          parsedServices = data.services.filter((s: any) => s?.type && s?.name);
          timePreference = data.timePreference || 'soon';
        }
      } catch { /* fall through to keyword match */ }

      // Step 2: Keyword fallback
      if (parsedServices.length === 0) {
        const kwSteps = parseMultiStepQuery(input);
        parsedServices = kwSteps.map(s => ({ type: s.serviceType, name: s.serviceName, step: s.step }));
      }

      // Step 3: Build resolved plan steps
      const planSteps: PlanStep[] = parsedServices
        .map(s => {
          const resolved = resolveType(s.type);
          const kw = serviceKeywords[resolved] || serviceKeywords[s.type];
          if (!kw) return null;
          return { step: s.step || 1, serviceType: kw.category, serviceName: s.name, businesses: [] as BusinessRecommendation[], estimatedDuration: kw.estimatedDuration };
        })
        .filter(Boolean) as PlanStep[];

      // Extract location from the full query (e.g. "in Bucharest")
      const location = extractLocation(input);

      // Step 4: No services detected → try conversational AI chat
      if (planSteps.length === 0) {
        try {
          const chatRes = await aiService.chat(input, conversationState, lang);
          const data = chatRes.data;
          setConversationState(data.conversationState || {});
          pushAssistant(data.response, { options: data.options });
        } catch {
          // Last resort: general text search
          try {
            const r = await businessService.search(input, '', location);
            const results = (r.data || []).filter((b: any) => b.status === 'approved' && b.isActive).slice(0, 5);
            if (results.length > 0) {
              const recs: BusinessRecommendation[] = results.map((b: any) => ({ id: b.id, name: b.name, category: b.category, address: b.address, city: b.city, state: b.state, rating: b.rating || 0, reviewCount: b.reviewCount || 0, availableNow: false }));
              pushAssistant(`${t('aiFound')} ${recs.length} ${recs.length === 1 ? t('aiBusiness') : t('aiBusinesses')}:`, { recommendations: recs });
            } else {
              pushAssistant(t('aiCouldNotUnderstand'));
            }
          } catch {
            pushAssistant(t('aiCouldNotUnderstand'));
          }
        }
        return;
      }

      // Step 5: Multi-step plan
      if (planSteps.length > 1) {
        const fullPlan: PlanStep[] = [];
        for (const step of planSteps) {
          let results: any[] = [];
          try { const r = await businessService.search('', step.serviceType, location); results = r.data || []; } catch { results = []; }
          const businesses: BusinessRecommendation[] = await Promise.all(
            results.filter((b: any) => b.status === 'approved' && b.isActive).slice(0, 3).map(async (b: any) => {
              const svcs = await fetchServices(b.id);
              return { id: b.id, name: b.name, category: b.category, address: b.address, city: b.city, state: b.state, rating: b.rating || 0, reviewCount: b.reviewCount || 0, availableNow: timePreference === 'now', services: svcs.slice(0, 3).map((s: any) => ({ id: s.id, name: s.name, duration: s.duration || step.estimatedDuration, price: Number(s.price) || 0 })) };
            })
          );
          businesses.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
          fullPlan.push({ ...step, businesses });
        }
        pushAssistant(`${t('aiCreatedPlan')} (${fullPlan.length} ${t('aiSteps')}):`, { plan: fullPlan });
        return;
      }

      // Step 6: Single service search
      const step = planSteps[0];
      let results: any[] = [];
      try { const r = await businessService.search('', step.serviceType, location); results = r.data || []; } catch { results = []; }

      const recs: BusinessRecommendation[] = await Promise.all(
        results.filter((b: any) => b.status === 'approved' && b.isActive).slice(0, 5).map(async (b: any) => {
          const [svcs, reviewSummary] = await Promise.all([fetchServices(b.id), fetchReviewSummary(b.id)]);
          return { id: b.id, name: b.name, category: b.category, address: b.address, city: b.city, state: b.state, rating: b.rating || 0, reviewCount: b.reviewCount || 0, availableNow: timePreference === 'now', reviewSummary, services: svcs.slice(0, 3).map((s: any) => ({ id: s.id, name: s.name, duration: s.duration || 30, price: Number(s.price) || 0 })) };
        })
      );
      recs.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);

      const locationLabel = location ? ` in ${location}` : '';
      if (recs.length === 0) {
        pushAssistant(location ? `No businesses found for "${step.serviceName}" in ${location}.` : t('aiNoBusinessesFound'));
      } else {
        pushAssistant(`${t('aiFound')} ${recs.length} ${recs.length === 1 ? t('aiBusiness') : t('aiBusinesses')} for "${step.serviceName}"${locationLabel}:`, { recommendations: recs });
      }
    } catch (err: any) {
      pushAssistant(t('aiSearchFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOptionClick = async (option: { id: string; label: string; value: any }) => {
    if (isProcessing) return;
    setMessages(prev => [...prev, { role: 'user', text: option.label }]);
    setIsProcessing(true);
    try {
      const updatedState = { ...conversationState };
      if (option.value?.businessId) updatedState.selectedBusinessId = option.value.businessId;
      if (option.value?.serviceId) updatedState.selectedServiceId = option.value.serviceId;
      const res = await aiService.chat(option.label, updatedState, lang);
      const data = res.data;
      setConversationState(data.conversationState || {});
      pushAssistant(data.response, { options: data.options });
      if (data.action?.type === 'create_booking') {
        try {
          const { bookingService } = await import('../services/api');
          await bookingService.create({ serviceId: data.action.data.serviceId, appointmentDate: data.action.data.appointmentDate });
          toast.success(t('aiBookingConfirmed'));
        } catch { toast.error(t('aiBookingFailed')); }
      }
    } catch {
      pushAssistant(t('aiChatError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectBusiness = (id: string) => { navigate(`/businesses/${id}`); onClose(); };
  const handleBookService = (id: string) => { navigate(`/book/${id}`); onClose(); };
  const clearChat = () => { setMessages([]); setConversationState({}); };

  if (!isOpen) return null;
  const isWelcome = messages.length === 0 && !isProcessing;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#330007] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#E7001E] rounded-full flex items-center justify-center shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white leading-tight">{t('aiAssistant')}</h3>
              <p className="text-xs text-gray-400">{t('aiAssistantSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={clearChat} className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10" title="New chat">
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages / Welcome */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {isWelcome ? (
            /* ── Welcome state ── */
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-16 h-16 bg-[#330007] rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <p className="text-[#330007] font-bold text-lg mb-1">{t('aiHowCanIHelp')}</p>
              <p className="text-sm text-gray-500 max-w-sm mb-6">{t('aiSearchExample')}</p>

              {/* Suggestion chips */}
              <div className="w-full max-w-md mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('aiSuggestions')}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="px-4 py-2 bg-white border-2 border-[#E7001E] text-[#330007] rounded-full text-sm font-medium hover:bg-[#E7001E] hover:text-white transition-colors shadow-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div className="w-full max-w-md">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5" />
                      {t('aiRecentSearches')}
                    </p>
                    <button onClick={clearRecentSearches} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                      {t('aiClearHistory')}
                    </button>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {recentSearches.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(s)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                      >
                        <History className="h-3 w-3 text-gray-400" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Chat thread ── */
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-[#330007] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                    {/* Text bubble */}
                    <div className={`rounded-2xl px-4 py-2.5 ${msg.role === 'user' ? 'bg-[#E7001E] text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                      {/* Booking options inside bubble */}
                      {msg.options && msg.options.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {msg.options.map((opt, j) => (
                            <button
                              key={j}
                              onClick={() => handleOptionClick(opt)}
                              className="w-full text-left px-3 py-2 bg-white hover:bg-[#E7001E] hover:text-white rounded-lg border border-gray-200 text-sm font-medium transition-colors text-gray-800"
                            >
                              {j + 1}. {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Business recommendations (below bubble) */}
                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div className="mt-2 w-full space-y-2">
                        {msg.recommendations.map(b => (
                          <BusinessCard
                            key={b.id}
                            business={b}
                            onSelect={handleSelectBusiness}
                            onBook={handleBookService}
                            formatPrice={formatPrice}
                            formatPriceRange={formatPriceRange}
                            t={t}
                          />
                        ))}
                      </div>
                    )}

                    {/* Multi-step plan (below bubble) */}
                    {msg.plan && msg.plan.length > 0 && (
                      <div className="mt-2 w-full space-y-3">
                        {msg.plan.map(step => (
                          <div key={step.step} className="border-2 border-[#E7001E] rounded-xl p-3 bg-white shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 bg-[#330007] text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {step.step}
                              </div>
                              <div>
                                <h5 className="font-bold text-[#330007] capitalize text-sm leading-tight">{step.serviceName.replace(/_/g, ' ')}</h5>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />~{step.estimatedDuration} {t('aiMinutes')}
                                </p>
                              </div>
                            </div>
                            {step.businesses.length > 0 ? (
                              <div className="space-y-2 pl-9">
                                {step.businesses.map(b => (
                                  <BusinessCard
                                    key={b.id}
                                    business={b}
                                    onSelect={handleSelectBusiness}
                                    onBook={handleBookService}
                                    formatPrice={formatPrice}
                                    formatPriceRange={formatPriceRange}
                                    t={t}
                                    compact
                                  />
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 pl-9">{t('aiNoBusinesses')}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isProcessing && (
                <div className="flex justify-start gap-2">
                  <div className="w-8 h-8 bg-[#330007] rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1.5 items-center h-4">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0 bg-white">
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={t('aiPlaceholder')}
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 focus:border-[#E7001E] rounded-xl focus:outline-none bg-gray-50 text-sm transition-colors"
              disabled={isProcessing}
            />
            <button
              onClick={() => handleSend()}
              disabled={!query.trim() || isProcessing}
              className="w-10 h-10 bg-[#E7001E] text-white rounded-xl hover:bg-[#330007] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-md flex-shrink-0"
            >
              {isProcessing
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 text-center">{t('aiExamples')}</p>
        </div>
      </div>
    </div>
  );
};

// ── Business Card ─────────────────────────────────────────────────

const BusinessCard: React.FC<{
  business: BusinessRecommendation;
  onSelect: (id: string) => void;
  onBook: (id: string) => void;
  formatPrice: (n: number) => string;
  formatPriceRange: (min: number, max: number) => string;
  t: (key: string) => string;
  compact?: boolean;
}> = ({ business, onSelect, onBook, formatPrice, formatPriceRange, t, compact }) => (
  <div className={`rounded-xl border-2 bg-white transition-all hover:shadow-md ${compact ? 'border-gray-200 p-2.5' : 'border-[#E7001E] p-3'}`}>
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h6 className="font-semibold text-gray-900 text-sm">{business.name}</h6>
          {business.rating > 0 && (
            <span className="text-xs text-gray-500 flex items-center gap-0.5">
              <span className="text-yellow-500">★</span>
              {Number(business.rating).toFixed(1)}
              {business.reviewCount > 0 && <span className="text-gray-400 ml-0.5">({business.reviewCount})</span>}
            </span>
          )}
          {business.availableNow && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
              <Clock className="h-3 w-3" />{t('aiAvailableNow')}
            </span>
          )}
        </div>
        {!compact && (
          <p className="text-xs text-gray-500 capitalize mt-0.5">{business.category.replace(/_/g, ' ')}</p>
        )}
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          {business.city}{business.state ? `, ${business.state}` : ''}
        </p>
      </div>
      <button
        onClick={() => onSelect(business.id)}
        className="ml-2 p-1.5 bg-[#E7001E] text-white hover:bg-[#330007] rounded-lg transition-all flex-shrink-0"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>

    {/* Review summary */}
    {business.reviewSummary && (
      <p className="text-xs italic text-gray-400 mt-1.5 pl-1 border-l-2 border-gray-200 leading-relaxed">
        "{business.reviewSummary}"
      </p>
    )}

    {/* Services */}
    {business.services && business.services.length > 0 && (
      <div className={`space-y-1 ${compact ? 'mt-2' : 'mt-2 pt-2 border-t border-gray-100'}`}>
        {!compact && <p className="text-xs font-semibold text-[#330007] mb-1">{t('aiAvailableServices')}</p>}
        {business.services.map(svc => (
          <button
            key={svc.id}
            onClick={() => onBook(svc.id)}
            className="w-full text-left px-2.5 py-1.5 bg-gray-50 hover:bg-[#E7001E] rounded-lg border border-gray-200 flex items-center justify-between group transition-all"
          >
            <div>
              <p className="text-xs font-medium text-gray-800 group-hover:text-white">{svc.name}</p>
              <p className="text-xs text-gray-500 group-hover:text-gray-100">
                {svc.duration} min · {svc.priceMax != null && Number(svc.priceMax) > Number(svc.price) ? formatPriceRange(Number(svc.price), Number(svc.priceMax)) : formatPrice(Number(svc.price || 0))}
              </p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-white flex-shrink-0" />
          </button>
        ))}
      </div>
    )}
  </div>
);
