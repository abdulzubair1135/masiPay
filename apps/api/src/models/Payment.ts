import mongoose, { Document, Schema, Types } from 'mongoose';

export type PaymentMethod = 'UPI_MANUAL' | 'CASH' | 'RAZORPAY';
export type PaymentStatus = 'PENDING' | 'USER_CLAIMED' | 'VERIFIED' | 'REJECTED' | 'REFUNDED';

export interface IPayment extends Document {
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference?: string;
  verifiedById?: Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['UPI_MANUAL', 'CASH', 'RAZORPAY'], default: 'UPI_MANUAL' },
    status: {
      type: String,
      enum: ['PENDING', 'USER_CLAIMED', 'VERIFIED', 'REJECTED', 'REFUNDED'],
      default: 'PENDING',
    },
    transactionReference: { type: String, trim: true },
    verifiedById: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
