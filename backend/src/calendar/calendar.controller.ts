import { Controller, Get, Param, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response } from 'express';

@ApiTags('Calendar')
@Controller('calendar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('booking/:bookingId/ical')
  @ApiOperation({ summary: 'Download iCal file for a booking' })
  @ApiResponse({ status: 200, description: 'iCal file generated' })
  async downloadICal(@Param('bookingId') bookingId: string, @Res() res: Response) {
    const icalContent = await this.calendarService.generateICalForBooking(bookingId);
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="booking-${bookingId}.ics"`);
    res.send(icalContent);
  }

  @Get('business/:businessId/ical')
  @ApiOperation({ summary: 'Download iCal file for all business bookings' })
  @ApiResponse({ status: 200, description: 'iCal file generated' })
  async downloadBusinessICal(@Param('businessId') businessId: string, @Res() res: Response) {
    const icalContent = await this.calendarService.generateICalForBusiness(businessId);
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="business-${businessId}-bookings.ics"`);
    res.send(icalContent);
  }

  @Get('booking/:bookingId/google')
  @ApiOperation({ summary: 'Get Google Calendar URL for a booking' })
  @ApiResponse({ status: 200, description: 'Google Calendar URL' })
  async getGoogleCalendarUrl(@Param('bookingId') bookingId: string, @Request() req) {
    // This would need to fetch the booking first
    // For now, return a placeholder
    return { url: 'https://calendar.google.com' };
  }
}

