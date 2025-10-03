import { Entity, Column, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Service } from '../../services/entities/service.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Review } from '../../reviews/entities/review.entity';

export enum BusinessStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

export enum BusinessCategory {
  BEAUTY_SALON = 'beauty_salon',
  TAILOR = 'tailor',
  MECHANIC = 'mechanic',
  RESTAURANT = 'restaurant',
  FITNESS = 'fitness',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  CONSULTING = 'consulting',
  OTHER = 'other',
}

@Entity('businesses')
export class Business extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: BusinessCategory,
  })
  category: BusinessCategory;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  zipCode: string;

  @Column()
  country: string;

  @Column({ nullable: true })
  latitude: number;

  @Column({ nullable: true })
  longitude: number;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ type: 'json', nullable: true })
  images: string[];

  @Column({
    type: 'enum',
    enum: BusinessStatus,
    default: BusinessStatus.PENDING,
  })
  status: BusinessStatus;

  @Column({ type: 'json', nullable: true })
  workingHours: {
    [key: string]: {
      isOpen: boolean;
      openTime?: string;
      closeTime?: string;
    };
  };

  @Column({ type: 'json', nullable: true })
  customBookingFields: {
    fieldName: string;
    fieldType: 'text' | 'number' | 'select' | 'textarea' | 'checkbox';
    isRequired: boolean;
    options?: string[];
  }[];

  @Column({ nullable: true })
  qrCode: string;

  @Column({ default: 0 })
  rating: number;

  @Column({ default: 0 })
  reviewCount: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  showRevenue: boolean;

  @Column({ default: false })
  autoAcceptBookings: boolean;

  @Column({ type: 'int', default: 2 })
  maxBookingsPerUserPerDay: number;

  @Column({ default: false })
  onboardingCompleted: boolean;

  @Column({ nullable: true })
  subscriptionPlan: string;

  @Column({ nullable: true })
  subscriptionExpiresAt: Date;

  // Relations
  @OneToOne(() => User, user => user.business)
  @JoinColumn()
  owner: User;

  @OneToMany(() => Service, service => service.business)
  services: Service[];

  @OneToMany(() => Booking, booking => booking.business)
  bookings: Booking[];

  @OneToMany(() => Review, review => review.business)
  reviews: Review[];
}
