import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  APPROVE = 'approve',
  REJECT = 'reject',
  VERIFY = 'verify',
  CANCEL = 'cancel',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['entityType', 'entityId'])
export class AuditLog extends BaseEntity {
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  user?: User;

  @Column({ nullable: true })
  userId?: string;

  @Column()
  action: AuditAction;

  @Column()
  entityType: string; // e.g., 'business', 'booking', 'user'

  @Column({ nullable: true })
  entityId?: string;

  @Column({ type: 'json', nullable: true })
  changes?: {
    before?: any;
    after?: any;
  };

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  description?: string;
}

