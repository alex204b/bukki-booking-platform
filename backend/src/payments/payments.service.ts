import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Booking } from '../bookings/entities/booking.entity';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private emailService: EmailService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(amount: number, currency: string = 'usd', metadata?: any): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  async createRefund(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    try {
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripe.refunds.create(refundData);
      return refund;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  async handleWebhook(payload: string, signature: string): Promise<void> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.get('STRIPE_WEBHOOK_SECRET')
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw error;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);

    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      this.logger.warn('Payment succeeded but no bookingId in metadata');
      return;
    }

    try {
      const booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
        relations: ['customer', 'business', 'service'],
      });

      if (!booking) {
        this.logger.error(`Booking ${bookingId} not found for payment ${paymentIntent.id}`);
        return;
      }

      // Update booking payment status
      await this.bookingRepository.update(bookingId, {
        paymentStatus: 'paid' as any,
        paymentDetails: {
          stripePaymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency,
          paidAt: new Date(),
        } as any,
      });

      // Auto-confirm booking if it was pending payment
      if (booking.status === 'pending') {
        await this.bookingRepository.update(bookingId, {
          status: 'confirmed' as any,
        });

        this.logger.log(`Booking ${bookingId} auto-confirmed after successful payment`);
      }

      // Send payment confirmation email
      try {
        await this.emailService.sendEmail(
          booking.customer.email,
          'Payment Confirmed - BUKKi',
          `
            <h2>Payment Confirmed</h2>
            <p>Your payment of ${paymentIntent.currency.toUpperCase()} ${paymentIntent.amount / 100} has been successfully processed.</p>
            <p><strong>Booking Details:</strong></p>
            <ul>
              <li>Business: ${booking.business.name}</li>
              <li>Service: ${booking.service.name}</li>
              <li>Date: ${booking.appointmentDate.toLocaleString()}</li>
            </ul>
            <p>Thank you for your booking!</p>
          `,
        );
      } catch (emailError) {
        this.logger.error(`Failed to send payment confirmation email: ${emailError.message}`);
      }
    } catch (error) {
      this.logger.error(`Error handling payment success: ${error.message}`);
      throw error;
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment failed: ${paymentIntent.id}`);

    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      this.logger.warn('Payment failed but no bookingId in metadata');
      return;
    }

    try {
      const booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
        relations: ['customer', 'business', 'service'],
      });

      if (!booking) {
        this.logger.error(`Booking ${bookingId} not found for failed payment ${paymentIntent.id}`);
        return;
      }

      // Update booking payment status
      await this.bookingRepository.update(bookingId, {
        paymentStatus: 'failed' as any,
        paymentDetails: {
          stripePaymentIntentId: paymentIntent.id,
          failureReason: paymentIntent.last_payment_error?.message || 'Unknown error',
          failedAt: new Date(),
        } as any,
      });

      // Optionally cancel the booking
      await this.bookingRepository.update(bookingId, {
        status: 'cancelled' as any,
        cancellationReason: 'Payment failed',
        cancelledAt: new Date(),
      });

      this.logger.log(`Booking ${bookingId} cancelled due to failed payment`);

      // Send payment failure notification
      try {
        await this.emailService.sendEmail(
          booking.customer.email,
          'Payment Failed - BUKKi',
          `
            <h2>Payment Failed</h2>
            <p>Unfortunately, your payment could not be processed.</p>
            <p><strong>Reason:</strong> ${paymentIntent.last_payment_error?.message || 'Unknown error'}</p>
            <p><strong>Booking Details:</strong></p>
            <ul>
              <li>Business: ${booking.business.name}</li>
              <li>Service: ${booking.service.name}</li>
              <li>Date: ${booking.appointmentDate.toLocaleString()}</li>
            </ul>
            <p>Your booking has been cancelled. Please try booking again or contact us for assistance.</p>
          `,
        );
      } catch (emailError) {
        this.logger.error(`Failed to send payment failure email: ${emailError.message}`);
      }
    } catch (error) {
      this.logger.error(`Error handling payment failure: ${error.message}`);
      throw error;
    }
  }

  async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      console.error('Error retrieving payment methods:', error);
      throw error;
    }
  }

  async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
      });

      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }
}
