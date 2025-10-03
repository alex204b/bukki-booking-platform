import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

export class CreateFeedbackDto {
  type?: 'general' | 'bug_report' | 'feature_request' | 'improvement';
  rating: number;
  content: string;
  userEmail?: string;
  userName?: string;
}

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async createFeedback(@Body() createFeedbackDto: CreateFeedbackDto, @Request() req?) {
    return this.feedbackService.createFeedback(
      createFeedbackDto.type || 'general',
      createFeedbackDto.rating,
      createFeedbackDto.content,
      req?.user?.id,
      createFeedbackDto.userEmail,
      createFeedbackDto.userName,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async getFeedback(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.feedbackService.getFeedback(page, limit);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async getFeedbackStats() {
    return this.feedbackService.getFeedbackStats();
  }
}
