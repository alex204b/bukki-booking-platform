import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesController } from './services.controller';
import { ServicePackagesController } from './service-packages.controller';
import { ServicesService } from './services.service';
import { ServicePackagesService } from './service-packages.service';
import { Service } from './entities/service.entity';
import { ServicePackage, ServicePackageItem } from './entities/service-package.entity';
import { Business } from '../businesses/entities/business.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Service, ServicePackage, ServicePackageItem, Business, Booking])],
  controllers: [ServicesController, ServicePackagesController],
  providers: [ServicesService, ServicePackagesService],
  exports: [ServicesService, ServicePackagesService],
})
export class ServicesModule {}
