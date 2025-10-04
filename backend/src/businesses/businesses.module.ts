import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { Business } from './entities/business.entity';
import { BusinessMember } from './entities/business-member.entity';
import { BusinessContact } from './entities/business-contact.entity';
import { UsersModule } from '../users/users.module';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, BusinessMember, BusinessContact]),
    UsersModule,
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService, EmailService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
