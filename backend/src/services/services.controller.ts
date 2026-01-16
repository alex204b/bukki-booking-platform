import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({ status: 201, description: 'Service created successfully' })
  async create(@Body() createServiceDto: any, @Request() req) {
    const { businessId } = createServiceDto;
    return this.servicesService.create(createServiceDto, businessId, req.user.id, req.user.role);
  }

  @Get()
  @ApiOperation({ summary: 'Get all services' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  async findAll(@Query('businessId') businessId?: string) {
    return this.servicesService.findAll(businessId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search services' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Query('q') query?: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
  ) {
    return this.servicesService.searchServices(query, category, location);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular services' })
  @ApiResponse({ status: 200, description: 'Popular services retrieved' })
  async getPopular(@Query('limit') limit?: number) {
    return this.servicesService.getPopularServices(limit);
  }

  @Get('business/:businessId')
  @ApiOperation({ summary: 'Get services by business' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  async findByBusiness(@Param('businessId') businessId: string) {
    console.log(`[ServicesController] GET /services/business/${businessId}`);
    const services = await this.servicesService.findByBusiness(businessId);
    console.log(`[ServicesController] Returning ${services.length} service(s)`);
    return services;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiResponse({ status: 200, description: 'Service retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Get(':id/available-slots')
  @ApiOperation({ summary: 'Get available time slots for a service' })
  @ApiResponse({ status: 200, description: 'Available slots retrieved' })
  async getAvailableSlots(
    @Param('id') id: string,
    @Query('date') date: string,
    @Query('partySize') partySize?: number
  ) {
    return this.servicesService.getAvailableSlots(id, date, partySize);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update service' })
  @ApiResponse({ status: 200, description: 'Service updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: any,
    @Request() req,
  ) {
    return this.servicesService.update(id, updateServiceDto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete service' })
  @ApiResponse({ status: 200, description: 'Service deleted successfully' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.servicesService.remove(id, req.user.id, req.user.role);
    return { message: 'Service deleted successfully' };
  }
}
