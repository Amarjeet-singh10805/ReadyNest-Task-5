import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { successResponse, paginatedResponse, getPaginationParams } from '../utils/response';
import { AppError } from '../utils/AppError';

// ========== NOTIFICATION CONTROLLER ==========

export const getNotifications = async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { isRead } = req.query;
  const userId = req.user!.userId;

  const where: any = { userId };
  if (isRead !== undefined) where.isRead = isRead === 'true';

  const [notifications, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return res.json({
    success: true,
    data: notifications,
    unreadCount,
    pagination: {
      page, limit, total, totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit), hasPrev: page > 1,
    },
  });
};

export const markNotificationRead = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });

  return successResponse(res, null, 'Notification marked as read.');
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, isRead: false },
    data: { isRead: true },
  });

  return successResponse(res, null, 'All notifications marked as read.');
};

export const deleteNotification = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const notification = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notification) throw new AppError('Notification not found.', 404);

  await prisma.notification.delete({ where: { id } });

  return successResponse(res, null, 'Notification deleted.');
};

// ========== AUDIT LOG CONTROLLER ==========

export const getAuditLogs = async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { action, userId, startDate, endDate } = req.query;
  const orgId = req.organizationId!;

  const where: any = { organizationId: orgId };
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate as string);
    if (endDate) where.createdAt.lte = new Date(endDate as string);
  }

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return paginatedResponse(res, logs, { page, limit, total }, 'Audit logs retrieved.');
};
