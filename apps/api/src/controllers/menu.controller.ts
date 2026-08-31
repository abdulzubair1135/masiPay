import { Request, Response } from 'express';
import { MenuService } from '../services/menu.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export class MenuController {
  static async getCategories(req: Request, res: Response) {
    try {
      const categories = await MenuService.getCategories(true);
      sendSuccess(res, categories, 'Categories fetched successfully');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }

  static async getMenuItems(req: Request, res: Response) {
    try {
      const { categoryId, isVeg, search } = req.query;
      const items = await MenuService.getMenuItems({
        categoryId: categoryId as string,
        isVeg: isVeg === 'true' ? true : isVeg === 'false' ? false : undefined,
        search: search as string,
        onlyAvailable: req.query.all !== 'true',
        onlyActive: true,
      });
      sendSuccess(res, items, 'Menu items fetched successfully');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }

  static async getMenuItemById(req: Request, res: Response) {
    try {
      const item = await MenuService.getMenuItemById(req.params.id as string);
      sendSuccess(res, item, 'Item fetched successfully');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }
}
