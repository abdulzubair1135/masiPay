import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name is required'),
  nameHi: z.string().optional(),
  nameGu: z.string().optional(),
  sortOrder: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createMenuItemSchema = z.object({
  categoryId: z.string().min(1, 'Category ID is required'),
  name: z.string().min(2, 'Item name is required'),
  nameHi: z.string().optional(),
  nameGu: z.string().optional(),
  description: z.string().optional(),
  descriptionHi: z.string().optional(),
  descriptionGu: z.string().optional(),
  image: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  stock: z.number().int().min(0).nullable().optional(),
  available: z.boolean().optional().default(true),
  isVeg: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();
