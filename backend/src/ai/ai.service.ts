import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import axios from 'axios';
import { Review } from '../reviews/entities/review.entity';
import { Business } from '../businesses/entities/business.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Service } from '../services/entities/service.entity';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly apiKey: string;
  private readonly useAI: boolean;
  private readonly reviewSummaryCache = new Map<string, { summary: string; cachedAt: Date }>();

  constructor(
    private configService: ConfigService,
    @InjectRepository(Review) private reviewRepository: Repository<Review>,
    @InjectRepository(Business) private businessRepository: Repository<Business>,
    @InjectRepository(Booking) private bookingRepository: Repository<Booking>,
    @InjectRepository(Service) private serviceRepository: Repository<Service>,
  ) {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    const hfKey = this.configService.get<string>('HUGGINGFACE_API_KEY') || process.env.HUGGINGFACE_API_KEY;

    this.apiKey = geminiKey || hfKey || '';
    this.useAI = !!this.apiKey;

    if (!this.useAI) {
      this.logger.warn('No AI API key found. Add GEMINI_API_KEY or HUGGINGFACE_API_KEY to .env');
    } else {
      const provider = (this.configService.get<string>('AI_PROVIDER') || process.env.AI_PROVIDER || 'auto').toLowerCase();
      this.logger.log(`AI enabled. Provider: ${provider}`);
      if (geminiKey) this.logger.log('   - Gemini (Google) available');
      if (hfKey) this.logger.log('   - Hugging Face available');
    }
  }

  // ─── Shared AI caller ─────────────────────────────────────────────

  private async callAI(prompt: string): Promise<string> {
    const provider = (this.configService.get<string>('AI_PROVIDER') || process.env.AI_PROVIDER || 'auto').toLowerCase();
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    const hfKey = this.configService.get<string>('HUGGINGFACE_API_KEY');

    const tryOrder: Array<'gemini' | 'huggingface'> =
      provider === 'huggingface' ? ['huggingface'] :
      provider === 'gemini' ? ['gemini'] :
      ['gemini', 'huggingface'];

    let lastError: any = null;
    for (const p of tryOrder) {
      try {
        if (p === 'gemini' && geminiKey) {
          return await this.callGemini(prompt, geminiKey);
        }
        if (p === 'huggingface' && hfKey) {
          return await this.callHuggingFace(prompt, hfKey);
        }
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`[callAI] ${p} failed: ${err.message}`);
      }
    }
    throw lastError || new Error('No AI provider available');
  }

  private async callGemini(prompt: string, apiKey: string): Promise<string> {
    const availableModels = await this.listAvailableModels(apiKey);
    if (availableModels.length === 0) throw new Error('No Gemini models available');

    const useV1Beta = availableModels.some(m => m.includes('latest') || !m.includes('-00'));
    const apiVersion = useV1Beta ? 'v1beta' : 'v1';

    for (const model of availableModels.slice(0, 3)) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`;
        const isV1Beta = apiVersion === 'v1beta';
        const requestConfig = isV1Beta
          ? { url: endpoint, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey } }
          : { url: `${endpoint}?key=${apiKey}`, headers: { 'Content-Type': 'application/json' } };

        const response = await axios.post(
          requestConfig.url,
          { contents: [{ parts: [{ text: prompt }] }] },
          { headers: requestConfig.headers, timeout: 15000 },
        );

        return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (error: any) {
        if (error.response?.status !== 404) throw error;
      }
    }
    throw new Error('All Gemini models returned 404');
  }

  private async callHuggingFace(prompt: string, hfKey: string): Promise<string> {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      { inputs: prompt, parameters: { max_new_tokens: 300, return_full_text: false } },
      { headers: { 'Authorization': `Bearer ${hfKey}`, 'Content-Type': 'application/json' }, timeout: 15000 },
    );
    return response.data[0]?.generated_text || '';
  }

  // ─── Parse Query (Feature 3: language param) ─────────────────────

  async parseQuery(userQuery: string, language: string = 'en'): Promise<{
    services: Array<{ type: string; name: string; step: number }>;
    timePreference: string;
    specificDate?: string | null;
    intent: string;
    isMultiStep: boolean;
    filters?: {
      priceRange: string;
      minRating: number | null;
      maxDistance: number | null;
      location: string | null;
      features: string[];
    };
  }> {
    if (!this.useAI) {
      throw new Error('AI service is not configured. Add GEMINI_API_KEY or HUGGINGFACE_API_KEY to .env');
    }

    const langInstruction = language === 'ro'
      ? 'IMPORTANT: Write the "intent" field in Romanian.'
      : language === 'ru'
      ? 'IMPORTANT: Write the "intent" field in Russian.'
      : 'Write the "intent" field in English.';

    const prompt = `You are an intelligent booking assistant for a multi-service booking platform called BUKKi. Your task is to parse user queries and extract detailed booking intent with filters and preferences.

CONTEXT:
- Users can book services like haircuts, restaurants, mechanics, tailors, gyms, healthcare, and beauty salons
- Users may request multiple services in sequence (e.g., "fix my car then eat")
- Users can specify filters like price range, ratings, distance, location, date/time, and special requirements

USER QUERY: "${userQuery}"

${langInstruction}

SERVICE CATEGORIES (MUST use exact database category names):
- "beauty_salon" - hair services, beauty, spa, nails, manicure, pedicure, massage
- "restaurant" - food, dining, eating, meals, cafes, fast food, fine dining
- "mechanic" - car repair, auto service, vehicle maintenance
- "tailor" - clothing alterations, tailoring, sewing
- "fitness" - gym, workout, exercise, personal training, yoga
- "healthcare" - doctor, medical, clinic, dentist, pharmacy
- "education" - schools, tutoring, courses, training
- "consulting" - professional services, legal, accounting
- "other" - any other services

TIME PREFERENCES: "now", "today", "tomorrow", "this_week", "next_week", "specific_date", "soon" (default)

FILTERS TO EXTRACT:
- priceRange: "cheap", "moderate", "expensive", "any" (default)
- minRating: number 1-5 or null
- maxDistance: number in km or null
- location: string or null
- features: array e.g. ["wheelchair_accessible", "parking", "outdoor_seating", "wifi", "air_conditioned"]

EXAMPLES:
"I need a haircut" → {"services": [{"type": "beauty_salon", "name": "haircut", "step": 1}], "timePreference": "soon", "intent": "Book a haircut appointment", "isMultiStep": false, "filters": {"priceRange": "any", "minRating": null, "maxDistance": null, "location": null, "features": []}}
"haircut then lunch, both nearby" → {"services": [{"type": "beauty_salon", "name": "haircut", "step": 1}, {"type": "restaurant", "name": "lunch", "step": 2}], "timePreference": "soon", "intent": "Get haircut then have lunch nearby", "isMultiStep": true, "filters": {"priceRange": "any", "minRating": null, "maxDistance": 3, "location": null, "features": []}}
"5 star restaurant with outdoor seating for Friday" → {"services": [{"type": "restaurant", "name": "fine dining", "step": 1}], "timePreference": "specific_date", "specificDate": "Friday", "intent": "Book high-end restaurant for Friday", "isMultiStep": false, "filters": {"priceRange": "expensive", "minRating": 5, "maxDistance": null, "location": null, "features": ["outdoor_seating"]}}

OUTPUT: Return ONLY valid JSON. Use exact service type names. Include all fields: services, timePreference, intent, isMultiStep, filters. Use null for unspecified filter values.

Return the JSON now:`;

    try {
      const text = await this.callAI(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          services: parsed.services || [],
          timePreference: parsed.timePreference || 'soon',
          specificDate: parsed.specificDate || null,
          intent: parsed.intent || userQuery,
          isMultiStep: parsed.isMultiStep || false,
          filters: parsed.filters || { priceRange: 'any', minRating: null, maxDistance: null, location: null, features: [] },
        };
      }
      throw new Error('AI did not return valid JSON');
    } catch (error: any) {
      this.logger.error('[parseQuery] Failed:', error.message);
      throw error;
    }
  }

  // ─── Feature 5: Smart Time Slot Suggestions ───────────────────────

  async getSmartSlots(serviceId: string, days: number = 7): Promise<{
    bestTimes: Array<{ day: string; dayName: string; time: string; score: number }>;
  }> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      relations: ['business'],
    });
    if (!service) throw new Error('Service not found');

    const business = service.business;
    const duration = service.duration || 30;

    // Get existing bookings for the next N days
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const bookings = await this.bookingRepository.find({
      where: {
        service: { id: serviceId },
        status: In(['confirmed', 'pending']),
      },
    });

    // Count bookings per hour to find peak times
    const hourCounts: Record<number, number> = {};
    for (const booking of bookings) {
      const hour = new Date(booking.appointmentDate).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    const maxCount = Math.max(...Object.values(hourCounts), 1);

    // Parse working hours
    let workingHours: any = business.workingHours;
    if (typeof workingHours === 'string') {
      try { workingHours = JSON.parse(workingHours); } catch { workingHours = null; }
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const bestTimes: Array<{ day: string; dayName: string; time: string; score: number }> = [];

    for (let d = 1; d <= days; d++) {
      const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      const dayName = dayNames[date.getDay()];
      const dayStr = date.toISOString().split('T')[0];

      // Get working hours for this day
      const dayHours = workingHours?.[dayName];
      if (!dayHours?.isOpen) continue;

      const [openH, openM] = (dayHours.openTime || '09:00').split(':').map(Number);
      const [closeH, closeM] = (dayHours.closeTime || '17:00').split(':').map(Number);
      const openMin = openH * 60 + (openM || 0);
      const closeMin = closeH * 60 + (closeM || 0);

      // Generate slots
      for (let min = openMin; min + duration <= closeMin; min += 30) {
        const hour = Math.floor(min / 60);
        const minute = min % 60;
        const hourCount = hourCounts[hour] || 0;
        const score = Math.round(((maxCount - hourCount) / maxCount) * 100);
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        // Check if slot is already booked
        const slotStart = new Date(`${dayStr}T${time}:00`);
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);
        const isBooked = bookings.some(b => {
          const bStart = new Date(b.appointmentDate);
          const bEnd = new Date(bStart.getTime() + duration * 60000);
          return slotStart < bEnd && slotEnd > bStart && bStart.toISOString().startsWith(dayStr);
        });

        if (!isBooked) {
          bestTimes.push({ day: dayStr, dayName, time, score });
        }
      }
    }

    // Sort by score (highest = least busy), take top 5
    bestTimes.sort((a, b) => b.score - a.score);
    return { bestTimes: bestTimes.slice(0, 5) };
  }

  // ─── Feature 6: Review Summarization ──────────────────────────────

  async summarizeReviews(businessId: string, language: string = 'en'): Promise<{
    summary: string;
    avgRating: number;
    totalReviews: number;
    cachedAt?: string;
  }> {
    // Check cache (24h TTL)
    const cacheKey = `${businessId}:${language}`;
    const cached = this.reviewSummaryCache.get(cacheKey);
    if (cached && (Date.now() - cached.cachedAt.getTime()) < 24 * 60 * 60 * 1000) {
      const business = await this.businessRepository.findOne({ where: { id: businessId } });
      return {
        summary: cached.summary,
        avgRating: Number(business?.rating || 0),
        totalReviews: business?.reviewCount || 0,
        cachedAt: cached.cachedAt.toISOString(),
      };
    }

    const reviews = await this.reviewRepository.find({
      where: { business: { id: businessId } },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const business = await this.businessRepository.findOne({ where: { id: businessId } });
    if (!business) throw new Error('Business not found');

    if (reviews.length < 3) {
      return {
        summary: '',
        avgRating: Number(business.rating || 0),
        totalReviews: reviews.length,
      };
    }

    if (!this.useAI) {
      return {
        summary: '',
        avgRating: Number(business.rating || 0),
        totalReviews: reviews.length,
      };
    }

    const langName = language === 'ro' ? 'Romanian' : language === 'ru' ? 'Russian' : 'English';
    const reviewTexts = reviews
      .filter(r => r.comment)
      .map(r => `[${r.rating}/5] ${r.comment}`)
      .slice(0, 20)
      .join('\n');

    const prompt = `Summarize these customer reviews for "${business.name}" in exactly 2 sentences. Focus on what customers liked most and what could improve. Respond in ${langName}.\n\nReviews:\n${reviewTexts}\n\nSummary (2 sentences only):`;

    try {
      const text = await this.callAI(prompt);
      const summary = text.replace(/```/g, '').trim().split('\n').filter(l => l.trim()).slice(0, 2).join(' ');

      this.reviewSummaryCache.set(cacheKey, { summary, cachedAt: new Date() });

      return {
        summary,
        avgRating: Number(business.rating || 0),
        totalReviews: reviews.length,
        cachedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error('[summarizeReviews] AI failed:', error.message);
      return {
        summary: '',
        avgRating: Number(business.rating || 0),
        totalReviews: reviews.length,
      };
    }
  }

  // ─── Feature 7: Similar Business Recommendations ──────────────────

  async findSimilarBusinesses(businessId: string, limit: number = 3): Promise<any[]> {
    const source = await this.businessRepository.findOne({ where: { id: businessId } });
    if (!source) throw new Error('Business not found');

    const candidates = await this.businessRepository.find({
      where: { status: 'approved' as any, isActive: true },
      relations: ['services'],
    });

    const scored = candidates
      .filter(b => b.id !== businessId)
      .map(b => {
        let score = 0;
        const reasons: string[] = [];
        if (b.category === source.category) { score += 3; reasons.push('same_category'); }
        if (b.city && b.city === source.city) { score += 2; reasons.push('same_city'); }
        if (b.priceRange && b.priceRange === source.priceRange) { score += 1; reasons.push('same_price'); }
        if (Math.abs(Number(b.rating || 0) - Number(source.rating || 0)) <= 1) { score += 1; reasons.push('similar_rating'); }
        return { ...b, similarityScore: score, matchReasons: reasons };
      })
      .filter(b => b.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    return scored.map(b => ({
      id: b.id,
      name: b.name,
      category: b.category,
      city: b.city,
      state: b.state,
      rating: b.rating,
      reviewCount: b.reviewCount,
      priceRange: b.priceRange,
      matchReasons: b.matchReasons,
      services: (b.services || []).slice(0, 3).map(s => ({
        id: s.id,
        name: s.name,
        duration: s.duration,
        price: s.price,
      })),
    }));
  }

  // ─── Feature 10: Personalized Recommendations ─────────────────────

  async getPersonalizedRecommendations(userId: string, category?: string, limit: number = 5): Promise<any[]> {
    // Get user's past bookings (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const pastBookings = await this.bookingRepository.find({
      where: {
        customer: { id: userId },
        status: In(['completed', 'confirmed'] as any[]),
      },
      relations: ['service', 'business'],
      order: { appointmentDate: 'DESC' },
      take: 50,
    });

    // Extract user patterns
    const categoryCounts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};
    const visitedBusinessIds = new Set<string>();
    let totalPrice = 0;
    let priceCount = 0;

    for (const booking of pastBookings) {
      if (booking.business?.category) {
        categoryCounts[booking.business.category] = (categoryCounts[booking.business.category] || 0) + 1;
      }
      if (booking.business?.city) {
        cityCounts[booking.business.city] = (cityCounts[booking.business.city] || 0) + 1;
      }
      if (booking.business?.id) {
        visitedBusinessIds.add(booking.business.id);
      }
      if (booking.service?.price) {
        totalPrice += Number(booking.service.price);
        priceCount++;
      }
    }

    const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const avgPrice = priceCount > 0 ? totalPrice / priceCount : 0;

    // Get candidate businesses
    const qb = this.businessRepository.createQueryBuilder('b')
      .leftJoinAndSelect('b.services', 'service')
      .where('b.status = :status', { status: 'approved' })
      .andWhere('b.isActive = true');

    if (category) {
      qb.andWhere('b.category = :category', { category });
    }

    const candidates = await qb.getMany();

    // Score each business
    const scored = candidates.map(b => {
      let score = 0;
      const reasons: string[] = [];

      // Category match
      const catRank = topCategories.indexOf(b.category);
      if (catRank === 0) { score += 4; reasons.push('top_category'); }
      else if (catRank > 0 && catRank < 3) { score += 2; reasons.push('preferred_category'); }

      // City match
      const cityRank = topCities.indexOf(b.city);
      if (cityRank === 0) { score += 3; reasons.push('your_area'); }
      else if (cityRank > 0) { score += 1; reasons.push('nearby_area'); }

      // Previously visited
      if (visitedBusinessIds.has(b.id)) { score += 2; reasons.push('previously_visited'); }

      // Rating boost
      if (Number(b.rating || 0) >= 4) { score += 1; reasons.push('highly_rated'); }

      // Price match
      if (avgPrice > 0 && b.services?.length) {
        const avgServicePrice = b.services.reduce((sum, s) => sum + Number(s.price || 0), 0) / b.services.length;
        if (Math.abs(avgServicePrice - avgPrice) / avgPrice < 0.3) { score += 1; reasons.push('matches_budget'); }
      }

      return { business: b, score, reasons };
    });

    // Cold-start: if fewer than 3 bookings, use popularity
    if (pastBookings.length < 3) {
      scored.forEach(s => {
        s.score = Number(s.business.rating || 0) * 2 + (s.business.reviewCount || 0) * 0.1;
        s.reasons = ['popular'];
      });
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(s => ({
      id: s.business.id,
      name: s.business.name,
      category: s.business.category,
      city: s.business.city,
      state: s.business.state,
      rating: s.business.rating,
      reviewCount: s.business.reviewCount,
      priceRange: s.business.priceRange,
      matchReasons: s.reasons,
      services: (s.business.services || []).slice(0, 3).map(svc => ({
        id: svc.id,
        name: svc.name,
        duration: svc.duration,
        price: svc.price,
      })),
    }));
  }

  // ─── Feature 8: Conversational Booking ────────────────────────────

  async chat(userId: string, message: string, state: any, language: string = 'en'): Promise<{
    response: string;
    conversationState: any;
    options?: Array<{ id: string; label: string; value: any }>;
    action?: { type: string; data: any };
  }> {
    const step = state?.step || 'initial';

    if (step === 'initial') {
      // Parse the user's intent
      try {
        const parsed = await this.parseQuery(message, language);
        if (parsed.services.length === 0) {
          return {
            response: this.getLocalizedText('noServiceDetected', language),
            conversationState: { step: 'initial' },
          };
        }

        const serviceType = parsed.services[0].type;
        const businesses = await this.businessRepository.find({
          where: { category: serviceType as any, status: 'approved' as any, isActive: true },
          relations: ['services'],
          take: 5,
        });

        if (businesses.length === 0) {
          return {
            response: this.getLocalizedText('noBusinessesFound', language),
            conversationState: { step: 'initial' },
          };
        }

        const options = businesses.map((b, i) => ({
          id: b.id,
          label: `${b.name} ${b.rating ? `(★${Number(b.rating).toFixed(1)})` : ''}`,
          value: { businessId: b.id, businessName: b.name },
        }));

        return {
          response: this.getLocalizedText('pickBusiness', language).replace('{service}', parsed.services[0].name),
          conversationState: {
            step: 'business_picking',
            intent: parsed,
            businessOptions: businesses.map(b => ({ id: b.id, name: b.name })),
          },
          options,
        };
      } catch {
        return {
          response: this.getLocalizedText('parseError', language),
          conversationState: { step: 'initial' },
        };
      }
    }

    if (step === 'business_picking') {
      // User picks a business
      const businessId = state.selectedBusinessId || this.resolveSelection(message, state.businessOptions);
      if (!businessId) {
        return {
          response: this.getLocalizedText('invalidSelection', language),
          conversationState: state,
          options: state.businessOptions?.map((b: any, i: number) => ({
            id: b.id,
            label: b.name,
            value: { businessId: b.id },
          })),
        };
      }

      const business = await this.businessRepository.findOne({
        where: { id: businessId },
        relations: ['services'],
      });
      if (!business) {
        return { response: this.getLocalizedText('businessNotFound', language), conversationState: { step: 'initial' } };
      }

      const activeServices = (business.services || []).filter(s => s.isActive);
      const options = activeServices.slice(0, 5).map(s => ({
        id: s.id,
        label: `${s.name} (${s.duration}min, ${s.price})`,
        value: { serviceId: s.id, serviceName: s.name },
      }));

      return {
        response: this.getLocalizedText('pickService', language).replace('{business}', business.name),
        conversationState: {
          step: 'service_picking',
          businessId,
          businessName: business.name,
          serviceOptions: activeServices.slice(0, 5).map(s => ({ id: s.id, name: s.name })),
        },
        options,
      };
    }

    if (step === 'service_picking') {
      const serviceId = state.selectedServiceId || this.resolveSelection(message, state.serviceOptions);
      if (!serviceId) {
        return {
          response: this.getLocalizedText('invalidSelection', language),
          conversationState: state,
        };
      }

      return {
        response: this.getLocalizedText('pickTime', language),
        conversationState: {
          step: 'time_picking',
          businessId: state.businessId,
          businessName: state.businessName,
          serviceId,
        },
      };
    }

    if (step === 'time_picking') {
      // Parse the time from user message
      const timeMatch = message.match(/(\d{1,2})[:\.]?(\d{2})?\s*(am|pm)?/i);
      const dateMatch = message.match(/tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i);

      let appointmentDate = new Date();
      if (dateMatch) {
        const day = dateMatch[0].toLowerCase();
        if (day === 'tomorrow') {
          appointmentDate.setDate(appointmentDate.getDate() + 1);
        } else {
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const targetDay = dayNames.indexOf(day);
          const currentDay = appointmentDate.getDay();
          const diff = (targetDay - currentDay + 7) % 7 || 7;
          appointmentDate.setDate(appointmentDate.getDate() + diff);
        }
      }

      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        if (timeMatch[3]?.toLowerCase() === 'pm' && hours < 12) hours += 12;
        if (timeMatch[3]?.toLowerCase() === 'am' && hours === 12) hours = 0;
        appointmentDate.setHours(hours, minutes, 0, 0);
      }

      const dateStr = appointmentDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      const timeStr = appointmentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      return {
        response: this.getLocalizedText('confirmBooking', language)
          .replace('{business}', state.businessName)
          .replace('{date}', dateStr)
          .replace('{time}', timeStr),
        conversationState: {
          step: 'confirming',
          businessId: state.businessId,
          businessName: state.businessName,
          serviceId: state.serviceId,
          appointmentDate: appointmentDate.toISOString(),
        },
      };
    }

    if (step === 'confirming') {
      const positive = /yes|da|да|confirm|book|ok|sure/i.test(message);
      if (positive) {
        return {
          response: this.getLocalizedText('bookingConfirmed', language),
          conversationState: { step: 'done' },
          action: {
            type: 'create_booking',
            data: {
              serviceId: state.serviceId,
              appointmentDate: state.appointmentDate,
            },
          },
        };
      }
      return {
        response: this.getLocalizedText('bookingCancelled', language),
        conversationState: { step: 'initial' },
      };
    }

    return {
      response: this.getLocalizedText('startOver', language),
      conversationState: { step: 'initial' },
    };
  }

  private resolveSelection(message: string, options: Array<{ id: string; name: string }>): string | null {
    if (!options || options.length === 0) return null;
    // Check by number
    const num = parseInt(message);
    if (num >= 1 && num <= options.length) return options[num - 1].id;
    // Check by name match
    const lower = message.toLowerCase();
    const match = options.find(o => lower.includes(o.name.toLowerCase()));
    if (match) return match.id;
    // "first one", "second one"
    if (/first|1st|prima|перв/i.test(message)) return options[0]?.id || null;
    if (/second|2nd|a doua|втор/i.test(message)) return options[1]?.id || null;
    if (/third|3rd|a treia|трет/i.test(message)) return options[2]?.id || null;
    return null;
  }

  private getLocalizedText(key: string, lang: string): string {
    const texts: Record<string, Record<string, string>> = {
      noServiceDetected: {
        en: "I couldn't identify a service from your message. Try something like 'I need a haircut' or 'find me a restaurant'.",
        ro: 'Nu am putut identifica un serviciu. Încearcă ceva de genul „Am nevoie de o tunsoare" sau „găsește-mi un restaurant".',
        ru: 'Не удалось определить услугу. Попробуйте что-то вроде «Мне нужна стрижка» или «найди мне ресторан».',
      },
      noBusinessesFound: {
        en: 'No businesses found for this service type. Try a different search.',
        ro: 'Nu s-au găsit afaceri pentru acest tip de serviciu. Încearcă altceva.',
        ru: 'Не найдено бизнесов для этого типа услуги. Попробуйте другой запрос.',
      },
      pickBusiness: {
        en: 'I found these places for {service}. Which one would you like?',
        ro: 'Am găsit aceste locuri pentru {service}. Pe care îl alegi?',
        ru: 'Я нашёл эти места для {service}. Какое выберете?',
      },
      pickService: {
        en: 'Great choice! Here are the services at {business}:',
        ro: 'Alegere excelentă! Iată serviciile la {business}:',
        ru: 'Отличный выбор! Вот услуги в {business}:',
      },
      pickTime: {
        en: 'When would you like to go? (e.g., "tomorrow at 3pm", "Friday 10am")',
        ro: 'Când ai vrea să mergi? (ex: „mâine la 15:00", „vineri la 10:00")',
        ru: 'Когда хотите пойти? (напр.: «завтра в 15:00», «пятница в 10:00»)',
      },
      confirmBooking: {
        en: 'Confirm booking at {business} on {date} at {time}? (yes/no)',
        ro: 'Confirmi rezervarea la {business} pe {date} la {time}? (da/nu)',
        ru: 'Подтвердить бронирование в {business} на {date} в {time}? (да/нет)',
      },
      bookingConfirmed: {
        en: 'Booking created! You can view it in My Bookings.',
        ro: 'Rezervare creată! O poți vedea în Rezervările Mele.',
        ru: 'Бронирование создано! Вы можете посмотреть его в Моих Бронированиях.',
      },
      bookingCancelled: {
        en: 'No problem. What else can I help you with?',
        ro: 'Nicio problemă. Cu ce altceva te pot ajuta?',
        ru: 'Без проблем. Чем ещё могу помочь?',
      },
      invalidSelection: {
        en: 'Please select an option by number or name.',
        ro: 'Te rog selectează o opțiune prin număr sau nume.',
        ru: 'Пожалуйста, выберите вариант по номеру или названию.',
      },
      businessNotFound: {
        en: 'Business not found. Let me start over.',
        ro: 'Afacerea nu a fost găsită. O luăm de la capăt.',
        ru: 'Бизнес не найден. Начнём сначала.',
      },
      parseError: {
        en: 'Sorry, I had trouble understanding that. Try again with something like "I need a haircut".',
        ro: 'Scuze, nu am înțeles. Încearcă din nou cu ceva de genul „Am nevoie de o tunsoare".',
        ru: 'Извините, я не понял. Попробуйте снова, например «Мне нужна стрижка».',
      },
      startOver: {
        en: "Let's start fresh! What service are you looking for?",
        ro: 'Hai să o luăm de la capăt! Ce serviciu cauți?',
        ru: 'Начнём сначала! Какую услугу вы ищете?',
      },
    };
    return texts[key]?.[lang] || texts[key]?.['en'] || key;
  }

  // ─── Existing helper: list available Gemini models ────────────────

  private async listAvailableModels(apiKey: string): Promise<string[]> {
    try {
      const response = await axios.get(
        `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
        { headers: { 'Content-Type': 'application/json' }, timeout: 5000 },
      );

      const models = response.data?.models || [];
      const freeTierModels = [
        'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-1.5-flash',
        'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-flash-lite-latest',
      ];

      const allModelNames = models
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name?.replace('models/', '') || '')
        .filter((name: string) => name);

      const prioritizedModels = [
        ...freeTierModels.filter(m => allModelNames.includes(m)),
        ...allModelNames.filter(m => !freeTierModels.includes(m) && !m.includes('pro') && !m.includes('preview') && !m.includes('exp')),
      ].slice(0, 3);

      return prioritizedModels;
    } catch (error: any) {
      try {
        const response = await axios.get(
          'https://generativelanguage.googleapis.com/v1beta/models',
          { headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, timeout: 5000 },
        );
        const models = response.data?.models || [];
        return models
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name?.replace('models/', '') || '')
          .filter((name: string) => name)
          .slice(0, 3);
      } catch {
        return [];
      }
    }
  }
}
