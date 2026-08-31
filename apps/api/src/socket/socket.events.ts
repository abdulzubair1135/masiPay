import { getIO } from './socket.server.js';

export const SocketEvents = {
  ORDER_CREATED: 'order:created',
  PAYMENT_CLAIMED: 'payment:claimed',
  PAYMENT_VERIFIED: 'payment:verified',
  PAYMENT_REJECTED: 'payment:rejected',
  ORDER_STATUS_CHANGED: 'order:status_changed',
  ORDER_CANCELLED: 'order:cancelled',
  MENU_AVAILABILITY_CHANGED: 'menu:availability_changed',
  NOTIFICATION_RECEIVED: 'notification:received',
};

export const emitToStaff = (event: string, payload: any) => {
  try {
    const io = getIO();
    io.to('staff-room').emit(event, payload);
  } catch (err) {
    console.error(`[Socket Error] Failed to emit ${event} to staff:`, err);
  }
};

export const emitToUser = (userId: string, event: string, payload: any) => {
  try {
    const io = getIO();
    io.to(`user-${userId}`).emit(event, payload);
  } catch (err) {
    console.error(`[Socket Error] Failed to emit ${event} to user ${userId}:`, err);
  }
};

export const emitToOrder = (orderId: string, event: string, payload: any) => {
  try {
    const io = getIO();
    io.to(`order-${orderId}`).emit(event, payload);
  } catch (err) {
    console.error(`[Socket Error] Failed to emit ${event} to order ${orderId}:`, err);
  }
};

export const emitToAll = (event: string, payload: any) => {
  try {
    const io = getIO();
    io.emit(event, payload);
  } catch (err) {
    console.error(`[Socket Error] Failed to broadcast ${event}:`, err);
  }
};
