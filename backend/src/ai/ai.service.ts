import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly apiKey: string;
  private readonly useAI: boolean;

  constructor(private configService: ConfigService) {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    const hfKey = this.configService.get<string>('HUGGINGFACE_API_KEY') || process.env.HUGGINGFACE_API_KEY;

    this.apiKey = geminiKey || hfKey || '';
    this.useAI = !!this.apiKey;

    if (!this.useAI) {
      this.logger.warn('⚠️ No AI API key found. Add GEMINI_API_KEY or HUGGINGFACE_API_KEY (for Moldova) to .env');
    } else {
      const provider = (this.configService.get<string>('AI_PROVIDER') || process.env.AI_PROVIDER || 'auto').toLowerCase();
      this.logger.log(`✅ AI enabled. Provider: ${provider}`);
      if (geminiKey) this.logger.log('   - Gemini (Google) available');
      if (hfKey) this.logger.log('   - Hugging Face available (works in Moldova)');
    }
  }

  /**
   * Parse user query using AI to extract services, time preferences, and intent
   */
  async parseQuery(userQuery: string): Promise<{
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
      throw new Error('AI service is not configured. Add GEMINI_API_KEY or HUGGINGFACE_API_KEY (for Moldova) to .env');
    }

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
          this.logger.debug('[parseQuery] Trying Gemini...');
          return await this.parseWithGemini(userQuery);
        }
        if (p === 'huggingface' && hfKey) {
          this.logger.debug('[parseQuery] Trying Hugging Face...');
          return await this.parseWithHuggingFace(userQuery);
        }
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`[parseQuery] ${p} failed: ${err.message}. Trying next provider...`);
      }
    }

    this.logger.error('All AI providers failed:', lastError?.message);
    throw lastError || new Error('No AI provider could parse the query');
  }

  /**
   * Parse using Google Gemini (free tier)
   * Enhanced prompt engineering for better accuracy
   */
  /**
   * List available Gemini models for this API key
   */
  private async listAvailableModels(apiKey: string): Promise<string[]> {
    try {
      // Try v1 API first
      const response = await axios.get(
        `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      const models = response.data?.models || [];

      // Filter to only free tier models and prioritize simpler/faster ones
      // Free tier models typically include: gemini-2.5-flash, gemini-flash-latest, gemini-1.5-flash
      // Avoid: pro models, preview models, experimental models (they have quota limits)
      const freeTierModels = [
        'gemini-2.5-flash',
        'gemini-flash-latest',
        'gemini-1.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-flash-lite-latest',
      ];

      const allModelNames = models
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name?.replace('models/', '') || '')
        .filter((name: string) => name);

      // Prioritize free tier models first, then others
      const prioritizedModels = [
        ...freeTierModels.filter(m => allModelNames.includes(m)),
        ...allModelNames.filter(m => !freeTierModels.includes(m) && !m.includes('pro') && !m.includes('preview') && !m.includes('exp')),
      ].slice(0, 3); // Only try top 3 models to avoid rate limits

      this.logger.log(`[Gemini] Using models (prioritized): ${prioritizedModels.join(', ')}`);
      return prioritizedModels;
    } catch (error: any) {
      // Log detailed error to understand what's wrong with ListModels
      this.logger.error(`[Gemini] Failed to list models:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url?.replace(new RegExp(apiKey, 'g'), '***'),
      });

      // Try v1beta API as fallback
      try {
        this.logger.log('[Gemini] Trying v1beta API for ListModels...');
        const response = await axios.get(
          'https://generativelanguage.googleapis.com/v1beta/models',
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            timeout: 5000,
          }
        );

        const models = response.data?.models || [];
        const allModelNames = models
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name?.replace('models/', '') || '')
          .filter((name: string) => name);

        this.logger.log(`[Gemini] v1beta API returned ${allModelNames.length} models`);
        return allModelNames.slice(0, 3);
      } catch (v1betaError: any) {
        this.logger.error(`[Gemini] v1beta API also failed:`, v1betaError.message);
        // Return empty array to indicate no models available
        return [];
      }
    }
  }

  private async parseWithGemini(query: string) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    this.logger.log('[Gemini] Starting query parsing with Gemini AI');
    
    const prompt = `You are an intelligent booking assistant for a multi-service booking platform called BUKKi. Your task is to parse user queries and extract detailed booking intent with filters and preferences.

CONTEXT:
- Users can book services like haircuts, restaurants, mechanics, tailors, gyms, healthcare, and beauty salons
- Users may request multiple services in sequence (e.g., "fix my car then eat")
- Users can specify filters like price range, ratings, distance, location, date/time, and special requirements

USER QUERY: "${query}"

TASK:
Analyze the query and extract:
1. Services: Identify all services mentioned (even if implied)
2. Filters: Extract price, rating, distance, location, features
3. Time: Extract date/time preferences (specific dates, time ranges, urgency)
4. Special Requirements: Accessibility, parking, outdoor seating, etc.
5. Intent: Understand what the user wants to accomplish

SERVICE CATEGORIES (MUST use exact database category names - these are the ONLY valid values):
- "beauty_salon" - hair services (haircuts, barbershops, salons, styling), beauty (spa, nails, manicure, pedicure, massage)
- "restaurant" - food, dining, eating, meals, cafes, fast food, fine dining
- "mechanic" - car repair, auto service, vehicle maintenance, oil change, tire service
- "tailor" - clothing alterations, tailoring, sewing, custom clothing
- "fitness" - gym, workout, exercise, personal training, yoga, pilates
- "healthcare" - doctor, medical, clinic, dentist, pharmacy, therapy
- "education" - schools, tutoring, courses, training, workshops
- "consulting" - professional services, consulting, legal, accounting
- "other" - any other services not listed above

TIME PREFERENCES:
- "now" - immediate, urgent, right now, ASAP, within the hour
- "today" - today, this day, later today
- "tomorrow" - tomorrow, next day
- "this_week" - this week, within 7 days
- "next_week" - next week, 7-14 days
- "specific_date" - if user mentions specific date (e.g., "Friday", "Dec 15", "next Monday")
- "soon" - soon, later, not urgent (default)

FILTERS TO EXTRACT:
- priceRange: "cheap", "moderate", "expensive", "any" (default: "any")
- minRating: number 1-5 if mentioned (e.g., "4+ stars", "highly rated")
- maxDistance: number in km if mentioned (e.g., "within 5km", "nearby", "close")
- location: specific city/area if mentioned (e.g., "in downtown", "near Times Square")
- features: array of special requirements (e.g., ["wheelchair_accessible", "parking", "outdoor_seating", "wifi", "air_conditioned"])

EXAMPLES:
Query: "I need a haircut"
→ {"services": [{"type": "beauty_salon", "name": "haircut", "step": 1}], "timePreference": "soon", "intent": "Book a haircut appointment", "isMultiStep": false, "filters": {"priceRange": "any", "minRating": null, "maxDistance": null, "location": null, "features": []}}

Query: "find me a cheap restaurant nearby with parking"
→ {"services": [{"type": "restaurant", "name": "dining", "step": 1}], "timePreference": "soon", "intent": "Find affordable nearby restaurant with parking", "isMultiStep": false, "filters": {"priceRange": "cheap", "minRating": null, "maxDistance": 5, "location": null, "features": ["parking"]}}

Query: "best rated mechanic within 10km for tomorrow"
→ {"services": [{"type": "mechanic", "name": "auto repair", "step": 1}], "timePreference": "tomorrow", "intent": "Find highly rated mechanic for tomorrow", "isMultiStep": false, "filters": {"priceRange": "any", "minRating": 4, "maxDistance": 10, "location": null, "features": []}}

Query: "haircut then lunch, both nearby and highly rated"
→ {"services": [{"type": "beauty_salon", "name": "haircut", "step": 1}, {"type": "restaurant", "name": "lunch", "step": 2}], "timePreference": "soon", "intent": "Get haircut then have lunch, both nearby and highly rated", "isMultiStep": true, "filters": {"priceRange": "any", "minRating": 4, "maxDistance": 3, "location": null, "features": []}}

Query: "wheelchair accessible gym in downtown"
→ {"services": [{"type": "fitness", "name": "gym", "step": 1}], "timePreference": "soon", "intent": "Find wheelchair accessible gym in downtown area", "isMultiStep": false, "filters": {"priceRange": "any", "minRating": null, "maxDistance": null, "location": "downtown", "features": ["wheelchair_accessible"]}}

Query: "doctor appointment ASAP"
→ {"services": [{"type": "healthcare", "name": "doctor visit", "step": 1}], "timePreference": "now", "intent": "Book urgent doctor appointment", "isMultiStep": false, "filters": {"priceRange": "any", "minRating": null, "maxDistance": null, "location": null, "features": []}}

Query: "5 star restaurant with outdoor seating for Friday evening"
→ {"services": [{"type": "restaurant", "name": "fine dining", "step": 1}], "timePreference": "specific_date", "specificDate": "Friday evening", "intent": "Book high-end restaurant with outdoor seating for Friday evening", "isMultiStep": false, "filters": {"priceRange": "expensive", "minRating": 5, "maxDistance": null, "location": null, "features": ["outdoor_seating"]}}

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON, no markdown, no explanations
- Use exact service type names from the list above
- Assign sequential step numbers (1, 2, 3...) for multi-step requests
- If no service detected, return empty services array
- Always include all fields: services, timePreference, intent, isMultiStep, filters
- For filters: use null for unspecified values, empty array [] for no features
- If specificDate mentioned, add "specificDate" field with the date string

Return the JSON now:`;

    try {
      // Get list of available models from Gemini API
      this.logger.log('[Gemini] Fetching available models from Gemini API...');
      const availableModels = await this.listAvailableModels(apiKey);

      if (availableModels.length === 0) {
        this.logger.warn('[Gemini] No models found via ListModels API. This might indicate the API key needs the Gemini API enabled in Google Cloud Console.');
        this.logger.warn('[Gemini] Please visit https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com and enable the API.');
        throw new Error('No Gemini models available for this API key. Please enable the Gemini API in Google Cloud Console: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
      }

      this.logger.log(`[Gemini] Available models: ${availableModels.join(', ')}`);

      // Determine API version based on available models
      // If models were fetched from v1beta, use v1beta endpoints
      const useV1Beta = availableModels.some(m => m.includes('latest') || !m.includes('-00'));
      const apiVersion = useV1Beta ? 'v1beta' : 'v1';

      this.logger.log(`[Gemini] Using API version: ${apiVersion}`);

      // Build endpoints using available models
      const endpoints = availableModels.slice(0, 3).map(model =>
        `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`
      );

      this.logger.log(`[Gemini] Will try ${endpoints.length} model(s): ${availableModels.slice(0, 3).join(', ')}`);
    
    let lastError: any = null;
    
    for (const endpoint of endpoints) {
      try {
        this.logger.debug(`[Gemini] Trying endpoint: ${endpoint}`);

        // Determine authentication method based on API version
        const isV1Beta = endpoint.includes('/v1beta/');
        const requestConfig = isV1Beta
          ? {
              url: endpoint,
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
              },
            }
          : {
              url: `${endpoint}?key=${apiKey}`,
              headers: {
                'Content-Type': 'application/json',
              },
            };

        const response = await axios.post(
          requestConfig.url,
          {
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          },
          {
            headers: requestConfig.headers,
            timeout: 15000, // Increased timeout for AI response
          }
        );

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          this.logger.log(`[Gemini] ✅ Successfully parsed query using endpoint: ${endpoint}`);

          // Return enhanced response with filters
          return {
            services: parsed.services || [],
            timePreference: parsed.timePreference || 'soon',
            specificDate: parsed.specificDate || null,
            intent: parsed.intent || query,
            isMultiStep: parsed.isMultiStep || false,
            filters: parsed.filters || {
              priceRange: 'any',
              minRating: null,
              maxDistance: null,
              location: null,
              features: [],
            },
          };
        }
        
        throw new Error('AI did not return valid JSON');
      } catch (error: any) {
        lastError = error;
        // If it's not a 404, don't try other endpoints
        if (error.response?.status !== 404) {
          break;
        }
        // Continue to next endpoint if 404
        this.logger.debug(`[Gemini] Endpoint returned 404, trying next...`);
      }
    }
    
    // If we get here, all endpoints failed
    throw lastError;
    } catch (error: any) {
      // Log detailed error information (mask API key)
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url?.replace(new RegExp(apiKey, 'g'), '***'),
      };

      this.logger.error('[Gemini] API call failed:', errorDetails);
      
      // Provide helpful error message
      if (error.response?.status === 404) {
        const errorMsg = error.response?.data?.error?.message || '';
        if (errorMsg.includes('not found') || errorMsg.includes('not supported')) {
          throw new Error(`Gemini model not available. The API key might need the Gemini API enabled in Google Cloud Console. Error: ${errorMsg}`);
        }
        throw new Error('Gemini API endpoint not found. Please ensure your API key is valid and the Gemini API is enabled in your Google Cloud project.');
      } else if (error.response?.status === 400) {
        throw new Error(`Gemini API request error: ${error.response?.data?.error?.message || error.message}`);
      } else if (error.response?.status === 403) {
        throw new Error('Gemini API access denied. Please check your API key permissions and ensure the Gemini API is enabled in your Google Cloud project.');
      } else {
        throw new Error(`Gemini API error: ${error.message}`);
      }
    }
  }

  /**
   * Parse using Hugging Face Inference API (free tier, works in Moldova)
   * Optimized prompt for smaller models
   */
  private async parseWithHuggingFace(query: string) {
    const hfKey = this.configService.get<string>('HUGGINGFACE_API_KEY');
    if (!hfKey) throw new Error('HUGGINGFACE_API_KEY is not configured');

    const prompt = `Parse booking query: "${query}"

Extract:
- Services: haircut, restaurant, mechanic, tailor, fitness, healthcare, beauty_salon
- Time: now, today, tomorrow, or soon
- Sequence: step numbers if multiple services

Return JSON only:
{"services": [{"type": "service_type", "name": "service_name", "step": 1}], "timePreference": "time", "intent": "user intent", "isMultiStep": true/false}

Examples:
"haircut" → {"services": [{"type": "beauty_salon", "name": "haircut", "step": 1}], "timePreference": "soon", "intent": "Book haircut", "isMultiStep": false}
"barbershop" → {"services": [{"type": "beauty_salon", "name": "barbershop", "step": 1}], "timePreference": "soon", "intent": "Find barbershop", "isMultiStep": false}
"fix car then eat" → {"services": [{"type": "mechanic", "name": "car repair", "step": 1}, {"type": "restaurant", "name": "dining", "step": 2}], "timePreference": "soon", "intent": "Car repair then meal", "isMultiStep": true}

Now parse: "${query}"`;

    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
        {
          inputs: prompt,
          parameters: {
            max_new_tokens: 200,
            return_full_text: false,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${hfKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const text = response.data[0]?.generated_text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          services: parsed.services || [],
          timePreference: parsed.timePreference || 'soon',
          specificDate: parsed.specificDate || null,
          intent: parsed.intent || query,
          isMultiStep: parsed.isMultiStep || false,
          filters: parsed.filters || {
            priceRange: 'any',
            minRating: null,
            maxDistance: null,
            location: null,
            features: [],
          },
        };
      }
    } catch (error: any) {
      this.logger.error('Hugging Face API error:', error.message);
      throw error;
    }
  }

  // REMOVED: All hardcoded fallback parsing - system now relies entirely on AI
}

