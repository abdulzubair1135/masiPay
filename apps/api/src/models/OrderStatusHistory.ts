import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IOrderStatusHistory extends Document {
  orderId: Types.ObjectId;
  fromStatus: string;
  toStatus: string;
  changedById?: Types.ObjectId;
  note?: string;
  createdAt: Date;
}

const orderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    changedById: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

orderStatusHistorySchema.index({ orderId: 1, createdAt: -1 });

export const OrderStatusHistory = mongoose.model<IOrderStatusHistory>(
  'OrderStatusHistory',
  orderStatusHistorySchema
);
