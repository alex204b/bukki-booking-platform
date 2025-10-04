import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { Service } from '../services/entities/service.entity';
import { Business } from '../businesses/entities/business.entity';
import { BusinessMember } from '../businesses/entities/business-member.entity';
import { User } from '../users/entities/user.entity';
import { ReviewsModule } from '../reviews/reviews.module';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Service, Business, BusinessMember, User]),
    ReviewsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, EmailService],
  exports: [BookingsService],
})
export class BookingsModule {}
