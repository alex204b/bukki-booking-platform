import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Business } from '../../businesses/entities/business.entity';
import { Service } from './service.entity';

@Entity('service_packages')
export class ServicePackage extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0 })
  duration: number; // Total duration in minutes

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  images: string[];

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discount: number; // Percentage discount

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn()
  business: Business;

  @OneToMany(() => ServicePackageItem, item => item.package, { cascade: true })
  items: ServicePackageItem[];
}

@Entity('service_package_items')
export class ServicePackageItem extends BaseEntity {
  @ManyToOne(() => ServicePackage, packageEntity => packageEntity.items, { onDelete: 'CASCADE' })
  @JoinColumn()
  package: ServicePackage;

  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  @JoinColumn()
  service: Service;

  @Column({ type: 'int', default: 1 })
  quantity: number; // How many times this service is included

  @Column({ type: 'int', nullable: true })
  order: number; // Order in the package
}

