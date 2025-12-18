import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Business } from '../../businesses/entities/business.entity';

@Entity('offers')
export class Offer extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountAmount: number; // Fixed discount amount

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountPercentage: number; // Percentage discount (0-100)

  @Column({ type: 'varchar', length: 50, nullable: true })
  discountCode: string; // Optional promo code

  @Column({ type: 'timestamp', nullable: true })
  validUntil: Date; // Offer expiration date

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: {
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    applicableServices?: string[]; // Service IDs
    termsAndConditions?: string;
  };

  // Relations
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column()
  businessId: string;
}

