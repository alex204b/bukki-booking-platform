import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TrustScoreService } from './trust-score.service';
import { User } from './entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Booking])],
  controllers: [UsersController],
  providers: [UsersService, TrustScoreService],
  exports: [UsersService, TrustScoreService],
})
export class UsersModule {}
