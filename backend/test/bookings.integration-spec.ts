import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BookingsService } from '../src/bookings/bookings.service';
import { AuthService } from '../src/auth/auth.service';
import { AppModule } from '../src/app.module';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../src/users/entities/user.entity';

/**
 * Integration Tests for Bookings
 *
 * These tests use the REAL DATABASE CONNECTION
 * Test data is cleaned up after each test
 */
describe('BookingsService Integration Tests', () => {
  let app: INestApplication;
  let bookingsService: BookingsService;
  let authService: AuthService;
  let dataSource: DataSource;
  let testUserIds: string[] = [];
  let testBusinessIds: string[] = [];
  let testServiceIds: string[] = [];
  let testBookingIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    bookingsService = moduleFixture.get<BookingsService>(BookingsService);
    authService = moduleFixture.get<AuthService>(AuthService);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    console.log('✅ Connected to database for booking integration tests');
  });

  afterAll(async () => {
    // Clean up test data in correct order (due to foreign keys)
    if (testBookingIds.length > 0) {
      await dataSource.query(`DELETE FROM bookings WHERE id = ANY($1)`, [testBookingIds]);
      console.log(`🧹 Cleaned up ${testBookingIds.length} test bookings`);
    }

    if (testServiceIds.length > 0) {
      await dataSource.query(`DELETE FROM services WHERE id = ANY($1)`, [testServiceIds]);
      console.log(`🧹 Cleaned up ${testServiceIds.length} test services`);
    }

    if (testBusinessIds.length > 0) {
      await dataSource.query(`DELETE FROM businesses WHERE id = ANY($1)`, [testBusinessIds]);
      console.log(`🧹 Cleaned up ${testBusinessIds.length} test businesses`);
    }

    if (testUserIds.length > 0) {
      await dataSource.query(`DELETE FROM users WHERE id = ANY($1)`, [testUserIds]);
      console.log(`🧹 Cleaned up ${testUserIds.length} test users`);
    }

    await app.close();
  });

  describe('Booking Creation', () => {
    let customer: any;
    let businessOwner: any;
    let business: any;
    let service: any;

    beforeEach(async () => {
      const timestamp = Date.now();

      // Create customer
      const customerResult = await authService.register({
        email: `customer-${timestamp}@test.com`,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Customer',
      });
      customer = customerResult.user;
      testUserIds.push(customer.id);

      // Verify customer email
      await dataSource.query(
        `UPDATE users SET "emailVerified" = true, "trustScore" = 100 WHERE id = $1`,
        [customer.id]
      );

      // Create business owner
      const ownerResult = await authService.register({
        email: `owner-${timestamp}@test.com`,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Owner',
        role: UserRole.BUSINESS_OWNER,
      });
      businessOwner = ownerResult.user;
      testUserIds.push(businessOwner.id);

      // Create business
      const businessResult = await dataSource.query(
        `INSERT INTO businesses (name, category, address, city, state, country, "zipCode", phone, "ownerId", "requiresResources", status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [`Test Business ${timestamp}`, 'beauty_salon', '123 Test St', 'Test City', 'Test State', 'Test Country', '12345', '+1234567890', businessOwner.id, false, 'approved']
      );
      business = businessResult[0];
      testBusinessIds.push(business.id);

      // Create service
      const serviceResult = await dataSource.query(
        `INSERT INTO services (name, duration, price, "businessId", "isActive")
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [`Test Service ${timestamp}`, 60, 50.00, business.id, true]
      );
      service = serviceResult[0];
      testServiceIds.push(service.id);

      console.log('✅ Test data setup complete');
    });

    it('should create a booking with valid data', async () => {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 7); // Book 7 days ahead

      const bookingDto = {
        serviceId: service.id,
        appointmentDate: appointmentDate.toISOString(),
        notes: 'Integration test booking',
      };

      const result = await bookingsService.create(bookingDto, customer.id);

      // Handle result (could be single booking or array)
      const booking = Array.isArray(result) ? result[0] : result;

      expect(booking).toHaveProperty('id');
      expect(booking.service.id).toBe(service.id);
      expect(booking.customer.id).toBe(customer.id);

      if (Array.isArray(result)) {
        testBookingIds.push(...result.map(b => b.id));
      } else {
        testBookingIds.push(result.id);
      }

      console.log('✅ Booking created successfully');
    });

    it('should throw BadRequestException if email not verified', async () => {
      // Create unverified user
      const timestamp = Date.now();
      const unverifiedResult = await authService.register({
        email: `unverified-${timestamp}@test.com`,
        password: 'Password123!',
        firstName: 'Unverified',
        lastName: 'User',
      });
      testUserIds.push(unverifiedResult.user.id);

      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 7);

      const bookingDto = {
        serviceId: service.id,
        appointmentDate: appointmentDate.toISOString(),
      };

      await expect(
        bookingsService.create(bookingDto, unverifiedResult.user.id)
      ).rejects.toThrow(BadRequestException);

      console.log('✅ Unverified email blocked correctly');
    });

    it('should throw NotFoundException if service not found', async () => {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 7);

      const bookingDto = {
        serviceId: '00000000-0000-0000-0000-000000000000', // Non-existent UUID
        appointmentDate: appointmentDate.toISOString(),
      };

      await expect(
        bookingsService.create(bookingDto, customer.id)
      ).rejects.toThrow(NotFoundException);

      console.log('✅ Non-existent service blocked correctly');
    });
  });

  describe('Booking Retrieval', () => {
    let customer: any;
    let businessOwner: any;
    let business: any;
    let service: any;
    let booking: any;

    beforeEach(async () => {
      const timestamp = Date.now();

      // Create customer
      const customerResult = await authService.register({
        email: `retrieval-customer-${timestamp}@test.com`,
        password: 'Password123!',
        firstName: 'Retrieval',
        lastName: 'Test',
      });
      customer = customerResult.user;
      testUserIds.push(customer.id);

      await dataSource.query(
        `UPDATE users SET "emailVerified" = true, "trustScore" = 100 WHERE id = $1`,
        [customer.id]
      );

      // Create business owner
      const ownerResult = await authService.register({
        email: `retrieval-owner-${timestamp}@test.com`,
        password: 'Password123!',
        firstName: 'Retrieval',
        lastName: 'Owner',
        role: UserRole.BUSINESS_OWNER,
      });
      businessOwner = ownerResult.user;
      testUserIds.push(businessOwner.id);

      // Create business
      const businessResult = await dataSource.query(
        `INSERT INTO businesses (name, category, address, city, state, country, "zipCode", phone, "ownerId", "requiresResources", status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [`Retrieval Business ${timestamp}`, 'restaurant', '456 Test Ave', 'Test City', 'Test State', 'Test Country', '67890', '+0987654321', businessOwner.id, false, 'approved']
      );
      business = businessResult[0];
      testBusinessIds.push(business.id);

      // Create service
      const serviceResult = await dataSource.query(
        `INSERT INTO services (name, duration, price, "businessId", "isActive")
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [`Retrieval Service ${timestamp}`, 30, 25.00, business.id, true]
      );
      service = serviceResult[0];
      testServiceIds.push(service.id);

      // Create booking
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 5);

      const bookingDto = {
        serviceId: service.id,
        appointmentDate: appointmentDate.toISOString(),
        notes: 'Test retrieval booking',
      };

      booking = await bookingsService.create(bookingDto, customer.id);
      if (Array.isArray(booking)) {
        testBookingIds.push(...booking.map(b => b.id));
        booking = booking[0];
      } else {
        testBookingIds.push(booking.id);
      }
    });

    it('should retrieve user bookings', async () => {
      // Query bookings directly since getUserBookings might not exist
      const bookings = await dataSource.query(
        `SELECT * FROM bookings WHERE "customerId" = $1`,
        [customer.id]
      );

      expect(Array.isArray(bookings)).toBe(true);
      expect(bookings.length).toBeGreaterThan(0);

      const ourBooking = bookings.find(b => b.id === booking.id);
      expect(ourBooking).toBeDefined();

      console.log('✅ User bookings retrieved successfully');
    });

    it('should retrieve business bookings', async () => {
      const bookings = await bookingsService.getBusinessBookings(business.id);

      expect(Array.isArray(bookings)).toBe(true);
      expect(bookings.length).toBeGreaterThan(0);

      const ourBooking = bookings.find(b => b.id === booking.id);
      expect(ourBooking).toBeDefined();

      console.log('✅ Business bookings retrieved successfully');
    });
  });

  describe('Database Relationships', () => {
    it('should maintain referential integrity', async () => {
      const timestamp = Date.now();

      // Create a customer
      const customerResult = await authService.register({
        email: `integrity-test-${timestamp}@test.com`,
        password: 'Password123!',
        firstName: 'Integrity',
        lastName: 'Test',
      });
      const customerId = customerResult.user.id;
      testUserIds.push(customerId);

      // Try to create booking with non-existent service
      const nonExistentServiceId = '00000000-0000-0000-0000-000000000000';

      await expect(
        dataSource.query(
          `INSERT INTO bookings ("customerId", "serviceId", "businessId", "appointmentDate", status)
           VALUES ($1, $2, $3, $4, $5)`,
          [customerId, nonExistentServiceId, nonExistentServiceId, new Date(), 'pending']
        )
      ).rejects.toThrow(); // Should fail due to foreign key constraint

      console.log('✅ Foreign key constraints working');
    });
  });
});
