import { z } from 'zod';

export const createTableSchema = z.object({
  tableNumber: z.string().min(1, 'Table number is required'),
  capacity: z.number().int().min(1).default(4),
  status: z.enum(['ACTIVE', 'DISABLED', 'OCCUPIED', 'RESERVED']).default('ACTIVE'),
});

export const updateTableSchema = z.object({
  tableNumber: z.string().min(1).optional(),
  capacity: z.number().int().min(1).optional(),
  status: z.enum(['ACTIVE', 'DISABLED', 'OCCUPIED', 'RESERVED']).optional(),
});
