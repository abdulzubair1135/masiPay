import { Response } from 'express';
import { Favorite } from '../models/Favorite.js';
import { Notification } from '../models/Notification.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class UserController {
  static async getFavorites(req: AuthenticatedRequest, res: Response) {
    try {
      const favorites = await Favorite.find({ userId: req.user!._id })
        .populate({
          path: 'menuItemId',
          populate: { path: 'categoryId' },
        })
        .sort({ createdAt: -1 });

      sendSuccess(res, favorites, 'Favorites fetched');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }

  static async toggleFavorite(req: AuthenticatedRequest, res: Response) {
    try {
      const { menuItemId } = req.body;
      const existing = await Favorite.findOne({
        userId: req.user!._id,
        menuItemId,
      });

      if (existing) {
        await Favorite.findByIdAndDelete(existing._id);
        sendSuccess(res, { favorited: false }, 'Removed from favorites');
      } else {
        const fav = await Favorite.create({
          userId: req.user!._id,
          menuItemId,
        });
        sendSuccess(res, { favorited: true, favorite: fav }, 'Added to favorites');
      }
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  static async getNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const notifications = await Notification.find({ userId: req.user!._id })
        .sort({ createdAt: -1 })
        .limit(50);
      sendSuccess(res, notifications, 'Notifications fetched');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }

  static async markNotificationRead(req: AuthenticatedRequest, res: Response) {
    try {
      await Notification.updateMany({ userId: req.user!._id, read: false }, { read: true });
      sendSuccess(res, null, 'Notifications marked as read');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }
}
