import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class AuthController {
  static async registerStudent(req: Request, res: Response) {
    try {
      const result = await AuthService.registerStudent(req.body);
      sendSuccess(res, result, 'Student registered successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async studentQuickLogin(req: Request, res: Response) {
    try {
      const phone = req.body.phone || req.body.rollNumberOrPhone;
      const result = await AuthService.studentQuickLogin(phone);
      if (!result.exists) {
        sendError(res, 'Account not found with this Mobile Number. Please click "Sign Up with Selfie & Name" below to register.', 404);
        return;
      }
      sendSuccess(res, result, 'Login successful');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async loginStaffAdmin(req: Request, res: Response) {
    try {
      const { emailOrPhone, password } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const result = await AuthService.loginStaffOrAdmin(emailOrPhone, password, ipAddress);
      sendSuccess(res, result, 'Staff/Admin authenticated successfully');
    } catch (error: any) {
      sendError(res, error.message, 401);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      sendSuccess(res, { user: req.user }, 'Profile fetched successfully');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await AuthService.updateProfile(req.user!._id.toString(), req.body);
      sendSuccess(res, { user }, 'Profile updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }
}
