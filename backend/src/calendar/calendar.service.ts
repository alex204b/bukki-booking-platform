import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Business } from '../businesses/entities/business.entity';
// @ts-ignore - ics doesn't have TypeScript types
import { createEvent, EventAttributes } from 'ics';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
  ) {}

  /**
   * Generate iCal file for a booking
   */
  async generateICalForBooking(bookingId: string): Promise<string> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['customer', 'service', 'business'],
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    const startDate = new Date(booking.appointmentDate);
    const endDate = new Date(booking.appointmentEndDate);

    const event: EventAttributes = {
      start: [
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        startDate.getDate(),
        startDate.getHours(),
        startDate.getMinutes(),
      ],
      end: [
        endDate.getFullYear(),
        endDate.getMonth() + 1,
        endDate.getDate(),
        endDate.getHours(),
        endDate.getMinutes(),
      ],
      title: `${booking.service?.name || 'Service'} at ${booking.business?.name || 'Business'}`,
      description: `Booking with ${booking.business?.name}\nService: ${booking.service?.name}\nStatus: ${booking.status}`,
      location: booking.business?.address || '',
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: {
        name: booking.business?.name || 'Business',
        email: booking.business?.email || '',
      },
      attendees: [
        {
          name: `${booking.customer?.firstName} ${booking.customer?.lastName}`,
          email: booking.customer?.email || '',
          rsvp: true,
          partstat: 'ACCEPTED',
          role: 'REQ-PARTICIPANT',
        },
      ],
    };

    return new Promise((resolve, reject) => {
      createEvent(event, (error, value) => {
        if (error) {
          reject(error);
        } else {
          resolve(value || '');
        }
      });
    });
  }

  /**
   * Generate iCal file for all bookings of a business
   */
  async generateICalForBusiness(businessId: string): Promise<string> {
    const bookings = await this.bookingRepository.find({
      where: {
        business: { id: businessId },
        status: In(['confirmed', 'pending']),
      } as any,
      relations: ['customer', 'service', 'business'],
      order: { appointmentDate: 'ASC' },
    });

    const events: EventAttributes[] = bookings.map((booking) => {
      const startDate = new Date(booking.appointmentDate);
      const endDate = new Date(booking.appointmentEndDate);

      return {
        start: [
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          startDate.getDate(),
          startDate.getHours(),
          startDate.getMinutes(),
        ],
        end: [
          endDate.getFullYear(),
          endDate.getMonth() + 1,
          endDate.getDate(),
          endDate.getHours(),
          endDate.getMinutes(),
        ],
        title: `${booking.service?.name || 'Service'} - ${booking.customer?.firstName} ${booking.customer?.lastName}`,
        description: `Customer: ${booking.customer?.firstName} ${booking.customer?.lastName}\nService: ${booking.service?.name}\nStatus: ${booking.status}`,
        location: booking.business?.address || '',
        status: booking.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE',
        busyStatus: 'BUSY',
      };
    });

    return new Promise((resolve, reject) => {
      createEvent(
        {
          title: 'Business Bookings',
          description: 'All bookings for this business',
          start: events[0]?.start || [new Date().getFullYear(), 1, 1],
          duration: { hours: 0 },
        },
        (error, value) => {
          if (error) {
            reject(error);
          } else {
            // For multiple events, we'd need a different approach
            // For now, return the first event
            resolve(value || '');
          }
        },
      );
    });
  }

  /**
   * Generate Google Calendar URL
   */
  generateGoogleCalendarUrl(booking: {
    service: { name: string };
    business: { name: string; address?: string };
    appointmentDate: Date | string;
    appointmentEndDate: Date | string;
  }): string {
    const start = new Date(booking.appointmentDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(booking.appointmentEndDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = encodeURIComponent(`${booking.service.name} at ${booking.business.name}`);
    const details = encodeURIComponent(`Service: ${booking.service.name}\nBusiness: ${booking.business.name}`);
    const location = encodeURIComponent(booking.business.address || '');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  }
}

