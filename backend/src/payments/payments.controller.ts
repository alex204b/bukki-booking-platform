import { Controller, Post, Body, Headers, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-payment-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment intent' })
  @ApiResponse({ status: 200, description: 'Payment intent created successfully' })
  async createPaymentIntent(
    @Body() body: { amount: number; currency?: string; bookingId?: string },
    @Request() req
  ) {
    const paymentIntent = await this.paymentsService.createPaymentIntent(
      body.amount,
      body.currency,
      {
        userId: req.user.id,
        bookingId: body.bookingId,
      }
    );

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  @Post('confirm-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm payment' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  async confirmPayment(@Body() body: { paymentIntentId: string }) {
    const paymentIntent = await this.paymentsService.confirmPaymentIntent(body.paymentIntentId);
    return { status: paymentIntent.status, paymentIntent };
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create refund' })
  @ApiResponse({ status: 200, description: 'Refund created successfully' })
  async createRefund(@Body() body: { paymentIntentId: string; amount?: number }) {
    const refund = await this.paymentsService.createRefund(body.paymentIntentId, body.amount);
    return { refund };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(
    @Body() body: any,
    @Headers('stripe-signature') signature: string
  ) {
    await this.paymentsService.handleWebhook(JSON.stringify(body), signature);
    return { received: true };
  }
}
