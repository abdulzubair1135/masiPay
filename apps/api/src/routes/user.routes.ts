import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/favorites', UserController.getFavorites);
router.post('/favorites/toggle', UserController.toggleFavorite);

router.get('/notifications', UserController.getNotifications);
router.post('/notifications/read', UserController.markNotificationRead);

export default router;
