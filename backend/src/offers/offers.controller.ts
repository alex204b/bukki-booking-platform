import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Patch, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post('business/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new offer (business owner only)' })
  @ApiResponse({ status: 201, description: 'Offer created and sent to all customers' })
  async create(
    @Param('businessId') businessId: string,
    @Body() createOfferDto: CreateOfferDto,
    @Request() req,
  ) {
    return this.offersService.create(createOfferDto, businessId, req.user.id);
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all offers for the current user' })
  @ApiResponse({ status: 200, description: 'User offers retrieved successfully' })
  async getUserOffers(@Request() req) {
    const offers = await this.offersService.getUserOffers(req.user.id);
    return offers;
  }

  @Get('business/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all offers for a business (business owner only)' })
  @ApiResponse({ status: 200, description: 'Business offers retrieved successfully' })
  async getBusinessOffers(
    @Param('businessId') businessId: string,
    @Request() req,
  ) {
    return this.offersService.getBusinessOffers(businessId, req.user.id);
  }

  @Patch(':offerId/business/:businessId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update offer status (business owner only)' })
  @ApiResponse({ status: 200, description: 'Offer status updated successfully' })
  async updateOfferStatus(
    @Param('offerId') offerId: string,
    @Param('businessId') businessId: string,
    @Query('isActive') isActive: string,
    @Request() req,
  ) {
    return this.offersService.updateOfferStatus(
      offerId,
      businessId,
      req.user.id,
      isActive === 'true',
    );
  }

  @Delete(':offerId/business/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an offer (business owner only)' })
  @ApiResponse({ status: 200, description: 'Offer deleted successfully' })
  async delete(
    @Param('offerId') offerId: string,
    @Param('businessId') businessId: string,
    @Request() req,
  ) {
    await this.offersService.delete(offerId, businessId, req.user.id);
    return { message: 'Offer deleted successfully' };
  }
}

