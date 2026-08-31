import { Response } from 'express';
import { OrderService } from '../services/order.service.js';
import { PaymentService } from '../services/payment.service.js';
import { MenuService } from '../services/menu.service.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { emitToOrder, emitToUser, SocketEvents } from '../socket/socket.events.js';

export class StaffController {
  static async getActiveOrders(req: AuthenticatedRequest, res: Response) {
    try {
      const orders = await Order.find({
        status: {
          $in: ['PENDING_PAYMENT', 'PAYMENT_VERIFYING', 'ACCEPTED', 'PREPARING', 'READY'],
        },
      })
        .populate('userId', 'name rollNumber profileImage phone')
        .populate('tableId', 'tableNumber')
        .sort({ createdAt: -1 });

      // Attach payment details (including proofImage and method)
      const orderIds = orders.map((o) => o._id);
      const payments = await Payment.find({ orderId: { $in: orderIds } });
      const paymentMap = new Map(payments.map((p) => [p.orderId.toString(), p]));

      const enriched = orders.map((o) => {
        const p = paymentMap.get(o._id.toString());
        return {
          ...o.toObject(),
          payment: p
            ? {
                method: p.method,
                status: p.status,
                transactionReference: p.transactionReference,
                proofImage: p.proofImage,
              }
            : null,
        };
      });

      sendSuccess(res, enriched, 'Active kitchen orders fetched');
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
        reason || 'Payment not found in UPI / Cash not received'
      );
      sendSuccess(res, result, 'Payment rejected');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async sendKitchenAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { type, message } = req.body;

      const order = await Order.findById(id).populate('userId', 'name phone');
      if (!order) throw new Error('Order not found');

      order.kitchenAlert = {
        type,
        message,
        sentAt: new Date(),
      };
      await order.save();

      const payload = {
        orderId: order._id,
        orderNumber: order.orderNumber,
        type,
        message,
        sentAt: new Date(),
      };

      emitToOrder(order._id.toString(), 'kitchen:alert', payload);
      emitToUser(order.userId._id.toString(), 'kitchen:alert', payload);

      sendSuccess(res, payload, `Alert "${type}" sent to student successfully`);
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
      const cashSales = payments.filter((p) => p.method === 'CASH').reduce((acc, p) => acc + p.amount, 0);
      const upiSales = payments.filter((p) => p.method !== 'CASH').reduce((acc, p) => acc + p.amount, 0);

      sendSuccess(res, {
        newOrders,
        preparing,
        ready,
        completed,
        cancelled,
        todaySales,
        cashSales,
        upiSales,
        totalVerifiedPayments: payments.length,
      }, 'Summary fetched');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }

  static async getDailyWhatsAppReport(req: AuthenticatedRequest, res: Response) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [orders, payments] = await Promise.all([
        Order.find({ createdAt: { $gte: startOfDay } }).populate('userId', 'name phone'),
        Payment.find({ status: 'VERIFIED', createdAt: { $gte: startOfDay } }),
      ]);

      const totalSales = payments.reduce((acc, p) => acc + p.amount, 0);
      const cashSales = payments.filter((p) => p.method === 'CASH').reduce((acc, p) => acc + p.amount, 0);
      const upiSales = payments.filter((p) => p.method !== 'CASH').reduce((acc, p) => acc + p.amount, 0);
      const deliveredCount = orders.filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status)).length;

      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const reportText = `📊 *MASICANTEEN DAILY SALES REPORT*\n📅 *Date:* ${dateStr}\n-----------------------------------\n💰 *Total Revenue:* ₹${totalSales}\n📱 *UPI Online:* ₹${upiSales}\n💵 *Cash at Counter:* ₹${cashSales}\n\n📦 *Total Orders Placed:* ${orders.length}\n✅ *Tokens Delivered:* ${deliveredCount}\n❌ *Cancelled:* ${orders.filter((o) => o.status === 'CANCELLED').length}\n-----------------------------------\n_Generated automatically from MasiCanteen Kitchen System_`;

      sendSuccess(res, { reportText, totalSales, cashSales, upiSales, ordersCount: orders.length }, 'Daily report generated');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }
}
