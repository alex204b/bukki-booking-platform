import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Service } from './entities/service.entity';
import { Business } from '../businesses/entities/business.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
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
      relations: ['business', 'business.owner'],
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

    // Check if business exists and has owner
    if (!service.business) {
      throw new NotFoundException('Business not found for this service');
    }

    if (!service.business.owner || !service.business.owner.id) {
      throw new ForbiddenException('Business owner information is missing. Please contact support.');
    }

    // Check if user owns the business or is super admin
    if (service.business.owner.id !== userId && userRole !== 'super_admin') {
      throw new ForbiddenException('You can only update services for your own business');
    }

    Object.assign(service, updateServiceDto);
    return this.serviceRepository.save(service);
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const service = await this.findOne(id);

    // Check if business exists and has owner
    if (!service.business) {
      throw new NotFoundException('Business not found for this service');
    }

    if (!service.business.owner || !service.business.owner.id) {
      throw new ForbiddenException('Business owner information is missing. Please contact support.');
    }

    // Check if user owns the business or is super admin
    if (service.business.owner.id !== userId && userRole !== 'super_admin') {
      throw new ForbiddenException('You can only delete services from your own business');
    }

    await this.serviceRepository.remove(service);
  }

  async getAvailableSlots(serviceId: string, date: string): Promise<any[]> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      relations: ['business']
    });
    
    if (!service) {
      return [];
    }
    
    const business = service.business;
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    console.log('Day of week:', dayOfWeek);
    console.log('Business working hours:', business?.workingHours);
    
    // Parse working hours
    let workingHoursData = business?.workingHours;
    if (typeof workingHoursData === 'string') {
      try {
        workingHoursData = JSON.parse(workingHoursData);
      } catch (error) {
        console.log('Error parsing working hours:', error);
        return [];
      }
    }
    
    // If no working hours are set, use default working hours
    if (!workingHoursData) {
      console.log('No working hours found, using default');
      workingHoursData = {
        "monday": {"isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        "tuesday": {"isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        "wednesday": {"isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        "thursday": {"isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        "friday": {"isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        "saturday": {"isOpen": false},
        "sunday": {"isOpen": false}
      };
    }
    
    console.log('Parsed working hours:', workingHoursData);
    
    // Get working hours for the selected day
    const workingHours = workingHoursData?.[dayOfWeek];
    console.log('Working hours for', dayOfWeek, ':', workingHours);
    
    // If business is closed on this day, return empty array
    if (!workingHours || !workingHours.isOpen) {
      console.log('Business is closed on', dayOfWeek);
      return [];
    }
    
    // Generate time slots based on actual working hours
    const openTime = workingHours.openTime;
    const closeTime = workingHours.closeTime;
    
    if (!openTime || !closeTime) {
      console.log('No open/close times found');
      return [];
    }
    
    console.log('Open time:', openTime, 'Close time:', closeTime);
    
    // Parse times
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);
    
    const slots = [];
    let currentHour = openHour;
    let currentMin = openMin;
    
    // Generate 30-minute slots
    while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      slots.push({ time: timeString, available: true });
      
      // Add 30 minutes
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }
    
    console.log('Generated', slots.length, 'slots:', slots);
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
