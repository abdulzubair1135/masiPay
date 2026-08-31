import { MenuCategory, IMenuCategory } from '../models/MenuCategory.js';
import { MenuItem, IMenuItem } from '../models/MenuItem.js';
import { emitToAll, SocketEvents } from '../socket/socket.events.js';
import { logAction } from './audit.service.js';
import { IUser } from '../models/User.js';

export class MenuService {
  // Category methods
  static async getCategories(onlyActive = true) {
    const filter = onlyActive ? { active: true } : {};
    return MenuCategory.find(filter).sort({ sortOrder: 1, name: 1 });
  }

  static async createCategory(data: Partial<IMenuCategory>, actor?: IUser) {
    const category = await MenuCategory.create(data);
    await logAction({
      actor,
      action: 'CREATE_CATEGORY',
      entityType: 'MenuCategory',
      entityId: category._id.toString(),
      metadata: { name: category.name },
    });
    return category;
  }

  static async updateCategory(id: string, data: Partial<IMenuCategory>, actor?: IUser) {
    const category = await MenuCategory.findByIdAndUpdate(id, data, { new: true });
    if (!category) throw new Error('Category not found');
    await logAction({
      actor,
      action: 'UPDATE_CATEGORY',
      entityType: 'MenuCategory',
      entityId: category._id.toString(),
      metadata: data,
    });
    return category;
  }

  static async deleteCategory(id: string, actor?: IUser) {
    const itemsCount = await MenuItem.countDocuments({ categoryId: id, active: true });
    if (itemsCount > 0) {
      throw new Error(`Cannot delete category with ${itemsCount} active menu items. Deactivate items first.`);
    }
    const category = await MenuCategory.findByIdAndUpdate(id, { active: false }, { new: true });
    await logAction({
      actor,
      action: 'DEACTIVATE_CATEGORY',
      entityType: 'MenuCategory',
      entityId: id,
    });
    return category;
  }

  // Menu items methods
  static async getMenuItems(query: {
    categoryId?: string;
    isVeg?: boolean;
    search?: string;
    onlyAvailable?: boolean;
    onlyActive?: boolean;
  }) {
    const filter: any = {};
    if (query.onlyActive !== false) filter.active = true;
    if (query.onlyAvailable) filter.available = true;
    if (query.categoryId) filter.categoryId = query.categoryId;
    if (typeof query.isVeg === 'boolean') filter.isVeg = query.isVeg;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
        { nameHi: { $regex: query.search, $options: 'i' } },
        { nameGu: { $regex: query.search, $options: 'i' } },
      ];
    }

    return MenuItem.find(filter)
      .populate('categoryId', 'name nameHi nameGu')
      .sort({ sortOrder: 1, name: 1 });
  }

  static async getMenuItemById(id: string) {
    const item = await MenuItem.findById(id).populate('categoryId', 'name nameHi nameGu');
    if (!item) throw new Error('Menu item not found');
    return item;
  }

  static async createMenuItem(data: Partial<IMenuItem>, actor?: IUser) {
    const item = await MenuItem.create(data);
    await logAction({
      actor,
      action: 'CREATE_MENU_ITEM',
      entityType: 'MenuItem',
      entityId: item._id.toString(),
      metadata: { name: item.name, price: item.price },
    });
    return item;
  }

  static async updateMenuItem(id: string, data: Partial<IMenuItem>, actor?: IUser) {
    const item = await MenuItem.findByIdAndUpdate(id, data, { new: true }).populate('categoryId');
    if (!item) throw new Error('Menu item not found');

    if (data.available !== undefined || data.stock !== undefined) {
      emitToAll(SocketEvents.MENU_AVAILABILITY_CHANGED, {
        menuItemId: item._id,
        name: item.name,
        available: item.available,
        stock: item.stock,
      });
    }

    await logAction({
      actor,
      action: 'UPDATE_MENU_ITEM',
      entityType: 'MenuItem',
      entityId: item._id.toString(),
      metadata: data,
    });
    return item;
  }

  static async toggleAvailability(id: string, available: boolean, actor?: IUser) {
    return this.updateMenuItem(id, { available }, actor);
  }

  static async updateStock(id: string, stock: number | null, actor?: IUser) {
    const available = stock === null || stock > 0;
    return this.updateMenuItem(id, { stock, available }, actor);
  }

  static async softDeleteMenuItem(id: string, actor?: IUser) {
    return this.updateMenuItem(id, { active: false, available: false }, actor);
  }
}
