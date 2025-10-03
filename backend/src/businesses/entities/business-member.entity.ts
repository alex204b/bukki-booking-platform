import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Business } from './business.entity';
import { User } from '../../users/entities/user.entity';

export enum BusinessMemberStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
  REMOVED = 'removed',
}

@Entity('business_members')
export class BusinessMember extends BaseEntity {
  @ManyToOne(() => Business, business => business.id, { onDelete: 'CASCADE' })
  business: Business;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user?: User | null;

  @Column()
  email: string;

  @Column({
    type: 'enum',
    enum: BusinessMemberStatus,
    default: BusinessMemberStatus.INVITED,
  })
  status: BusinessMemberStatus;
}


