import { Router } from 'express';
import { StaffController } from '../controllers/staff.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireStaffOrAdmin } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import {
  verifyPaymentSchema,
  rejectPaymentSchema,
  cancelOrderSchema,
  kitchenAlertSchema,
} from '../validators/order.validator.js';

const router = Router();

router.use(authenticate, requireStaffOrAdmin);

router.get('/orders', StaffController.getActiveOrders);
router.get('/summary', StaffController.getTodaySummary);
router.get('/daily-report', StaffController.getDailyWhatsAppReport);

router.post('/orders/:id/accept', StaffController.acceptOrder);
router.post('/orders/:id/preparing', StaffController.markPreparing);
router.post('/orders/:id/ready', StaffController.markReady);
router.post('/orders/:id/delivered', StaffController.markDelivered);
router.post('/orders/:id/complete', StaffController.markComplete);
router.post('/orders/:id/cancel', validateBody(cancelOrderSchema), StaffController.cancelOrder);
router.post('/orders/:id/alert', validateBody(kitchenAlertSchema), StaffController.sendKitchenAlert);

router.post('/orders/verify-all', StaffController.verifyAllPendingPayments);
router.post('/orders/:id/verify-payment', StaffController.verifyPayment);
router.post('/orders/:id/reject-payment', validateBody(rejectPaymentSchema), StaffController.rejectPayment);
router.post('/payments/:id/verify', validateBody(verifyPaymentSchema), StaffController.verifyPayment);
router.post('/payments/:id/reject', validateBody(rejectPaymentSchema), StaffController.rejectPayment);

router.patch('/menu/:id/availability', StaffController.toggleItemAvailability);

export default router;
