import { Router } from 'express';
import { TableController } from '../controllers/table.controller.js';

const router = Router();

router.get('/token/:token', TableController.resolveTableToken);
router.get('/', TableController.getAllTables);

export default router;
