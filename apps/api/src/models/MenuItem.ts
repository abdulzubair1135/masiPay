import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMenuItem extends Document {
  categoryId: Types.ObjectId;
  name: string;
  nameHi?: string;
  nameGu?: string;
  description?: string;
  descriptionHi?: string;
  descriptionGu?: string;
  image?: string;
  price: number;
  stock?: number | null; // null = made-to-order (infinite)
  available: boolean;
  isVeg: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
    name: { type: String, required: true, trim: true },
    nameHi: { type: String, trim: true },
    nameGu: { type: String, trim: true },
    description: { type: String, trim: true },
    descriptionHi: { type: String, trim: true },
    descriptionGu: { type: String, trim: true },
    image: { type: String },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: null },
    available: { type: Boolean, default: true },
    isVeg: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

menuItemSchema.index({ categoryId: 1, available: 1, active: 1 });
menuItemSchema.index({ active: 1, sortOrder: 1 });

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
