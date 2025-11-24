import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Business } from '../../businesses/entities/business.entity';
import { Service } from '../../services/entities/service.entity';

export enum WaitlistStatus {
  ACTIVE = 'active',
  NOTIFIED = 'notified',
  BOOKED = 'booked',
  CANCELLED = 'cancelled',
}

@Entity('waitlist')
export class Waitlist extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  customer: User;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn()
  business: Business;

  @ManyToOne(() => Service, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  service?: Service;

  @Column({
    type: 'enum',
    enum: WaitlistStatus,
    default: WaitlistStatus.ACTIVE,
  })
  status: WaitlistStatus;

  @Column({ type: 'timestamp', nullable: true })
  preferredDate?: Date; // Preferred date for booking

  @Column({ type: 'timestamp', nullable: true })
  notifiedAt?: Date; // When customer was notified of availability

  @Column({ type: 'timestamp', nullable: true })
  bookedAt?: Date; // When customer booked after notification

  @Column({ nullable: true })
  notes?: string; // Customer notes/preferences
}

