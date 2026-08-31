import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'SUPER_ADMIN' | 'STAFF' | 'STUDENT';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type UserLanguage = 'en' | 'hi' | 'gu';

export interface IUser extends Document {
  name: string;
  email?: string;
  phone?: string;
  rollNumber?: string;
  passwordHash?: string;
  profileImage?: string;
  language: UserLanguage;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    phone: { type: String, trim: true, sparse: true, unique: true },
    rollNumber: { type: String, trim: true, uppercase: true, sparse: true, unique: true },
    passwordHash: { type: String },
    profileImage: { type: String },
    language: { type: String, enum: ['en', 'hi', 'gu'], default: 'en' },
    role: { type: String, enum: ['SUPER_ADMIN', 'STAFF', 'STUDENT'], default: 'STUDENT' },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
