import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto, UpdateReviewDto, ReviewResponseDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
  ) {}

  async create(createReviewDto: CreateReviewDto, userId: string): Promise<ReviewResponseDto> {
    // Check if user already reviewed this business
    const existingReview = await this.reviewRepository.findOne({
      where: { businessId: createReviewDto.businessId, userId },
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this business');
    }

    const review = this.reviewRepository.create({
      ...createReviewDto,
      userId,
    });

    const savedReview = await this.reviewRepository.save(review);
    return this.formatReviewResponse(savedReview);
  }

  async findAllByBusiness(businessId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.reviewRepository.find({
      where: { businessId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return reviews.map(review => this.formatReviewResponse(review));
  }

  async findAllByUser(userId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.reviewRepository.find({
      where: { userId },
      relations: ['business'],
      order: { createdAt: 'DESC' },
    });

    return reviews.map(review => this.formatReviewResponse(review));
  }

  async findOne(id: string): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'business'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.formatReviewResponse(review);
  }

  async update(id: string, updateReviewDto: UpdateReviewDto, userId: string): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findOne({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    Object.assign(review, updateReviewDto);
    const updatedReview = await this.reviewRepository.save(review);
    return this.formatReviewResponse(updatedReview);
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.reviewRepository.remove(review);
  }

  async getBusinessRatingStats(businessId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
  }> {
    const reviews = await this.reviewRepository.find({
      where: { businessId },
      select: ['rating'],
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;

    const ratingDistribution = reviews.reduce((dist, review) => {
      dist[review.rating] = (dist[review.rating] || 0) + 1;
      return dist;
    }, {} as { [key: number]: number });

    // Fill missing ratings with 0
    for (let i = 1; i <= 5; i++) {
      if (!ratingDistribution[i]) {
        ratingDistribution[i] = 0;
      }
    }

    return {
      averageRating,
      totalReviews: reviews.length,
      ratingDistribution,
    };
  }

  private formatReviewResponse(review: Review): ReviewResponseDto {
    return {
      id: review.id,
      businessId: review.businessId,
      userId: review.userId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: review.user ? {
        id: review.user.id,
        firstName: review.user.firstName,
        lastName: review.user.lastName,
        email: review.user.email,
      } : undefined,
    };
  }
}