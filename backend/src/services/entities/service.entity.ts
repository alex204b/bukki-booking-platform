import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Business } from '../../businesses/entities/business.entity';
import { Booking } from '../../bookings/entities/booking.entity';

@Entity('services')
export class Service extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 30 })
  duration: number; // in minutes

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  images: string[];

  @Column({ type: 'json', nullable: true })
  customFields: {
    fieldName: string;
    fieldType: 'text' | 'number' | 'select' | 'textarea' | 'checkbox';
    isRequired: boolean;
    options?: string[];
  }[];

  @Column({ type: 'int', default: 1 })
  maxBookingsPerSlot: number;

  @Column({ type: 'int', default: 0 })
  advanceBookingDays: number;

  @Column({ type: 'int', default: 0 })
  cancellationHours: number;

  @Column({ default: 0 })
  rating: number;

  @Column({ default: 0 })
  reviewCount: number;

  @Column({ default: 0 })
  bookingCount: number;

  // Relations
  @ManyToOne(() => Business, business => business.services)
  @JoinColumn()
  business: Business;

  @OneToMany(() => Booking, booking => booking.service)
  bookings: Booking[];
}
