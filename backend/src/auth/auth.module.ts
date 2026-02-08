import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { VerificationService } from './verification.service';
// EmailService is provided globally by CommonModule
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { User } from '../users/entities/user.entity';
import { TwoFactorAuth } from './entities/two-factor-auth.entity';
import { TwoFactorService } from './two-factor.service';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([User, TwoFactorAuth]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, VerificationService, JwtStrategy, LocalStrategy, TwoFactorService],
  exports: [AuthService, VerificationService, TwoFactorService],
})
export class AuthModule {}
