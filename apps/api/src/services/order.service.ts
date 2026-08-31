import { Order, IOrder, OrderStatus, getNextOrderNumber } from '../models/Order.js';
import { MenuItem } from '../models/MenuItem.js';
import { Table } from '../models/Table.js';
import { Payment } from '../models/Payment.js';
import { OrderStatusHistory } from '../models/OrderStatusHistory.js';
import { IUser } from '../models/User.js';
import { emitToStaff, emitToUser, emitToOrder, SocketEvents } from '../socket/socket.events.js';
import { createNotification } from './notification.service.js';
import { logAction } from './audit.service.js';

export class OrderService {
  /**
   * Create a new Order from student cart
   */
  static async createOrder(data: {
    userId: string;
    tableToken: string;
    items: { menuItemId: string; quantity: number; specialInstruction?: string }[];
    notes?: string;
    idempotencyKey?: string;
  }) {
    if (data.idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey: data.idempotencyKey })
        .populate('userId', 'name rollNumber profileImage')
        .populate('tableId', 'tableNumber');
      if (existing) {
        return existing;
      }
    }

    const table = await Table.findOne({ secureToken: data.tableToken });
    if (!table) {
      throw new Error('Invalid table QR code');
    }
    if (table.status === 'DISABLED') {
      throw new Error(`Table ${table.tableNumber} is currently disabled`);
    }

    // Fetch and validate menu items from database to compute authoritative prices
    const itemIds = data.items.map((i) => i.menuItemId);
    const dbItems = await MenuItem.find({ _id: { $in: itemIds }, active: true });

    if (dbItems.length !== data.items.length) {
      throw new Error('One or more items in your cart are no longer available');
    }

    const itemMap = new Map(dbItems.map((item) => [item._id.toString(), item]));

    let subtotal = 0;
    const embeddedItems = [];

    for (const requestedItem of data.items) {
      const dbItem = itemMap.get(requestedItem.menuItemId);
      if (!dbItem) {
        throw new Error(`Item ${requestedItem.menuItemId} not found`);
      }
      if (!dbItem.available) {
        throw new Error(`"${dbItem.name}" is currently sold out / unavailable`);
      }
      if (dbItem.stock !== null && dbItem.stock !== undefined) {
        if (dbItem.stock < requestedItem.quantity) {
          throw new Error(`Only ${dbItem.stock} quantity available for "${dbItem.name}"`);
        }
      }

      const itemTotal = dbItem.price * requestedItem.quantity;
      subtotal += itemTotal;

      embeddedItems.push({
        menuItemId: dbItem._id,
        itemName: dbItem.name,
        itemPrice: dbItem.price,
        quantity: requestedItem.quantity,
        specialInstruction: requestedItem.specialInstruction,
      });
    }

    // Stock deduction
    for (const requestedItem of data.items) {
      const dbItem = itemMap.get(requestedItem.menuItemId)!;
      if (dbItem.stock !== null && dbItem.stock !== undefined) {
        dbItem.stock = Math.max(0, dbItem.stock - requestedItem.quantity);
        if (dbItem.stock === 0) {
          dbItem.available = false;
        }
        await dbItem.save();
      }
    }

    const tax = 0; // Configurable if needed
    const total = subtotal + tax;
    const orderNumber = await getNextOrderNumber();

    const order = await Order.create({
      orderNumber,
      userId: data.userId,
      tableId: table._id,
      tableNumber: table.tableNumber,
      idempotencyKey: data.idempotencyKey,
      items: embeddedItems,
      subtotal,
      tax,
      total,
      status: 'PENDING_PAYMENT',
      notes: data.notes,
    });

    // Create corresponding payment record
    await Payment.create({
      orderId: order._id,
      userId: data.userId,
      amount: total,
      method: 'UPI_MANUAL',
      status: 'PENDING',
    });

    await OrderStatusHistory.create({
      orderId: order._id,
      fromStatus: 'NONE',
      toStatus: 'PENDING_PAYMENT',
      changedById: data.userId,
      note: 'Order created',
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name rollNumber profileImage phone email')
      .populate('tableId', 'tableNumber');

    // Realtime notification to Masi Staff
    emitToStaff(SocketEvents.ORDER_CREATED, populatedOrder);

    return populatedOrder;
  }

  /**
   * Update Order Status (Strict State Machine)
   */
  static async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    staffUser: IUser,
    cancellationReason?: string
  ) {
    const order = await Order.findById(orderId).populate('userId', 'name rollNumber profileImage');
    if (!order) throw new Error('Order not found');

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING_PAYMENT: ['PAYMENT_VERIFYING', 'ACCEPTED', 'CANCELLED'],
      PAYMENT_VERIFYING: ['ACCEPTED', 'PENDING_PAYMENT', 'CANCELLED'],
      PAYMENT_VERIFIED: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: ['DELIVERED', 'COMPLETED', 'CANCELLED'],
      DELIVERED: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[order.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
    }

    const previousStatus = order.status;
    order.status = newStatus;

    if (newStatus === 'ACCEPTED') order.acceptedAt = new Date();
    if (newStatus === 'PREPARING') order.preparingAt = new Date();
    if (newStatus === 'READY') order.readyAt = new Date();
    if (newStatus === 'DELIVERED') order.deliveredAt = new Date();
    if (newStatus === 'COMPLETED') order.completedAt = new Date();
    if (newStatus === 'CANCELLED') {
      order.cancelledAt = new Date();
      order.cancellationReason = cancellationReason || 'Cancelled by staff';

      // Restore stock
      for (const item of order.items) {
        const dbItem = await MenuItem.findById(item.menuItemId);
        if (dbItem && dbItem.stock !== null && dbItem.stock !== undefined) {
          dbItem.stock += item.quantity;
          dbItem.available = true;
          await dbItem.save();
        }
      }
    }

    await order.save();

    await OrderStatusHistory.create({
      orderId: order._id,
      fromStatus: previousStatus,
      toStatus: newStatus,
      changedById: staffUser._id,
      note: cancellationReason || `Status moved to ${newStatus}`,
    });

    await logAction({
      actor: staffUser,
      action: `ORDER_${newStatus}`,
      entityType: 'Order',
      entityId: order._id.toString(),
      metadata: { orderNumber: order.orderNumber, from: previousStatus, to: newStatus },
    });

    // Customer notifications
    if (newStatus === 'PREPARING') {
      await createNotification({
        userId: order.userId._id.toString(),
        orderId: order._id.toString(),
        type: 'ORDER_PREPARING',
        title: 'Food is Preparing! 🍳',
        message: `Order #${order.orderNumber} is now being prepared by Masi.`,
      });
    } else if (newStatus === 'READY') {
      await createNotification({
        userId: order.userId._id.toString(),
        orderId: order._id.toString(),
        type: 'ORDER_READY',
        title: 'Order is Ready! 🔔',
        message: `Order #${order.orderNumber} is ready for Table ${order.tableNumber}!`,
      });
    } else if (newStatus === 'DELIVERED' || newStatus === 'COMPLETED') {
      await createNotification({
        userId: order.userId._id.toString(),
        orderId: order._id.toString(),
        type: 'ORDER_COMPLETED',
        title: 'Order Completed! ✅',
        message: `Order #${order.orderNumber} delivered. Enjoy your meal!`,
      });
    } else if (newStatus === 'CANCELLED') {
      await createNotification({
        userId: order.userId._id.toString(),
        orderId: order._id.toString(),
        type: 'ORDER_CANCELLED',
        title: 'Order Cancelled ❌',
        message: `Order #${order.orderNumber} was cancelled: ${order.cancellationReason}`,
      });
    }

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: newStatus,
      cancellationReason: order.cancellationReason,
      updatedAt: new Date(),
    };

    emitToStaff(SocketEvents.ORDER_STATUS_CHANGED, payload);
    emitToUser(order.userId._id.toString(), SocketEvents.ORDER_STATUS_CHANGED, payload);
    emitToOrder(order._id.toString(), SocketEvents.ORDER_STATUS_CHANGED, payload);

    return order;
  }

  /**
   * Student cancel order
   */
  static async studentCancelOrder(orderId: string, userId: string, reason?: string) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');

    if (order.userId.toString() !== userId) {
      throw new Error('Unauthorized to cancel this order');
    }

    if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PAYMENT_VERIFYING') {
      throw new Error(`Order cannot be cancelled in ${order.status} state. Please ask staff.`);
    }

    const previousStatus = order.status;
    order.status = 'CANCELLED';
    order.cancelledAt = new Date();
    order.cancellationReason = reason || 'Cancelled by student';
    await order.save();

    // Restore stock
    for (const item of order.items) {
      const dbItem = await MenuItem.findById(item.menuItemId);
      if (dbItem && dbItem.stock !== null && dbItem.stock !== undefined) {
        dbItem.stock += item.quantity;
        dbItem.available = true;
        await dbItem.save();
      }
    }

    await OrderStatusHistory.create({
      orderId: order._id,
      fromStatus: previousStatus,
      toStatus: 'CANCELLED',
      changedById: userId,
      note: 'Cancelled by student',
    });

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'CANCELLED',
      cancellationReason: order.cancellationReason,
    };

    emitToStaff(SocketEvents.ORDER_CANCELLED, payload);
    emitToUser(userId, SocketEvents.ORDER_CANCELLED, payload);
    emitToOrder(order._id.toString(), SocketEvents.ORDER_STATUS_CHANGED, payload);

    return order;
  }

  /**
   * Get Active Kitchen Orders for Staff Dashboard
   */
  static async getStaffActiveOrders() {
    return Order.find({
      status: {
        $in: ['PENDING_PAYMENT', 'PAYMENT_VERIFYING', 'ACCEPTED', 'PREPARING', 'READY'],
      },
    })
      .populate('userId', 'name rollNumber profileImage phone')
      .populate('tableId', 'tableNumber')
      .sort({ createdAt: 1 });
  }

  /**
   * Get Order by ID
   */
  static async getOrderById(orderId: string) {
    const order = await Order.findById(orderId)
      .populate('userId', 'name rollNumber profileImage phone email')
      .populate('tableId', 'tableNumber capacity')
      .populate('items.menuItemId');

    if (!order) throw new Error('Order not found');

    const payment = await Payment.findOne({ orderId: order._id }).populate('verifiedById', 'name');
    const history = await OrderStatusHistory.find({ orderId: order._id })
      .populate('changedById', 'name role')
      .sort({ createdAt: 1 });

    return { order, payment, history };
  }

  /**
   * Get User Order History
   */
  static async getUserOrders(userId: string) {
    return Order.find({ userId }).sort({ createdAt: -1 });
  }
}
