import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { LoyaltyPoints, LoyaltyTransactionType } from './entities/loyalty-points.entity';
import { User } from '../users/entities/user.entity';
import { Business } from '../businesses/entities/business.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyPoints)
    private loyaltyPointsRepository: Repository<LoyaltyPoints>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
  ) {}

  /**
   * Award points for a booking
   */
  async awardPointsForBooking(booking: Booking, pointsPerDollar: number = 1): Promise<LoyaltyPoints> {
    const service = booking.service;
    const amount = service?.price ? Number(service.price) : 0;
    const points = Math.floor(amount * pointsPerDollar);

    if (points <= 0) {
      return null;
    }

    const currentBalance = await this.getBalance(booking.customer.id as string, booking.business.id);

    const loyaltyPoint = this.loyaltyPointsRepository.create({
      customer: { id: booking.customer.id } as any,
      business: { id: booking.business.id } as any,
      booking: { id: booking.id } as any,
      points,
      type: LoyaltyTransactionType.EARNED,
      description: `Earned ${points} points for booking ${service?.name || 'service'}`,
      balance: currentBalance + points,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Expires in 1 year
    });

    return this.loyaltyPointsRepository.save(loyaltyPoint);
  }

  /**
   * Redeem points
   */
  async redeemPoints(
    customerId: string,
    businessId: string,
    points: number,
    description?: string,
  ): Promise<LoyaltyPoints> {
    const balance = await this.getBalance(customerId, businessId);

    if (balance < points) {
      throw new Error('Insufficient points');
    }

    const loyaltyPoint = this.loyaltyPointsRepository.create({
      customer: { id: customerId } as any,
      business: { id: businessId } as any,
      points: -points,
      type: LoyaltyTransactionType.REDEEMED,
      description: description || `Redeemed ${points} points`,
      balance: balance - points,
    });

    return this.loyaltyPointsRepository.save(loyaltyPoint);
  }

  /**
   * Get current balance
   */
  async getBalance(customerId: string, businessId: string): Promise<number> {
    const latest = await this.loyaltyPointsRepository.findOne({
      where: {
        customer: { id: customerId },
        business: { id: businessId },
      } as any,
      order: { createdAt: 'DESC' },
    });

    return latest?.balance || 0;
  }

  /**
   * Get transaction history
   */
  async getHistory(customerId: string, businessId: string): Promise<LoyaltyPoints[]> {
    return this.loyaltyPointsRepository.find({
      where: {
        customer: { id: customerId },
        business: { id: businessId },
      } as any,
      relations: ['booking'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /**
   * Expire old points (run as scheduled task)
   */
  async expireOldPoints(): Promise<number> {
    const now = new Date();
    const expiredPoints = await this.loyaltyPointsRepository.find({
      where: {
        type: LoyaltyTransactionType.EARNED,
        expiresAt: LessThan(now),
        points: MoreThan(0), // Only unexpired earned points
      } as any,
    });

    let totalExpired = 0;
    for (const point of expiredPoints) {
      const balance = await this.getBalance(point.customer.id as string, point.business.id);
      const expiredAmount = Math.min(point.points, balance);

      if (expiredAmount > 0) {
        await this.loyaltyPointsRepository.save({
          ...this.loyaltyPointsRepository.create({
            customer: { id: point.customer.id } as any,
            business: { id: point.business.id } as any,
            points: -expiredAmount,
            type: LoyaltyTransactionType.EXPIRED,
            description: `Expired ${expiredAmount} points`,
            balance: balance - expiredAmount,
          }),
        });
        totalExpired += expiredAmount;
      }
    }

    return totalExpired;
  }
}

