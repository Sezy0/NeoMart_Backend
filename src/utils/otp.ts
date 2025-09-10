import crypto from 'crypto';
import { logger } from '@/config/logger';

export const otpUtils = {
  generate(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[crypto.randomInt(0, digits.length)];
    }
    
    return otp;
  },

  generateAlphanumeric(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < length; i++) {
      code += chars[crypto.randomInt(0, chars.length)];
    }
    
    return code;
  },

  isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  },

  getExpirationTime(minutes: number = 10): Date {
    const now = new Date();
    return new Date(now.getTime() + minutes * 60 * 1000);
  },

  validate(otp: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!otp) {
      errors.push('OTP is required');
      return { isValid: false, errors };
    }

    if (!/^\d{6}$/.test(otp)) {
      errors.push('OTP must be exactly 6 digits');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Rate limiting for OTP requests
  getRateLimitKey(email: string, type: string): string {
    return `otp_rate_limit:${type}:${email}`;
  },

  getAttemptsKey(email: string, type: string): string {
    return `otp_attempts:${type}:${email}`;
  },

  // Generate secure random token for password reset
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  },

  // Hash OTP for storage (optional security measure)
  hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  },

  // Verify hashed OTP
  verifyHashedOtp(otp: string, hashedOtp: string): boolean {
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(otpHash), Buffer.from(hashedOtp));
  }
};