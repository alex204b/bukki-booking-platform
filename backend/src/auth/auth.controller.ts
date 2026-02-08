import { Controller, Post, Body, UseGuards, Get, Request, UnauthorizedException, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { VerificationService } from './verification.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly verificationService: VerificationService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    try {
      console.log('[LOGIN CONTROLLER] Received login request:', { 
        email: loginDto.email,
        hasPassword: !!loginDto.password,
        passwordLength: loginDto.password?.length || 0
      });
      
      if (!loginDto.email || !loginDto.password) {
        console.error('[LOGIN CONTROLLER] Missing email or password');
        throw new UnauthorizedException('Email and password are required');
      }
      
      const result = await this.authService.login(loginDto);
      console.log('[LOGIN CONTROLLER] Login successful for:', loginDto.email);
      return result;
    } catch (error) {
      console.error('[LOGIN CONTROLLER] Error:', error.message);
      console.error('[LOGIN CONTROLLER] Error type:', error.constructor.name);
      if (error.stack) {
        console.error('[LOGIN CONTROLLER] Stack:', error.stack);
      }
      
      // Re-throw the error to let NestJS handle it properly
      throw error;
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    return req.user;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid current password' })
  async changePassword(
    @Request() req,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    await this.authService.changePassword(req.user.id, body.oldPassword, body.newPassword);
    return { message: 'Password changed successfully' };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset code' })
  @ApiResponse({ status: 200, description: 'Password reset code sent' })
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('verify-reset-code')
  @ApiOperation({ summary: 'Verify password reset code' })
  @ApiResponse({ status: 200, description: 'Reset code verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifyResetCode(@Body() body: { email: string; code: string }) {
    return this.authService.verifyPasswordResetCode(body.email, body.code);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with verified code' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired code' })
  async resetPassword(@Body() body: { email: string; code: string; newPassword: string }) {
    await this.authService.resetPassword(body.email, body.code, body.newPassword);
    return { message: 'Password reset successfully' };
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email with verification code' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async verifyEmail(@Body() body: { email: string; verificationCode: string }) {
    return this.verificationService.verifyEmail(body.email, body.verificationCode);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend verification code' })
  @ApiResponse({ status: 200, description: 'Verification code sent successfully' })
  @ApiResponse({ status: 400, description: 'User not found or already verified' })
  async resendVerification(@Body() body: { email: string }) {
    return this.verificationService.resendVerificationCode(body.email);
  }

  @Post('debug-login')
  @ApiOperation({ summary: 'Debug login - shows detailed info without authenticating' })
  async debugLogin(@Body() body: { email: string; password: string }) {
    // This is a debug endpoint - remove in production
    return this.authService.debugLogin(body.email, body.password);
  }

  @Post('oauth')
  @ApiOperation({ summary: 'OAuth login (Google/Facebook)' })
  @ApiResponse({ status: 200, description: 'OAuth login successful' })
  @ApiResponse({ status: 401, description: 'Invalid OAuth token' })
  async oauthLogin(@Body() body: { provider: string; idToken: string; accessToken?: string }) {
    return this.authService.oauthLogin(body.provider, body.idToken, body.accessToken);
  }
}
