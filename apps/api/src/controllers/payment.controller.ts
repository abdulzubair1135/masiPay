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
      let parsedSender = sender ? String(sender).trim() : '';
      let parsedTokenNumber: number | null = null;

      // Parse from raw notification/SMS text if passed (e.g. "SHAIKH ABDUL ZUBAIRA paid you ₹1.00")
      if (text && typeof text === 'string') {
        // Parse Amount (e.g., "₹1.00" or "INR 1.00" or "paid you ₹1.00")
        if (!parsedAmount) {
          const amtMatch = text.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{2})?)/i);
          if (amtMatch) {
            parsedAmount = parseFloat(amtMatch[1].replace(/,/g, ''));
          }
        }

        // Parse Sender Name from GPay ("SHAIKH ABDUL ZUBAIRA paid you ₹1.00")
        if (!parsedSender) {
          const gpayNameMatch = text.match(/^(.+?)\s+paid you/i) || text.match(/received.*?from\s+([A-Za-z\s]+)/i);
          if (gpayNameMatch) {
            parsedSender = gpayNameMatch[1].trim();
          }
        }

        // Parse Token Number from UPI Note (e.g. "Token #101" or "Token 101")
        const tokenMatch = text.match(/token[\s#_-]*(\d+)/i);
        if (tokenMatch) {
          const num = parseInt(tokenMatch[1], 10);
          if (!isNaN(num)) {
            parsedTokenNumber = num;
          }
        }

        // Parse 12-digit UTR / Reference ID if available
        if (!parsedUtr) {
          const utrMatch =
            text.match(/(?:utr|ref|rrn|txn|id)[\s:/-]*([a-zA-Z0-9]{8,20})/i) || text.match(/\b\d{12}\b/);
          if (utrMatch) {
            parsedUtr = utrMatch[1] || utrMatch[0];
          }
        }
      }

      console.log(
        `[Auto-Sync Webhook] Notification parsed: Sender="${parsedSender}", Token=${parsedTokenNumber}, Amount=₹${parsedAmount}, UTR="${parsedUtr}", Raw="${text}"`
      );

      // Find system bot or admin user for auto-action
      let systemUser = await User.findOne({ role: 'SUPER_ADMIN' });
      if (!systemUser) {
        systemUser = await User.findOne({ role: 'STAFF' });
      }

      let matchedOrder: any = null;

      // Match Strategy 0: Direct Match by Token Number (from UPI Note "Token #101")
      if (parsedTokenNumber) {
        matchedOrder = await Order.findOne({
          orderNumber: parsedTokenNumber,
          status: { $in: ['PENDING_PAYMENT', 'PAYMENT_VERIFYING'] },
        }).populate('userId', 'name phone');
      }

      // Match Strategy 1: Match by UTR / Reference number (if present)
      if (!matchedOrder && parsedUtr) {
        const payment = await Payment.findOne({
          transactionReference: parsedUtr,
          status: { $in: ['PENDING', 'USER_CLAIMED'] },
        });
        if (payment) {
          matchedOrder = await Order.findById(payment.orderId).populate('userId', 'name phone');
        }
      }

      // Match Strategy 2: Match by Sender Name + Exact Amount (Zero UTR needed!)
      if (!matchedOrder && parsedSender && parsedAmount > 0) {
        const candidateOrders = await Order.find({
          status: { $in: ['PENDING_PAYMENT', 'PAYMENT_VERIFYING'] },
          total: parsedAmount,
        }).populate('userId', 'name phone');

        const senderNorm = parsedSender.toLowerCase().replace(/[^a-z0-9]/g, '');
        matchedOrder = candidateOrders.find((ord: any) => {
          const userNameNorm = (ord.userId?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!userNameNorm) return false;
          return (
            userNameNorm.includes(senderNorm) ||
            senderNorm.includes(userNameNorm) ||
            senderNorm.split(' ').some((part: string) => part.length >= 3 && userNameNorm.includes(part)) ||
            userNameNorm.split(' ').some((part: string) => part.length >= 3 && senderNorm.includes(part))
          );
        });
      }

      // Match Strategy 3: Safe Single Candidate Match (Ambiguity Guard)
      // Only auto-verify if there is EXACTLY ONE pending order with this amount.
      // If 2 or more students ordered ₹50 simultaneously without unique Name/UTR,
      // the system will NEVER guess - it leaves it for Masi's 1-tap manual verification to prevent fraud!
      if (!matchedOrder && parsedAmount > 0) {
        const matchingOrders = await Order.find({
          status: { $in: ['PENDING_PAYMENT', 'PAYMENT_VERIFYING'] },
          total: parsedAmount,
        }).populate('userId', 'name phone');

        if (matchingOrders.length === 1) {
          matchedOrder = matchingOrders[0];
        } else if (matchingOrders.length > 1) {
          console.warn(
            `[Auto-Sync Ambiguity Guard] ${matchingOrders.length} orders found with Amount ₹${parsedAmount}. Awaiting UTR or Masi manual verification.`
          );
        }
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
