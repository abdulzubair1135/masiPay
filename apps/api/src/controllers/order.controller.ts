import { Response } from 'express';
import { OrderService } from '../services/order.service.js';
import { PaymentService } from '../services/payment.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class OrderController {
  static async createOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { tableToken, items, notes, idempotencyKey } = req.body;
      const order = await OrderService.createOrder({
        userId: req.user!._id.toString(),
        tableToken,
        items,
        notes,
        idempotencyKey,
      });
      sendSuccess(res, order, 'Order placed successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async claimPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { transactionReference, paymentMethod, proofImage } = req.body;
      const result = await PaymentService.claimPayment(
        id,
        req.user!._id.toString(),
        transactionReference,
        paymentMethod,
        proofImage
      );
      sendSuccess(res, result, 'Payment claim submitted. Staff will verify shortly.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async getOrderById(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const details = await OrderService.getOrderById(id);

      // Student can only view their own order
      if (
        req.user?.role === 'STUDENT' &&
        details.order.userId._id.toString() !== req.user._id.toString()
      ) {
        sendError(res, 'Unauthorized to view this order', 403);
        return;
      }

      sendSuccess(res, details, 'Order details fetched');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  static async getMyOrders(req: AuthenticatedRequest, res: Response) {
    try {
      const orders = await OrderService.getUserOrders(req.user!._id.toString());
      sendSuccess(res, orders, 'Orders fetched');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }

  static async studentCancel(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;
      const order = await OrderService.studentCancelOrder(
        id,
        req.user!._id.toString(),
        reason
      );
      sendSuccess(res, order, 'Order cancelled successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }
}
