import { Notification, INotification, NotificationType } from '../models/Notification.js';
import { emitToUser, SocketEvents } from '../socket/socket.events.js';

export const createNotification = async (params: {
  userId: string;
  orderId?: string;
  type: NotificationType;
  title: string;
  message: string;
}): Promise<INotification> => {
  const notification = await Notification.create({
    userId: params.userId,
    orderId: params.orderId,
    type: params.type,
    title: params.title,
    message: params.message,
  });

  emitToUser(params.userId, SocketEvents.NOTIFICATION_RECEIVED, notification);
  return notification;
};
