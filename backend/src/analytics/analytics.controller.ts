import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('business/revenue')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get revenue analytics for business' })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year'], description: 'Time period (default: month)' })
  async getRevenueAnalytics(
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
    @Request() req
  ) {
    // Get business ID from user's business or employee membership
    let businessId = req.user.business?.id;
    if (!businessId && req.user.role === UserRole.EMPLOYEE) {
      // For employees, get their business membership
      // This would need to be implemented based on your business member logic
    }
    if (!businessId) {
      throw new Error('User does not have an associated business');
    }

    return this.analyticsService.getRevenueAnalytics(businessId, period);
  }

  @Get('business/trends')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get booking trends for business' })
  @ApiResponse({ status: 200, description: 'Booking trends retrieved successfully' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (default: 30)' })
  async getBookingTrends(
    @Query('days') days: number = 30,
    @Request() req
  ) {
    let businessId = req.user.business?.id;
    if (!businessId && req.user.role === UserRole.EMPLOYEE) {
      // Get from employee membership
    }
    if (!businessId) {
      throw new Error('User does not have an associated business');
    }

    return this.analyticsService.getBookingTrends(businessId, days);
  }

  @Get('platform')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get platform-wide analytics' })
  @ApiResponse({ status: 200, description: 'Platform analytics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year'], description: 'Time period (default: month)' })
  async getPlatformAnalytics(
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month'
  ) {
    return this.analyticsService.getPlatformAnalytics(period);
  }
}
