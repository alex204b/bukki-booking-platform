import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Business } from '../../businesses/entities/business.entity';

export enum NotificationType {
  TEAM_INVITATION = 'team_invitation',
  PROMOTIONAL_OFFER = 'promotional_offer',
  SYSTEM_NOTIFICATION = 'system_notification',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_REMINDER = 'booking_reminder',
  REVIEW_REQUEST = 'review_request',
  BUSINESS_UPDATE = 'business_update',
  SPECIAL_ANNOUNCEMENT = 'special_announcement',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

@Entity('notifications')
@Index(['recipientId', 'status'])
export class Notification extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  recipient: User;

  @Column()
  recipientId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  sender?: User;

  @Column({ nullable: true })
  senderId?: string;

  @ManyToOne(() => Business, { nullable: true, onDelete: 'CASCADE' })
  business?: Business;

  @Column({ nullable: true })
  businessId?: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
  })
  status: NotificationStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    offerCode?: string;
    discount?: number;
    validUntil?: string;
    businessMemberId?: string;
    bookingId?: string;
    actionData?: any;
  };

  @Column({ length: 500, nullable: true })
  actionUrl?: string;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;
}
