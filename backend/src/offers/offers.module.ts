import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { Offer } from './entities/offer.entity';
import { Business } from '../businesses/entities/business.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../common/services/email.service';
import { PushNotificationService } from '../notifications/push-notification.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Offer, Business, Booking, User]),
    NotificationsModule,
  ],
  controllers: [OffersController],
  providers: [OffersService, EmailService],
  exports: [OffersService],
})
export class OffersModule {}

