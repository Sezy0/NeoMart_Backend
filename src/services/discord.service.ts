import { User } from '@prisma/client';
import { prisma } from '@/config/database';
import { cache, cacheKeys, cacheTTL } from '@/config/redis';
import { jwtUtils } from '@/utils/jwt';
import { logger } from '@/config/logger';
import { AuthResponse, DiscordProfile } from '@/types';
import { createError } from '@/middleware/errorHandler';

export class DiscordService {
  async handleDiscordCallback(profile: DiscordProfile): Promise<AuthResponse> {
    try {
      let user = await this.findOrCreateDiscordUser(profile);

      // Check if user is active
      if (!user.isActive) {
        throw createError('Account is deactivated', 401);
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

      logger.info(`Discord user logged in: ${user.email}`);

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
      logger.error('Discord callback error:', error);
      throw error;
    }
  }

  private async findOrCreateDiscordUser(profile: DiscordProfile): Promise<User> {
    try {
      // First, try to find user by Discord ID
      let user = await prisma.user.findUnique({
        where: { discordId: profile.id }
      });

      if (user) {
        // Update Discord profile data if it has changed
        const needsUpdate = 
          user.discordUsername !== `${profile.username}#${profile.discriminator}` ||
          user.discordAvatar !== this.getDiscordAvatarUrl(profile);

        if (needsUpdate) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              discordUsername: `${profile.username}#${profile.discriminator}`,
              discordAvatar: this.getDiscordAvatarUrl(profile),
            }
          });
        }

        return user;
      }

      // If no user found by Discord ID, check if email exists
      if (profile.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email }
        });

        if (existingUser) {
          // Link Discord account to existing user
          user = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              discordId: profile.id,
              discordUsername: `${profile.username}#${profile.discriminator}`,
              discordAvatar: this.getDiscordAvatarUrl(profile),
              isEmailVerified: true, // Discord emails are verified
            }
          });

          return user;
        }
      }

      // Create new user with Discord data
      if (!profile.email) {
        throw createError('Discord account must have a verified email address', 400);
      }

      user = await prisma.user.create({
        data: {
          name: profile.username,
          email: profile.email,
          password: null, // Discord users don't have passwords
          discordId: profile.id,
          discordUsername: `${profile.username}#${profile.discriminator}`,
          discordAvatar: this.getDiscordAvatarUrl(profile),
          isEmailVerified: true, // Discord emails are verified
          emailVerifiedAt: new Date(),
        }
      });

      logger.info(`New Discord user created: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Find or create Discord user error:', error);
      throw error;
    }
  }

  private getDiscordAvatarUrl(profile: DiscordProfile): string | null {
    if (!profile.avatar) return null;
    
    const format = profile.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}?size=256`;
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

  async unlinkDiscordAccount(userId: string): Promise<{ message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      if (!user.discordId) {
        throw createError('No Discord account linked', 400);
      }

      // Check if user has a password (can still login without Discord)
      if (!user.password) {
        throw createError('Cannot unlink Discord account. Please set a password first.', 400);
      }

      // Unlink Discord account
      await prisma.user.update({
        where: { id: userId },
        data: {
          discordId: null,
          discordUsername: null,
          discordAvatar: null,
        }
      });

      // Clear user cache
      await cache.del(cacheKeys.user(userId));

      logger.info(`Discord account unlinked for user: ${userId}`);

      return {
        message: 'Discord account unlinked successfully'
      };
    } catch (error) {
      logger.error('Unlink Discord account error:', error);
      throw error;
    }
  }

  async linkDiscordAccount(userId: string, profile: DiscordProfile): Promise<{ message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      if (user.discordId) {
        throw createError('Discord account already linked', 400);
      }

      // Check if Discord account is already linked to another user
      const existingDiscordUser = await prisma.user.findUnique({
        where: { discordId: profile.id }
      });

      if (existingDiscordUser) {
        throw createError('This Discord account is already linked to another user', 409);
      }

      // Link Discord account
      await prisma.user.update({
        where: { id: userId },
        data: {
          discordId: profile.id,
          discordUsername: `${profile.username}#${profile.discriminator}`,
          discordAvatar: this.getDiscordAvatarUrl(profile),
        }
      });

      // Clear user cache
      await cache.del(cacheKeys.user(userId));

      logger.info(`Discord account linked for user: ${userId}`);

      return {
        message: 'Discord account linked successfully'
      };
    } catch (error) {
      logger.error('Link Discord account error:', error);
      throw error;
    }
  }

  async syncDiscordProfile(userId: string, profile: DiscordProfile): Promise<{ message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || user.discordId !== profile.id) {
        throw createError('Discord account not linked or mismatch', 400);
      }

      // Update Discord profile data
      await prisma.user.update({
        where: { id: userId },
        data: {
          discordUsername: `${profile.username}#${profile.discriminator}`,
          discordAvatar: this.getDiscordAvatarUrl(profile),
        }
      });

      // Clear user cache
      await cache.del(cacheKeys.user(userId));

      logger.info(`Discord profile synced for user: ${userId}`);

      return {
        message: 'Discord profile synchronized successfully'
      };
    } catch (error) {
      logger.error('Sync Discord profile error:', error);
      throw error;
    }
  }

  async getDiscordUsers(page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: {
            discordId: { not: null }
          },
          select: {
            id: true,
            name: true,
            email: true,
            discordId: true,
            discordUsername: true,
            discordAvatar: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({
          where: {
            discordId: { not: null }
          }
        })
      ]);

      return {
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        }
      };
    } catch (error) {
      logger.error('Get Discord users error:', error);
      throw error;
    }
  }
}