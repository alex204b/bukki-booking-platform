import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServicePackage, ServicePackageItem } from './entities/service-package.entity';
import { Service } from './entities/service.entity';
import { Business } from '../businesses/entities/business.entity';

@Injectable()
export class ServicePackagesService {
  constructor(
    @InjectRepository(ServicePackage)
    private packageRepository: Repository<ServicePackage>,
    @InjectRepository(ServicePackageItem)
    private packageItemRepository: Repository<ServicePackageItem>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
  ) {}

  async create(businessId: string, packageData: {
    name: string;
    description?: string;
    price: number;
    duration: number;
    discount?: number;
    serviceIds: { serviceId: string; quantity: number }[];
  }): Promise<ServicePackage> {
    const business = await this.businessRepository.findOne({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const packageEntity = this.packageRepository.create({
      ...packageData,
      business: { id: businessId } as any,
    });

    const savedPackage = await this.packageRepository.save(packageEntity);

    // Create package items
    for (let i = 0; i < packageData.serviceIds.length; i++) {
      const { serviceId, quantity } = packageData.serviceIds[i];
      const service = await this.serviceRepository.findOne({ where: { id: serviceId } });
      if (!service) {
        continue;
      }

      const item = this.packageItemRepository.create({
        package: { id: savedPackage.id } as any,
        service: { id: serviceId } as any,
        quantity,
        order: i,
      });

      await this.packageItemRepository.save(item);
    }

    return this.packageRepository.findOne({
      where: { id: savedPackage.id },
      relations: ['items', 'items.service'],
    });
  }

  async findByBusiness(businessId: string): Promise<ServicePackage[]> {
    return this.packageRepository.find({
      where: {
        business: { id: businessId },
        isActive: true,
      } as any,
      relations: ['items', 'items.service'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ServicePackage> {
    const packageEntity = await this.packageRepository.findOne({
      where: { id },
      relations: ['items', 'items.service', 'business'],
    });

    if (!packageEntity) {
      throw new NotFoundException('Service package not found');
    }

    return packageEntity;
  }

  async update(id: string, updateData: any, businessId: string): Promise<ServicePackage> {
    const packageEntity = await this.findOne(id);

    if (packageEntity.business.id !== businessId) {
      throw new ForbiddenException('You can only update your own packages');
    }

    Object.assign(packageEntity, updateData);
    return this.packageRepository.save(packageEntity);
  }

  async delete(id: string, businessId: string): Promise<void> {
    const packageEntity = await this.findOne(id);

    if (packageEntity.business.id !== businessId) {
      throw new ForbiddenException('You can only delete your own packages');
    }

    await this.packageRepository.delete(id);
  }
}

