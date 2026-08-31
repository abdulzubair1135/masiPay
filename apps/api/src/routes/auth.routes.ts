import { Router } from 'express';
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

router.post('/register/student', validateBody(studentRegisterSchema), AuthController.registerStudent);
router.post('/login/student', validateBody(studentLoginOtpSchema), AuthController.studentQuickLogin);
router.post('/login/staff', validateBody(staffAdminLoginSchema), AuthController.loginStaffAdmin);

router.get('/me', authenticate, AuthController.getMe);
router.patch('/profile', authenticate, validateBody(updateProfileSchema), AuthController.updateProfile);

export default router;
