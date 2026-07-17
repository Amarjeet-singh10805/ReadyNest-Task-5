import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { successResponse, paginatedResponse, getPaginationParams, getSortParams, qs } from '../utils/response';
import { createAuditLog, createActivityLog } from '../services/audit.service';
import { emitToOrg } from '../sockets';

export const getProjects = async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const search = qs(req.query.search);
  const status = qs(req.query.status);
  const organizationId = qs(req.query.organizationId);

  const orgId = organizationId || req.organizationId;
  if (!orgId) throw new AppError('Organization context required.', 400);

  const where: any = { organizationId: orgId, isArchived: false };
  if (status) where.status = status;
  if (search) where.name = { contains: search };

  const [projects, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: getSortParams(req.query),
      include: {
        _count: { select: { tasks: true, files: true } },
        tasks: { select: { status: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  const projectsWithStats = projects.map((p) => {
    const taskStats = (p.tasks as any[]).reduce((acc: any, t: any) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    const { tasks: _, ...rest } = p as any;
    return { ...rest, taskStats };
  });

  return paginatedResponse(res, projectsWithStats, { page, limit, total });
};

export const getProject = async (req: Request, res: Response) => {
  const { id } = req.params;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: req.organizationId! },
    include: {
      tasks: {
        orderBy: { position: 'asc' },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { comments: true, files: true } },
        },
      },
      _count: { select: { tasks: true, files: true } },
    },
  });

  if (!project) throw new AppError('Project not found.', 404);
  return successResponse(res, project, 'Project retrieved.');
};

export const createProject = async (req: Request, res: Response) => {
  const { name, description, color, startDate, endDate } = req.body;
  const orgId = req.organizationId!;

  const project = await prisma.project.create({
    data: {
      name, description, color,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      organizationId: orgId,
      ownerId: req.user!.userId,
    },
  });

  await createAuditLog({ action: 'PROJECT_CREATED', userId: req.user!.userId, organizationId: orgId, projectId: project.id });
  await createActivityLog({
    userId: req.user!.userId, organizationId: orgId,
    action: 'created', entityType: 'project', entityId: project.id, entityName: project.name,
  });

  emitToOrg(orgId, 'project:created', project);
  return successResponse(res, project, 'Project created.', 201);
};

export const updateProject = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, status, color, startDate, endDate } = req.body;

  const existing = await prisma.project.findFirst({ where: { id, organizationId: req.organizationId! } });
  if (!existing) throw new AppError('Project not found.', 404);

  const updated = await prisma.project.update({
    where: { id },
    data: {
      name, description, status, color,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
  });

  await createAuditLog({ action: 'PROJECT_UPDATED', userId: req.user!.userId, organizationId: req.organizationId!, projectId: id });
  await createActivityLog({
    userId: req.user!.userId, organizationId: req.organizationId!,
    action: 'updated', entityType: 'project', entityId: id, entityName: updated.name,
  });

  emitToOrg(req.organizationId!, 'project:updated', updated);
  return successResponse(res, updated, 'Project updated.');
};

export const deleteProject = async (req: Request, res: Response) => {
  const { id } = req.params;

  const project = await prisma.project.findFirst({ where: { id, organizationId: req.organizationId! } });
  if (!project) throw new AppError('Project not found.', 404);

  await prisma.project.delete({ where: { id } });

  await createAuditLog({ action: 'PROJECT_DELETED', userId: req.user!.userId, organizationId: req.organizationId!, projectId: id });
  emitToOrg(req.organizationId!, 'project:deleted', { id });

  return successResponse(res, null, 'Project deleted.');
};

export const archiveProject = async (req: Request, res: Response) => {
  const { id } = req.params;

  const project = await prisma.project.findFirst({ where: { id, organizationId: req.organizationId! } });
  if (!project) throw new AppError('Project not found.', 404);

  const updated = await prisma.project.update({
    where: { id },
    data: { isArchived: !project.isArchived, status: project.isArchived ? 'ACTIVE' : 'ARCHIVED' },
  });

  return successResponse(res, updated, `Project ${updated.isArchived ? 'archived' : 'unarchived'}.`);
};
