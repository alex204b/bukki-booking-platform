import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    role: UserRole.CUSTOMER,
    isActive: true,
    emailVerified: true,
    trustScore: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsers = [
    mockUser,
    {
      ...mockUser,
      id: 'user-2',
      email: 'test2@test.com',
    },
  ];

  beforeEach(async () => {
    const mockUserRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      userRepository.find.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toEqual(mockUsers);
      expect(userRepository.find).toHaveBeenCalledWith({
        select: ['id', 'email', 'firstName', 'lastName', 'phone', 'role', 'isActive', 'createdAt'],
      });
    });

    it('should return empty array if no users', async () => {
      userRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated users', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockUsers),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAllPaginated({ limit: 20, offset: 0 });

      expect(result.data).toEqual(mockUsers);
      expect(result.total).toBe(2);
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.createdAt', 'DESC');
    });

    it('should filter by role when provided', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAllPaginated(
        { limit: 20, offset: 0 },
        UserRole.CUSTOMER
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.role = :role', { role: UserRole.CUSTOMER });
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('user-1');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.any(Array),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent')).rejects.toThrow('User not found');
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({
        ...mockUser,
        ...updateData,
      });

      const result = await service.update('user-1', updateData);

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { firstName: 'Test' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a user', async () => {
      userRepository.update.mockResolvedValue({});

      await service.deactivate('user-1');

      expect(userRepository.update).toHaveBeenCalledWith('user-1', { isActive: false });
    });
  });

  describe('activate', () => {
    it('should activate a user', async () => {
      userRepository.update.mockResolvedValue({});

      await service.activate('user-1');

      expect(userRepository.update).toHaveBeenCalledWith('user-1', { isActive: true });
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@test.com');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@test.com');

      expect(result).toBeNull();
    });
  });

  describe('getUsersByRole', () => {
    it('should return users by role', async () => {
      const businessOwners = [
        { ...mockUser, role: UserRole.BUSINESS_OWNER },
      ];

      userRepository.find.mockResolvedValue(businessOwners);

      const result = await service.getUsersByRole('business_owner');

      expect(result).toEqual(businessOwners);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { role: 'business_owner' },
        select: ['id', 'email', 'firstName', 'lastName', 'phone', 'isActive', 'createdAt'],
      });
    });

    it('should return empty array if no users with role', async () => {
      userRepository.find.mockResolvedValue([]);

      const result = await service.getUsersByRole('admin');

      expect(result).toEqual([]);
    });
  });
});
