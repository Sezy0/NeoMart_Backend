import jwt from 'jsonwebtoken';
import { JwtPayload } from '@/types';
import { logger } from '@/config/logger';

if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  logger.error('JWT secrets not configured');
  process.exit(1);
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

export const jwtUtils = {
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, ACCESS_SECRET, {
      expiresIn: ACCESS_EXPIRES_IN,
      issuer: 'nekomart-api',
      audience: 'nekomart-client',
    });
  },

  generateRefreshToken(payload: Omit<JwtPayload, 'sessionId'>): string {
    return jwt.sign(payload, REFRESH_SECRET, {
      expiresIn: REFRESH_EXPIRES_IN,
      issuer: 'nekomart-api',
      audience: 'nekomart-client',
    });
  },

  verifyAccessToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, ACCESS_SECRET, {
        issuer: 'nekomart-api',
        audience: 'nekomart-client',
      }) as JwtPayload;
      return decoded;
    } catch (error) {
      logger.debug('Access token verification failed:', error);
      return null;
    }
  },

  verifyRefreshToken(token: string): Omit<JwtPayload, 'sessionId'> | null {
    try {
      const decoded = jwt.verify(token, REFRESH_SECRET, {
        issuer: 'nekomart-api',
        audience: 'nekomart-client',
      }) as Omit<JwtPayload, 'sessionId'>;
      return decoded;
    } catch (error) {
      logger.debug('Refresh token verification failed:', error);
      return null;
    }
  },

  getTokenExpirationTime(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      logger.debug('Token decode failed:', error);
      return null;
    }
  },

  isTokenExpired(token: string): boolean {
    const expirationTime = this.getTokenExpirationTime(token);
    if (!expirationTime) return true;
    return new Date() >= expirationTime;
  }
};