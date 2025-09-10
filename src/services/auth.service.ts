import { User, Role } from '@prisma/client';
import { prisma } from '@/config/database';
import { cache, cacheKeys, cacheTTL } from '@/config/redis';
import { jwtUtils } from '@/utils/jwt';
import { passwordUtils } from '@/utils/password';
import { logger } from '@/config/logger';
import { AuthResponse, LoginRequest, RegisterRequest } from '@/types';
import { createError } from '@/middleware/errorHandler';

export class AuthService {
  async register(data: RegisterRequest): Promise<{ message: string }> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        throw createError('User with this email already exists', 409);
      }

      // Validate password strength
      const passwordValidation = passwordUtils.validate(data.password);
      if (!passwordValidation.isValid) {
        throw createError(passwordValidation.errors.join(', '), 400);
      }

      // Hash password
      const hashedPassword = await passwordUtils.hash(data.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          isEmailVerified: false,
        }
      });

      logger.info(`User registered: ${user.email}`);

      return {
        message: 'User registered successfully. Please verify your email.'
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (!user || !user.password) {
        throw createError('Invalid email or password', 401);
      }

      // Check if user is active
      if (!user.isActive) {
        throw createError('Account is deactivated', 401);
      }

      // Verify password
      const isPasswordValid = await passwordUtils.compare(data.password, user.password);
      if (!isPasswordValid) {
        throw createError('Invalid email or password', 401);
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        throw createError('Please verify your email before logging in', 401);
      }

      // Create session
      const session = await this.createSession(user.id);

      // Generate tokens
      const accessToken = jwtUtils.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionId: session.id
      });

      const refreshToken = jwtUtils.generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Update session with refresh token
      await prisma.session.update({
        where: { id: session.id },
        data: { token: refreshToken }
      });

      // Cache user data
      await cache.set(
        cacheKeys.user(user.id),
        JSON.stringify(user),
        cacheTTL.user
      );

      logger.info(`User logged in: ${user.email}`);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          discordId: user.discordId || undefined,
          discordUsername: user.discordUsername || undefined,
          discordAvatar: user.discordAvatar || undefined,
        }
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const payload = jwtUtils.verifyRefreshToken(refreshToken);
      if (!payload) {
        throw createError('Invalid refresh token', 401);
      }

      // Find session
      const session = await prisma.session.findFirst({
        where: {
          token: refreshToken,
          userId: payload.userId,
          expiresAt: { gt: new Date() }
        },
        include: { user: true }
      });

      if (!session) {
        throw createError('Session not found or expired', 401);
      }

      // Check if user is still active
      if (!session.user.isActive) {
        throw createError('Account is deactivated', 401);
      }

      // Generate new access token
      const accessToken = jwtUtils.generateAccessToken({
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        sessionId: session.id
      });

      // Generate new refresh token
      const newRefreshToken = jwtUtils.generateRefreshToken({
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role
      });

      // Update session
      await prisma.session.update({
        where: { id: session.id },
        data: { 
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          discordId: session.user.discordId || undefined,
          discordUsername: session.user.discordUsername || undefined,
          discordAvatar: session.user.discordAvatar || undefined,
        }
      };
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw error;
    }
  }

  async logout(sessionId: string): Promise<{ message: string }> {
    try {
      // Delete session
      await prisma.session.delete({
        where: { id: sessionId }
      });

      logger.info(`User logged out, session: ${sessionId}`);

      return {
        message: 'Logged out successfully'
      };
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  async logoutAll(userId: string): Promise<{ message: string }> {
    try {
      // Delete all user sessions
      await prisma.session.deleteMany({
        where: { userId }
      });

      // Clear user cache
      await cache.del(cacheKeys.user(userId));

      logger.info(`All sessions logged out for user: ${userId}`);

      return {
        message: 'Logged out from all devices successfully'
      };
    } catch (error) {
      logger.error('Logout all error:', error);
      throw error;
    }
  }

  private async createSession(userId: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return await prisma.session.create({
      data: {
        userId,
        token: '', // Will be updated with refresh token
        expiresAt
      }
    });
  }

  async validateSession(sessionId: string): Promise<User | null> {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true }
      });

      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      if (!session.user.isActive) {
        return null;
      }

      return session.user;
    } catch (error) {
      logger.error('Session validation error:', error);
      return null;
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });

      logger.info(`Cleaned up ${result.count} expired sessions`);
    } catch (error) {
      logger.error('Session cleanup error:', error);
    }
  }

  async getUserSessions(userId: string) {
    try {
      return await prisma.session.findMany({
        where: { 
          userId,
          expiresAt: { gt: new Date() }
        },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error('Get user sessions error:', error);
      throw error;
    }
  }

  async revokeSession(sessionId: string, userId: string): Promise<{ message: string }> {
    try {
      const session = await prisma.session.findFirst({
        where: { 
          id: sessionId,
          userId 
        }
      });

      if (!session) {
        throw createError('Session not found', 404);
      }

      await prisma.session.delete({
        where: { id: sessionId }
      });

      return {
        message: 'Session revoked successfully'
      };
    } catch (error) {
      logger.error('Revoke session error:', error);
      throw error;
    }
  }
}