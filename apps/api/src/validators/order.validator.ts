import { z } from 'zod';

export const createOrderSchema = z.object({
  tableToken: z.string().optional(),
  tableNumber: z.string().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1, 'Menu item ID is required'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        specialInstruction: z.string().max(200).optional(),
      })
    )
    .min(1, 'Order must contain at least 1 item'),
  notes: z.string().max(300).optional(),
  idempotencyKey: z.string().optional(),
});

export const claimPaymentSchema = z.object({
  transactionReference: z.string().max(100).optional(),
});

export const verifyPaymentSchema = z.object({
  transactionReference: z.string().max(100).optional(),
});

export const rejectPaymentSchema = z.object({
  reason: z.string().min(3, 'Rejection reason is required'),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason is required'),
});
