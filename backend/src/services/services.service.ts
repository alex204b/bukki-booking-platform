import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Service } from './entities/service.entity';
import { Business } from '../businesses/entities/business.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Resource, ResourceType } from '../resources/entities/resource.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async create(createServiceDto: any, businessId: string, userId: string, userRole: string): Promise<Service> {
    console.log(`[ServicesService] create called`);
    console.log(`[ServicesService] Business ID: ${businessId}, User ID: ${userId}`);
    console.log(`[ServicesService] Service data:`, createServiceDto);

    // Check if user owns the business or is super admin
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      console.error(`[ServicesService] Business not found: ${businessId}`);
      throw new NotFoundException('Business not found');
    }

    if (business.owner.id !== userId && userRole !== 'super_admin') {
      console.error(`[ServicesService] Unauthorized: Owner ID mismatch`);
      throw new ForbiddenException('You can only add services to your own business');
    }

    console.log(`[ServicesService] Business found: ${business.name}`);
    console.log(`[ServicesService] Owner ID: ${business.owner.id}, Requested User ID: ${userId}`);

    try {
      // Prepare service data
      const now = new Date();
      const imagesJson = createServiceDto.images 
        ? (typeof createServiceDto.images === 'string' ? createServiceDto.images : JSON.stringify(createServiceDto.images))
        : null;
      const customFieldsJson = createServiceDto.customFields
        ? (typeof createServiceDto.customFields === 'string' ? createServiceDto.customFields : JSON.stringify(createServiceDto.customFields))
        : null;
      
      const serviceData = {
        name: createServiceDto.name || '',
        description: createServiceDto.description || null,
        price: parseFloat(createServiceDto.price) || 0,
        duration: parseInt(createServiceDto.duration) || 30,
        isActive: createServiceDto.isActive !== undefined ? createServiceDto.isActive : true,
        images: imagesJson,
        customFields: customFieldsJson,
        maxBookingsPerSlot: parseInt(createServiceDto.maxBookingsPerSlot) || 1,
        advanceBookingDays: parseInt(createServiceDto.advanceBookingDays) || 0,
        cancellationHours: parseInt(createServiceDto.cancellationHours) || 0,
        rating: 0,
        reviewCount: 0,
        bookingCount: 0,
        businessId: businessId,
        createdAt: now,
        updatedAt: now,
      };

      console.log(`[ServicesService] Using DataSource directly for INSERT...`);
      console.log(`[ServicesService] Service data prepared:`, serviceData);

      // CRITICAL: Use DataSource directly to ensure INSERT commits to database
      let result;
      try {
        // Handle JSON columns - cast to jsonb only if not null
        const imagesParam = serviceData.images ? serviceData.images : null;
        const customFieldsParam = serviceData.customFields ? serviceData.customFields : null;
        
        result = await this.dataSource.query(
          `INSERT INTO services (
            name,
            description,
            price,
            duration,
            "isActive",
            images,
            "customFields",
            "maxBookingsPerSlot",
            "advanceBookingDays",
            "cancellationHours",
            rating,
            "reviewCount",
            "bookingCount",
            "businessId",
            "createdAt",
            "updatedAt"
          ) VALUES (
            $1, $2, $3::decimal, $4, $5, 
            CASE WHEN $6 IS NULL THEN NULL ELSE $6::jsonb END,
            CASE WHEN $7 IS NULL THEN NULL ELSE $7::jsonb END,
            $8, $9, $10, $11::decimal, $12, $13, $14::uuid, $15, $16
          )
          RETURNING id, "createdAt", "updatedAt"`,
          [
            serviceData.name,
            serviceData.description,
            serviceData.price.toString(),
            serviceData.duration,
            serviceData.isActive,
            imagesParam,
            customFieldsParam,
            serviceData.maxBookingsPerSlot,
            serviceData.advanceBookingDays,
            serviceData.cancellationHours,
            serviceData.rating.toString(),
            serviceData.reviewCount,
            serviceData.bookingCount,
            serviceData.businessId,
            serviceData.createdAt,
            serviceData.updatedAt,
          ]
        );
        console.log(`[ServicesService] ✅ INSERT successful!`);
        console.log(`[ServicesService] Result:`, result);
      } catch (sqlError: any) {
        console.error(`[ServicesService] ❌ SQL Error during INSERT:`, sqlError);
        console.error(`[ServicesService] SQL Error code:`, sqlError.code);
        console.error(`[ServicesService] SQL Error message:`, sqlError.message);
        console.error(`[ServicesService] SQL Error detail:`, sqlError.detail);
        console.error(`[ServicesService] SQL Error hint:`, sqlError.hint);
        throw new Error(`Database error: ${sqlError.message || 'Failed to insert service'}`);
      }

      if (!result || result.length === 0) {
        console.error(`[ServicesService] ❌ INSERT returned no result`);
        throw new Error('Failed to create service - no result returned');
      }

      const insertedId = result[0].id;
      console.log(`[ServicesService] Inserted service ID: ${insertedId}`);

      // Verify the service was actually saved by querying it back
      console.log(`[ServicesService] Verifying service was saved...`);
      const verification = await this.dataSource.query(
        `SELECT * FROM services WHERE id = $1`,
        [insertedId]
      );

      if (!verification || verification.length === 0) {
        console.error(`[ServicesService] ❌ CRITICAL: Service not found after INSERT!`);
        throw new Error('Service was not saved to database');
      }

      console.log(`[ServicesService] ✅ Verification successful! Service found in database`);
      console.log(`[ServicesService] Verified service:`, verification[0]);

      // Return the service using findOne to get full entity with relations
      const savedService = await this.serviceRepository.findOne({
        where: { id: insertedId },
        relations: ['business'],
      });

      if (!savedService) {
        console.error(`[ServicesService] ❌ Service not found via TypeORM after INSERT`);
        // Return the raw data if TypeORM can't find it
        return verification[0] as any;
      }

      console.log(`[ServicesService] ✅ Service created successfully: ${savedService.name}`);
      return savedService;
    } catch (error: any) {
      console.error(`[ServicesService] ❌ Error creating service:`, error);
      console.error(`[ServicesService] Error stack:`, error.stack);
      throw error;
    }
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
    console.log(`[ServicesService] findByBusiness called for businessId: ${businessId}`);
    
    try {
      // Use raw SQL to ensure data is fetched from remote database
      const services = await this.dataSource.query(
        `SELECT * FROM services 
         WHERE "businessId" = $1 
         AND "deletedAt" IS NULL
         ORDER BY "createdAt" DESC`,
        [businessId]
      );
      
      console.log(`[ServicesService] Found ${services.length} service(s) for business ${businessId}`);
      
      // Parse JSON columns
      const parsedServices = services.map((service: any) => {
        if (service.images && typeof service.images === 'string') {
          try {
            service.images = JSON.parse(service.images);
          } catch (e) {
            console.warn(`[ServicesService] Failed to parse images JSON for service ${service.id}:`, e);
            service.images = null;
          }
        }
        if (service.customFields && typeof service.customFields === 'string') {
          try {
            service.customFields = JSON.parse(service.customFields);
          } catch (e) {
            console.warn(`[ServicesService] Failed to parse customFields JSON for service ${service.id}:`, e);
            service.customFields = null;
          }
        }
        return service;
      });
      
      console.log(`[ServicesService] ✅ Successfully fetched services for business ${businessId}`);
      return parsedServices;
    } catch (error: any) {
      console.error(`[ServicesService] ❌ Error fetching services for business ${businessId}:`, error);
      throw error;
    }
  }

  async update(id: string, updateServiceDto: any, userId: string, userRole: string): Promise<Service> {
    console.log(`[ServicesService] update called`);
    console.log(`[ServicesService] Service ID: ${id}, User ID: ${userId}`);
    console.log(`[ServicesService] Update data:`, updateServiceDto);

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

    try {
      // Build UPDATE query dynamically based on provided fields
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updateServiceDto.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updateServiceDto.name);
      }
      if (updateServiceDto.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(updateServiceDto.description);
      }
      if (updateServiceDto.price !== undefined) {
        updateFields.push(`price = $${paramIndex++}`);
        updateValues.push(updateServiceDto.price.toString());
      }
      if (updateServiceDto.duration !== undefined) {
        updateFields.push(`duration = $${paramIndex++}`);
        updateValues.push(parseInt(updateServiceDto.duration));
      }
      if (updateServiceDto.isActive !== undefined) {
        updateFields.push(`"isActive" = $${paramIndex++}`);
        updateValues.push(updateServiceDto.isActive);
      }
      if (updateServiceDto.images !== undefined) {
        updateFields.push(`images = $${paramIndex++}`);
        updateValues.push(updateServiceDto.images ? JSON.stringify(updateServiceDto.images) : null);
      }
      if (updateServiceDto.customFields !== undefined) {
        updateFields.push(`"customFields" = $${paramIndex++}`);
        updateValues.push(updateServiceDto.customFields ? JSON.stringify(updateServiceDto.customFields) : null);
      }
      if (updateServiceDto.maxBookingsPerSlot !== undefined) {
        updateFields.push(`"maxBookingsPerSlot" = $${paramIndex++}`);
        updateValues.push(parseInt(updateServiceDto.maxBookingsPerSlot));
      }
      if (updateServiceDto.advanceBookingDays !== undefined) {
        updateFields.push(`"advanceBookingDays" = $${paramIndex++}`);
        updateValues.push(parseInt(updateServiceDto.advanceBookingDays));
      }
      if (updateServiceDto.cancellationHours !== undefined) {
        updateFields.push(`"cancellationHours" = $${paramIndex++}`);
        updateValues.push(parseInt(updateServiceDto.cancellationHours));
      }

      // Always update updatedAt
      updateFields.push(`"updatedAt" = $${paramIndex++}`);
      updateValues.push(new Date());

      if (updateFields.length === 0) {
        console.log(`[ServicesService] No fields to update`);
        return service;
      }

      // Add id as last parameter
      updateValues.push(id);

      console.log(`[ServicesService] Using DataSource directly for UPDATE...`);
      console.log(`[ServicesService] Update fields:`, updateFields);
      console.log(`[ServicesService] Update values:`, updateValues);

      // CRITICAL: Use DataSource directly to ensure UPDATE commits to database
      const result = await this.dataSource.query(
        `UPDATE services 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, "updatedAt"`,
        updateValues
      );

      console.log(`[ServicesService] ✅ UPDATE successful!`);
      console.log(`[ServicesService] Result:`, result);

      if (!result || result.length === 0) {
        console.error(`[ServicesService] ❌ UPDATE returned no result`);
        throw new Error('Failed to update service - no result returned');
      }

      // Verify the service was actually updated
      console.log(`[ServicesService] Verifying service was updated...`);
      const verification = await this.dataSource.query(
        `SELECT * FROM services WHERE id = $1`,
        [id]
      );

      if (!verification || verification.length === 0) {
        console.error(`[ServicesService] ❌ CRITICAL: Service not found after UPDATE!`);
        throw new Error('Service was not updated in database');
      }

      console.log(`[ServicesService] ✅ Verification successful! Service updated in database`);

      // Return the updated service using findOne to get full entity with relations
      const updatedService = await this.serviceRepository.findOne({
        where: { id },
        relations: ['business'],
      });

      if (!updatedService) {
        console.error(`[ServicesService] ❌ Service not found via TypeORM after UPDATE`);
        // Return the raw data if TypeORM can't find it
        return verification[0] as any;
      }

      console.log(`[ServicesService] ✅ Service updated successfully: ${updatedService.name}`);
      return updatedService;
    } catch (error: any) {
      console.error(`[ServicesService] ❌ Error updating service:`, error);
      console.error(`[ServicesService] Error stack:`, error.stack);
      throw error;
    }
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

  async getAvailableSlots(serviceId: string, date: string, partySize?: number): Promise<any[]> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      relations: ['business', 'resources']
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

    // Generate base time slots using service duration
    const slots = this.generateTimeSlots(openTime, closeTime, service.duration);

    // If service doesn't use resources, check booking availability for each slot
    if (!service.resourceType || (!service.requireResourceSelection && !service.resources?.length)) {
      console.log('Service does not use resources, checking booking availability');
      
      const slotsWithAvailability = await Promise.all(
        slots.map(async (slot) => {
          const appointmentStart = new Date(`${date}T${slot.time}`);
          const appointmentEnd = new Date(
            appointmentStart.getTime() + service.duration * 60000
          );

          // Check how many bookings exist for this time slot
          const existingBookings = await this.bookingRepository
            .createQueryBuilder('booking')
            .where('booking.serviceId = :serviceId', { serviceId: service.id })
            .andWhere('booking.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
            .andWhere('booking.appointmentDate >= :start', { start: appointmentStart })
            .andWhere('booking.appointmentDate < :end', { end: appointmentEnd })
            .getCount();

          // Check if we've reached the maximum bookings per slot
          const maxBookings = service.maxBookingsPerSlot || 1;
          const available = existingBookings < maxBookings;

          return {
            time: slot.time,
            available,
            bookedCount: existingBookings,
            maxBookings,
          };
        })
      );

      console.log('Generated', slotsWithAvailability.length, 'slots with availability (no resources)');
      return slotsWithAvailability;
    }

    // For resource-based services, check per-slot availability
    const resources = service.resources?.filter(r => r.isActive) || [];

    if (resources.length === 0) {
      console.log('No active resources found for this service');
      return slots.map(slot => ({ ...slot, available: false }));
    }

    console.log(`Checking availability for ${resources.length} resources`);

    const slotsWithAvailability = await Promise.all(
      slots.map(async (slot) => {
        const availableCount = await this.countAvailableResources(
          service,
          resources,
          date,
          slot.time,
          partySize
        );

        return {
          time: slot.time,
          available: availableCount > 0,
          availableResourceCount: availableCount,
        };
      })
    );

    console.log('Generated', slotsWithAvailability.length, 'slots with availability');
    return slotsWithAvailability;
  }

  private generateTimeSlots(openTime: string, closeTime: string, serviceDuration: number): { time: string }[] {
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);

    const slots = [];
    let currentHour = openHour;
    let currentMin = openMin;

    while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      slots.push({ time: timeString });

      // Increment by service duration instead of fixed 30 minutes
      currentMin += serviceDuration;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }

    return slots;
  }

  private async countAvailableResources(
    service: Service,
    resources: Resource[],
    date: string,
    time: string,
    partySize?: number
  ): Promise<number> {
    const appointmentStart = new Date(`${date}T${time}`);
    const appointmentEnd = new Date(
      appointmentStart.getTime() + service.duration * 60000
    );

    let availableCount = 0;

    for (const resource of resources) {
      // Check resource working hours
      if (!this.isResourceWorking(resource, service.business, appointmentStart)) {
        continue;
      }

      // For tables: check capacity
      if (service.resourceType === ResourceType.TABLE && partySize) {
        if (!resource.capacity || resource.capacity < partySize) {
          continue;
        }
      }

      // Check booking conflicts
      const hasConflict = await this.hasResourceConflict(
        resource.id,
        appointmentStart,
        appointmentEnd
      );

      if (!hasConflict) {
        availableCount++;
      }
    }

    return availableCount;
  }

  private isResourceWorking(resource: Resource, business: Business, time: Date): boolean {
    const workingHours = resource.workingHours || business.workingHours;
    const dayOfWeek = time.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    let workingHoursData = workingHours;
    if (typeof workingHoursData === 'string') {
      try {
        workingHoursData = JSON.parse(workingHoursData);
      } catch (error) {
        return false;
      }
    }

    const dayHours = workingHoursData?.[dayOfWeek];

    if (!dayHours || !dayHours.isOpen) return false;

    const timeStr = time.toTimeString().substring(0, 5);
    return timeStr >= dayHours.openTime && timeStr < dayHours.closeTime;
  }

  private async hasResourceConflict(
    resourceId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const conflict = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.resourceId = :resourceId', { resourceId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: ['pending', 'confirmed']
      })
      .andWhere('booking.appointmentDate < :endTime', { endTime })
      .andWhere('booking.appointmentEndDate > :startTime', { startTime })
      .getCount();

    return conflict > 0;
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
