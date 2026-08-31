import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { User, IUser } from '../models/User.js';
import { sendError } from '../utils/apiResponse.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  tokenPayload?: TokenPayload;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authentication token missing or invalid', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.tokenPayload = decoded;

    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'ACTIVE') {
      sendError(res, 'User not found or account is deactivated', 401);
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    sendError(res, 'Invalid or expired authentication token', 401);
  }
};
