import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { User } from '../users/entities/user.entity';
import { Business } from '../businesses/entities/business.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async createReview(
    userId: number,
    businessId: number,
    bookingId: number,
    rating: number,
    comment?: string,
  ): Promise<Review> {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Check if user exists
    const user = await this.userRepository.findOne({ where: { id: userId as any } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if business exists
    const business = await this.businessRepository.findOne({ where: { id: businessId as any } });
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Check if booking exists and belongs to user and business
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId as any, customer: { id: userId as any }, business: { id: businessId as any } },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found or does not belong to user');
    }

    // Check if booking is completed (checked in)
    if (!booking.checkedIn) {
      throw new BadRequestException('Cannot review a booking that has not been completed');
    }

    // Check if review already exists for this booking
    const existingReview = await this.reviewRepository.findOne({
      where: { bookingId, userId },
    });
    if (existingReview) {
      throw new BadRequestException('Review already exists for this booking');
    }

    // Create review
    const review = this.reviewRepository.create({
      userId,
      businessId,
      bookingId,
      rating,
      comment,
    });

    const savedReview = await this.reviewRepository.save(review);

    // Update business average rating
    await this.updateBusinessRating(businessId);

    return savedReview;
  }

  async getReviewsByBusiness(businessId: number, page: number = 1, limit: number = 10): Promise<{
    reviews: Review[];
    total: number;
    averageRating: number;
  }> {
    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { businessId, isActive: true },
      relations: ['user', 'booking'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate average rating
    const averageRating = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .where('review.businessId = :businessId', { businessId })
      .andWhere('review.isActive = :isActive', { isActive: true })
      .getRawOne();

    return {
      reviews,
      total,
      averageRating: parseFloat(averageRating.average) || 0,
    };
  }

  async updateTrustScore(userId: number, points: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId as any } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update trust score with bounds
    const newScore = Math.max(0, Math.min(100, user.trustScore + points));
    await this.userRepository.update(userId, { trustScore: newScore });
  }

  async getTrustScore(userId: number): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId as any } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.trustScore;
  }

  private async updateBusinessRating(businessId: number): Promise<void> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.businessId = :businessId', { businessId })
      .andWhere('review.isActive = :isActive', { isActive: true })
      .getRawOne();

    const averageRating = parseFloat(result.average) || 0;
    const reviewCount = parseInt(result.count) || 0;

    await this.businessRepository.update(businessId, {
      // averageRating,
      reviewCount,
    });
  }

  async checkForNoShows(): Promise<void> {
    // Find bookings that are past their appointment time and haven't been checked in
    const now = new Date();
    const noShowBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .where('booking.appointmentDate < :now', { now })
      .andWhere('booking.checkedIn = :checkedIn', { checkedIn: false })
      .andWhere('booking.status IN (:...statuses)', { 
        statuses: ['confirmed', 'pending'] 
      })
      .getMany();

    // Update trust scores for no-shows
    for (const booking of noShowBookings) {
      await this.updateTrustScore(booking.customer.id as any, -50);
      
      // Mark booking as no-show
      await this.bookingRepository.update(booking.id, { 
        status: 'no_show' as any 
      });
    }
  }
}
