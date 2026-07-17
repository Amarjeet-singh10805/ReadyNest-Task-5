import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { successResponse, paginatedResponse, getPaginationParams, getSortParams, qs } from '../utils/response';
import { createAuditLog, createActivityLog } from '../services/audit.service';
import { emitToOrg } from '../sockets';

export const getTasks = async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const search = qs(req.query.search);
  const status = qs(req.query.status);
  const priority = qs(req.query.priority);
  const assigneeId = qs(req.query.assigneeId);
  const projectId = qs(req.query.projectId);
  const orgId = req.organizationId!;

  const where: any = { organizationId: orgId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (projectId) where.projectId = projectId;
  if (search) where.title = { contains: search };

  const [tasks, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: getSortParams(req.query, 'position'),
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { comments: true, files: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return paginatedResponse(res, tasks, { page, limit, total }, 'Tasks retrieved.');
};

export const getTask = async (req: Request, res: Response) => {
  const { id } = req.params;

  const task = await prisma.task.findFirst({
    where: { id, organizationId: req.organizationId! },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
      creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      project: { select: { id: true, name: true, color: true } },
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          replies: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
          },
        },
      },
      files: true,
    },
  });

  if (!task) throw new AppError('Task not found.', 404);
  return successResponse(res, task, 'Task retrieved.');
};

export const createTask = async (req: Request, res: Response) => {
  const { title, description, status, priority, projectId, assigneeId, dueDate, estimatedHours, tags } = req.body;
  const orgId = req.organizationId!;

  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } });
  if (!project) throw new AppError('Project not found.', 404);

  const lastTask = await prisma.task.findFirst({
    where: { projectId, organizationId: orgId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      title, description, status, priority,
      projectId, assigneeId, organizationId: orgId,
      creatorId: req.user!.userId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimatedHours,
      tags,
      position: (lastTask?.position ?? -1) + 1,
    },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      creator: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await createAuditLog({ action: 'TASK_CREATED', userId: req.user!.userId, organizationId: orgId, taskId: task.id });
  await createActivityLog({
    userId: req.user!.userId, organizationId: orgId,
    action: 'created', entityType: 'task', entityId: task.id, entityName: task.title,
    details: { projectId },
  });

  if (assigneeId && assigneeId !== req.user!.userId) {
    await prisma.notification.create({
      data: {
        userId: assigneeId, organizationId: orgId,
        title: 'New Task Assigned',
        message: `You have been assigned to "${task.title}"`,
        type: 'task_assigned',
        data: { taskId: task.id, projectId },
      },
    });
  }

  emitToOrg(orgId, 'task:created', task);
  return successResponse(res, task, 'Task created.', 201);
};

export const updateTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, status, priority, assigneeId, dueDate, estimatedHours, actualHours, tags } = req.body;
  const orgId = req.organizationId!;

  const existing = await prisma.task.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) throw new AppError('Task not found.', 404);

  const updated = await prisma.task.update({
    where: { id },
    data: {
      title, description, status, priority, assigneeId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimatedHours, actualHours, tags,
      completedAt: status === 'DONE' && existing.status !== 'DONE' ? new Date() : undefined,
    },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      creator: { select: { id: true, firstName: true, lastName: true } },
      project: { select: { id: true, name: true } },
    },
  });

  const auditAction = assigneeId && assigneeId !== existing.assigneeId ? 'TASK_ASSIGNED' : 'TASK_UPDATED';
  await createAuditLog({ action: auditAction, userId: req.user!.userId, organizationId: orgId, taskId: id });
  await createActivityLog({
    userId: req.user!.userId, organizationId: orgId,
    action: 'updated', entityType: 'task', entityId: id, entityName: updated.title,
    details: { changes: { status: { from: existing.status, to: updated.status } } },
  });

  if (assigneeId && assigneeId !== existing.assigneeId && assigneeId !== req.user!.userId) {
    await prisma.notification.create({
      data: {
        userId: assigneeId, organizationId: orgId,
        title: 'Task Assigned to You',
        message: `You have been assigned to "${updated.title}"`,
        type: 'task_assigned',
        data: { taskId: id },
      },
    });
  }

  emitToOrg(orgId, 'task:updated', updated);
  return successResponse(res, updated, 'Task updated.');
};

export const deleteTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = req.organizationId!;

  const task = await prisma.task.findFirst({ where: { id, organizationId: orgId } });
  if (!task) throw new AppError('Task not found.', 404);

  await prisma.task.delete({ where: { id } });

  await createAuditLog({ action: 'TASK_DELETED', userId: req.user!.userId, organizationId: orgId, taskId: id });
  emitToOrg(orgId, 'task:deleted', { id, projectId: task.projectId });

  return successResponse(res, null, 'Task deleted.');
};

export const updateTaskPosition = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { position, status } = req.body;
  const orgId = req.organizationId!;

  const task = await prisma.task.findFirst({ where: { id, organizationId: orgId } });
  if (!task) throw new AppError('Task not found.', 404);

  const updated = await prisma.task.update({ where: { id }, data: { position, status } });
  emitToOrg(orgId, 'task:moved', { id, position, status, projectId: task.projectId });

  return successResponse(res, updated, 'Task position updated.');
};

export const addComment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content, parentId } = req.body;
  const orgId = req.organizationId!;

  const task = await prisma.task.findFirst({ where: { id, organizationId: orgId } });
  if (!task) throw new AppError('Task not found.', 404);

  const comment = await prisma.comment.create({
    data: { content, taskId: id, userId: req.user!.userId, organizationId: orgId, parentId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });

  emitToOrg(orgId, 'task:comment', { taskId: id, comment });
  return successResponse(res, comment, 'Comment added.', 201);
};
