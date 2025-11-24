import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwoFactorAuth } from './entities/two-factor-auth.entity';
import { User } from '../users/entities/user.entity';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(TwoFactorAuth)
    private twoFactorRepository: Repository<TwoFactorAuth>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Generate 2FA secret and QR code
   */
  async generateSecret(userId: string, email: string): Promise<{ secret: string; qrCode: string }> {
    const secret = speakeasy.generateSecret({
      name: `BUKKi (${email})`,
      issuer: 'BUKKi Platform',
    });

    // Save or update 2FA record
    let twoFactor = await this.twoFactorRepository.findOne({
      where: { user: { id: userId } } as any,
    });

    if (!twoFactor) {
      twoFactor = this.twoFactorRepository.create({
        user: { id: userId } as any,
        secret: secret.base32,
        isEnabled: false,
      });
    } else {
      twoFactor.secret = secret.base32;
      twoFactor.isEnabled = false;
    }

    await this.twoFactorRepository.save(twoFactor);

    // Generate QR code
    const qrCode = await qrcode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode,
    };
  }

  /**
   * Verify 2FA token
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { user: { id: userId } } as any,
    });

    if (!twoFactor || !twoFactor.isEnabled) {
      return false;
    }

    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps (60 seconds) of tolerance
    });

    if (verified) {
      twoFactor.lastUsedAt = new Date();
      await this.twoFactorRepository.save(twoFactor);
    }

    return verified;
  }

  /**
   * Enable 2FA (after verification)
   */
  async enable(userId: string, token: string): Promise<boolean> {
    const verified = await this.verifyToken(userId, token);
    if (!verified) {
      return false;
    }

    const twoFactor = await this.twoFactorRepository.findOne({
      where: { user: { id: userId } } as any,
    });

    if (twoFactor) {
      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase(),
      );

      twoFactor.isEnabled = true;
      twoFactor.backupCodes = backupCodes;
      await this.twoFactorRepository.save(twoFactor);

      return true;
    }

    return false;
  }

  /**
   * Disable 2FA
   */
  async disable(userId: string): Promise<void> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { user: { id: userId } } as any,
    });

    if (twoFactor) {
      twoFactor.isEnabled = false;
      twoFactor.backupCodes = null;
      await this.twoFactorRepository.save(twoFactor);
    }
  }

  /**
   * Check if 2FA is enabled for user
   */
  async isEnabled(userId: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { user: { id: userId } } as any,
    });

    return twoFactor?.isEnabled || false;
  }
}

