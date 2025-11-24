import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Business } from '../../businesses/entities/business.entity';

@Entity('favorites')
@Index(['user', 'business'], { unique: true }) // One favorite per user per business
export class Favorite extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn()
  business: Business;
}

