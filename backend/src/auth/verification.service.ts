import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../common/services/email.service';
import * as crypto from 'crypto';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  async generateVerificationCode(): Promise<string> {
    // Generate a 6-digit verification code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendVerificationEmail(user: User): Promise<void> {
    const verificationCode = await this.generateVerificationCode();
    
    // Store the verification code in the user record
    await this.userRepository.update(user.id, {
      emailVerificationToken: verificationCode,
    });

    // Send the verification email
    await this.emailService.sendVerificationEmail(
      user.email,
      verificationCode,
      user.firstName,
    );
  }

  async verifyEmail(email: string, verificationCode: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({ 
      where: { email, emailVerificationToken: verificationCode } 
    });

    if (!user) {
      return {
        success: false,
        message: 'Invalid verification code or email address',
      };
    }

    // Mark email as verified and clear the verification token
    await this.userRepository.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
    });

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  async resendVerificationCode(email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    if (user.emailVerified) {
      return {
        success: false,
        message: 'Email is already verified',
      };
    }

    try {
      await this.sendVerificationEmail(user);
      return {
        success: true,
        message: 'Verification code sent successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send verification code',
      };
    }
  }
}
