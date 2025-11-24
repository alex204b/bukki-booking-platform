import { Controller, Post, Body, Get, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DevicePlatform } from './entities/device-token.entity';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Post('test-email')
  @ApiOperation({ summary: 'Send test email' })
  @ApiResponse({ status: 200, description: 'Test email sent successfully' })
  async sendTestEmail(@Body() body: { email: string }) {
    await this.notificationsService.sendEmail(
      body.email,
      'Test Email - BUKKi',
      '<h1>Test Email</h1><p>This is a test email from BUKKi platform.</p>'
    );
    return { message: 'Test email sent successfully' };
  }

  @Post('push/register')
  @ApiOperation({ summary: 'Register device token for push notifications' })
  @ApiResponse({ status: 201, description: 'Device token registered successfully' })
  async registerToken(
    @Request() req: any,
    @Body() body: {
      token: string;
      platform: DevicePlatform;
      deviceId?: string;
      deviceName?: string;
    },
  ) {
    const deviceToken = await this.pushNotificationService.registerToken(
      req.user.id,
      body.token,
      body.platform,
      body.deviceId,
      body.deviceName,
    );
    return { message: 'Token registered successfully', deviceToken };
  }

  @Delete('push/unregister/:token')
  @ApiOperation({ summary: 'Unregister device token' })
  @ApiResponse({ status: 200, description: 'Device token unregistered successfully' })
  async unregisterToken(@Request() req: any, @Param('token') token: string) {
    await this.pushNotificationService.unregisterToken(token, req.user.id);
    return { message: 'Token unregistered successfully' };
  }

  @Get('push/tokens')
  @ApiOperation({ summary: 'Get all device tokens for current user' })
  @ApiResponse({ status: 200, description: 'Device tokens retrieved successfully' })
  async getUserTokens(@Request() req: any) {
    const tokens = await this.pushNotificationService.getUserTokens(req.user.id);
    return { tokens };
  }

  @Post('push/preferences')
  @ApiOperation({ summary: 'Update notification preferences for a device' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(
    @Request() req: any,
    @Body() body: {
      token: string;
      preferences: Partial<{
        bookingConfirmations: boolean;
        bookingReminders: boolean;
        bookingCancellations: boolean;
        bookingUpdates: boolean;
        messages: boolean;
        reviews: boolean;
      }>;
    },
  ) {
    const deviceToken = await this.pushNotificationService.updatePreferences(
      body.token,
      req.user.id,
      body.preferences,
    );
    return { message: 'Preferences updated successfully', deviceToken };
  }

  @Post('push/test')
  @ApiOperation({ summary: 'Send test push notification' })
  @ApiResponse({ status: 200, description: 'Test notification sent successfully' })
  async sendTestNotification(@Request() req: any) {
    await this.pushNotificationService.sendToUser(
      req.user.id,
      {
        title: 'Test Notification',
        body: 'This is a test push notification from BUKKi!',
        data: { type: 'test' },
      },
    );
    return { message: 'Test notification sent successfully' };
  }
}
