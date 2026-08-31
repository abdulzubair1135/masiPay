import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuCategory extends Document {
  name: string;
  nameHi?: string;
  nameGu?: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const menuCategorySchema = new Schema<IMenuCategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    nameHi: { type: String, trim: true },
    nameGu: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

menuCategorySchema.index({ active: 1, sortOrder: 1 });

export const MenuCategory = mongoose.model<IMenuCategory>('MenuCategory', menuCategorySchema);
