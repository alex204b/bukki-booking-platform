import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { Business } from '../businesses/entities/business.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
  ) {}

  async create(createServiceDto: any, businessId: string, userId: string, userRole: string): Promise<Service> {
    // Check if user owns the business or is super admin
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    if (business.owner.id !== userId && userRole !== 'super_admin') {
      throw new ForbiddenException('You can only add services to your own business');
    }

    const service = this.serviceRepository.create({
      ...createServiceDto,
      business: { id: businessId },
    });

    const saved = await (this.serviceRepository.save(service as any) as unknown as Service);
    return saved;
  }

  async findAll(businessId?: string): Promise<Service[]> {
    const where = businessId ? { business: { id: businessId } } : {};
    return this.serviceRepository.find({
      where,
      relations: ['business'],
      select: {
        business: {
          id: true,
          name: true,
          category: true,
        },
      },
    });
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: ['business'],
      select: {
        business: {
          id: true,
          name: true,
          category: true,
          owner: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async findByBusiness(businessId: string): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { business: { id: businessId } },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateServiceDto: any, userId: string, userRole: string): Promise<Service> {
    const service = await this.findOne(id);

    // Check if user owns the business or is super admin
    if (service.business.owner.id !== userId && userRole !== 'super_admin') {
      throw new ForbiddenException('You can only update services for your own business');
    }

    Object.assign(service, updateServiceDto);
    return this.serviceRepository.save(service);
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const service = await this.findOne(id);

    // Check if user owns the business or is super admin
    if (service.business.owner.id !== userId && userRole !== 'super_admin') {
      throw new ForbiddenException('You can only delete services from your own business');
    }

    await this.serviceRepository.remove(service);
  }

  async getAvailableSlots(serviceId: string, date: string): Promise<any[]> {
    const service = await this.findOne(serviceId);
    
    // This is a simplified implementation
    // In production, you'd want to check existing bookings and business hours
    const slots = [];
    const startTime = new Date(`${date}T09:00:00`);
    const endTime = new Date(`${date}T17:00:00`);
    
    for (let time = new Date(startTime); time < endTime; time.setMinutes(time.getMinutes() + service.duration)) {
      slots.push({
        time: new Date(time),
        available: true, // This would be calculated based on existing bookings
      });
    }
    
    return slots;
  }

  async searchServices(query: string, category?: string, location?: string): Promise<Service[]> {
    const qb = this.serviceRepository.createQueryBuilder('service')
      .leftJoinAndSelect('service.business', 'business')
      .leftJoinAndSelect('business.owner', 'owner')
      .where('business.status = :status', { status: 'approved' as any })
      .andWhere('business.isActive = :isActive', { isActive: true })
      .andWhere('service.isActive = :serviceActive', { serviceActive: true });

    if (query) {
      qb.andWhere('(service.name ILIKE :query OR service.description ILIKE :query)', {
        query: `%${query}%`,
      });
    }

    if (category) {
      qb.andWhere('business.category = :category', { category });
    }

    if (location) {
      qb.andWhere('(business.city ILIKE :location OR business.state ILIKE :location)', {
        location: `%${location}%`,
      });
    }

    return qb.getMany();
  }

  async getPopularServices(limit: number = 10): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { isActive: true },
      relations: ['business'],
      order: { bookingCount: 'DESC' },
      take: limit,
      select: {
        business: {
          id: true,
          name: true,
          category: true,
          city: true,
          state: true,
        },
      },
    });
  }
}
