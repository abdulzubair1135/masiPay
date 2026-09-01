import { Router } from 'express';
import { PaymentWebhookController } from '../controllers/payment.controller.js';

const router = Router();

// Public Webhook for Android Notification Listener App / Tasker / SMS Forwarder
router.post('/auto-verify-webhook', PaymentWebhookController.handleNotificationWebhook);

export default router;
