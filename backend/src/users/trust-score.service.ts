import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { User } from './entities/user.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';

export interface TrustScoreFactors {
  completedBookings: number;
  noShows: number;
  lateCancellations: number; // Cancelled within 24 hours
  earlyCancellations: number; // Cancelled more than 24 hours before
  onTimeArrivals: number;
  totalBookings: number;
}

@Injectable()
export class TrustScoreService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  /**
   * Calculate trust score based on user's booking history
   * Score ranges from 0-100
   * Starting score: 100
   * 
   * Factors:
   * - Completed booking: +2 points (max +20 for 10+ completions)
   * - No-show: -15 points
   * - Late cancellation (<24h): -10 points
   * - Early cancellation (>24h): -5 points
   * - On-time arrival: +1 point (max +10)
   * - Multiple cancellations in short time: -5 per additional cancellation
   */
  async calculateTrustScore(userId: string): Promise<number> {
    const factors = await this.getTrustScoreFactors(userId);
    
    let score = 100; // Starting score

    // Positive factors
    // Completed bookings (capped at 20 points for 10+ completions)
    const completionBonus = Math.min(factors.completedBookings * 2, 20);
    score += completionBonus;

    // On-time arrivals (capped at 10 points)
    const arrivalBonus = Math.min(factors.onTimeArrivals, 10);
    score += arrivalBonus;

    // Negative factors
    // No-shows are heavily penalized
    score -= factors.noShows * 15;

    // Late cancellations (within 24 hours) are penalized more
    score -= factors.lateCancellations * 10;

    // Early cancellations (more than 24 hours) are penalized less
    score -= factors.earlyCancellations * 5;

    // Penalty for multiple cancellations in a short period (last 30 days)
    const recentCancellations = await this.getRecentCancellations(userId, 30);
    if (recentCancellations > 3) {
      score -= (recentCancellations - 3) * 5;
    }

    // Penalty for suspicious patterns (booking and immediately cancelling)
    const suspiciousPatterns = await this.detectSuspiciousPatterns(userId);
    score -= suspiciousPatterns * 20;

    // Ensure score stays within bounds (0-100)
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get trust score factors for a user
   */
  async getTrustScoreFactors(userId: string): Promise<TrustScoreFactors> {
    const bookings = await this.bookingRepository.find({
      where: { customer: { id: userId } },
      relations: ['customer'],
      order: { appointmentDate: 'DESC' },
    });

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let completedBookings = 0;
    let noShows = 0;
    let lateCancellations = 0;
    let earlyCancellations = 0;
    let onTimeArrivals = 0;
    const totalBookings = bookings.length;

    for (const booking of bookings) {
      if (booking.status === BookingStatus.COMPLETED) {
        completedBookings++;
        // Check if checked in on time (within 15 minutes of appointment)
        if (booking.checkedInAt) {
          const timeDiff = Math.abs(
            booking.checkedInAt.getTime() - booking.appointmentDate.getTime()
          );
          if (timeDiff <= 15 * 60 * 1000) {
            // Within 15 minutes
            onTimeArrivals++;
          }
        }
      } else if (booking.status === BookingStatus.NO_SHOW) {
        noShows++;
      } else if (booking.status === BookingStatus.CANCELLED && booking.cancelledAt) {
        const cancellationTime = booking.cancelledAt.getTime();
        const appointmentTime = booking.appointmentDate.getTime();
        const hoursBeforeAppointment = (appointmentTime - cancellationTime) / (1000 * 60 * 60);

        if (hoursBeforeAppointment < 24) {
          lateCancellations++;
        } else {
          earlyCancellations++;
        }
      }
    }

    return {
      completedBookings,
      noShows,
      lateCancellations,
      earlyCancellations,
      onTimeArrivals,
      totalBookings,
    };
  }

  /**
   * Get number of cancellations in the last N days
   */
  async getRecentCancellations(userId: string, days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const cancellations = await this.bookingRepository.count({
      where: {
        customer: { id: userId },
        status: BookingStatus.CANCELLED,
        cancelledAt: MoreThan(cutoffDate),
      },
    });

    return cancellations;
  }

  /**
   * Detect suspicious booking patterns
   * Returns number of suspicious patterns detected
   */
  async detectSuspiciousPatterns(userId: string): Promise<number> {
    // Pattern: Booking created and cancelled within 1 hour
    const suspiciousBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.customer.id = :userId', { userId })
      .andWhere('booking.status = :status', { status: BookingStatus.CANCELLED })
      .andWhere('booking.cancelledAt IS NOT NULL')
      .andWhere('booking.createdAt IS NOT NULL')
      .getMany();

    let suspiciousCount = 0;
    for (const booking of suspiciousBookings) {
      if (booking.cancelledAt && booking.createdAt) {
        const timeDiff = booking.cancelledAt.getTime() - booking.createdAt.getTime();
        // If cancelled within 1 hour of creation
        if (timeDiff > 0 && timeDiff < 60 * 60 * 1000) {
          suspiciousCount++;
        }
      }
    }

    return suspiciousCount;
  }

  /**
   * Update user's trust score
   */
  async updateTrustScore(userId: string): Promise<number> {
    const newScore = await this.calculateTrustScore(userId);
    await this.userRepository.update(userId, { trustScore: newScore });
    return newScore;
  }

  /**
   * Get trust score level
   */
  getTrustScoreLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor' {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'very_poor';
  }

  /**
   * Check if user can make bookings based on trust score
   */
  canMakeBooking(score: number): { allowed: boolean; reason?: string } {
    if (score >= 40) {
      return { allowed: true };
    } else if (score >= 20) {
      return {
        allowed: true,
        reason: 'Your trust score is low. Bookings may require approval.',
      };
    } else {
      return {
        allowed: false,
        reason: 'Your trust score is too low to make new bookings. Please contact support.',
      };
    }
  }

  /**
   * Get trust score breakdown for display
   */
  async getTrustScoreBreakdown(userId: string): Promise<{
    score: number;
    level: string;
    factors: TrustScoreFactors;
    breakdown: {
      positive: number;
      negative: number;
      details: string[];
    };
  }> {
    const score = await this.calculateTrustScore(userId);
    const factors = await this.getTrustScoreFactors(userId);
    const level = this.getTrustScoreLevel(score);

    const details: string[] = [];
    let positive = 0;
    let negative = 0;

    if (factors.completedBookings > 0) {
      const bonus = Math.min(factors.completedBookings * 2, 20);
      positive += bonus;
      details.push(`+${bonus} from ${factors.completedBookings} completed bookings`);
    }

    if (factors.onTimeArrivals > 0) {
      const bonus = Math.min(factors.onTimeArrivals, 10);
      positive += bonus;
      details.push(`+${bonus} from on-time arrivals`);
    }

    if (factors.noShows > 0) {
      const penalty = factors.noShows * 15;
      negative += penalty;
      details.push(`-${penalty} from ${factors.noShows} no-show(s)`);
    }

    if (factors.lateCancellations > 0) {
      const penalty = factors.lateCancellations * 10;
      negative += penalty;
      details.push(`-${penalty} from ${factors.lateCancellations} late cancellation(s)`);
    }

    if (factors.earlyCancellations > 0) {
      const penalty = factors.earlyCancellations * 5;
      negative += penalty;
      details.push(`-${penalty} from ${factors.earlyCancellations} early cancellation(s)`);
    }

    return {
      score,
      level,
      factors,
      breakdown: {
        positive,
        negative,
        details,
      },
    };
  }
}

