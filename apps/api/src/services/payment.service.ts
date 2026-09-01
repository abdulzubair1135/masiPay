import mongoose from 'mongoose';
import { Payment, IPayment } from '../models/Payment.js';
import { Order, IOrder } from '../models/Order.js';
import { OrderStatusHistory } from '../models/OrderStatusHistory.js';
import { IUser } from '../models/User.js';
import { emitToStaff, emitToUser, emitToOrder, SocketEvents } from '../socket/socket.events.js';
import { createNotification } from './notification.service.js';
import { logAction } from './audit.service.js';

export class PaymentService {
  /**
   * Student clicks "I HAVE PAID"
   */
  static async claimPayment(
    orderId: string,
    userId: string,
    transactionReference?: string,
    method: 'UPI_MANUAL' | 'CASH' = 'UPI_MANUAL',
    proofImage?: string
  ) {
    const order = await Order.findById(orderId).populate('userId', 'name rollNumber profileImage phone');
    if (!order) throw new Error('Order not found');

    if (order.userId._id.toString() !== userId) {
      throw new Error('Unauthorized to claim payment for this order');
    }

    if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PAYMENT_VERIFYING') {
      throw new Error(`Cannot claim payment for order in ${order.status} state`);
    }

    // Anti-Fraud: Prevent duplicate UTR / Reference recycling across multiple orders
    if (
      transactionReference &&
      transactionReference.trim().length >= 6 &&
      !['CASH_AT_COUNTER', 'UPI_DIRECT'].includes(transactionReference.trim())
    ) {
      const duplicateTx = await Payment.findOne({
        transactionReference: transactionReference.trim(),
        orderId: { $ne: order._id },
        status: { $in: ['USER_CLAIMED', 'VERIFIED'] },
      });
      if (duplicateTx) {
        throw new Error(
          'This UPI Reference / UTR number has already been used for another order! Please enter your unique payment transaction ID.'
        );
      }
    }

    let payment = await Payment.findOne({ orderId: order._id });
    if (!payment) {
      payment = await Payment.create({
        orderId: order._id,
        userId: order.userId._id,
        amount: order.total,
        method: method || 'UPI_MANUAL',
        status: 'USER_CLAIMED',
        transactionReference,
        proofImage,
      });
    } else {
      payment.status = 'USER_CLAIMED';
      payment.method = method || payment.method;
      if (transactionReference) payment.transactionReference = transactionReference;
      if (proofImage) payment.proofImage = proofImage;
      payment.updatedAt = new Date();
      await payment.save();
    }

    const previousStatus = order.status;
    order.status = 'PAYMENT_VERIFYING';
    await order.save();

    await OrderStatusHistory.create({
      orderId: order._id,
      fromStatus: previousStatus,
      toStatus: 'PAYMENT_VERIFYING',
      changedById: userId,
      note: 'Student claimed UPI payment made',
    });

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      tableNumber: order.tableNumber,
      student: order.userId,
      transactionReference,
      claimedAt: new Date(),
    };

    // Emit to staff room & student
    emitToStaff(SocketEvents.PAYMENT_CLAIMED, payload);
    emitToUser(userId, SocketEvents.ORDER_STATUS_CHANGED, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'PAYMENT_VERIFYING',
      paymentStatus: 'USER_CLAIMED',
    });
    emitToOrder(order._id.toString(), SocketEvents.ORDER_STATUS_CHANGED, {
      orderId: order._id,
      status: 'PAYMENT_VERIFYING',
      paymentStatus: 'USER_CLAIMED',
    });

    return { order, payment };
  }

  /**
   * Staff verifies that money reached UPI / GPay account
   */
  static async verifyPayment(paymentIdOrOrderId: string, staffUser: IUser, transactionReference?: string) {
    let payment = await Payment.findOne({
      $or: [{ _id: mongoose.isValidObjectId(paymentIdOrOrderId) ? paymentIdOrOrderId : null }, { orderId: paymentIdOrOrderId }],
    });

    if (!payment) throw new Error('Payment record not found');

    const order = await Order.findById(payment.orderId).populate('userId', 'name rollNumber profileImage');
    if (!order) throw new Error('Order not found');

    payment.status = 'VERIFIED';
    payment.verifiedById = staffUser._id as any;
    payment.verifiedAt = new Date();
    if (transactionReference) payment.transactionReference = transactionReference;
    await payment.save();

    const previousStatus = order.status;
    order.status = 'ACCEPTED';
    order.acceptedAt = new Date();
    await order.save();

    await OrderStatusHistory.create({
      orderId: order._id,
      fromStatus: previousStatus,
      toStatus: 'ACCEPTED',
      changedById: staffUser._id,
      note: `Payment verified by staff ${staffUser.name}`,
    });

    await logAction({
      actor: staffUser,
      action: 'VERIFY_PAYMENT',
      entityType: 'Payment',
      entityId: payment._id.toString(),
      metadata: { orderNumber: order.orderNumber, amount: payment.amount },
    });

    await createNotification({
      userId: order.userId._id.toString(),
      orderId: order._id.toString(),
      type: 'PAYMENT_VERIFIED',
      title: 'Payment Verified! ✅',
      message: `Your payment of ₹${payment.amount} for Order #${order.orderNumber} is verified. Masi is preparing your food!`,
    });

    const statusPayload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'ACCEPTED',
      paymentStatus: 'VERIFIED',
      acceptedAt: order.acceptedAt,
    };

    emitToStaff(SocketEvents.PAYMENT_VERIFIED, { payment, order });
    emitToUser(order.userId._id.toString(), SocketEvents.ORDER_STATUS_CHANGED, statusPayload);
    emitToOrder(order._id.toString(), SocketEvents.ORDER_STATUS_CHANGED, statusPayload);

    return { order, payment };
  }

  /**
   * Staff rejects payment because money was NOT found in GPay
   */
  static async rejectPayment(paymentIdOrOrderId: string, staffUser: IUser, reason: string) {
    let payment = await Payment.findOne({
      $or: [{ _id: mongoose.isValidObjectId(paymentIdOrOrderId) ? paymentIdOrOrderId : null }, { orderId: paymentIdOrOrderId }],
    });

    if (!payment) throw new Error('Payment record not found');

    const order = await Order.findById(payment.orderId);
    if (!order) throw new Error('Order not found');

    payment.status = 'REJECTED';
    payment.rejectionReason = reason;
    payment.verifiedById = staffUser._id as any;
    payment.verifiedAt = new Date();
    await payment.save();

    order.status = 'PENDING_PAYMENT';
    await order.save();

    await OrderStatusHistory.create({
      orderId: order._id,
      fromStatus: 'PAYMENT_VERIFYING',
      toStatus: 'PENDING_PAYMENT',
      changedById: staffUser._id,
      note: `Payment rejected by staff ${staffUser.name}: ${reason}`,
    });

    await logAction({
      actor: staffUser,
      action: 'REJECT_PAYMENT',
      entityType: 'Payment',
      entityId: payment._id.toString(),
      metadata: { orderNumber: order.orderNumber, reason },
    });

    await createNotification({
      userId: order.userId.toString(),
      orderId: order._id.toString(),
      type: 'PAYMENT_REJECTED',
      title: 'Payment Verification Failed ❌',
      message: `Payment for Order #${order.orderNumber} could not be verified: ${reason}. Please re-check and pay via UPI.`,
    });

    const rejectPayload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'REJECTED',
      reason,
    };

    emitToStaff(SocketEvents.PAYMENT_REJECTED, rejectPayload);
    emitToUser(order.userId.toString(), SocketEvents.PAYMENT_REJECTED, rejectPayload);
    emitToOrder(order._id.toString(), SocketEvents.ORDER_STATUS_CHANGED, rejectPayload);

    return { order, payment };
  }
}
