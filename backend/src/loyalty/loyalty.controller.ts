import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Loyalty')
@Controller('loyalty')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('balance/:businessId')
  @ApiOperation({ summary: 'Get loyalty points balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  async getBalance(@Param('businessId') businessId: string, @Request() req) {
    return {
      balance: await this.loyaltyService.getBalance(req.user.id, businessId),
    };
  }

  @Get('history/:businessId')
  @ApiOperation({ summary: 'Get loyalty points transaction history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getHistory(@Param('businessId') businessId: string, @Request() req) {
    return this.loyaltyService.getHistory(req.user.id, businessId);
  }

  @Post('redeem/:businessId')
  @ApiOperation({ summary: 'Redeem loyalty points' })
  @ApiResponse({ status: 200, description: 'Points redeemed successfully' })
  async redeemPoints(
    @Param('businessId') businessId: string,
    @Body() body: { points: number; description?: string },
    @Request() req,
  ) {
    return this.loyaltyService.redeemPoints(req.user.id, businessId, body.points, body.description);
  }
}

