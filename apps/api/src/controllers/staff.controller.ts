import { Response } from 'express';
import { OrderService } from '../services/order.service.js';
import { PaymentService } from '../services/payment.service.js';
import { MenuService } from '../services/menu.service.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class StaffController {
  static async getActiveOrders(req: AuthenticatedRequest, res: Response) {
    try {
      const orders = await OrderService.getStaffActiveOrders();
      sendSuccess(res, orders, 'Active kitchen orders fetched');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }

  static async acceptOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const order = await OrderService.updateOrderStatus(req.params.id as string, 'ACCEPTED', req.user!);
      sendSuccess(res, order, 'Order accepted');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async markPreparing(req: AuthenticatedRequest, res: Response) {
    try {
      const order = await OrderService.updateOrderStatus(req.params.id as string, 'PREPARING', req.user!);
      sendSuccess(res, order, 'Order status updated to Preparing');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async markReady(req: AuthenticatedRequest, res: Response) {
    try {
      const order = await OrderService.updateOrderStatus(req.params.id as string, 'READY', req.user!);
      sendSuccess(res, order, 'Order marked Ready');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async markDelivered(req: AuthenticatedRequest, res: Response) {
    try {
      const order = await OrderService.updateOrderStatus(req.params.id as string, 'DELIVERED', req.user!);
      sendSuccess(res, order, 'Order marked Delivered');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async markComplete(req: AuthenticatedRequest, res: Response) {
    try {
      const order = await OrderService.updateOrderStatus(req.params.id as string, 'COMPLETED', req.user!);
      sendSuccess(res, order, 'Order completed');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async cancelOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { reason } = req.body;
      const order = await OrderService.updateOrderStatus(req.params.id as string, 'CANCELLED', req.user!, reason);
      sendSuccess(res, order, 'Order cancelled with reason');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async verifyPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const { transactionReference } = req.body;
      const id = req.params.id as string;
      const result = await PaymentService.verifyPayment(
        id,
        req.user!,
        transactionReference
      );
      sendSuccess(res, result, 'Payment verified successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async rejectPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const { reason } = req.body;
      const id = req.params.id as string;
      const result = await PaymentService.rejectPayment(
        id,
        req.user!,
        reason || 'Payment not found in UPI'
      );
      sendSuccess(res, result, 'Payment rejected');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async toggleItemAvailability(req: AuthenticatedRequest, res: Response) {
    try {
      const { available } = req.body;
      const item = await MenuService.toggleAvailability(req.params.id as string, available, req.user!);
      sendSuccess(res, item, `Item is now ${available ? 'available' : 'sold out'}`);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async getTodaySummary(req: AuthenticatedRequest, res: Response) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [newOrders, preparing, ready, completed, cancelled, payments] = await Promise.all([
        Order.countDocuments({ status: { $in: ['PENDING_PAYMENT', 'PAYMENT_VERIFYING', 'ACCEPTED'] }, createdAt: { $gte: startOfDay } }),
        Order.countDocuments({ status: 'PREPARING', createdAt: { $gte: startOfDay } }),
        Order.countDocuments({ status: 'READY', createdAt: { $gte: startOfDay } }),
        Order.countDocuments({ status: 'COMPLETED', createdAt: { $gte: startOfDay } }),
        Order.countDocuments({ status: 'CANCELLED', createdAt: { $gte: startOfDay } }),
        Payment.find({ status: 'VERIFIED', createdAt: { $gte: startOfDay } }),
      ]);

      const todaySales = payments.reduce((acc, p) => acc + p.amount, 0);

      sendSuccess(res, {
        newOrders,
        preparing,
        ready,
        completed,
        cancelled,
        todaySales,
      }, 'Summary fetched');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }
}
