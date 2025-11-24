import { Controller, Get, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Get platform-wide analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getPlatformAnalytics(@Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month') {
    return this.adminService.getPlatformAnalytics(period);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with filters' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers(
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: string,
    @Query('emailVerified') emailVerified?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers({
      role,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      emailVerified: emailVerified === 'true' ? true : emailVerified === 'false' ? false : undefined,
      search,
    });
  }

  @Patch('users/:userId')
  @ApiOperation({ summary: 'Update user (role, status)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUser(@Param('userId') userId: string, @Body() updates: any) {
    return this.adminService.updateUser(userId, updates);
  }

  @Get('businesses/pending')
  @ApiOperation({ summary: 'Get pending business approvals' })
  @ApiResponse({ status: 200, description: 'Pending businesses retrieved' })
  async getPendingBusinesses() {
    return this.adminService.getPendingBusinesses();
  }

  @Patch('businesses/:businessId/verify')
  @ApiOperation({ summary: 'Verify a business' })
  @ApiResponse({ status: 200, description: 'Business verified' })
  async verifyBusiness(@Param('businessId') businessId: string, @Body() body: { notes?: string }) {
    return this.adminService.verifyBusiness(businessId, body.notes);
  }

  @Patch('businesses/:businessId/unverify')
  @ApiOperation({ summary: 'Unverify a business' })
  @ApiResponse({ status: 200, description: 'Business unverified' })
  async unverifyBusiness(@Param('businessId') businessId: string, @Body() body: { notes?: string }) {
    return this.adminService.unverifyBusiness(businessId, body.notes);
  }
}

