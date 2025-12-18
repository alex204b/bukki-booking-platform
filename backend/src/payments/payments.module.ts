import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Booking } from '../bookings/entities/booking.entity';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [TypeOrmModule.forFeature([Booking])],
  controllers: [PaymentsController],
  providers: [PaymentsService, EmailService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
