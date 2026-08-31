import { z } from 'zod';

export const studentRegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Please enter a valid 10-digit mobile number'),
  profileImage: z.string().optional(),
  language: z.enum(['en', 'hi', 'gu']).default('en'),
});

export const studentLoginOtpSchema = z.object({
  phone: z.string().min(10, 'Please enter a valid 10-digit mobile number').optional(),
  rollNumberOrPhone: z.string().optional(),
}).refine((data) => data.phone || data.rollNumberOrPhone, {
  message: 'Mobile number is required',
});

export const staffAdminLoginSchema = z.object({
  emailOrPhone: z.string().min(3, 'Email or Phone is required'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  language: z.enum(['en', 'hi', 'gu']).optional(),
  profileImage: z.string().optional(),
  phone: z.string().optional(),
});
