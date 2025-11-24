import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('two_factor_auth')
export class TwoFactorAuth extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  secret: string; // TOTP secret

  @Column({ default: false })
  isEnabled: boolean;

  @Column({ type: 'json', nullable: true })
  backupCodes?: string[]; // Backup codes for recovery

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;
}

