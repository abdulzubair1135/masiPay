import { Router } from 'express';
import authRoutes from './auth.routes.js';
import menuRoutes from './menu.routes.js';
import tableRoutes from './table.routes.js';
import orderRoutes from './order.routes.js';
import staffRoutes from './staff.routes.js';
import adminRoutes from './admin.routes.js';
import userRoutes from './user.routes.js';
import paymentRoutes from './payment.routes.js';
import walletRoutes from './wallet.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/menu', menuRoutes);
router.use('/tables', tableRoutes);
router.use('/orders', orderRoutes);
router.use('/staff', staffRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);
router.use('/payments', paymentRoutes);
router.use('/wallet', walletRoutes);

export default router;
