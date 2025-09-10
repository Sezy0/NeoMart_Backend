import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { validateBody } from '@/middleware/validation';
import { authenticate } from '@/middleware/auth';
import { authLimiter, loginAttemptLimiter } from '@/middleware/rateLimiter';
import { registerSchema, loginSchema, refreshTokenSchema } from '@/utils/validation';

const router = Router();
const authController = new AuthController();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  authLimiter,
  validateBody(registerSchema),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
  loginAttemptLimiter,
  validateBody(loginSchema),
  authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh',
  validateBody(refreshTokenSchema),
  authController.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate session)
 * @access  Private
 */
router.post('/logout',
  authenticate,
  authController.logout
);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all',
  authenticate,
  authController.logoutAll
);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get user's active sessions
 * @access  Private
 */
router.get('/sessions',
  authenticate,
  authController.getSessions
);

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Revoke a specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId',
  authenticate,
  authController.revokeSession
);

/**
 * @route   GET /api/auth/discord
 * @desc    Discord OAuth2 login
 * @access  Public
 */
router.get('/discord', authController.discordLogin);

/**
 * @route   GET /api/auth/discord/callback
 * @desc    Discord OAuth2 callback
 * @access  Public
 */
router.get('/discord/callback', authController.discordCallback);

export default router;