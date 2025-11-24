import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WaitlistService } from './waitlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Waitlist')
@Controller('waitlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('join')
  @ApiOperation({ summary: 'Join waitlist for a service' })
  @ApiResponse({ status: 201, description: 'Joined waitlist successfully' })
  async joinWaitlist(
    @Body() body: { businessId: string; serviceId: string; preferredDate?: string; notes?: string },
    @Request() req,
  ) {
    return this.waitlistService.joinWaitlist(
      req.user.id,
      body.businessId,
      body.serviceId,
      body.preferredDate ? new Date(body.preferredDate) : undefined,
      body.notes,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Leave waitlist' })
  @ApiResponse({ status: 200, description: 'Left waitlist successfully' })
  async leaveWaitlist(@Param('id') id: string, @Request() req) {
    await this.waitlistService.leaveWaitlist(id, req.user.id);
    return { message: 'Left waitlist successfully' };
  }

  @Get('my-waitlist')
  @ApiOperation({ summary: 'Get current user waitlist entries' })
  @ApiResponse({ status: 200, description: 'Waitlist entries retrieved successfully' })
  async getUserWaitlist(@Request() req) {
    return this.waitlistService.getUserWaitlist(req.user.id);
  }

  @Get('business/:businessId')
  @ApiOperation({ summary: 'Get waitlist for a business (business owners only)' })
  @ApiResponse({ status: 200, description: 'Waitlist retrieved successfully' })
  async getBusinessWaitlist(@Param('businessId') businessId: string, @Request() req) {
    // TODO: Add authorization check to ensure user owns the business
    return this.waitlistService.getBusinessWaitlist(businessId);
  }

  @Post('notify/:businessId/:serviceId')
  @ApiOperation({ summary: 'Notify waitlist customers of available slot (business owners only)' })
  @ApiResponse({ status: 200, description: 'Waitlist customers notified' })
  async notifyWaitlist(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @Body() body: { availableDate: string },
    @Request() req,
  ) {
    // TODO: Add authorization check
    await this.waitlistService.notifyWaitlistCustomers(
      businessId,
      serviceId,
      new Date(body.availableDate),
    );
    return { message: 'Waitlist customers notified' };
  }
}

