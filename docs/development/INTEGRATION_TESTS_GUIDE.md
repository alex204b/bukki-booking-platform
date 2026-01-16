# 🧪 Integration Tests Guide

## Overview

This project now has **TWO types of tests**:

### 1. Unit Tests (Fast, Mocked)
- **Location:** `src/**/*.spec.ts`
- **Run:** `npm test`
- **Database:** Uses mocks, NO database connection
- **Speed:** Very fast (seconds)
- **Purpose:** Test individual functions in isolation

### 2. Integration Tests (Real, Database)
- **Location:** `test/*.integration-spec.ts`
- **Run:** `npm run test:integration`
- **Database:** Uses REAL cloud database
- **Speed:** Slower (30-60 seconds)
- **Purpose:** Test complete workflows with real data

---

## 🚀 Running Tests

### Quick Commands

```bash
cd backend

# Run UNIT tests (mocked, fast)
npm test

# Run INTEGRATION tests (real database)
npm run test:integration

# Run specific integration test
npm run test:integration -- auth.integration-spec

# Run all tests with coverage
npm run test:cov
```

---

## 🔍 What Integration Tests Do

### Authentication Integration Tests (`test/auth.integration-spec.ts`)

**Tests:**
1. ✅ User registration with real database
2. ✅ Email normalization (uppercase → lowercase)
3. ✅ Password hashing with bcrypt
4. ✅ Duplicate email prevention
5. ✅ Special characters in emails
6. ✅ User login with correct credentials
7. ✅ Wrong password rejection
8. ✅ Non-existent user rejection
9. ✅ Case-insensitive login
10. ✅ Bcrypt cost factor verification
11. ✅ Database unique constraints

**Example Output:**
```
✅ Connected to database for integration tests
✅ User registered successfully: abc-123-xyz
✅ Password hashed correctly
✅ Duplicate email blocked correctly
✅ Login successful
✅ Wrong password rejected
🧹 Cleaned up 5 test users after test
```

### Booking Integration Tests (`test/bookings.integration-spec.ts`)

**Tests:**
1. ✅ Create booking with valid data
2. ✅ Block booking without email verification
3. ✅ Block booking for non-existent service
4. ✅ Retrieve user bookings
5. ✅ Retrieve business bookings
6. ✅ Foreign key constraints

**Example Output:**
```
✅ Connected to database for booking integration tests
✅ Test data setup complete
✅ Booking created successfully
✅ Unverified email blocked correctly
✅ User bookings retrieved successfully
🧹 Cleaned up 3 test bookings
🧹 Cleaned up 2 test services
🧹 Cleaned up 1 test businesses
🧹 Cleaned up 4 test users
```

---

## 🧹 Automatic Cleanup

**Integration tests automatically clean up after themselves:**

### Cleanup Strategy

1. **After Each Test:**
   - Deletes users with test email patterns
   - Removes temporary test data

2. **After All Tests:**
   - Deletes all tracked test data
   - Respects foreign key constraints (bookings → services → businesses → users)

3. **Test Isolation:**
   - Each test uses unique timestamps in emails
   - No conflicts between tests

### Cleanup Example

```typescript
afterAll(async () => {
  // Clean up in correct order
  if (testBookingIds.length > 0) {
    await dataSource.query(`DELETE FROM bookings WHERE id = ANY($1)`, [testBookingIds]);
  }
  if (testServiceIds.length > 0) {
    await dataSource.query(`DELETE FROM services WHERE id = ANY($1)`, [testServiceIds]);
  }
  // ... etc
});
```

---

## 🎯 When to Use Which Tests

### Use Unit Tests When:
- ✅ Testing individual functions
- ✅ Testing logic without side effects
- ✅ Need fast feedback during development
- ✅ Writing new features (TDD)
- ✅ CI/CD pipeline (fast builds)

### Use Integration Tests When:
- ✅ Testing complete user workflows
- ✅ Verifying database constraints work
- ✅ Testing relationships between entities
- ✅ Verifying real-world behavior
- ✅ Before deploying to production
- ✅ After database schema changes

---

## 📊 Test Coverage

### Current Coverage

| Module | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| **Authentication** | 2 tests | 11 tests |
| **Bookings** | 3 tests | 6 tests |
| **Sanitization** | 64 tests | - |
| **Total** | **69 tests** | **17 tests** |

---

## 🛠️ How Integration Tests Work

### 1. Connection to Database

```typescript
const moduleFixture: TestingModule = await Test.createTestingModule({
  imports: [AppModule], // Imports entire app with real database
}).compile();

dataSource = moduleFixture.get<DataSource>(DataSource);
```

### 2. Test Data Creation

```typescript
const timestamp = Date.now(); // Unique identifier

const result = await authService.register({
  email: `test-${timestamp}@example.com`, // Unique email
  password: 'Password123!',
  firstName: 'Test',
  lastName: 'User',
});

testUserIds.push(result.user.id); // Track for cleanup
```

### 3. Assertions on Real Data

```typescript
// Verify data in actual database
const userInDb = await dataSource.query(
  `SELECT password FROM users WHERE id = $1`,
  [result.user.id]
);

expect(userInDb[0].password).toMatch(/^\$2[aby]\$/); // bcrypt hash
```

### 4. Automatic Cleanup

```typescript
afterAll(async () => {
  if (testUserIds.length > 0) {
    await dataSource.query(
      `DELETE FROM users WHERE id = ANY($1)`,
      [testUserIds]
    );
  }
});
```

---

## 🔒 Safety Features

### Protection Against Data Loss

1. **Unique Email Patterns:**
   - All test emails include timestamps
   - Pattern: `test-${Date.now()}@example.com`
   - Won't conflict with real users

2. **Tracked IDs:**
   - Every created entity is tracked
   - Cleanup only deletes tracked entities

3. **Foreign Key Respect:**
   - Cleanup happens in correct order
   - No orphaned records

4. **Test Isolation:**
   - Each test runs independently
   - One test failure doesn't affect others

---

## 🐛 Troubleshooting

### Issue: "Connection Refused"

**Problem:** Can't connect to database

**Solution:**
```bash
# Check .env file has DATABASE_URL
cat backend/.env | grep DATABASE_URL

# Test connection
cd backend
npx ts-node -e "
import { DataSource } from 'typeorm';
const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
ds.initialize().then(() => console.log('✅ Connected')).catch(console.error);
"
```

### Issue: "Tests Hanging"

**Problem:** Tests don't finish

**Solution:**
```bash
# Add timeout in test
it('should register user', async () => {
  // ... test code
}, 30000); // 30 second timeout

# Or run with --forceExit
npm run test:integration -- --forceExit
```

### Issue: "Foreign Key Violation"

**Problem:** Can't delete test data

**Solution:** Already handled! Cleanup happens in correct order:
1. Bookings (depends on services, users)
2. Services (depends on businesses)
3. Businesses (depends on users)
4. Users (no dependencies)

---

## 📈 Adding New Integration Tests

### Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('YourService Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testCleanupIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    // Cleanup
    if (testCleanupIds.length > 0) {
      await dataSource.query(
        `DELETE FROM your_table WHERE id = ANY($1)`,
        [testCleanupIds]
      );
    }
    await app.close();
  });

  it('should do something', async () => {
    const timestamp = Date.now();

    // Create test data
    const result = await dataSource.query(
      `INSERT INTO your_table (name) VALUES ($1) RETURNING *`,
      [`test-${timestamp}`]
    );

    testCleanupIds.push(result[0].id);

    // Assertions
    expect(result[0]).toHaveProperty('id');

    console.log('✅ Test passed');
  });
});
```

---

## 🎬 Running Your First Integration Test

### Step 1: Make sure backend is NOT running
```bash
# Stop the dev server if it's running
# Integration tests will start their own instance
```

### Step 2: Run integration tests
```bash
cd backend
npm run test:integration
```

### Step 3: Watch the output
```
PASS test/auth.integration-spec.ts (15.234s)
  AuthService Integration Tests
    User Registration
      ✓ should register a new user with valid data (234ms)
      ✓ should normalize email to lowercase (189ms)
      ✓ should hash password before storing (201ms)
      ✓ should throw ConflictException for duplicate email (198ms)
      ...

🧹 Cleaned up 5 test users
✅ Test data cleaned up

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
```

### Step 4: Verify cleanup
```bash
# Check your database - test users should be gone
# All test users have email pattern: *-test-* or *test-*
```

---

## 🚀 Best Practices

### DO:
✅ Use unique timestamps in test data
✅ Track all created IDs for cleanup
✅ Clean up in correct order (respect foreign keys)
✅ Use descriptive test names
✅ Log test progress with console.log
✅ Handle async operations properly

### DON'T:
❌ Use production user emails in tests
❌ Skip cleanup in afterAll()
❌ Create test data without tracking IDs
❌ Run tests against production database
❌ Forget to await async operations
❌ Share state between tests

---

## 📊 Summary

**You now have:**
- ✅ 69 Unit Tests (mocked, fast)
- ✅ 17 Integration Tests (real database)
- ✅ Automatic cleanup
- ✅ Safe test isolation
- ✅ Complete test coverage

**Running tests:**
```bash
# Fast feedback during development
npm test

# Thorough testing before deployment
npm run test:integration

# Everything
npm test && npm run test:integration
```

---

**Happy Testing! 🎉**
