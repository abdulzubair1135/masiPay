import mongoose, { Document, Schema } from 'mongoose';

export interface ICanteenSettings extends Document {
  canteenName: string;
  tagline: string;
  upiId: string;
  upiPayeeName: string;
  upiQrImage?: string;
  currencySymbol: string;
  defaultLanguage: string;
  estimatedPrepTimeMin: number;
  warningTimeThresholdMin: number;
  lateTimeThresholdMin: number;
  allowStudentCancel: boolean;
  updatedAt: Date;
}

const canteenSettingsSchema = new Schema<ICanteenSettings>(
  {
    canteenName: { type: String, default: 'MasiCanteen' },
    tagline: { type: String, default: 'Order karo, Masi tak turant pahunchao.' },
    upiId: { type: String, default: 'canteen@upi' },
    upiPayeeName: { type: String, default: 'Masi Canteen Services' },
    upiQrImage: { type: String },
    currencySymbol: { type: String, default: '₹' },
    defaultLanguage: { type: String, default: 'en' },
    estimatedPrepTimeMin: { type: Number, default: 10 },
    warningTimeThresholdMin: { type: Number, default: 10 },
    lateTimeThresholdMin: { type: Number, default: 20 },
    allowStudentCancel: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const CanteenSettings = mongoose.model<ICanteenSettings>(
  'CanteenSettings',
  canteenSettingsSchema
);

export async function getCanteenSettings(): Promise<ICanteenSettings> {
  let settings = await CanteenSettings.findOne();
  if (!settings) {
    settings = await CanteenSettings.create({});
  }
  return settings;
}
