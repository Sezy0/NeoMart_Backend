import { Router } from 'express';
import { OtpController } from '@/controllers/otp.controller';
import { validateBody } from '@/middleware/validation';
import { otpLimiter, otpAttemptLimiter } from '@/middleware/rateLimiter';
import { otpSendSchema, otpVerifySchema } from '@/utils/validation';

const router = Router();
const otpController = new OtpController();

/**
 * @route   POST /api/otp/send
 * @desc    Send OTP via email
 * @access  Public
 */
router.post('/send',
  otpLimiter,
  validateBody(otpSendSchema),
  otpController.sendOtp
);

/**
 * @route   POST /api/otp/verify
 * @desc    Verify OTP code
 * @access  Public
 */
router.post('/verify',
  otpAttemptLimiter,
  validateBody(otpVerifySchema),
  otpController.verifyOtp
);

export default router;