import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { Business } from './entities/business.entity';
import { BusinessMember } from './entities/business-member.entity';
import { BusinessContact } from './entities/business-contact.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { MessagesModule } from '../messages/messages.module';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, BusinessMember, BusinessContact, User]),
    ConfigModule,
    UsersModule,
    MessagesModule,
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService, EmailService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
