import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';
import { Waitlist } from './entities/waitlist.entity';
import { User } from '../users/entities/user.entity';
import { Business } from '../businesses/entities/business.entity';
import { Service } from '../services/entities/service.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { EmailService } from '../common/services/email.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Waitlist, User, Business, Service, Booking]),
    NotificationsModule,
  ],
  controllers: [WaitlistController],
  providers: [WaitlistService, EmailService],
  exports: [WaitlistService],
})
export class WaitlistModule {}

