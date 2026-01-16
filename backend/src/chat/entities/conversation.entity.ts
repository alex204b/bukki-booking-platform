import { Entity, Column, ManyToOne, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Business } from '../../businesses/entities/business.entity';
import { ChatMessage } from './chat-message.entity';

@Entity('conversations')
@Index(['businessId', 'customerId'], { unique: true })
export class Conversation extends BaseEntity {
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  business: Business;

  @Column()
  businessId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  customer: User;

  @Column()
  customerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  businessOwner: User;

  @Column()
  businessOwnerId: string;

  @OneToMany(() => ChatMessage, message => message.conversation)
  messages: ChatMessage[];

  @Column({ nullable: true })
  lastMessageId?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @Column({ type: 'text', nullable: true })
  lastMessagePreview?: string;

  @Column({ default: 0 })
  customerUnreadCount: number;

  @Column({ default: 0 })
  businessUnreadCount: number;
}
