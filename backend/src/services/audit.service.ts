import { AuditAction } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

interface AuditLogParams {
  action: AuditAction;
  userId?: string;
  organizationId?: string;
  projectId?: string;
  taskId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export const createAuditLog = async (params: AuditLogParams): Promise<void> => {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
};

export const createActivityLog = async (params: {
  userId: string;
  organizationId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  details?: Record<string, any>;
}): Promise<void> => {
  try {
    await prisma.activityLog.create({ data: params });
  } catch (error) {
    logger.error('Failed to create activity log:', error);
  }
};
