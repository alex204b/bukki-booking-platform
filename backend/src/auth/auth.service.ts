import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as admin from 'firebase-admin';
import { User, UserRole } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerificationService } from './verification.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private verificationService: VerificationService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: User; message: string; requiresVerification: boolean }> {
    const { email, password, firstName, lastName, phone, role } = registerDto;

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Don't trim password - passwords can intentionally have leading/trailing spaces
    // But we'll store it as-is and compare as-is during login

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ 
      where: { email: normalizedEmail },
      select: ['id', 'email', 'password']
    });
    
    if (existingUser) {
      // If user exists but has no password, update it instead of throwing error
      if (!existingUser.password) {
        console.log('[REGISTER] User exists but has no password. Updating password...');
        const hashedPassword = await bcrypt.hash(password, 12);
        await this.userRepository.query(
          'UPDATE users SET password = $1 WHERE id = $2',
          [hashedPassword, existingUser.id]
        );
        console.log('[REGISTER] Password updated for existing user');
        
        // Return the updated user
        const updatedUser = await this.userRepository.findOne({ 
          where: { id: existingUser.id }
        });
        const { password: _, ...userWithoutPassword } = updatedUser;
        return {
          user: userWithoutPassword as User,
          message: 'Password has been set. You can now login.',
          requiresVerification: false,
        };
      }
      throw new ConflictException('User with this email already exists');
    }

    // Hash password (use password as-is, don't trim)
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('[REGISTER] Password hashed, length:', hashedPassword.length);
    console.log('[REGISTER] Hash preview:', hashedPassword.substring(0, 20) + '...');

    // Create user (not verified initially)
    const user = this.userRepository.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: role || UserRole.CUSTOMER,
      emailVerified: false,
    });

    console.log('[REGISTER] User object before save:', {
      email: user.email,
      hasPassword: !!user.password,
      passwordLength: user.password?.length || 0,
      firstName: user.firstName,
      lastName: user.lastName
    });

    const savedUser = await this.userRepository.save(user);
    
    // CRITICAL FIX: Use raw SQL query to ensure password is saved
    // TypeORM save() might not be persisting the password field properly
    await this.userRepository.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, savedUser.id]
    );
    
    console.log('[REGISTER] Password saved via direct SQL update for user:', savedUser.id);
    
    // Verify password was saved by querying it back directly from database
    const verifyUser = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id: savedUser.id })
      .addSelect('user.password')
      .getOne();
    
    console.log('[REGISTER] User after save - password saved:', !!verifyUser?.password);
    console.log('[REGISTER] User after save - password length:', verifyUser?.password?.length || 0);
    
    if (!verifyUser?.password) {
      console.error('[REGISTER] CRITICAL ERROR: Password still not in database after SQL update!');
      throw new Error('Failed to save password during registration. Please contact support.');
    }

    // Send verification email
    try {
      await this.verificationService.sendVerificationEmail(savedUser);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails, but log the error
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = savedUser;

    return {
      user: userWithoutPassword as User,
      message: 'Registration successful! Please check your email for verification code.',
      requiresVerification: true,
    };
  }

  async login(loginDto: LoginDto): Promise<{ user: User; token: string; accessToken: string; requiresVerification?: boolean }> {
    const { email, password } = loginDto;

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    console.log('[LOGIN] Attempting login for email:', normalizedEmail);
    console.log('[LOGIN] Password provided (length):', password?.length || 0);

    // Find user - try normalized email first, then case-insensitive search as fallback
    let user: User | null = null;
    
    try {
      // Explicitly select password field to ensure it's loaded
      user = await this.userRepository
        .createQueryBuilder('user')
        .where('user.email = :email', { email: normalizedEmail })
        .addSelect('user.password') // Explicitly select password
        .getOne();
      
      // If not found, try case-insensitive search (for existing users with different casing)
      if (!user) {
        console.log('[LOGIN] User not found with normalized email, trying case-insensitive search');
        user = await this.userRepository
          .createQueryBuilder('user')
          .where('LOWER(user.email) = LOWER(:email)', { email: normalizedEmail })
          .addSelect('user.password') // Explicitly select password
          .getOne();
      }
    } catch (error) {
      console.error('[LOGIN] Database error during user lookup:', error);
      console.error('[LOGIN] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw new UnauthorizedException('Database connection error. Please try again.');
    }
    
    if (!user) {
      console.log('[LOGIN] User not found in database for email:', normalizedEmail);
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('[LOGIN] User found:', {
      id: user.id,
      email: user.email,
      hasPassword: !!user.password,
      passwordLength: user.password?.length || 0,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      role: user.role
    });

    // Check if user is active (allow login if isActive is null/undefined)
    if (user.isActive === false) {
      console.log('[LOGIN] Account is deactivated');
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password - check if password exists
    if (!user.password) {
      console.log('[LOGIN] User has no password set');
      throw new UnauthorizedException('No password set for this account. Please use "Forgot Password" to set your password.');
    }

    // Verify password
    console.log('[LOGIN] Comparing password...');
    console.log('[LOGIN] Stored password hash starts with:', user.password?.substring(0, 10));
    console.log('[LOGIN] Input password length:', password.length);
    console.log('[LOGIN] Password hash length:', user.password?.length);
    
    // Check if password hash looks valid (bcrypt hashes start with $2a$, $2b$, or $2y$)
    if (!user.password.startsWith('$2')) {
      console.error('[LOGIN] ERROR: Password hash does not look like a valid bcrypt hash!');
      console.error('[LOGIN] Hash format:', user.password.substring(0, 20));
      throw new UnauthorizedException('Invalid credentials - password format error');
    }
    
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('[LOGIN] Password valid:', isPasswordValid);
    } catch (error) {
      console.error('[LOGIN] ERROR during bcrypt.compare:', error);
      throw new UnauthorizedException('Invalid credentials - password verification error');
    }
    
    if (!isPasswordValid) {
      console.log('[LOGIN] Password comparison failed');
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('[LOGIN] Password verified successfully');

    // If email not verified, still allow login but include flag and (re)send code
    if (!user.emailVerified) {
      await this.verificationService.sendVerificationEmail(user);
      const token = this.generateToken(user);
      const { password: _, ...userWithoutPassword } = user;
      return {
        user: userWithoutPassword as User,
        accessToken: token,
        token, // Keep for backward compatibility
        requiresVerification: true,
      } as any;
    }

    // Generate JWT token
    const token = this.generateToken(user);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as User,
      accessToken: token,
      token, // Keep for backward compatibility
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({ where: { email: normalizedEmail } });
    if (user && user.password && await bcrypt.compare(password, user.password)) {
      const { password: _, ...result } = user;
      return result as User;
    }
    return null;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  // Debug method - remove in production
  async debugLogin(email: string, password: string): Promise<any> {
    const normalizedEmail = email.toLowerCase().trim();
    
    let user = await this.userRepository.findOne({ 
      where: { email: normalizedEmail } 
    });
    
    if (!user) {
      user = await this.userRepository
        .createQueryBuilder('user')
        .where('LOWER(user.email) = LOWER(:email)', { email: normalizedEmail })
        .getOne();
    }

    if (!user) {
      return {
        found: false,
        message: 'User not found',
        searchedEmail: normalizedEmail,
      };
    }

    const hasPassword = !!user.password;
    const passwordHashPreview = user.password ? user.password.substring(0, 20) + '...' : 'NO PASSWORD';
    const isActive = user.isActive;
    const emailVerified = user.emailVerified;

    let passwordMatch = false;
    if (user.password) {
      passwordMatch = await bcrypt.compare(password, user.password);
    }

    return {
      found: true,
      user: {
        id: user.id,
        email: user.email,
        hasPassword,
        passwordHashPreview,
        isActive,
        emailVerified,
        passwordMatch,
        role: user.role,
      },
      searchedEmail: normalizedEmail,
      inputPasswordLength: password.length,
    };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // If user has no password set, they should use password reset instead
    if (!user.password) {
      throw new UnauthorizedException('No password set. Please use "Forgot Password" to set your password.');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await this.userRepository.update(userId, { password: hashedNewPassword });
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      // Don't reveal if email exists or not
      return {
        success: true,
        message: 'If the email exists, a password reset code has been sent',
      };
    }

    // Generate 4-digit code
    const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.userRepository.update(user.id, {
      passwordResetToken: resetCode,
      passwordResetExpires: resetExpires,
    });

    // Send email with reset code
    try {
      await this.verificationService.sendPasswordResetCode(user, resetCode);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't fail the request, but log the error
    }

    // If user has no password, provide a helpful message
    const message = !user.password 
      ? 'Password reset code sent. You can now set your password.'
      : 'If the email exists, a password reset code has been sent';

    return {
      success: true,
      message,
    };
  }

  async verifyPasswordResetCode(email: string, code: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({ 
      where: { 
        email: normalizedEmail,
        passwordResetToken: code,
      } 
    });

    if (!user) {
      return {
        success: false,
        message: 'Invalid reset code or email address',
      };
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return {
        success: false,
        message: 'Reset code has expired. Please request a new one.',
      };
    }

    return {
      success: true,
      message: 'Reset code verified successfully',
    };
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({
      where: {
        email: normalizedEmail,
        passwordResetToken: code,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid reset code or email address');
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new UnauthorizedException('Reset code has expired. Please request a new one.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.userRepository.update(user.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  async oauthLogin(provider: string, idToken: string, accessToken?: string): Promise<{ user: User; token: string }> {
    try {
      // Verify the Firebase ID token
      let decodedToken;
      
      try {
        // Use Firebase Admin if initialized, otherwise throw error
        if (admin.apps.length === 0) {
          throw new UnauthorizedException('Firebase Admin not initialized');
        }
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (error) {
        console.error('Firebase token verification error:', error);
        throw new UnauthorizedException('Invalid OAuth token');
      }

      const { email, name, picture } = decodedToken;
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user exists
      let user = await this.userRepository.findOne({ 
        where: { email: normalizedEmail }
      });

      if (user) {
        // User exists, update email verification status if needed
        if (!user.emailVerified) {
          await this.userRepository.update(user.id, { emailVerified: true });
          user.emailVerified = true;
        }
      } else {
        // Create new user from OAuth
        const nameParts = name?.split(' ') || ['User', ''];
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.slice(1).join(' ') || '';

        user = this.userRepository.create({
          email: normalizedEmail,
          firstName,
          lastName,
          password: null, // OAuth users don't have passwords
          emailVerified: true,
          role: UserRole.CUSTOMER,
          avatar: picture || null,
        });

        user = await this.userRepository.save(user);
      }

      // Generate JWT token
      const token = this.jwtService.sign({ 
        sub: user.id, 
        email: user.email,
        role: user.role 
      });

      const { password: _, ...userWithoutPassword } = user;
      return { user: userWithoutPassword as User, token };
    } catch (error) {
      console.error('OAuth login error:', error);
      throw new UnauthorizedException('OAuth authentication failed');
    }
  }
}
