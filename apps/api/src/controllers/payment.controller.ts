import { Request, Response } from 'express';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { User, IUser } from '../models/User.js';
import { PaymentService } from '../services/payment.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { ENV } from '../config/env.js';

export class PaymentWebhookController {
  /**
   * Automated PhonePe / GPay / Bank SMS Notification Webhook Listener
   * Matches incoming notification UTR & Amount with pending student orders
   */
  static async handleNotificationWebhook(req: Request, res: Response) {
    try {
      const { text, amount: rawAmount, utr: rawUtr, sender, secretKey } = req.body;

      // Basic webhook security
      const expectedSecret = process.env.NOTIFICATION_WEBHOOK_SECRET || 'MASI_AUTO_SYNC_SECRET_2026';
      if (secretKey && secretKey !== expectedSecret) {
        sendError(res, 'Unauthorized webhook request', 401);
        return;
      }

      let parsedAmount = rawAmount ? Number(rawAmount) : 0;
      let parsedUtr = rawUtr ? String(rawUtr).trim() : '';

      // Parse from raw notification/SMS text if passed
      if (text && typeof text === 'string') {
        // Parse Amount (e.g., "Received Rs. 50.00" or "credited with INR 50.00" or "₹50")
        if (!parsedAmount) {
          const amtMatch = text.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{2})?)/i);
          if (amtMatch) {
            parsedAmount = parseFloat(amtMatch[1].replace(/,/g, ''));
          }
        }

        // Parse 12-digit UTR / Reference ID
        if (!parsedUtr) {
          const utrMatch = text.match(/(?:utr|ref|rrn|txn|id)[\s:/-]*([a-zA-Z0-9]{8,20})/i) || text.match(/\b\d{12}\b/);
          if (utrMatch) {
            parsedUtr = utrMatch[1] || utrMatch[0];
          }
        }
      }

      console.log(`[Auto-Sync Webhook] Incoming Notification: Amount=₹${parsedAmount}, UTR=${parsedUtr}, Text="${text}"`);

      // Find system bot or admin user for auto-action
      let systemUser = await User.findOne({ role: 'SUPER_ADMIN' });
      if (!systemUser) {
        systemUser = await User.findOne({ role: 'STAFF' });
      }

      // Match Strategy 1: Match by UTR / Reference number
      let matchedOrder: any = null;

      if (parsedUtr) {
        const payment = await Payment.findOne({
          transactionReference: parsedUtr,
          status: { $in: ['PENDING', 'USER_CLAIMED'] },
        });
        if (payment) {
          matchedOrder = await Order.findById(payment.orderId);
        }
      }

      // Match Strategy 2: Match by exact Amount for oldest pending order
      if (!matchedOrder && parsedAmount > 0) {
        matchedOrder = await Order.findOne({
          status: { $in: ['PENDING_PAYMENT', 'PAYMENT_VERIFYING'] },
          total: parsedAmount,
        }).sort({ createdAt: 1 });
      }

      if (!matchedOrder) {
        console.warn(`[Auto-Sync] No pending order found for Amount ₹${parsedAmount} (UTR: ${parsedUtr})`);
        sendSuccess(
          res,
          { matched: false, amount: parsedAmount, utr: parsedUtr },
          'Notification recorded, no matching pending order found'
        );
        return;
      }

      // Automatically verify and move order to cooking!
      const result = await PaymentService.verifyPayment(
        matchedOrder._id.toString(),
        systemUser || (matchedOrder.userId as any),
        parsedUtr || 'AUTO_VERIFIED_NOTIFICATION'
      );

      console.log(`[Auto-Sync SUCCESS] Automatically verified TOKEN #${matchedOrder.orderNumber} (Amount: ₹${matchedOrder.total})`);

      sendSuccess(
        res,
        {
          matched: true,
          orderNumber: matchedOrder.orderNumber,
          orderId: matchedOrder._id,
          amount: matchedOrder.total,
          utr: parsedUtr,
        },
        `Auto-verified Order #${matchedOrder.orderNumber} successfully!`
      );
    } catch (error: any) {
      console.error('[Auto-Sync Webhook Error]:', error);
      sendError(res, error.message, 400);
    }
  }
}
