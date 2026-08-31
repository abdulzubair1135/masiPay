import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationType =
  | 'NEW_ORDER'
  | 'PAYMENT_CLAIMED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_REJECTED'
  | 'ORDER_ACCEPTED'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'ORDER_COMPLETED';

export interface INotification extends Document {
  userId: Types.ObjectId;
  orderId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    type: {
      type: String,
      enum: [
        'NEW_ORDER',
        'PAYMENT_CLAIMED',
        'PAYMENT_VERIFIED',
        'PAYMENT_REJECTED',
        'ORDER_ACCEPTED',
        'ORDER_PREPARING',
        'ORDER_READY',
        'ORDER_DELIVERED',
        'ORDER_CANCELLED',
        'ORDER_COMPLETED',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
