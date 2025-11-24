import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Business } from '../../businesses/entities/business.entity';
import { Booking } from '../../bookings/entities/booking.entity';

export enum LoyaltyTransactionType {
  EARNED = 'earned',
  REDEEMED = 'redeemed',
  EXPIRED = 'expired',
  ADJUSTED = 'adjusted',
}

@Entity('loyalty_points')
export class LoyaltyPoints extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  customer: User;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn()
  business: Business;

  @Column({ type: 'int' })
  points: number; // Positive for earned, negative for redeemed

  @Column({
    type: 'enum',
    enum: LoyaltyTransactionType,
  })
  type: LoyaltyTransactionType;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Booking, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  booking?: Booking;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date; // Points expiration date

  @Column({ type: 'int', default: 0 })
  balance: number; // Running balance after this transaction
}

