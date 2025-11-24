import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum DevicePlatform {
  WEB = 'web',
  ANDROID = 'android',
  IOS = 'ios',
}

@Entity('device_tokens')
export class DeviceToken extends BaseEntity {
  @Column()
  token: string;

  @Column({
    type: 'enum',
    enum: DevicePlatform,
    default: DevicePlatform.WEB,
  })
  platform: DevicePlatform;

  @Column({ nullable: true })
  deviceId: string; // Unique device identifier

  @Column({ nullable: true })
  deviceName: string; // e.g., "iPhone 13", "Chrome Browser"

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  notificationPreferences: {
    bookingConfirmations: boolean;
    bookingReminders: boolean;
    bookingCancellations: boolean;
    bookingUpdates: boolean;
    messages: boolean;
    reviews: boolean;
  };

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;
}

