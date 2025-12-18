import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
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
  async parseQuery(@Body() body: { query: string }, @Request() req) {
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
      
      // Call AI service (no fallback - we removed all hardcoded logic)
      const result = await this.aiService.parseQuery(body.query.trim());
      console.log('[AIController] Parsing result:', result);
      
      // Ensure result has required fields
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
      
      // Return error response - no fallback since we removed all hardcoded logic
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

