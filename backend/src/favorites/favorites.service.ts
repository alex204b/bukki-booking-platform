import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { User } from '../users/entities/user.entity';
import { Business } from '../businesses/entities/business.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private favoriteRepository: Repository<Favorite>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
  ) {}

  async addFavorite(userId: string, businessId: string): Promise<Favorite> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const business = await this.businessRepository.findOne({ where: { id: businessId } });

    if (!user || !business) {
      throw new NotFoundException('User or business not found');
    }

    // Check if already favorited
    const existing = await this.favoriteRepository.findOne({
      where: {
        user: { id: userId },
        business: { id: businessId },
      } as any,
    });

    if (existing) {
      throw new BadRequestException('Business is already in favorites');
    }

    const favorite = this.favoriteRepository.create({
      user: { id: userId } as any,
      business: { id: businessId } as any,
    });

    return this.favoriteRepository.save(favorite);
  }

  async removeFavorite(userId: string, businessId: string): Promise<void> {
    const favorite = await this.favoriteRepository.findOne({
      where: {
        user: { id: userId },
        business: { id: businessId },
      } as any,
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.favoriteRepository.remove(favorite);
  }

  async getFavorites(userId: string): Promise<Favorite[]> {
    return this.favoriteRepository.find({
      where: { user: { id: userId } } as any,
      relations: ['business', 'business.owner'],
      order: { createdAt: 'DESC' },
    });
  }

  async isFavorite(userId: string, businessId: string): Promise<boolean> {
    const favorite = await this.favoriteRepository.findOne({
      where: {
        user: { id: userId },
        business: { id: businessId },
      } as any,
    });

    return !!favorite;
  }
}

