import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Business } from '../../businesses/entities/business.entity';

export enum ReportType {
  USER = 'user',
  BUSINESS = 'business'
}

export enum ReportReason {
  NO_SHOW = 'no-show',
  FALSE_INFORMATION = 'false-info',
  INAPPROPRIATE_BEHAVIOR = 'inappropriate',
  SPAM = 'spam',
  OTHER = 'other'
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ReportType })
  type: ReportType;

  @Column({ type: 'enum', enum: ReportReason })
  reason: ReportReason;

  @Column({ type: 'text' })
  details: string;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @Column({ type: 'int', nullable: true })
  reportedUserId: number;

  @Column({ type: 'int', nullable: true })
  reportedBusinessId: number;

  @Column({ type: 'int' })
  reporterId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reportedUserId' })
  reportedUser: User;

  @ManyToOne(() => Business, { nullable: true })
  @JoinColumn({ name: 'reportedBusinessId' })
  reportedBusiness: Business;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
