import { Response } from 'express';
import { User, IUser } from '../models/User.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Table } from '../models/Table.js';
import { AuditLog } from '../models/AuditLog.js';
import { MenuService } from '../services/menu.service.js';
import { TableService } from '../services/table.service.js';
import { CanteenSettings, getCanteenSettings } from '../models/CanteenSettings.js';
import { hashPassword } from '../utils/password.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logAction } from '../services/audit.service.js';

export class AdminController {
  static async getDashboardMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [
        todayOrdersCount,
        completedCount,
        cancelledCount,
        pendingCount,
        todayPayments,
        popularItemsAggregate,
        totalStudents,
        totalTables,
      ] = await Promise.all([
        Order.countDocuments({ createdAt: { $gte: startOfDay } }),
        Order.countDocuments({ status: 'COMPLETED', createdAt: { $gte: startOfDay } }),
        Order.countDocuments({ status: 'CANCELLED', createdAt: { $gte: startOfDay } }),
        Order.countDocuments({ status: { $in: ['PENDING_PAYMENT', 'PAYMENT_VERIFYING', 'ACCEPTED', 'PREPARING', 'READY'] }, createdAt: { $gte: startOfDay } }),
        Payment.find({ status: 'VERIFIED', createdAt: { $gte: startOfDay } }),
        Order.aggregate([
          { $match: { createdAt: { $gte: startOfDay } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.itemName',
              count: { $sum: '$items.quantity' },
              revenue: { $sum: { $multiply: ['$items.itemPrice', '$items.quantity'] } },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
        User.countDocuments({ role: 'STUDENT' }),
        Table.countDocuments(),
      ]);

      const todayRevenue = todayPayments.reduce((acc, p) => acc + p.amount, 0);

      sendSuccess(res, {
        todayOrdersCount,
        completedCount,
        cancelledCount,
        pendingCount,
        todayRevenue,
        popularItems: popularItemsAggregate,
        totalStudents,
        totalTables,
      }, 'Admin dashboard metrics');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }

  // Users & Staff
  static async getUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const { role, search, status } = req.query;
      const filter: any = {};
      if (role) filter.role = role as string;
      if (status) filter.status = status as string;
      if (search) {
        filter.$or = [
          { name: { $regex: search as string, $options: 'i' } },
          { email: { $regex: search as string, $options: 'i' } },
          { rollNumber: { $regex: search as string, $options: 'i' } },
          { phone: { $regex: search as string, $options: 'i' } },
        ];
      }

      const users = await User.find(filter).sort({ createdAt: -1 });
      sendSuccess(res, users, 'Users fetched');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }

  static async createStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, email, phone, password, role = 'STAFF' } = req.body;
      const existing = await User.findOne({
        $or: [{ email: email?.toLowerCase() }, { phone }],
      });
      if (existing) {
        sendError(res, 'A user with this email or phone already exists', 400);
        return;
      }

      const passwordHash = await hashPassword(password || 'Masi@12345');
      const staff = await User.create({
        name,
        email: email?.toLowerCase(),
        phone,
        passwordHash,
        role: role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'STAFF',
        status: 'ACTIVE',
      });

      await logAction({
        actor: req.user,
        action: 'CREATE_STAFF',
        entityType: 'User',
        entityId: staff._id.toString(),
        metadata: { name: staff.name, role: staff.role },
      });

      sendSuccess(res, staff, 'Staff account created', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async updateUserStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { status, role } = req.body;
      const user = await User.findById(req.params.id as string);
      if (!user) {
        sendError(res, 'User not found', 404);
        return;
      }

      if (status) user.status = status;
      if (role && req.user?.role === 'SUPER_ADMIN') user.role = role;
      await user.save();

      await logAction({
        actor: req.user,
        action: 'UPDATE_USER_STATUS',
        entityType: 'User',
        entityId: user._id.toString(),
        metadata: { status, role },
      });

      sendSuccess(res, user, 'User updated');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  // Menu
  static async createCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const cat = await MenuService.createCategory(req.body, req.user);
      sendSuccess(res, cat, 'Category created', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async updateCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const cat = await MenuService.updateCategory(req.params.id as string, req.body, req.user);
      sendSuccess(res, cat, 'Category updated');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async deleteCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const cat = await MenuService.deleteCategory(req.params.id as string, req.user);
      sendSuccess(res, cat, 'Category deactivated');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async createMenuItem(req: AuthenticatedRequest, res: Response) {
    try {
      const item = await MenuService.createMenuItem(req.body, req.user);
      sendSuccess(res, item, 'Menu item created', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async updateMenuItem(req: AuthenticatedRequest, res: Response) {
    try {
      const item = await MenuService.updateMenuItem(req.params.id as string, req.body, req.user);
      sendSuccess(res, item, 'Menu item updated');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async deleteMenuItem(req: AuthenticatedRequest, res: Response) {
    try {
      const item = await MenuService.softDeleteMenuItem(req.params.id as string, req.user);
      sendSuccess(res, item, 'Menu item deactivated');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  // Tables
  static async createTable(req: AuthenticatedRequest, res: Response) {
    try {
      const table = await TableService.createTable(req.body, req.user);
      sendSuccess(res, table, 'Table created', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async updateTable(req: AuthenticatedRequest, res: Response) {
    try {
      const table = await TableService.updateTable(req.params.id as string, req.body, req.user);
      sendSuccess(res, table, 'Table updated');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async regenerateTableQR(req: AuthenticatedRequest, res: Response) {
    try {
      const table = await TableService.regenerateTableQR(req.params.id as string, req.user);
      sendSuccess(res, table, 'Table QR regenerated');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  // Settings
  static async getSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const settings = await getCanteenSettings();
      sendSuccess(res, settings, 'Canteen settings');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }

  static async updateSettings(req: AuthenticatedRequest, res: Response) {
    try {
      let settings = await CanteenSettings.findOne();
      if (!settings) {
        settings = await CanteenSettings.create(req.body);
      } else {
        Object.assign(settings, req.body);
        await settings.save();
      }

      await logAction({
        actor: req.user,
        action: 'UPDATE_SETTINGS',
        entityType: 'CanteenSettings',
        entityId: settings._id.toString(),
        metadata: req.body,
      });

      sendSuccess(res, settings, 'Settings updated');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  // Orders Ledger
  static async getOrders(req: AuthenticatedRequest, res: Response) {
    try {
      const { status, dateFrom, dateTo, search } = req.query;
      const filter: any = {};
      if (status) filter.status = status as string;
      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) filter.createdAt.$gte = new Date(dateFrom as string);
        if (dateTo) {
          const toDate = new Date(dateTo as string);
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }

      const orders = await Order.find(filter)
        .populate('userId', 'name rollNumber profileImage phone')
        .populate('tableId', 'tableNumber')
        .sort({ createdAt: -1 })
        .limit(100);

      sendSuccess(res, orders, 'Orders fetched');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }

  // Audit logs
  static async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
      sendSuccess(res, logs, 'Audit logs fetched');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }
}
