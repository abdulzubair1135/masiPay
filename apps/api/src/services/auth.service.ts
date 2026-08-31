import { User, IUser } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { logAction } from './audit.service.js';

export class AuthService {
  static async registerStudent(data: {
    name: string;
    phone: string;
    profileImage?: string;
    language?: 'en' | 'hi' | 'gu';
  }) {
    const cleanPhone = data.phone.trim();
    let existing = await User.findOne({ phone: cleanPhone });

    if (existing) {
      if (existing.status !== 'ACTIVE') {
        throw new Error('This account has been suspended or deactivated.');
      }
      existing.name = data.name || existing.name;
      if (data.language) existing.language = data.language;
      if (data.profileImage) existing.profileImage = data.profileImage;
      await existing.save();

      const token = generateToken({
        userId: existing._id.toString(),
        role: existing.role,
        name: existing.name,
      });

      return { user: existing, token, isExisting: true };
    }

    const user = await User.create({
      name: data.name.trim(),
      phone: cleanPhone,
      language: data.language || 'en',
      profileImage:
        data.profileImage ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.name)}`,
      role: 'STUDENT',
      status: 'ACTIVE',
    });

    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
    });

    return { user, token, isExisting: false };
  }

  static async studentQuickLogin(phone: string) {
    const cleanPhone = phone.trim();
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return { exists: false };
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('Account is suspended');
    }

    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
    });

    return { exists: true, user, token };
  }

  static async loginStaffOrAdmin(emailOrPhone: string, password: string, ipAddress?: string) {
    const clean = emailOrPhone.trim();
    const user = await User.findOne({
      $or: [
        { email: clean.toLowerCase() },
        { phone: clean },
      ],
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.role === 'STUDENT') {
      throw new Error('Student accounts cannot login through Staff portal');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('Account is suspended or deactivated');
    }

    if (!user.passwordHash) {
      throw new Error('Password not set for this account');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
    });

    await logAction({
      actor: user,
      action: 'LOGIN_STAFF_ADMIN',
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress,
    });

    return { user, token };
  }

  static async updateProfile(userId: string, data: Partial<IUser>) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (data.name) user.name = data.name;
    if (data.language) user.language = data.language;
    if (data.profileImage) user.profileImage = data.profileImage;
    if (data.phone) user.phone = data.phone;

    await user.save();
    return user;
  }
}
