import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { PaginationDto, PaginatedResult, createPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'email', 'firstName', 'lastName', 'phone', 'role', 'isActive', 'createdAt'],
    });
  }

  async findAllPaginated(
    paginationDto: PaginationDto,
    role?: UserRole,
  ): Promise<PaginatedResult<User>> {
    const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'DESC' } = paginationDto;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.phone',
        'user.role',
        'user.isActive',
        'user.emailVerified',
        'user.trustScore',
        'user.createdAt',
        'user.updatedAt',
      ]);

    if (role) {
      queryBuilder.where('user.role = :role', { role });
    }

    queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

    const total = await queryBuilder.getCount();
    queryBuilder.skip(offset).take(limit);

    const users = await queryBuilder.getMany();

    return createPaginatedResponse(users, total, limit, offset);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'phone', 'role', 'isActive', 'avatar', 'address', 'city', 'state', 'zipCode', 'country', 'dateOfBirth', 'emailVerified', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async deactivate(id: string): Promise<void> {
    await this.userRepository.update(id, { isActive: false });
  }

  async activate(id: string): Promise<void> {
    await this.userRepository.update(id, { isActive: true });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return this.userRepository.find({
      where: { role: role as any },
      select: ['id', 'email', 'firstName', 'lastName', 'phone', 'isActive', 'createdAt'],
    });
  }
}
