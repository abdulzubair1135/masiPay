import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { OrderStatusHistory } from '../models/OrderStatusHistory.js';
import { getIO } from '../socket/socket.server.js';
import { logAction } from '../services/audit.service.js';

export class WalletController {
  static async getWalletDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = await User.findById(req.user!._id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const transactions = await WalletTransaction.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(20);

      res.json({
        success: true,
        data: {
          balance: user.walletBalance || 0,
          transactions,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async rechargeWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { amount, reference } = req.body;
      const numAmount = Number(amount);

      if (!numAmount || numAmount <= 0) {
        res.status(400).json({ success: false, message: 'Please provide a valid recharge amount' });
        return;
      }

      const user = await User.findById(req.user!._id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const currentBalance = user.walletBalance || 0;
      const newBalance = currentBalance + numAmount;
      user.walletBalance = newBalance;
      await user.save();

      const tx = await WalletTransaction.create({
        userId: user._id,
        amount: numAmount,
        type: 'RECHARGE',
        description: `Wallet Recharged via UPI (${reference || 'Instant Auto Top-Up'})`,
        balanceAfter: newBalance,
        reference: reference || `WAL-REC-${Date.now()}`,
      });

      res.json({
        success: true,
        message: `₹${numAmount} successfully added to your SRK Canteen Wallet!`,
        data: {
          balance: newBalance,
          transaction: tx,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async payOrderWithWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        res.status(400).json({ success: false, message: 'Order ID is required' });
        return;
      }

      const order = await Order.findById(orderId).populate('userId');
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PAYMENT_VERIFYING') {
        res.status(400).json({ success: false, message: `Order cannot be paid in status: ${order.status}` });
        return;
      }

      const user = await User.findById(req.user!._id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const currentBalance = user.walletBalance || 0;
      if (currentBalance < order.total) {
        res.status(400).json({
          success: false,
          message: `Insufficient SRK Wallet balance (₹${currentBalance.toFixed(2)}). Need ₹${order.total.toFixed(2)}. Please recharge your wallet or choose UPI.`,
          requiredAmount: order.total,
          currentBalance,
        });
        return;
      }

      // Deduct from wallet
      const newBalance = currentBalance - order.total;
      user.walletBalance = newBalance;
      await user.save();

      // Record transaction
      const tx = await WalletTransaction.create({
        userId: user._id,
        orderId: order._id,
        amount: -order.total,
        type: 'ORDER_PAYMENT',
        description: `Payment for Order #${order.orderNumber}`,
        balanceAfter: newBalance,
        reference: `ORD-${order.orderNumber}`,
      });

      // Update payment
      let payment = await Payment.findOne({ orderId: order._id });
      if (!payment) {
        payment = await Payment.create({
          orderId: order._id,
          userId: user._id,
          amount: order.total,
          method: 'WALLET',
          status: 'VERIFIED',
          verifiedAt: new Date(),
        });
      } else {
        payment.method = 'WALLET';
        payment.status = 'VERIFIED';
        payment.verifiedAt = new Date();
        await payment.save();
      }

      // Transition order status to ACCEPTED
      const prevStatus = order.status;
      order.status = 'ACCEPTED';
      order.acceptedAt = new Date();
      await order.save();

      await OrderStatusHistory.create({
        orderId: order._id,
        fromStatus: prevStatus,
        toStatus: 'ACCEPTED',
        changedById: user._id,
        note: `Instant 1-Click Payment via SRK Canteen Wallet (New Balance: ₹${newBalance})`,
      });

      await logAction({
        actor: user,
        action: 'WALLET_PAYMENT_ACCEPTED',
        entityType: 'Order',
        entityId: order._id.toString(),
        metadata: { orderNumber: order.orderNumber, amount: order.total, balanceRemaining: newBalance },
      });

      // Realtime Socket Broadcasts
      try {
        const io = getIO();
        if (io) {
          io.to(`order-${order._id}`).emit('order:status_changed', {
            orderId: order._id,
            newStatus: 'ACCEPTED',
            pickupCounter: order.pickupCounter,
            paymentStatus: 'VERIFIED',
          });

          io.to('staff:kitchen').emit('staff:order_accepted', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            pickupCounter: order.pickupCounter,
            total: order.total,
            method: 'WALLET',
          });
        }
      } catch (e) {
        // Socket may not be initialized in background tasks/tests
      }

      res.json({
        success: true,
        message: 'Order paid instantly using SRK Wallet! 🚀',
        data: {
          order,
          payment,
          walletBalance: newBalance,
          transaction: tx,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
