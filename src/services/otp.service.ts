import { OtpType } from '@prisma/client';
import { prisma } from '@/config/database';
import { cache, cacheKeys, cacheTTL } from '@/config/redis';
import { otpUtils } from '@/utils/otp';
import { logger } from '@/config/logger';
import { OtpRequest, OtpVerifyRequest } from '@/types';
import { createError } from '@/middleware/errorHandler';

export class OtpService {
  async sendOtp(data: OtpRequest): Promise<{ message: string }> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      // Check rate limiting
      const rateLimitKey = otpUtils.getRateLimitKey(data.email, data.type);
      const attempts = await cache.get(rateLimitKey);
      
      if (attempts && parseInt(attempts) >= 5) {
        throw createError('Too many OTP requests. Please try again later.', 429);
      }

      // Invalidate any existing OTPs of the same type
      await prisma.otp.updateMany({
        where: {
          userId: user.id,
          type: data.type,
          isUsed: false
        },
        data: { isUsed: true }
      });

      // Generate new OTP
      const otpCode = otpUtils.generate(6);
      const expiresAt = otpUtils.getExpirationTime(10); // 10 minutes

      // Save OTP to database
      await prisma.otp.create({
        data: {
          userId: user.id,
          email: data.email,
          code: otpCode,
          type: data.type,
          expiresAt
        }
      });

      // Increment rate limit counter
      await cache.incr(rateLimitKey);
      await cache.expire(rateLimitKey, 900); // 15 minutes

      // Send OTP via email (implement email service)
      await this.sendOtpEmail(data.email, otpCode, data.type, user.name);

      logger.info(`OTP sent to ${data.email} for ${data.type}`);

      return {
        message: 'OTP sent successfully'
      };
    } catch (error) {
      logger.error('Send OTP error:', error);
      throw error;
    }
  }

  async verifyOtp(data: OtpVerifyRequest): Promise<{ message: string; user?: any }> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      // Check attempt rate limiting
      const attemptsKey = otpUtils.getAttemptsKey(data.email, data.type);
      const attempts = await cache.get(attemptsKey);
      
      if (attempts && parseInt(attempts) >= 10) {
        throw createError('Too many verification attempts. Please request a new OTP.', 429);
      }

      // Find valid OTP
      const otp = await prisma.otp.findFirst({
        where: {
          userId: user.id,
          email: data.email,
          code: data.code,
          type: data.type,
          isUsed: false,
          expiresAt: { gt: new Date() }
        }
      });

      if (!otp) {
        // Increment failed attempts
        await cache.incr(attemptsKey);
        await cache.expire(attemptsKey, 900); // 15 minutes
        
        throw createError('Invalid or expired OTP', 400);
      }

      // Mark OTP as used
      await prisma.otp.update({
        where: { id: otp.id },
        data: {
          isUsed: true,
          usedAt: new Date()
        }
      });

      // Clear rate limit counters
      await cache.del(otpUtils.getRateLimitKey(data.email, data.type));
      await cache.del(attemptsKey);

      // Handle different OTP types
      let updatedUser = user;
      
      switch (data.type) {
        case OtpType.EMAIL_VERIFICATION:
          updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
              isEmailVerified: true,
              emailVerifiedAt: new Date()
            }
          });
          break;
          
        case OtpType.PASSWORD_RESET:
          // For password reset, we'll return a temporary token
          // The actual password reset will be handled in a separate endpoint
          break;
          
        case OtpType.PHONE_VERIFICATION:
          // Handle phone verification if implemented
          break;
      }

      logger.info(`OTP verified for ${data.email} - ${data.type}`);

      return {
        message: 'OTP verified successfully',
        user: data.type === OtpType.EMAIL_VERIFICATION ? {
          id: updatedUser.id,
          email: updatedUser.email,
          isEmailVerified: updatedUser.isEmailVerified
        } : undefined
      };
    } catch (error) {
      logger.error('Verify OTP error:', error);
      throw error;
    }
  }

  async resendOtp(email: string, type: OtpType): Promise<{ message: string }> {
    try {
      // Check if enough time has passed since last OTP
      const lastOtp = await prisma.otp.findFirst({
        where: {
          email,
          type,
        },
        orderBy: { createdAt: 'desc' }
      });

      if (lastOtp) {
        const timeSinceLastOtp = Date.now() - lastOtp.createdAt.getTime();
        const minWaitTime = 60 * 1000; // 1 minute
        
        if (timeSinceLastOtp < minWaitTime) {
          const waitTime = Math.ceil((minWaitTime - timeSinceLastOtp) / 1000);
          throw createError(`Please wait ${waitTime} seconds before requesting a new OTP`, 429);
        }
      }

      return await this.sendOtp({ email, type });
    } catch (error) {
      logger.error('Resend OTP error:', error);
      throw error;
    }
  }

  private async sendOtpEmail(email: string, otp: string, type: OtpType, userName: string): Promise<void> {
    try {
      // In a real implementation, you would use a proper email service
      // For now, we'll just log the OTP (DO NOT DO THIS IN PRODUCTION)
      
      let subject = '';
      let message = '';
      
      switch (type) {
        case OtpType.EMAIL_VERIFICATION:
          subject = 'NeoMart - Verify Your Email';
          message = `Hi ${userName},\n\nYour email verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;
          break;
          
        case OtpType.PASSWORD_RESET:
          subject = 'NeoMart - Password Reset';
          message = `Hi ${userName},\n\nYour password reset code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;
          break;
          
        case OtpType.PHONE_VERIFICATION:
          subject = 'NeoMart - Phone Verification';
          message = `Hi ${userName},\n\nYour phone verification code is: ${otp}\n\nThis code will expire in 10 minutes.`;
          break;
      }

      // Email sending implementation placeholder
      logger.info(`OTP email prepared for ${email}: ${subject}`);
      
      // For development, log OTP details
      if (process.env.NODE_ENV === 'development') {
        logger.info(`OTP sent to ${email} - Subject: ${subject} - Code: ${otp} - Type: ${type}`);
      }
      
    } catch (error) {
      logger.error('Send OTP email error:', error);
      throw createError('Failed to send OTP email', 500);
    }
  }

  async cleanupExpiredOtps(): Promise<void> {
    try {
      const result = await prisma.otp.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { 
              isUsed: true,
              createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24 hours old
            }
          ]
        }
      });

      logger.info(`Cleaned up ${result.count} expired/used OTPs`);
    } catch (error) {
      logger.error('OTP cleanup error:', error);
    }
  }

  async getOtpStats(userId: string) {
    try {
      const stats = await prisma.otp.groupBy({
        by: ['type'],
        where: { userId },
        _count: { type: true },
        _max: { createdAt: true }
      });

      return stats.map(stat => ({
        type: stat.type,
        count: stat._count.type,
        lastSent: stat._max.createdAt
      }));
    } catch (error) {
      logger.error('Get OTP stats error:', error);
      throw error;
    }
  }
}