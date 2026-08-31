import mongoose, { Document, Schema, Types } from 'mongoose';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_VERIFYING'
  | 'PAYMENT_VERIFIED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface IOrderItem {
  menuItemId: Types.ObjectId;
  itemName: string;
  itemPrice: number;
  quantity: number;
  specialInstruction?: string;
}

export interface IOrder extends Document {
  orderNumber: number;
  userId: Types.ObjectId;
  tableId: Types.ObjectId;
  tableNumber: string;
  idempotencyKey?: string;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  cancellationReason?: string;
  notes?: string;
  createdAt: Date;
  acceptedAt?: Date;
  preparingAt?: Date;
  readyAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    itemName: { type: String, required: true },
    itemPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    specialInstruction: { type: String, trim: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: Number, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table' },
    tableNumber: { type: String, default: 'Counter' },
    idempotencyKey: { type: String, unique: true, sparse: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: [
        'PENDING_PAYMENT',
        'PAYMENT_VERIFYING',
        'PAYMENT_VERIFIED',
        'ACCEPTED',
        'PREPARING',
        'READY',
        'DELIVERED',
        'COMPLETED',
        'CANCELLED',
      ],
      default: 'PENDING_PAYMENT',
    },
    cancellationReason: { type: String },
    notes: { type: String },
    acceptedAt: { type: Date },
    preparingAt: { type: Date },
    readyAt: { type: Date },
    deliveredAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ tableId: 1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);

// Counter Schema for Atomic Order Number Sequence (#101, #102...)
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 100 },
});

export const Counter = mongoose.model('Counter', counterSchema);

export async function getNextOrderNumber(): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    'orderNumber',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}
