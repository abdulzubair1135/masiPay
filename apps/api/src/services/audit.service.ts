import { AuditLog, IAuditLog } from '../models/AuditLog.js';
import { IUser } from '../models/User.js';

export const logAction = async (params: {
  actor?: IUser;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}): Promise<IAuditLog> => {
  try {
    return await AuditLog.create({
      actorId: params.actor?._id,
      actorName: params.actor?.name,
      actorRole: params.actor?.role,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
    });
  } catch (error) {
    console.error('[AuditService] Error logging action:', error);
    throw error;
  }
};
