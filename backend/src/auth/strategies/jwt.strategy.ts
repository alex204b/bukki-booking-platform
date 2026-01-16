import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // DEBUG: Log JWT payload to see what user ID is in the token
    console.log('[JwtStrategy.validate] JWT payload received:', {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    });

    const user = await this.authService.findUserById(payload.sub);
    if (!user || !user.isActive) {
      console.error('[JwtStrategy.validate] User not found or inactive:', {
        userId: payload.sub,
      });
      throw new UnauthorizedException();
    }

    // DEBUG: Log the user that will be set as req.user
    console.log('[JwtStrategy.validate] User authenticated:', {
      userId: user.id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
    });

    return user;
  }
}
