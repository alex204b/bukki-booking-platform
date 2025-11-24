import { Controller, Get, Post, Delete, Param, UseGuards, Request, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @ApiOperation({ summary: 'Add business to favorites' })
  @ApiResponse({ status: 201, description: 'Business added to favorites' })
  async addFavorite(@Request() req, @Body() body: { businessId: string }) {
    return this.favoritesService.addFavorite(req.user.id, body.businessId);
  }

  @Delete(':businessId')
  @ApiOperation({ summary: 'Remove business from favorites' })
  @ApiResponse({ status: 200, description: 'Business removed from favorites' })
  async removeFavorite(@Request() req, @Param('businessId') businessId: string) {
    await this.favoritesService.removeFavorite(req.user.id, businessId);
    return { message: 'Favorite removed successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all user favorites' })
  @ApiResponse({ status: 200, description: 'Favorites retrieved successfully' })
  async getFavorites(@Request() req) {
    return this.favoritesService.getFavorites(req.user.id);
  }

  @Get(':businessId')
  @ApiOperation({ summary: 'Check if business is favorite' })
  @ApiResponse({ status: 200, description: 'Favorite status' })
  async isFavorite(@Request() req, @Param('businessId') businessId: string) {
    const isFavorite = await this.favoritesService.isFavorite(req.user.id, businessId);
    return { isFavorite };
  }
}

