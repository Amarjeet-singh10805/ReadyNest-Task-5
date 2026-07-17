import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { successResponse, paginatedResponse, getPaginationParams, getSortParams } from '../utils/response';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';
import { createAuditLog, createActivityLog } from '../services/audit.service';

// GET /organizations
export const getOrganizations = async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { search } = req.query;

  const where: any = {};

  // Super admins see all; others see their orgs
  if (req.user?.role !== Role.SUPER_ADMIN) {
    const userOrgs = await prisma.organizationUser.findMany({
      where: { userId: req.user!.userId, isActive: true },
      select: { organizationId: true },
    });
    where.id = { in: userOrgs.map((o) => o.organizationId) };
  }

  if (search) {
    where.OR = [
      { name: { contains: search as string } },
      { slug: { contains: search as string } },
    ];
  }

  const [organizations, total] = await prisma.$transaction([
    prisma.organization.findMany({
      where,
      skip,
      take: limit,
      orderBy: getSortParams(req.query),
      include: {
        _count: { select: { users: true, projects: true } },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  return paginatedResponse(res, organizations, { page, limit, total });
};

// GET /organizations/:id
export const getOrganization = async (req: Request, res: Response) => {
  const { id } = req.params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
        where: { isActive: true },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
        },
        take: 10,
      },
      _count: { select: { users: true, projects: true, files: true } },
    },
  });

  if (!org) throw new AppError('Organization not found.', 404);

  return successResponse(res, org, 'Organization retrieved.');
};

// POST /organizations
export const createOrganization = async (req: Request, res: Response) => {
  const { name, description, website, industry, size } = req.body;

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

  const org = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name, slug, description, website, industry, size },
    });

    await tx.organizationUser.create({
      data: { userId: req.user!.userId, organizationId: organization.id, role: Role.ORG_ADMIN },
    });

    return organization;
  });

  await createAuditLog({ action: 'ORG_UPDATED', userId: req.user!.userId, organizationId: org.id });

  return successResponse(res, org, 'Organization created.', 201);
};

// PUT /organizations/:id
export const updateOrganization = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, website, industry, size, settings } = req.body;

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw new AppError('Organization not found.', 404);

  const updated = await prisma.organization.update({
    where: { id },
    data: { name, description, website, industry, size, settings },
  });

  await createAuditLog({ action: 'ORG_UPDATED', userId: req.user!.userId, organizationId: id });
  await createActivityLog({
    userId: req.user!.userId,
    organizationId: id,
    action: 'updated',
    entityType: 'organization',
    entityId: id,
    entityName: updated.name,
  });

  return successResponse(res, updated, 'Organization updated.');
};

// DELETE /organizations/:id
export const deleteOrganization = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (req.user?.role !== Role.SUPER_ADMIN) throw new AppError('Only Super Admins can delete organizations.', 403);

  await prisma.organization.delete({ where: { id } });

  return successResponse(res, null, 'Organization deleted.');
};

// POST /organizations/:id/logo
export const uploadLogo = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!req.file) throw new AppError('Logo file is required.', 400);

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw new AppError('Organization not found.', 404);

  if (org.logoUrl) {
    const publicId = org.logoUrl.split('/').slice(-2).join('/').split('.')[0];
    await deleteFromCloudinary(`saas-platform/logos/${publicId}`).catch(() => {});
  }

  const result = await uploadToCloudinary(req.file.buffer, {
    folder: 'logos',
    publicId: `org-${id}`,
    resourceType: 'image',
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }],
  });

  const updated = await prisma.organization.update({
    where: { id },
    data: { logoUrl: result.secure_url },
  });

  return successResponse(res, { logoUrl: updated.logoUrl }, 'Logo uploaded.');
};

// GET /organizations/:id/members
export const getMembers = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page, limit, skip } = getPaginationParams(req.query);
  const { search, role } = req.query;

  const where: any = { organizationId: id, isActive: true };
  if (role) where.role = role;
  if (search) {
    where.user = {
      OR: [
        { firstName: { contains: search as string } },
        { lastName: { contains: search as string } },
        { email: { contains: search as string } },
      ],
    };
  }

  const [members, total] = await prisma.$transaction([
    prisma.organizationUser.findMany({
      where,
      skip,
      take: limit,
      orderBy: { joinedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            avatarUrl: true, phone: true, lastLoginAt: true,
          },
        },
      },
    }),
    prisma.organizationUser.count({ where }),
  ]);

  return paginatedResponse(res, members, { page, limit, total }, 'Members retrieved.');
};

// PATCH /organizations/:id/members/:userId/role
export const updateMemberRole = async (req: Request, res: Response) => {
  const { id, userId } = req.params;
  const { role } = req.body;

  if (role === Role.SUPER_ADMIN) throw new AppError('Cannot assign Super Admin role via this endpoint.', 403);

  const membership = await prisma.organizationUser.findUnique({
    where: { userId_organizationId: { userId, organizationId: id } },
  });
  if (!membership) throw new AppError('Member not found.', 404);

  const updated = await prisma.organizationUser.update({
    where: { userId_organizationId: { userId, organizationId: id } },
    data: { role },
  });

  await createAuditLog({
    action: 'ROLE_CHANGED',
    userId: req.user!.userId,
    organizationId: id,
    details: { targetUserId: userId, oldRole: membership.role, newRole: role },
  });

  return successResponse(res, updated, 'Member role updated.');
};

// DELETE /organizations/:id/members/:userId
export const removeMember = async (req: Request, res: Response) => {
  const { id, userId } = req.params;

  await prisma.organizationUser.update({
    where: { userId_organizationId: { userId, organizationId: id } },
    data: { isActive: false },
  });

  await createAuditLog({ action: 'MEMBER_REMOVED', userId: req.user!.userId, organizationId: id, details: { removedUserId: userId } });

  return successResponse(res, null, 'Member removed from organization.');
};
