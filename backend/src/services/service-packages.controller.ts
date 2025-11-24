import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ServicePackagesService } from './service-packages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Service Packages')
@Controller('service-packages')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ServicePackagesController {
  constructor(private readonly packagesService: ServicePackagesService) {}

  @Post('business/:businessId')
  @Roles(UserRole.BUSINESS_OWNER)
  @ApiOperation({ summary: 'Create a service package' })
  @ApiResponse({ status: 201, description: 'Package created successfully' })
  async create(@Param('businessId') businessId: string, @Body() packageData: any, @Request() req) {
    return this.packagesService.create(businessId, packageData);
  }

  @Get('business/:businessId')
  @ApiOperation({ summary: 'Get all packages for a business' })
  @ApiResponse({ status: 200, description: 'Packages retrieved successfully' })
  async findByBusiness(@Param('businessId') businessId: string) {
    return this.packagesService.findByBusiness(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get package by ID' })
  @ApiResponse({ status: 200, description: 'Package retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.packagesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.BUSINESS_OWNER)
  @ApiOperation({ summary: 'Update a service package' })
  @ApiResponse({ status: 200, description: 'Package updated successfully' })
  async update(@Param('id') id: string, @Body() updateData: any, @Request() req) {
    // Get business ID from user
    const businessId = req.user.business?.id;
    if (!businessId) {
      throw new Error('User does not have an associated business');
    }
    return this.packagesService.update(id, updateData, businessId);
  }

  @Delete(':id')
  @Roles(UserRole.BUSINESS_OWNER)
  @ApiOperation({ summary: 'Delete a service package' })
  @ApiResponse({ status: 200, description: 'Package deleted successfully' })
  async delete(@Param('id') id: string, @Request() req) {
    const businessId = req.user.business?.id;
    if (!businessId) {
      throw new Error('User does not have an associated business');
    }
    await this.packagesService.delete(id, businessId);
    return { message: 'Package deleted successfully' };
  }
}

