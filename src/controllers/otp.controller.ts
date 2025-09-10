import { Request, Response } from 'express';
import { OtpService } from '@/services/otp.service';
import { asyncHandler } from '@/middleware/errorHandler';

export class OtpController {
  private otpService = new OtpService();

  sendOtp = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.otpService.sendOtp(req.body);
    
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  });

  verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.otpService.verifyOtp(req.body);
    
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result.user
    });
  });
}