import { Entity, Column, ManyToOne, JoinColumn, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Business } from '../../businesses/entities/business.entity';
import { User } from '../../users/entities/user.entity';
import { Service } from '../../services/entities/service.entity';

export enum ResourceType {
  STAFF = 'staff',
  TABLE = 'table',
  EQUIPMENT = 'equipment',
  ROOM = 'room',
}

@Entity('resources')
export class Resource extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: ResourceType;

  @ManyToOne(() => Business, business => business.resources)
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User; // For STAFF - links to BusinessMember

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', nullable: true })
  capacity?: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  workingHours?: {
    [key: string]: {
      isOpen: boolean;
      openTime?: string;
      closeTime?: string;
    };
  };

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @ManyToMany(() => Service, service => service.resources)
  services: Service[];
}
