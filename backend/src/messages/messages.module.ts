import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessagesScheduler } from './messages.scheduler';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Business } from '../businesses/entities/business.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { BusinessMember } from '../businesses/entities/business-member.entity';
import { EmailService } from '../common/services/email.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User, Business, Booking, BusinessMember]),
    NotificationsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesScheduler, EmailService],
  exports: [MessagesService],
})
export class MessagesModule {}

