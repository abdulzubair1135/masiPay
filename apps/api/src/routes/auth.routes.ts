import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import {
  studentRegisterSchema,
  studentLoginOtpSchema,
  staffAdminLoginSchema,
  updateProfileSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Strict Rate Limiting on Auth to block brute force attacks (30 attempts per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login / registration attempts. Please try again after 15 minutes.',
  },
});

router.post('/register/student', authLimiter, validateBody(studentRegisterSchema), AuthController.registerStudent);
router.post('/login/student', authLimiter, validateBody(studentLoginOtpSchema), AuthController.studentQuickLogin);
router.post('/login/staff', authLimiter, validateBody(staffAdminLoginSchema), AuthController.loginStaffAdmin);

router.get('/me', authenticate, AuthController.getMe);
router.patch('/profile', authenticate, validateBody(updateProfileSchema), AuthController.updateProfile);

export default router;
