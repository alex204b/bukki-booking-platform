import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createReviewDto: CreateReviewDto, @Request() req) {
    return this.reviewsService.create(createReviewDto, req.user.id);
  }

  @Get('business/:businessId')
  findAllByBusiness(@Param('businessId') businessId: string) {
    return this.reviewsService.findAllByBusiness(businessId);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  findAllByUser(@Param('userId') userId: string, @Request() req) {
    // Users can only see their own reviews
    if (req.user.id !== userId) {
      throw new Error('Forbidden');
    }
    return this.reviewsService.findAllByUser(userId);
  }

  @Get('my-reviews')
  @UseGuards(JwtAuthGuard)
  findMyReviews(@Request() req) {
    return this.reviewsService.findAllByUser(req.user.id);
  }

  @Get('business/:businessId/stats')
  getBusinessRatingStats(@Param('businessId') businessId: string) {
    return this.reviewsService.getBusinessRatingStats(businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto, @Request() req) {
    return this.reviewsService.update(id, updateReviewDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req) {
    return this.reviewsService.remove(id, req.user.id);
  }
}