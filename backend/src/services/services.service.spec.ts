import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { ServicesService } from './services.service';
import { Service } from './entities/service.entity';
import { Business } from '../businesses/entities/business.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';

describe('ServicesService', () => {
  let service: ServicesService;
  let serviceRepository: any;
  let businessRepository: any;
  let bookingRepository: any;
  let dataSource: any;

  const mockBusiness = {
    id: 'business-1',
    name: 'Test Business',
    owner: { id: 'owner-1', email: 'owner@test.com' },
  };

  const mockService = {
    id: 'service-1',
    name: 'Test Service',
    description: 'Test Description',
    price: 50.00,
    duration: 60,
    isActive: true,
    business: mockBusiness,
    businessId: 'business-1',
    rating: 4.5,
    reviewCount: 10,
    bookingCount: 20,
  };

  beforeEach(async () => {
    const mockServiceRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockBusinessRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockBookingRepo = {
      find: jest.fn(),
      count: jest.fn(),
    };

    const mockDataSource = {
      query: jest.fn(),
      createQueryRunner: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: getRepositoryToken(Service),
          useValue: mockServiceRepo,
        },
        {
          provide: getRepositoryToken(Business),
          useValue: mockBusinessRepo,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepo,
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    serviceRepository = module.get(getRepositoryToken(Service));
    businessRepository = module.get(getRepositoryToken(Business));
    bookingRepository = module.get(getRepositoryToken(Booking));
    dataSource = module.get(getDataSourceToken());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createServiceDto = {
      name: 'New Service',
      description: 'New Description',
      price: 100,
      duration: 90,
      isActive: true,
    };

    it('should create a service for business owner', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);
      dataSource.query.mockResolvedValue([{ id: 'new-service-1' }]);
      serviceRepository.findOne.mockResolvedValue({
        ...mockService,
        id: 'new-service-1',
        ...createServiceDto,
      });

      const result = await service.create(createServiceDto, 'business-1', 'owner-1', UserRole.BUSINESS_OWNER);

      expect(businessRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'business-1' },
        relations: ['owner'],
      });
      expect(dataSource.query).toHaveBeenCalled();
    });

    it('should create a service for super admin', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);
      dataSource.query.mockResolvedValue([{ id: 'new-service-1' }]);
      serviceRepository.findOne.mockResolvedValue({
        ...mockService,
        id: 'new-service-1',
        ...createServiceDto,
      });

      const result = await service.create(createServiceDto, 'business-1', 'admin-1', 'super_admin');

      expect(businessRepository.findOne).toHaveBeenCalled();
      expect(dataSource.query).toHaveBeenCalled();
    });

    it('should throw NotFoundException if business not found', async () => {
      businessRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(createServiceDto, 'non-existent', 'owner-1', UserRole.BUSINESS_OWNER)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create(createServiceDto, 'non-existent', 'owner-1', UserRole.BUSINESS_OWNER)
      ).rejects.toThrow('Business not found');
    });

    it('should throw ForbiddenException if user is not owner or super admin', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);

      await expect(
        service.create(createServiceDto, 'business-1', 'other-user', UserRole.BUSINESS_OWNER)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(createServiceDto, 'business-1', 'other-user', UserRole.BUSINESS_OWNER)
      ).rejects.toThrow('You can only add services to your own business');
    });
  });

  describe('findAll', () => {
    it('should return all services', async () => {
      const mockServices = [mockService, { ...mockService, id: 'service-2' }];
      serviceRepository.find.mockResolvedValue(mockServices);

      const result = await service.findAll();

      expect(result).toEqual(mockServices);
      expect(serviceRepository.find).toHaveBeenCalled();
    });

    it('should return empty array if no services', async () => {
      serviceRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(serviceRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a service by id', async () => {
      serviceRepository.findOne.mockResolvedValue(mockService);

      const result = await service.findOne('service-1');

      expect(result).toEqual(mockService);
      expect(serviceRepository.findOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException if service not found', async () => {
      serviceRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent')).rejects.toThrow('Service not found');
    });
  });

  describe('findByBusiness', () => {
    it('should return services for a business', async () => {
      const mockServices = [mockService, { ...mockService, id: 'service-2' }];
      dataSource.query.mockResolvedValue(mockServices);

      const result = await service.findByBusiness('business-1');

      expect(result).toHaveLength(2);
      expect(dataSource.query).toHaveBeenCalled();
    });

    it('should return empty array if no services for business', async () => {
      dataSource.query.mockResolvedValue([]);

      const result = await service.findByBusiness('business-1');

      expect(result).toEqual([]);
      expect(dataSource.query).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Service',
      price: 75,
    };

    it('should update a service for owner', async () => {
      const updatedService = { ...mockService, ...updateDto };
      serviceRepository.findOne.mockResolvedValueOnce(mockService)
        .mockResolvedValueOnce(updatedService);
      businessRepository.findOne.mockResolvedValue(mockBusiness);
      // Mock UPDATE query result
      dataSource.query.mockResolvedValueOnce([{ id: 'service-1', updatedAt: new Date() }])
        // Mock verification SELECT query result
        .mockResolvedValueOnce([updatedService]);

      const result = await service.update('service-1', updateDto, 'owner-1', UserRole.BUSINESS_OWNER);

      expect(serviceRepository.findOne).toHaveBeenCalled();
      expect(dataSource.query).toHaveBeenCalledTimes(2);
    });

    it('should update a service for super admin', async () => {
      const updatedService = { ...mockService, ...updateDto };
      serviceRepository.findOne.mockResolvedValueOnce(mockService)
        .mockResolvedValueOnce(updatedService);
      businessRepository.findOne.mockResolvedValue(mockBusiness);
      // Mock UPDATE query result
      dataSource.query.mockResolvedValueOnce([{ id: 'service-1', updatedAt: new Date() }])
        // Mock verification SELECT query result
        .mockResolvedValueOnce([updatedService]);

      const result = await service.update('service-1', updateDto, 'admin-1', 'super_admin');

      expect(dataSource.query).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if service not found', async () => {
      serviceRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, 'owner-1', UserRole.BUSINESS_OWNER)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not owner or super admin', async () => {
      serviceRepository.findOne.mockResolvedValue(mockService);
      businessRepository.findOne.mockResolvedValue(mockBusiness);

      await expect(
        service.update('service-1', updateDto, 'other-user', UserRole.BUSINESS_OWNER)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete a service for owner', async () => {
      const serviceWithBusiness = { ...mockService, business: mockBusiness };
      serviceRepository.findOne.mockResolvedValue(serviceWithBusiness);
      serviceRepository.remove.mockResolvedValue(undefined);

      await service.remove('service-1', 'owner-1', UserRole.BUSINESS_OWNER);

      expect(serviceRepository.remove).toHaveBeenCalledWith(serviceWithBusiness);
    });

    it('should delete a service for super admin', async () => {
      const serviceWithBusiness = { ...mockService, business: mockBusiness };
      serviceRepository.findOne.mockResolvedValue(serviceWithBusiness);
      serviceRepository.remove.mockResolvedValue(undefined);

      await service.remove('service-1', 'admin-1', 'super_admin');

      expect(serviceRepository.remove).toHaveBeenCalledWith(serviceWithBusiness);
    });

    it('should throw NotFoundException if service not found', async () => {
      serviceRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('non-existent', 'owner-1', UserRole.BUSINESS_OWNER)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not owner or super admin', async () => {
      const serviceWithBusiness = { ...mockService, business: mockBusiness };
      serviceRepository.findOne.mockResolvedValue(serviceWithBusiness);

      await expect(
        service.remove('service-1', 'other-user', UserRole.BUSINESS_OWNER)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
