import { Entity, Column, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Business } from '../../businesses/entities/business.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Review } from '../../reviews/entities/review.entity';
import { encryptedTransformer } from '../../common/utils/crypto.util';

export enum UserRole {
  CUSTOMER = 'customer',
  BUSINESS_OWNER = 'business_owner',
  EMPLOYEE = 'employee',
  SUPER_ADMIN = 'super_admin',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true, transformer: encryptedTransformer })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 100 })
  trustScore: number;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true, transformer: encryptedTransformer })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  zipCode: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  dateOfBirth: Date;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken: string;

  @Column({ nullable: true })
  passwordResetToken: string;

  @Column({ nullable: true })
  passwordResetExpires: Date;

  // Relations
  @OneToOne(() => Business, business => business.owner)
  business?: Business;

  @OneToMany(() => Booking, booking => booking.customer)
  bookings: Booking[];

  @OneToMany(() => Review, review => review.user)
  reviews: Review[];
}
