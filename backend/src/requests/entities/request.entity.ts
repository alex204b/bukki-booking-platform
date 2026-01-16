import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Business } from '../../businesses/entities/business.entity';
import { User } from '../../users/entities/user.entity';

export enum RequestType {
  UNSUSPENSION = 'unsuspension',
  SUSPENSION = 'suspension',
  VERIFICATION = 'verification',
  APPEAL = 'appeal',
  FEATURE_REQUEST = 'feature_request',
  OTHER = 'other',
}

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('requests')
export class Request extends BaseEntity {
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({
    type: 'varchar',
    length: 50,
  })
  requestType: RequestType;

  @Column({
    type: 'varchar',
    length: 20,
    default: RequestStatus.PENDING,
  })
  status: RequestStatus;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'text', nullable: true })
  adminResponse?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  requestedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt?: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'respondedBy' })
  respondedBy?: User;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    businessName?: string;
    ownerEmail?: string;
    ownerId?: string;
    [key: string]: any;
  };
}

