import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Business } from '../../businesses/entities/business.entity';

export enum MessageType {
  TEAM_INVITATION = 'team_invitation',
  PROMOTIONAL_OFFER = 'promotional_offer',
  CHAT = 'chat', // Direct chat message between customer and business
  SYSTEM_NOTIFICATION = 'system_notification', // Automated messages from BUKKi system
}

export enum MessageStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
}

@Entity('messages')
export class Message extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  recipient: User;

  @ManyToOne(() => Business, { nullable: true, onDelete: 'CASCADE' })
  business?: Business;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  sender?: User;

  @Column({
    type: 'enum',
    enum: MessageType,
  })
  type: MessageType;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.UNREAD,
  })
  status: MessageStatus;

  // For chat messages: conversation/thread ID
  // Format: "customerId-businessId" or "businessId-customerId" (same conversation)
  @Column({ nullable: true })
  conversationId?: string;

  // For chat messages: reference to booking (optional)
  @Column({ nullable: true })
  bookingId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    offerCode?: string;
    discount?: number;
    validUntil?: string;
    businessMemberId?: string; // For team invitations
    bookingId?: string; // For chat messages related to a booking
  };
}

