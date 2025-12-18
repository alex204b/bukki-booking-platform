import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingStatus } from './entities/booking.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  async create(@Body() createBookingDto: any, @Request() req) {
    return this.bookingsService.create(createBookingDto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all bookings for current user (paginated)' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page (default: 20, max: 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of items to skip (default: 0)' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by (default: appointmentDate)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Sort order (default: DESC)' })
  @ApiQuery({ name: 'businessId', required: false, type: String, description: 'Filter by business ID' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by booking status' })
  async findAll(
    @Request() req,
    @Query() paginationDto: PaginationDto,
    @Query('businessId') businessId?: string,
    @Query('status') status?: BookingStatus,
  ) {
    return this.bookingsService.findAllPaginated(
      req.user.id,
      req.user.role,
      paginationDto,
      businessId,
      status,
    );
  }

  @Get('business/:businessId/date/:date')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get bookings for a business on a specific date' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async getBookingsByDate(
    @Param('businessId') businessId: string,
    @Param('date') date: string,
    @Request() req,
  ) {
    // Check if user owns the business or is super admin
    if (req.user.role !== 'super_admin') {
      // Additional check would be needed here
    }
    return this.bookingsService.getBookingsByDate(businessId, date);
  }

  @Get('business/:businessId/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking statistics for a business' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getBookingStats(
    @Param('businessId') businessId: string,
    @Request() req,
    @Query('period') period?: string,
  ) {
    // Check if user owns the business or is super admin
    if (req.user.role !== 'super_admin') {
      // Additional check would be needed here
    }
    return this.bookingsService.getBookingStats(businessId, period);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update booking status' })
  @ApiResponse({ status: 200, description: 'Booking status updated successfully' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: BookingStatus; reason?: string },
    @Request() req,
  ) {
    return this.bookingsService.updateStatus(id, body.status, req.user.id, req.user.role, body.reason);
  }

  @Post(':id/checkin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check in a customer for their booking' })
  @ApiResponse({ status: 200, description: 'Customer checked in successfully' })
  async checkIn(
    @Param('id') id: string,
    @Body() body: { businessId: string },
    @Request() req,
  ) {
    return this.bookingsService.checkIn(id, body.businessId);
  }

  @Post('validate-qr')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate and check in a booking via QR code' })
  @ApiResponse({ status: 200, description: 'QR code validated and customer checked in successfully' })
  @ApiResponse({ status: 400, description: 'Invalid QR code or booking' })
  async validateQR(
    @Body() body: { qrData: string },
    @Request() req,
  ) {
    return this.bookingsService.validateAndCheckInQR(body.qrData, req.user.id, req.user.role);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update booking (reschedule)' })
  @ApiResponse({ status: 200, description: 'Booking updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() body: { appointmentDate?: string; appointmentEndDate?: string },
    @Request() req,
  ) {
    return this.bookingsService.reschedule(id, body.appointmentDate, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
  async cancel(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req,
  ) {
    return this.bookingsService.updateStatus(id, BookingStatus.CANCELLED, req.user.id, req.user.role, body.reason);
  }
}
