import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { Business } from './entities/business.entity';
import { BusinessMember } from './entities/business-member.entity';
import { BusinessContact } from './entities/business-contact.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { MessagesModule } from '../messages/messages.module';
import { RequestsModule } from '../requests/requests.module';
import { multerConfig } from '../common/config/multer.config';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, BusinessMember, BusinessContact, User]),
    ConfigModule,
    MulterModule.register(multerConfig),
    StorageModule,
    UsersModule,
    MessagesModule,
    forwardRef(() => RequestsModule),
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
