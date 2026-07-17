import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { successResponse } from '../utils/response';

// GET /dashboard/stats
export const getDashboardStats = async (req: Request, res: Response) => {
  const orgId = req.organizationId!;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalMembers, totalProjects, totalTasks, completedTasks, overdueTasks,
    activeProjects, newMembersThisMonth, newTasksThisWeek, recentActivity,
    tasksByStatus, tasksByPriority, projectsByStatus,
    filesCount, notificationsCount,
  ] = await Promise.all([
    prisma.organizationUser.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.project.count({ where: { organizationId: orgId, isArchived: false } }),
    prisma.task.count({ where: { organizationId: orgId } }),
    prisma.task.count({ where: { organizationId: orgId, status: 'DONE' } }),
    prisma.task.count({
      where: {
        organizationId: orgId,
        dueDate: { lt: now },
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
    }),
    prisma.project.count({ where: { organizationId: orgId, status: 'ACTIVE', isArchived: false } }),
    prisma.organizationUser.count({ where: { organizationId: orgId, joinedAt: { gte: thirtyDaysAgo } } }),
    prisma.task.count({ where: { organizationId: orgId, createdAt: { gte: sevenDaysAgo } } }),
    prisma.activityLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    }),
    prisma.task.groupBy({
      by: ['status'],
      where: { organizationId: orgId },
      _count: { status: true },
    }),
    prisma.task.groupBy({
      by: ['priority'],
      where: { organizationId: orgId, status: { notIn: ['DONE', 'CANCELLED'] } },
      _count: { priority: true },
    }),
    prisma.project.groupBy({
      by: ['status'],
      where: { organizationId: orgId, isArchived: false },
      _count: { status: true },
    }),
    prisma.file.count({ where: { organizationId: orgId } }),
    prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } }),
  ]);

  // Task completion trend (last 7 days)
  const completionTrend = await Promise.all(
    Array.from({ length: 7 }, async (_, i) => {
      const day = new Date(now);
      day.setDate(day.getDate() - (6 - i));
      const dayStart = new Date(day.setHours(0, 0, 0, 0));
      const dayEnd = new Date(day.setHours(23, 59, 59, 999));

      const count = await prisma.task.count({
        where: {
          organizationId: orgId,
          status: 'DONE',
          completedAt: { gte: dayStart, lte: dayEnd },
        },
      });

      return { date: dayStart.toISOString().split('T')[0], completed: count };
    })
  );

  // Monthly task creation trend (last 6 months)
  const monthlyTrend = await Promise.all(
    Array.from({ length: 6 }, async (_, i) => {
      const month = new Date(now);
      month.setMonth(month.getMonth() - (5 - i));
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

      const [created, completed] = await Promise.all([
        prisma.task.count({ where: { organizationId: orgId, createdAt: { gte: monthStart, lte: monthEnd } } }),
        prisma.task.count({ where: { organizationId: orgId, status: 'DONE', completedAt: { gte: monthStart, lte: monthEnd } } }),
      ]);

      return {
        month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
        created,
        completed,
      };
    })
  );

  // Top contributors
  const topContributors = await prisma.task.groupBy({
    by: ['assigneeId'],
    where: { organizationId: orgId, status: 'DONE', assigneeId: { not: null } },
    _count: { assigneeId: true },
    orderBy: { _count: { assigneeId: 'desc' } },
    take: 5,
  });

  const topContributorDetails = await Promise.all(
    topContributors.map(async (c) => {
      const user = await prisma.user.findUnique({
        where: { id: c.assigneeId! },
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      });
      return { user, tasksCompleted: c._count.assigneeId };
    })
  );

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return successResponse(res, {
    kpis: {
      totalMembers,
      totalProjects,
      totalTasks,
      completedTasks,
      completionRate,
      overdueTasks,
      activeProjects,
      newMembersThisMonth,
      newTasksThisWeek,
      filesCount,
      unreadNotifications: notificationsCount,
    },
    charts: {
      tasksByStatus: tasksByStatus.map((t) => ({ status: t.status, count: t._count.status })),
      tasksByPriority: tasksByPriority.map((t) => ({ priority: t.priority, count: t._count.priority })),
      projectsByStatus: projectsByStatus.map((p) => ({ status: p.status, count: p._count.status })),
      completionTrend,
      monthlyTrend,
    },
    topContributors: topContributorDetails,
    recentActivity,
  }, 'Dashboard data retrieved.');
};

// GET /dashboard/my-tasks
export const getMyTasks = async (req: Request, res: Response) => {
  const orgId = req.organizationId!;
  const userId = req.user!.userId;

  const [assignedTasks, createdTasks, overdueTasks] = await Promise.all([
    prisma.task.findMany({
      where: { organizationId: orgId, assigneeId: userId, status: { notIn: ['DONE', 'CANCELLED'] } },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 10,
      include: { project: { select: { id: true, name: true, color: true } } },
    }),
    prisma.task.findMany({
      where: { organizationId: orgId, creatorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.task.findMany({
      where: {
        organizationId: orgId, assigneeId: userId,
        dueDate: { lt: new Date() },
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
      include: { project: { select: { id: true, name: true } } },
    }),
  ]);

  return successResponse(res, { assignedTasks, createdTasks, overdueTasks }, 'My tasks retrieved.');
};
