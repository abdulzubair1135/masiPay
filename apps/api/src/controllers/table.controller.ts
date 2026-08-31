import { Request, Response } from 'express';
import { TableService } from '../services/table.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export class TableController {
  static async resolveTableToken(req: Request, res: Response) {
    try {
      const table = await TableService.getTableByToken(req.params.token as string);
      sendSuccess(res, table, 'Table resolved successfully');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  static async getAllTables(req: Request, res: Response) {
    try {
      const tables = await TableService.getAllTables();
      sendSuccess(res, tables, 'Tables fetched successfully');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }
}
