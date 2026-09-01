import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { UserRole } from '../models/User.js';
import { sendError } from '../utils/apiResponse.js';

export const requireRoles = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized: User not authenticated', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'Forbidden: Insufficient privileges', 403);
      return;
    }

    next();
  };
};

export const requireSuperAdmin = requireRoles(['SUPER_ADMIN', 'ADMIN']);
export const requireStaffOrAdmin = requireRoles(['SUPER_ADMIN', 'ADMIN', 'STAFF']);
export const requireStudent = requireRoles(['STUDENT']);
