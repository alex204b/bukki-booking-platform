import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  async createReview(
    @Request() req,
    @Body() createReviewDto: {
      businessId: number;
      bookingId: number;
      rating: number;
      comment?: string;
    },
  ) {
    return this.reviewsService.createReview(
      req.user.id,
      createReviewDto.businessId,
      createReviewDto.bookingId,
      createReviewDto.rating,
      createReviewDto.comment,
    );
  }

  @Get('business/:businessId')
  async getReviewsByBusiness(
    @Param('businessId') businessId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.reviewsService.getReviewsByBusiness(businessId, page, limit);
  }

  @Get('trust-score')
  async getTrustScore(@Request() req) {
    const score = await this.reviewsService.getTrustScore(req.user.id);
    return { trustScore: score };
  }
}
