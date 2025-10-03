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

  @Get('business')
  @Roles(UserRole.BUSINESS_OWNER)
  @ApiOperation({ summary: 'Get business analytics' })
  @ApiResponse({ status: 200, description: 'Business analytics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: true, type: Date })
  @ApiQuery({ name: 'endDate', required: true, type: Date })
  async getBusinessAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Get business ID from user's business
    const businessId = req.user.business?.id;
    if (!businessId) {
      throw new Error('User does not have an associated business');
    }

    return this.analyticsService.getBusinessAnalytics(businessId, start, end);
  }

  @Get('business/trends')
  @Roles(UserRole.BUSINESS_OWNER)
  @ApiOperation({ summary: 'Get booking trends for business' })
  @ApiResponse({ status: 200, description: 'Booking trends retrieved successfully' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (default: 30)' })
  async getBookingTrends(
    @Query('days') days: number = 30,
    @Request() req
  ) {
    const businessId = req.user.business?.id;
    if (!businessId) {
      throw new Error('User does not have an associated business');
    }

    return this.analyticsService.getBookingTrends(businessId, days);
  }

  @Get('business/top-services')
  @Roles(UserRole.BUSINESS_OWNER)
  @ApiOperation({ summary: 'Get top services by booking count' })
  @ApiResponse({ status: 200, description: 'Top services retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of services (default: 5)' })
  async getTopServices(
    @Query('limit') limit: number = 5,
    @Request() req
  ) {
    const businessId = req.user.business?.id;
    if (!businessId) {
      throw new Error('User does not have an associated business');
    }

    return this.analyticsService.getTopServices(businessId, limit);
  }

  @Get('platform')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get platform-wide analytics' })
  @ApiResponse({ status: 200, description: 'Platform analytics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: true, type: Date })
  @ApiQuery({ name: 'endDate', required: true, type: Date })
  async getPlatformAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return this.analyticsService.getPlatformAnalytics(start, end);
  }
}
