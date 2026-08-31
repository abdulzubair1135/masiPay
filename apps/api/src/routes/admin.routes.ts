import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireSuperAdmin } from '../middleware/rbac.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
} from '../validators/menu.validator.js';
import { createTableSchema, updateTableSchema } from '../validators/table.validator.js';

const router = Router();

router.use(authenticate, requireSuperAdmin);

// Analytics
router.get('/dashboard', AdminController.getDashboardMetrics);
router.get('/orders', AdminController.getOrders);
router.get('/audit-logs', AdminController.getAuditLogs);

// Users & Staff
router.get('/users', AdminController.getUsers);
router.post('/staff', AdminController.createStaff);
router.patch('/users/:id', AdminController.updateUserStatus);

// Menu & Categories
router.post('/categories', validateBody(createCategorySchema), AdminController.createCategory);
router.patch('/categories/:id', validateBody(updateCategorySchema), AdminController.updateCategory);
router.delete('/categories/:id', AdminController.deleteCategory);

router.post('/menu', validateBody(createMenuItemSchema), AdminController.createMenuItem);
router.patch('/menu/:id', validateBody(updateMenuItemSchema), AdminController.updateMenuItem);
router.delete('/menu/:id', AdminController.deleteMenuItem);

// Tables & QR
router.post('/tables', validateBody(createTableSchema), AdminController.createTable);
router.patch('/tables/:id', validateBody(updateTableSchema), AdminController.updateTable);
router.post('/tables/:id/regenerate-qr', AdminController.regenerateTableQR);

// Canteen Settings
router.get('/settings', AdminController.getSettings);
router.patch('/settings', AdminController.updateSettings);

export default router;
