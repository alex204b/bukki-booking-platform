import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthService } from '../src/auth/auth.service';
import { AppModule } from '../src/app.module';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

/**
 * Integration Tests for Authentication
 *
 * These tests use the REAL DATABASE CONNECTION
 * Test data is cleaned up after each test
 */
describe('AuthService Integration Tests', () => {
  let app: INestApplication;
  let authService: AuthService;
  let dataSource: DataSource;
  let testUserIds: string[] = [];

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

    authService = moduleFixture.get<AuthService>(AuthService);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    console.log('✅ Connected to database for integration tests');
  });

  afterAll(async () => {
    // Clean up all test users
    if (testUserIds.length > 0) {
      console.log(`🧹 Cleaning up ${testUserIds.length} test users...`);
      await dataSource.query(
        `DELETE FROM users WHERE id = ANY($1)`,
        [testUserIds]
      );
      console.log('✅ Test data cleaned up');
    }

    await app.close();
  });

  afterEach(async () => {
    // Clean up users created with test email pattern
    const testEmails = await dataSource.query(
      `SELECT id FROM users WHERE email LIKE '%integration-test%' OR email LIKE '%test-integration%'`
    );

    if (testEmails.length > 0) {
      const ids = testEmails.map(u => u.id);
      await dataSource.query(
        `DELETE FROM users WHERE id = ANY($1)`,
        [ids]
      );
      console.log(`🧹 Cleaned up ${testEmails.length} test users after test`);
    }
  });

  describe('User Registration', () => {
    it('should register a new user with valid data', async () => {
      const timestamp = Date.now();
      const registerDto = {
        email: `integration-test-${timestamp}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Integration',
        lastName: 'Test',
      };

      const result = await authService.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email.toLowerCase());
      expect(result.user.firstName).toBe('Integration');
      expect(result.user).not.toHaveProperty('password'); // Password should not be exposed

      testUserIds.push(result.user.id);
      console.log('✅ User registered successfully:', result.user.id);
    });

    it('should normalize email to lowercase', async () => {
      const timestamp = Date.now();
      const registerDto = {
        email: `UPPERCASE-${timestamp}@EXAMPLE.COM`,
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const result = await authService.register(registerDto);

      expect(result.user.email).toBe(registerDto.email.toLowerCase());
      testUserIds.push(result.user.id);
    });

    it('should hash password before storing', async () => {
      const timestamp = Date.now();
      const plainPassword = 'MySecretPassword123!';
      const registerDto = {
        email: `password-test-${timestamp}@example.com`,
        password: plainPassword,
        firstName: 'Password',
        lastName: 'Test',
      };

      const result = await authService.register(registerDto);
      testUserIds.push(result.user.id);

      // Verify password is hashed in database
      const userInDb = await dataSource.query(
        `SELECT password FROM users WHERE id = $1`,
        [result.user.id]
      );

      expect(userInDb[0].password).not.toBe(plainPassword);
      expect(userInDb[0].password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
      console.log('✅ Password hashed correctly');
    });

    it('should throw ConflictException for duplicate email', async () => {
      const timestamp = Date.now();
      const registerDto = {
        email: `duplicate-${timestamp}@example.com`,
        password: 'Password123!',
        firstName: 'Duplicate',
        lastName: 'Test',
      };

      // Register first time
      const firstResult = await authService.register(registerDto);
      testUserIds.push(firstResult.user.id);

      // Try to register again with same email
      await expect(
        authService.register(registerDto)
      ).rejects.toThrow(ConflictException);

      console.log('✅ Duplicate email blocked correctly');
    });

    it('should handle emails with special characters', async () => {
      const timestamp = Date.now();
      const registerDto = {
        email: `test+tag-${timestamp}@example.com`,
        password: 'Password123!',
        firstName: 'Special',
        lastName: 'Char',
      };

      const result = await authService.register(registerDto);
      expect(result.user.email).toBe(registerDto.email);
      testUserIds.push(result.user.id);
    });
  });

  describe('User Login', () => {
    let testUser: any;
    let testPassword = 'LoginTestPassword123!';

    beforeEach(async () => {
      // Create a test user for login tests
      const timestamp = Date.now();
      const result = await authService.register({
        email: `login-test-${timestamp}@example.com`,
        password: testPassword,
        firstName: 'Login',
        lastName: 'Test',
      });

      testUser = result.user;
      testUserIds.push(testUser.id);

      // Verify email so user can login
      await dataSource.query(
        `UPDATE users SET "emailVerified" = true WHERE id = $1`,
        [testUser.id]
      );
    });

    it('should login with correct credentials', async () => {
      const loginDto = {
        email: testUser.email,
        password: testPassword,
      };

      const result = await authService.login(loginDto);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(testUser.email);
      expect(result.user).not.toHaveProperty('password');
      console.log('✅ Login successful');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const loginDto = {
        email: testUser.email,
        password: 'WrongPassword123!',
      };

      await expect(
        authService.login(loginDto)
      ).rejects.toThrow(UnauthorizedException);

      console.log('✅ Wrong password rejected');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      await expect(
        authService.login(loginDto)
      ).rejects.toThrow(UnauthorizedException);

      console.log('✅ Non-existent user rejected');
    });

    it('should login with email in any case', async () => {
      const loginDto = {
        email: testUser.email.toUpperCase(),
        password: testPassword,
      };

      const result = await authService.login(loginDto);
      expect(result).toHaveProperty('token');
      console.log('✅ Case-insensitive login works');
    });
  });

  describe('Password Security', () => {
    it('should use bcrypt with cost factor 12', async () => {
      const timestamp = Date.now();
      const registerDto = {
        email: `bcrypt-test-${timestamp}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Bcrypt',
        lastName: 'Test',
      };

      const result = await authService.register(registerDto);
      testUserIds.push(result.user.id);

      const userInDb = await dataSource.query(
        `SELECT password FROM users WHERE id = $1`,
        [result.user.id]
      );

      const hash = userInDb[0].password;

      // Check bcrypt format: $2a$12$ or $2b$12$
      expect(hash).toMatch(/^\$2[aby]\$12\$/);
      console.log('✅ Bcrypt cost factor 12 verified');
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique email constraint at database level', async () => {
      const timestamp = Date.now();
      const email = `db-constraint-${timestamp}@example.com`;

      // Create first user
      const result1 = await authService.register({
        email,
        password: 'Password123!',
        firstName: 'First',
        lastName: 'User',
      });
      testUserIds.push(result1.user.id);

      // Try to create second user with same email (bypassing service layer)
      // This should fail at database level
      const insertQuery = `
        INSERT INTO users (email, password, "firstName", "lastName", role, "emailVerified")
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await expect(
        dataSource.query(insertQuery, [
          email,
          'hashedpassword',
          'Second',
          'User',
          'customer',
          false,
        ])
      ).rejects.toThrow();

      console.log('✅ Database unique constraint working');
    });
  });
});
