import { Router } from 'express';
import { MenuController } from '../controllers/menu.controller.js';

const router = Router();

router.get('/categories', MenuController.getCategories);
router.get('/items', MenuController.getMenuItems);
router.get('/items/:id', MenuController.getMenuItemById);

export default router;
