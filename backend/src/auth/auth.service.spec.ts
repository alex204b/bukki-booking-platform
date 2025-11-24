import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

const createRepoMock = () => ({
  findOne: jest.fn(),
  create: jest.fn((v) => v),
  save: jest.fn((v) => ({ id: 'u1', ...v })),
  update: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  const jwtService: any = { sign: jest.fn(() => 'jwt-token') };
  const verificationService: any = { sendVerificationEmail: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    userRepo = createRepoMock() as any;
    service = new AuthService(userRepo, jwtService, verificationService);
  });

  it('register blocks duplicate emails', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);
    await expect(
      service.register({ email: 'a@b.com', password: 'Password123', firstName: 'A', lastName: 'B' } as any)
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('login fails with wrong password', async () => {
    // Provide hash that will never match simple compare shortcut (bcrypt.compare is used but fine for unit intent by mocking)
    userRepo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.com', password: '$2a$hash', isActive: true, emailVerified: true } as any);
    // Monkey-patch bcrypt.compare used internally
    jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false as any);
    await expect(service.login({ email: 'a@b.com', password: 'wrong' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});


