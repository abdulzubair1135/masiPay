import mongoose, { Document, Schema, Types } from 'mongoose';

export type WalletTxType = 'RECHARGE' | 'ORDER_PAYMENT' | 'REFUND';

export interface IWalletTransaction extends Document {
  userId: Types.ObjectId;
  amount: number;
  type: WalletTxType;
  description: string;
  orderId?: Types.ObjectId;
  balanceAfter: number;
  reference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['RECHARGE', 'ORDER_PAYMENT', 'REFUND'], required: true },
    description: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    balanceAfter: { type: Number, required: true },
    reference: { type: String },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

export const WalletTransaction = mongoose.model<IWalletTransaction>(
  'WalletTransaction',
  walletTransactionSchema
);
