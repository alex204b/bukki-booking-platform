import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Business } from './business.entity';
import { encryptedTransformer } from '../../common/utils/crypto.util';

@Entity('business_contacts')
export class BusinessContact extends BaseEntity {
  @ManyToOne(() => Business, business => business.id, { onDelete: 'CASCADE' })
  business: Business;

  @Column({ transformer: encryptedTransformer })
  email: string;

  @Index()
  @Column({ nullable: true })
  emailHash: string;

  @Column({ nullable: true })
  name: string;

  @Column({ default: true })
  subscribed: boolean;
}


