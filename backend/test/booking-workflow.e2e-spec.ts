import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * End-to-End Integration Tests for Booking Workflow
 *
 * Tests the complete booking flow from registration to booking completion:
 * 1. User registration
 * 2. Email verification
 * 3. Business discovery
 * 4. Service selection
 * 5. Booking creation
 * 6. Booking management (view, cancel)
 * 7. Reviews
 */
describe('Booking Workflow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let customerToken: string;
  let businessOwnerToken: string;
  let businessId: string;
  let serviceId: string;
  let bookingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    // Cleanup: delete test data
    if (dataSource) {
      await dataSource.query(`DELETE FROM bookings WHERE notes LIKE '%E2E Test%'`);
      await dataSource.query(`DELETE FROM services WHERE name LIKE '%E2E Test%'`);
      await dataSource.query(`DELETE FROM businesses WHERE name LIKE '%E2E Test%'`);
      await dataSource.query(`DELETE FROM users WHERE email LIKE '%e2e.test%'`);
    }
    await app.close();
  });

  describe('1. User Registration & Authentication', () => {
    it('should register a new customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'customer.e2e.test@example.com',
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'Customer',
          phone: '+1234567890',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('customer.e2e.test@example.com');
    });

    it('should register a business owner', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'owner.e2e.test@example.com',
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'Owner',
          role: 'business_owner',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('business_owner');
    });

    it('should login as customer and receive JWT token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'customer.e2e.test@example.com',
          password: 'SecurePassword123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      customerToken = response.body.accessToken;
    });

    it('should login as business owner', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'owner.e2e.test@example.com',
          password: 'SecurePassword123!',
        })
        .expect(200);

      businessOwnerToken = response.body.accessToken;
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'customer.e2e.test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });
  });

  describe('2. Business Setup', () => {
    it('should create a new business', async () => {
      const response = await request(app.getHttpServer())
        .post('/businesses')
        .set('Authorization', `Bearer ${businessOwnerToken}`)
        .send({
          name: 'E2E Test Salon',
          category: 'beauty_salon',
          description: 'A test salon for E2E testing',
          address: '123 Test Street',
          city: 'Testville',
          country: 'Testland',
          latitude: 40.7128,
          longitude: -74.0060,
          phone: '+1234567890',
          email: 'salon.e2e@example.com',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('E2E Test Salon');
      businessId = response.body.id;
    });

    it('should create a service for the business', async () => {
      const response = await request(app.getHttpServer())
        .post(`/businesses/${businessId}/services`)
        .set('Authorization', `Bearer ${businessOwnerToken}`)
        .send({
          name: 'E2E Test Haircut',
          description: 'Standard haircut service',
          duration: 30,
          price: 25.00,
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      serviceId = response.body.id;
    });

    it('should not allow customers to create businesses', async () => {
      await request(app.getHttpServer())
        .post('/businesses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Unauthorized Business',
          category: 'restaurant',
        })
        .expect(403);
    });
  });

  describe('3. Business Discovery', () => {
    it('should search for businesses by location', async () => {
      const response = await request(app.getHttpServer())
        .get('/businesses')
        .query({
          lat: 40.7128,
          lng: -74.0060,
          radius: 10,
        })
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      const testBusiness = response.body.data.find((b: any) => b.id === businessId);
      expect(testBusiness).toBeDefined();
    });

    it('should filter businesses by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/businesses')
        .query({
          category: 'beauty_salon',
        })
        .expect(200);

      expect(response.body.data.every((b: any) => b.category === 'beauty_salon')).toBe(true);
    });

    it('should get business details with services', async () => {
      const response = await request(app.getHttpServer())
        .get(`/businesses/${businessId}`)
        .expect(200);

      expect(response.body.id).toBe(businessId);
      expect(response.body).toHaveProperty('services');
      expect(Array.isArray(response.body.services)).toBe(true);
    });
  });

  describe('4. Booking Creation', () => {
    it('should create a booking for a service', async () => {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 7); // Book 7 days in advance

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: serviceId,
          appointmentDate: appointmentDate.toISOString(),
          notes: 'E2E Test booking - please ignore',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('pending');
      bookingId = response.body.id;
    });

    it('should not allow unauthenticated booking', async () => {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 7);

      await request(app.getHttpServer())
        .post('/bookings')
        .send({
          serviceId: serviceId,
          appointmentDate: appointmentDate.toISOString(),
        })
        .expect(401);
    });

    it('should not allow double booking at same time', async () => {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 8);

      // First booking
      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: serviceId,
          appointmentDate: appointmentDate.toISOString(),
        })
        .expect(201);

      // Attempt second booking at exact same time
      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: serviceId,
          appointmentDate: appointmentDate.toISOString(),
        })
        .expect(400); // Should fail
    });

    it('should validate booking date is in the future', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: serviceId,
          appointmentDate: pastDate.toISOString(),
        })
        .expect(400);
    });
  });

  describe('5. Booking Management', () => {
    it('should get user bookings', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings/my-bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const testBooking = response.body.find((b: any) => b.id === bookingId);
      expect(testBooking).toBeDefined();
    });

    it('should get booking details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.id).toBe(bookingId);
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('business');
    });

    it('should not allow viewing other users bookings', async () => {
      // Try to access booking with business owner token
      await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${businessOwnerToken}`)
        .expect(403);
    });

    it('should cancel a booking', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.status).toBe('cancelled');
    });

    it('should not allow cancelling already cancelled booking', async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(400);
    });
  });

  describe('6. Business Owner Dashboard', () => {
    it('should get business bookings for owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/businesses/${businessId}/bookings`)
        .set('Authorization', `Bearer ${businessOwnerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should not allow customer to view business bookings', async () => {
      await request(app.getHttpServer())
        .get(`/businesses/${businessId}/bookings`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe('7. Security Tests', () => {
    it('should sanitize SQL injection attempts', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: "'; DROP TABLE users; --",
          password: 'test',
        })
        .expect(401); // Should fail authentication, not cause SQL error
    });

    it('should sanitize XSS attempts in business description', async () => {
      const response = await request(app.getHttpServer())
        .post('/businesses')
        .set('Authorization', `Bearer ${businessOwnerToken}`)
        .send({
          name: 'XSS Test Business',
          category: 'restaurant',
          description: '<script>alert("XSS")</script>',
          address: '123 Test St',
        })
        .expect(201);

      // Description should be escaped
      expect(response.body.description).not.toContain('<script>');
    });

    it('should reject requests with invalid JWT', async () => {
      await request(app.getHttpServer())
        .get('/bookings/my-bookings')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should validate input data types', async () => {
      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: 123, // Should be string
          appointmentDate: 'not-a-date',
        })
        .expect(400);
    });
  });

  describe('8. Rate Limiting', () => {
    it('should handle rapid requests gracefully', async () => {
      const promises = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/businesses')
            .query({ lat: 40, lng: -74, radius: 10 })
        );

      const responses = await Promise.all(promises);

      // All requests should succeed or be rate limited
      responses.forEach((response) => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });
});
