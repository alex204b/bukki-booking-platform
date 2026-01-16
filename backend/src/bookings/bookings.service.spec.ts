import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Service } from '../services/entities/service.entity';
import { Business } from '../businesses/entities/business.entity';
import { User } from '../users/entities/user.entity';
import { BusinessMember } from '../businesses/entities/business-member.entity';

const createRepoMock = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  create: jest.fn((v) => v),
  createQueryBuilder: jest.fn(),
});

describe('BookingsService.create', () => {
  let service: BookingsService;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let serviceRepo: jest.Mocked<Repository<Service>>;
  let businessRepo: jest.Mocked<Repository<Business>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let memberRepo: jest.Mocked<Repository<BusinessMember>>;

  beforeEach(() => {
    bookingRepo = createRepoMock() as any;
    serviceRepo = createRepoMock() as any;
    businessRepo = createRepoMock() as any;
    userRepo = createRepoMock() as any;
    memberRepo = createRepoMock() as any;

    // Minimal stubs for collaborators not under test
    const dataSource: any = { query: jest.fn().mockResolvedValue([]) };
    const reviewsService: any = { createForBooking: jest.fn() };
    const emailService: any = { sendNewBookingNotification: jest.fn() };
    const trustScoreService: any = {
      canMakeBooking: jest.fn().mockReturnValue({ allowed: true }),
      updateTrustScore: jest.fn().mockResolvedValue(undefined),
    };
    const pushNotificationService: any = { sendNotification: jest.fn() };
    const messagesService: any = { createNotification: jest.fn() };

    service = new BookingsService(
      bookingRepo,
      serviceRepo,
      businessRepo,
      userRepo,
      memberRepo,
      dataSource,
      reviewsService,
      emailService,
      trustScoreService,
      pushNotificationService,
      messagesService,
    );
  });

  it('throws if user email is not verified', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'u1', emailVerified: false } as any);
    await expect(
      service.create({ serviceId: 's1', appointmentDate: new Date().toISOString() }, 'u1')
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enforces daily booking limit (>=2)', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'u1', emailVerified: true } as any);
    serviceRepo.findOne.mockResolvedValue({ id: 's1', isActive: true, duration: 30, business: { id: 'b1', autoAcceptBookings: false } } as any);

    // Mock query builder count to 2
    const qb: any = { leftJoin: () => qb, where: () => qb, andWhere: () => qb, getCount: jest.fn().mockResolvedValue(2) };
    bookingRepo.createQueryBuilder.mockReturnValue(qb);

    await expect(
      service.create({ serviceId: 's1', appointmentDate: new Date().toISOString() }, 'u1')
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws if service not found', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'u1', emailVerified: true } as any);
    serviceRepo.findOne.mockResolvedValue(null as any);
    await expect(
      service.create({ serviceId: 'missing', appointmentDate: new Date().toISOString() }, 'u1')
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});


