import mongoose, { Document, Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export type TableStatus = 'ACTIVE' | 'DISABLED' | 'OCCUPIED' | 'RESERVED';

export interface ITable extends Document {
  tableNumber: string;
  secureToken: string;
  capacity: number;
  status: TableStatus;
  qrCodeUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tableSchema = new Schema<ITable>(
  {
    tableNumber: { type: String, required: true, unique: true, trim: true },
    secureToken: { type: String, required: true, unique: true, default: () => randomUUID() },
    capacity: { type: Number, default: 4 },
    status: { type: String, enum: ['ACTIVE', 'DISABLED', 'OCCUPIED', 'RESERVED'], default: 'ACTIVE' },
    qrCodeUrl: { type: String },
  },
  { timestamps: true }
);

tableSchema.index({ status: 1 });

export const Table = mongoose.model<ITable>('Table', tableSchema);
