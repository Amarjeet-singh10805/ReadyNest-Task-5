import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { successResponse, paginatedResponse, getPaginationParams, qs } from '../utils/response';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';
import { createAuditLog } from '../services/audit.service';

export const getAllUsers = async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const role = qs(req.query.role);
  const isActiveRaw = qs(req.query.isActive);
  const search = qs(req.query.search);

  const where: any = {};
  if (role) where.role = role;
  if (isActiveRaw !== undefined) where.isActive = isActiveRaw === 'true';
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, firstName: true, lastName: true, avatarUrl: true,
        role: true, isActive: true, isEmailVerified: true, lastLoginAt: true, createdAt: true,
        _count: { select: { organizations: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return paginatedResponse(res, users, { page, limit, total }, 'Users retrieved.');
};

export const getUser = async (req: Request, res: Response) => {
  const id = req.params.id || req.user!.userId;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, firstName: true, lastName: true, avatarUrl: true,
      phone: true, bio: true, role: true, isActive: true, isEmailVerified: true,
      lastLoginAt: true, createdAt: true,
      organizations: {
        where: { isActive: true },
        include: { organization: { select: { id: true, name: true, logoUrl: true } } },
      },
    },
  });

  if (!user) throw new AppError('User not found.', 404);
  return successResponse(res, user, 'User retrieved.');
};

export const updateProfile = async (req: Request, res: Response) => {
  const { firstName, lastName, phone, bio } = req.body;
  const userId = req.user!.userId;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { firstName, lastName, phone, bio },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      avatarUrl: true, phone: true, bio: true, role: true,
    },
  });

  await createAuditLog({ action: 'PROFILE_UPDATED', userId, ipAddress: req.ip });
  return successResponse(res, updated, 'Profile updated.');
};

export const uploadAvatar = async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('Avatar file is required.', 400);
  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found.', 404);

  if (user.avatarUrl) {
    await deleteFromCloudinary(`saas-platform/avatars/avatar-${userId}`).catch(() => {});
  }

  const result = await uploadToCloudinary(req.file.buffer, {
    folder: 'avatars',
    publicId: `avatar-${userId}`,
    resourceType: 'image',
    transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto' }],
  });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: result.secure_url },
    select: { id: true, avatarUrl: true },
  });

  return successResponse(res, updated, 'Avatar updated.');
};

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found.', 404);

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new AppError('Current password is incorrect.', 400);

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
  await prisma.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true } });

  return successResponse(res, null, 'Password changed successfully.');
};

export const toggleUserStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (req.user?.role !== Role.SUPER_ADMIN) throw new AppError('Unauthorized.', 403);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('User not found.', 404);

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: { id: true, isActive: true },
  });

  return successResponse(res, updated, `User ${updated.isActive ? 'activated' : 'deactivated'}.`);
};
