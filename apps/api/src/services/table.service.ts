import { Table, ITable } from '../models/Table.js';
import { generateQRCodeDataURL } from '../utils/qr.js';
import { ENV } from '../config/env.js';
import { randomUUID } from 'crypto';
import { logAction } from './audit.service.js';
import { IUser } from '../models/User.js';

export class TableService {
  static async getTableByToken(token: string): Promise<ITable> {
    const table = await Table.findOne({ secureToken: token });
    if (!table) {
      throw new Error('Invalid or expired table QR code');
    }
    if (table.status === 'DISABLED') {
      throw new Error(`Table ${table.tableNumber} is currently disabled`);
    }
    return table;
  }

  static async getAllTables() {
    return Table.find().sort({ tableNumber: 1 });
  }

  static async getTableById(id: string) {
    const table = await Table.findById(id);
    if (!table) throw new Error('Table not found');
    return table;
  }

  static async createTable(data: { tableNumber: string; capacity?: number; status?: any }, actor?: IUser) {
    const secureToken = randomUUID();
    const qrTargetUrl = `${ENV.CLIENT_URL}/table/${secureToken}`;
    const qrCodeUrl = await generateQRCodeDataURL(qrTargetUrl);

    const table = await Table.create({
      tableNumber: data.tableNumber,
      capacity: data.capacity || 4,
      status: data.status || 'ACTIVE',
      secureToken,
      qrCodeUrl,
    });

    await logAction({
      actor,
      action: 'CREATE_TABLE',
      entityType: 'Table',
      entityId: table._id.toString(),
      metadata: { tableNumber: table.tableNumber },
    });

    return table;
  }

  static async updateTable(id: string, data: Partial<ITable>, actor?: IUser) {
    const table = await Table.findByIdAndUpdate(id, data, { new: true });
    if (!table) throw new Error('Table not found');

    await logAction({
      actor,
      action: 'UPDATE_TABLE',
      entityType: 'Table',
      entityId: table._id.toString(),
      metadata: data,
    });

    return table;
  }

  static async regenerateTableQR(id: string, actor?: IUser) {
    const table = await Table.findById(id);
    if (!table) throw new Error('Table not found');

    table.secureToken = randomUUID();
    const qrTargetUrl = `${ENV.CLIENT_URL}/table/${table.secureToken}`;
    table.qrCodeUrl = await generateQRCodeDataURL(qrTargetUrl);
    await table.save();

    await logAction({
      actor,
      action: 'REGENERATE_TABLE_QR',
      entityType: 'Table',
      entityId: table._id.toString(),
      metadata: { tableNumber: table.tableNumber },
    });

    return table;
  }
}
