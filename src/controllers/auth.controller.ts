import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { AuthService } from '@/services/auth.service';
import { DiscordService } from '@/services/discord.service';
import { asyncHandler } from '@/middleware/errorHandler';
import { logger } from '@/config/logger';

export class AuthController {
  private authService = new AuthService();
  private discordService = new DiscordService();

  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.register(req.body);
    
    res.status(201).json({
      status: 'success',
      message: result.message
    });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.login(req.body);
    
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: result
    });
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await this.authService.refreshToken(refreshToken);
    
    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: result
    });
  });

  logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Extract session ID from JWT payload
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided'
      });
    }

    const { jwtUtils } = await import('@/utils/jwt');
    const payload = jwtUtils.verifyAccessToken(token);
    
    if (!payload) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }

    const result = await this.authService.logout(payload.sessionId);
    
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  });

  logoutAll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await this.authService.logoutAll(req.user!.id);
    
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  });

  getSessions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const sessions = await this.authService.getUserSessions(req.user!.id);
    
    res.status(200).json({
      status: 'success',
      message: 'Sessions retrieved successfully',
      data: sessions
    });
  });

  revokeSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;
    const result = await this.authService.revokeSession(sessionId, req.user!.id);
    
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  });

  discordLogin = asyncHandler(async (req: Request, res: Response) => {
    // In a real implementation, this would redirect to Discord OAuth2
    // For now, we'll return the Discord OAuth2 URL
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI!)}&response_type=code&scope=identify%20email`;
    
    res.status(200).json({
      status: 'success',
      message: 'Discord OAuth2 URL generated',
      data: {
        authUrl: discordAuthUrl
      }
    });
  });

  discordCallback = asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({
        status: 'error',
        message: 'Authorization code is required'
      });
    }

    // In a real implementation, you would:
    // 1. Exchange the code for an access token with Discord
    // 2. Fetch user profile from Discord API
    // 3. Create or update user in database
    
    // For demo purposes, we'll simulate a Discord profile
    const mockDiscordProfile = {
      id: '123456789012345678',
      username: 'testuser',
      discriminator: '1234',
      email: 'testuser@discord.com',
      avatar: 'avatar_hash'
    };

    const result = await this.discordService.handleDiscordCallback(mockDiscordProfile);
    
    res.status(200).json({
      status: 'success',
      message: 'Discord login successful',
      data: result
    });
  });
}