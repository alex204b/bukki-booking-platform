import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Business } from '../../businesses/entities/business.entity';

@Entity('customer_profiles')
export class CustomerProfile extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  customer: User;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn()
  business: Business;

  @Column({ type: 'int', default: 0 })
  totalBookings: number;

  @Column({ type: 'int', default: 0 })
  totalSpent: number; // In cents

  @Column({ type: 'timestamp', nullable: true })
  lastBookingDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  firstBookingDate?: Date;

  @Column({ type: 'json', nullable: true })
  preferences?: {
    preferredServices?: string[];
    preferredTimeSlots?: string[];
    notes?: string;
    allergies?: string[];
    specialRequests?: string;
  };

  @Column({ type: 'json', nullable: true })
  tags?: string[]; // e.g., "VIP", "Regular", "New Customer"

  @Column({ type: 'int', default: 0 })
  loyaltyPoints: number;

  @Column({ type: 'timestamp', nullable: true })
  lastContactDate?: Date;
}

