# Pagination Implementation Guide

## ✅ Completed

1. **Bookings** - Full pagination implemented
2. **Businesses** - Full pagination implemented

## 📝 Remaining Work

### Messages Pagination

**File**: `src/messages/messages.controller.ts`

Add import:
```typescript
import { PaginationDto } from '../common/dto/pagination.dto';
import { ApiQuery } from '@nestjs/swagger';
```

Update `getUserMessages` endpoint:
```typescript
@Get()
@ApiOperation({ summary: 'Get all messages for current user (paginated)' })
@ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
@ApiQuery({ name: 'limit', required: false, type: Number })
@ApiQuery({ name: 'offset', required: false, type: Number })
@ApiQuery({ name: 'sortBy', required: false, type: String })
@ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
@ApiQuery({ name: 'status', required: false, enum: MessageStatus })
async getUserMessages(
  @Request() req,
  @Query() paginationDto: PaginationDto,
  @Query('status') status?: MessageStatus,
) {
  return this.messagesService.getUserMessagesPaginated(req.user.id, paginationDto, status);
}
```

**File**: `src/messages/messages.service.ts`

Add import:
```typescript
import { PaginationDto, PaginatedResult, createPaginatedResponse } from '../common/dto/pagination.dto';
```

Add method:
```typescript
async getUserMessagesPaginated(
  userId: string,
  paginationDto: PaginationDto,
  status?: MessageStatus,
): Promise<PaginatedResult<Message>> {
  const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'DESC' } = paginationDto;

  const queryBuilder = this.messageRepository
    .createQueryBuilder('message')
    .leftJoinAndSelect('message.business', 'business')
    .leftJoinAndSelect('message.sender', 'sender')
    .where('message.recipientId = :userId', { userId });

  if (status) {
    queryBuilder.andWhere('message.status = :status', { status });
  }

  queryBuilder.orderBy(`message.${sortBy}`, sortOrder);

  const total = await queryBuilder.getCount();
  queryBuilder.skip(offset).take(limit);

  const messages = await queryBuilder.getMany();

  return createPaginatedResponse(messages, total, limit, offset);
}
```

### Reviews Pagination

**File**: `src/reviews/reviews.controller.ts`

Add import:
```typescript
import { PaginationDto } from '../common/dto/pagination.dto';
import { ApiQuery } from '@nestjs/swagger';
```

Update business reviews endpoint:
```typescript
@Get('business/:businessId')
@ApiOperation({ summary: 'Get reviews for a business (paginated)' })
@ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
@ApiQuery({ name: 'limit', required: false, type: Number })
@ApiQuery({ name: 'offset', required: false, type: Number })
@ApiQuery({ name: 'sortBy', required: false, type: String })
@ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
async getBusinessReviews(
  @Param('businessId') businessId: string,
  @Query() paginationDto: PaginationDto,
) {
  return this.reviewsService.getBusinessReviewsPaginated(businessId, paginationDto);
}
```

**File**: `src/reviews/reviews.service.ts`

Add import:
```typescript
import { PaginationDto, PaginatedResult, createPaginatedResponse } from '../common/dto/pagination.dto';
```

Add method:
```typescript
async getBusinessReviewsPaginated(
  businessId: string,
  paginationDto: PaginationDto,
): Promise<PaginatedResult<Review>> {
  const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'DESC' } = paginationDto;

  const queryBuilder = this.reviewRepository
    .createQueryBuilder('review')
    .leftJoinAndSelect('review.user', 'user')
    .where('review.businessId = :businessId', { businessId });

  queryBuilder.orderBy(`review.${sortBy}`, sortOrder);

  const total = await queryBuilder.getCount();
  queryBuilder.skip(offset).take(limit);

  const reviews = await queryBuilder.getMany();

  return createPaginatedResponse(reviews, total, limit, offset);
}
```

### Users Pagination (Admin Only)

**File**: `src/users/users.controller.ts`

Add import:
```typescript
import { PaginationDto } from '../common/dto/pagination.dto';
import { ApiQuery } from '@nestjs/swagger';
```

Update getAllUsers endpoint (if exists):
```typescript
@Get()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get all users (paginated, admin only)' })
@ApiResponse({ status: 200, description: 'Users retrieved successfully' })
@ApiQuery({ name: 'limit', required: false, type: Number })
@ApiQuery({ name: 'offset', required: false, type: Number })
@ApiQuery({ name: 'sortBy', required: false, type: String })
@ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
@ApiQuery({ name: 'role', required: false, enum: UserRole })
async findAll(
  @Query() paginationDto: PaginationDto,
  @Query('role') role?: UserRole,
) {
  return this.usersService.findAllPaginated(paginationDto, role);
}
```

**File**: `src/users/users.service.ts`

Add import:
```typescript
import { PaginationDto, PaginatedResult, createPaginatedResponse } from '../common/dto/pagination.dto';
```

Add method:
```typescript
async findAllPaginated(
  paginationDto: PaginationDto,
  role?: UserRole,
): Promise<PaginatedResult<User>> {
  const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'DESC' } = paginationDto;

  const queryBuilder = this.userRepository
    .createQueryBuilder('user');

  if (role) {
    queryBuilder.where('user.role = :role', { role });
  }

  // Don't return password field
  queryBuilder.select([
    'user.id',
    'user.email',
    'user.firstName',
    'user.lastName',
    'user.role',
    'user.isActive',
    'user.emailVerified',
    'user.trustScore',
    'user.createdAt',
    'user.updatedAt',
  ]);

  queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

  const total = await queryBuilder.getCount();
  queryBuilder.skip(offset).take(limit);

  const users = await queryBuilder.getMany();

  return createPaginatedResponse(users, total, limit, offset);
}
```

## Frontend Integration

Update API service to handle paginated responses:

**File**: `frontend/src/services/api.ts`

Add pagination params to existing calls:
```typescript
// Bookings
export const getBookings = (params?: {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  businessId?: string;
  status?: string;
}) => api.get('/bookings', { params });

// Businesses
export const getBusinesses = (params?: {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  status?: string;
}) => api.get('/businesses', { params });

// Messages
export const getMessages = (params?: {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  status?: string;
}) => api.get('/messages', { params });

// Reviews
export const getBusinessReviews = (businessId: string, params?: {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}) => api.get(`/reviews/business/${businessId}`, { params });
```

## Testing Pagination

Test with different parameters:

```bash
# Get first 10 bookings
GET /bookings?limit=10&offset=0

# Get next 10 bookings
GET /bookings?limit=10&offset=10

# Sort by date ascending
GET /bookings?limit=20&offset=0&sortBy=appointmentDate&sortOrder=ASC

# Filter by status
GET /bookings?status=confirmed&limit=20

# Combine filters
GET /bookings?businessId=xxx&status=confirmed&limit=20&sortBy=createdAt&sortOrder=DESC
```

Expected response format:
```json
{
  "data": [...],
  "total": 150,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```

## Performance Tips

1. **Always use indexes** - The migration 010 adds indexes for common query patterns
2. **Limit maximum page size** - PaginationDto enforces max 100 items per page
3. **Use `skip()` and `take()`** - More efficient than `OFFSET` and `LIMIT` in TypeORM
4. **Count before query** - Helps determine if there are more results
5. **Cache total counts** - For frequently-accessed lists, consider caching the total count

## Migration Checklist

- [x] Create PaginationDto
- [x] Add pagination to Bookings
- [x] Add pagination to Businesses
- [ ] Add pagination to Messages
- [ ] Add pagination to Reviews
- [ ] Add pagination to Users
- [ ] Update frontend API calls
- [ ] Test all endpoints
- [ ] Update API documentation

## Status

**Completion**: 40% (2/5 main entities done)

**Next Steps**:
1. Implement Messages pagination (15 min)
2. Implement Reviews pagination (15 min)
3. Implement Users pagination (15 min)
4. Update frontend (30 min)
5. Testing (30 min)

**Total Time Remaining**: ~2 hours
