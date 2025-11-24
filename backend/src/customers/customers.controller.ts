import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('business/:businessId')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get all customers for a business' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
  async getBusinessCustomers(@Param('businessId') businessId: string, @Request() req) {
    return this.customersService.getBusinessCustomers(businessId);
  }

  @Get(':customerId/business/:businessId')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get customer details with booking history' })
  @ApiResponse({ status: 200, description: 'Customer details retrieved successfully' })
  async getCustomerDetails(
    @Param('customerId') customerId: string,
    @Param('businessId') businessId: string,
  ) {
    return this.customersService.getCustomerDetails(customerId, businessId);
  }

  @Patch(':customerId/business/:businessId/preferences')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Update customer preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(
    @Param('customerId') customerId: string,
    @Param('businessId') businessId: string,
    @Body() preferences: any,
  ) {
    return this.customersService.updatePreferences(customerId, businessId, preferences);
  }

  @Patch(':customerId/business/:businessId/tags')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Add tags to customer' })
  @ApiResponse({ status: 200, description: 'Tags added successfully' })
  async addTags(
    @Param('customerId') customerId: string,
    @Param('businessId') businessId: string,
    @Body() body: { tags: string[] },
  ) {
    return this.customersService.addTags(customerId, businessId, body.tags);
  }
}

