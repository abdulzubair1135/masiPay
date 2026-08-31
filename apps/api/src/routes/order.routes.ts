import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import {
  createOrderSchema,
  claimPaymentSchema,
  cancelOrderSchema,
} from '../validators/order.validator.js';

const router = Router();

router.use(authenticate);

router.post('/', validateBody(createOrderSchema), OrderController.createOrder);
router.get('/my', OrderController.getMyOrders);
router.get('/:id', OrderController.getOrderById);
router.post('/:id/payment-claimed', validateBody(claimPaymentSchema), OrderController.claimPayment);
router.post('/:id/cancel', validateBody(cancelOrderSchema), OrderController.studentCancel);

export default router;
