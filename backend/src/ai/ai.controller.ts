import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('parse-query')
  @ApiOperation({ summary: 'Parse user query using AI to extract services and intent' })
  @ApiResponse({ status: 200, description: 'Query parsed successfully' })
  async parseQuery(@Body() body: { query: string; language?: string }, @Request() req) {
    try {
      console.log('[AIController] Received query:', { query: body.query, userId: req.user?.id });

      if (!body || !body.query || !body.query.trim()) {
        console.warn('[AIController] Empty query received');
        return {
          services: [],
          timePreference: 'soon',
          intent: '',
          isMultiStep: false,
          userId: req.user?.id,
        };
      }

      const result = await this.aiService.parseQuery(body.query.trim(), body.language || 'en');
      console.log('[AIController] Parsing result:', result);

      const response = {
        services: Array.isArray(result.services) ? result.services : [],
        timePreference: result.timePreference || 'soon',
        intent: result.intent || body.query.trim(),
        isMultiStep: result.isMultiStep || false,
        specificDate: result.specificDate || null,
        filters: result.filters || {
          priceRange: 'any',
          minRating: null,
          maxDistance: null,
          location: null,
          features: [],
        },
        userId: req.user?.id,
      };

      return response;
    } catch (error: any) {
      console.error('[AIController] Error parsing query:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      return {
        error: error.message || 'AI service failed. Please check your API keys and try again.',
        services: [],
        timePreference: 'soon',
        intent: body?.query || '',
        isMultiStep: false,
        userId: req.user?.id,
      };
    }
  }

  @Get('smart-slots/:serviceId')
  @ApiOperation({ summary: 'Get smart time slot suggestions for a service' })
  @ApiResponse({ status: 200, description: 'Smart slots returned' })
  async getSmartSlots(
    @Param('serviceId') serviceId: string,
    @Query('days') days?: string,
  ) {
    try {
      return await this.aiService.getSmartSlots(serviceId, days ? parseInt(days) : 7);
    } catch (error: any) {
      return { bestTimes: [], error: error.message };
    }
  }

  @Get('review-summary/:businessId')
  @ApiOperation({ summary: 'Get AI-generated review summary for a business' })
  @ApiResponse({ status: 200, description: 'Review summary returned' })
  async getReviewSummary(
    @Param('businessId') businessId: string,
    @Query('language') language?: string,
  ) {
    try {
      return await this.aiService.summarizeReviews(businessId, language || 'en');
    } catch (error: any) {
      return { summary: '', avgRating: 0, totalReviews: 0, error: error.message };
    }
  }

  @Get('similar/:businessId')
  @ApiOperation({ summary: 'Get similar business recommendations' })
  @ApiResponse({ status: 200, description: 'Similar businesses returned' })
  async getSimilarBusinesses(
    @Param('businessId') businessId: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const businesses = await this.aiService.findSimilarBusinesses(
        businessId,
        limit ? parseInt(limit) : 3,
      );
      return { businesses };
    } catch (error: any) {
      return { businesses: [], error: error.message };
    }
  }

  @Get('personalized')
  @ApiOperation({ summary: 'Get personalized business recommendations' })
  @ApiResponse({ status: 200, description: 'Personalized recommendations returned' })
  async getPersonalized(
    @Request() req,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const businesses = await this.aiService.getPersonalizedRecommendations(
        req.user.id,
        category,
        limit ? parseInt(limit) : 5,
      );
      return { businesses };
    } catch (error: any) {
      return { businesses: [], error: error.message };
    }
  }

  @Post('chat')
  @ApiOperation({ summary: 'Conversational booking assistant' })
  @ApiResponse({ status: 200, description: 'Chat response returned' })
  async chat(
    @Body() body: { message: string; conversationState?: any; language?: string },
    @Request() req,
  ) {
    try {
      return await this.aiService.chat(
        req.user.id,
        body.message,
        body.conversationState || {},
        body.language || 'en',
      );
    } catch (error: any) {
      return {
        response: 'Sorry, something went wrong. Please try again.',
        conversationState: { step: 'initial' },
        error: error.message,
      };
    }
  }

  @Get('test')
  @ApiOperation({ summary: 'Test AI endpoint connectivity' })
  @ApiResponse({ status: 200, description: 'AI service is accessible' })
  async test(@Request() req) {
    return {
      status: 'ok',
      message: 'AI endpoint is working',
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    };
  }
}
