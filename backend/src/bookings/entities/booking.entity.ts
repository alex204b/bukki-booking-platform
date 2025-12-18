import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Business } from '../../businesses/entities/business.entity';
import { Service } from '../../services/entities/service.entity';
import { Review } from '../../reviews/entities/review.entity';
import { encryptedTransformer } from '../../common/utils/crypto.util';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}


@Entity('bookings')
export class Booking extends BaseEntity {
  @Column({ type: 'timestamp' })
  appointmentDate: Date;

  @Column({ type: 'timestamp' })
  appointmentEndDate: Date;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ nullable: true })
  paymentStatus: string;

  @Column({ type: 'json', nullable: true })
  paymentDetails: {
    stripePaymentIntentId?: string;
    amount?: number;
    currency?: string;
    paidAt?: Date;
    failureReason?: string;
    failedAt?: Date;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'totalAmount' })
  totalAmount: number;

  @Column({ type: 'json', nullable: true })
  customFieldValues: Record<string, any>;

  @Column({ nullable: true, transformer: encryptedTransformer })
  notes: string;

  @Column({ nullable: true })
  qrCode: string;

  @Column({ type: 'timestamp', nullable: true })
  checkedInAt: Date;

  @Column({ default: false })
  checkedIn: boolean;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true })
  cancellationReason: string;

  @Column({ type: 'timestamp', nullable: true })
  reminderSentAt: Date;

  // Recurring booking fields
  @Column({ default: false })
  isRecurring: boolean;

  @Column({ nullable: true })
  recurrencePattern?: 'weekly' | 'biweekly' | 'monthly';

  @Column({ type: 'timestamp', nullable: true })
  recurrenceEndDate?: Date;

  @Column({ nullable: true })
  parentBookingId?: string; // For recurring bookings - links to original booking

  @Column({ nullable: true })
  recurrenceSequence?: number; // Sequence number in the recurring series

  // Relations
  @ManyToOne(() => User, user => user.bookings)
  @JoinColumn()
  customer: User;

  @ManyToOne(() => Business, business => business.bookings)
  @JoinColumn()
  business: Business;

  @ManyToOne(() => Service, service => service.bookings)
  @JoinColumn()
  service: Service;

  // Note: Reviews are now linked to businesses, not bookings
  // @OneToMany(() => Review, review => review.booking)
  // reviews: Review[];
}
