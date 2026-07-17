import { Request, Response } from 'express';
import path from 'path';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { successResponse, paginatedResponse, getPaginationParams } from '../utils/response';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';
import { createAuditLog, createActivityLog } from '../services/audit.service';

// GET /files
export const getFiles = async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { projectId, taskId, search } = req.query;
  const orgId = req.organizationId!;

  const where: any = { organizationId: orgId };
  if (projectId) where.projectId = projectId as string;
  if (taskId) where.taskId = taskId as string;
  if (search) where.name = { contains: search as string };

  const [files, total] = await prisma.$transaction([
    prisma.file.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    }),
    prisma.file.count({ where }),
  ]);

  return paginatedResponse(res, files, { page, limit, total }, 'Files retrieved.');
};

// POST /files/upload
export const uploadFile = async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('File is required.', 400);
  const { projectId, taskId, folder } = req.body;
  const orgId = req.organizationId!;

  // Determine resource type from mime
  const isImage = req.file.mimetype.startsWith('image/');
  const isVideo = req.file.mimetype.startsWith('video/');
  const resourceType = isImage ? 'image' : isVideo ? 'video' : 'raw';

  const result = await uploadToCloudinary(req.file.buffer, {
    folder: `org-${orgId}/${folder || 'general'}`,
    resourceType,
  });

  const fileRecord = await prisma.file.create({
    data: {
      name: path.parse(req.file.originalname).name,
      originalName: req.file.originalname,
      url: result.secure_url,
      publicId: result.public_id,
      mimeType: req.file.mimetype,
      size: req.file.size,
      organizationId: orgId,
      uploadedById: req.user!.userId,
      projectId: projectId || null,
      taskId: taskId || null,
      folder: folder || 'general',
    },
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await createAuditLog({ action: 'FILE_UPLOADED', userId: req.user!.userId, organizationId: orgId, details: { fileId: fileRecord.id, name: fileRecord.originalName } });
  await createActivityLog({
    userId: req.user!.userId, organizationId: orgId,
    action: 'uploaded', entityType: 'file', entityId: fileRecord.id, entityName: fileRecord.originalName,
  });

  return successResponse(res, fileRecord, 'File uploaded.', 201);
};

// POST /files/upload-multiple
export const uploadMultipleFiles = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files?.length) throw new AppError('At least one file is required.', 400);
  const { projectId, taskId, folder } = req.body;
  const orgId = req.organizationId!;

  const uploads = await Promise.all(
    files.map(async (file) => {
      const isImage = file.mimetype.startsWith('image/');
      const resourceType = isImage ? 'image' : 'raw';

      const result = await uploadToCloudinary(file.buffer, {
        folder: `org-${orgId}/${folder || 'general'}`,
        resourceType,
      });

      return {
        name: path.parse(file.originalname).name,
        originalName: file.originalname,
        url: result.secure_url,
        publicId: result.public_id,
        mimeType: file.mimetype,
        size: file.size,
        organizationId: orgId,
        uploadedById: req.user!.userId,
        projectId: projectId || null,
        taskId: taskId || null,
        folder: folder || 'general',
      };
    })
  );

  const fileRecords = await prisma.$transaction(
    uploads.map((data) => prisma.file.create({ data }))
  );

  return successResponse(res, fileRecords, 'Files uploaded.', 201);
};

// DELETE /files/:id
export const deleteFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = req.organizationId!;

  const file = await prisma.file.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!file) throw new AppError('File not found.', 404);

  // Only uploader or org admin can delete
  const membership = await prisma.organizationUser.findUnique({
    where: { userId_organizationId: { userId: req.user!.userId, organizationId: orgId } },
  });

  const canDelete = file.uploadedById === req.user!.userId || ['ORG_ADMIN', 'SUPER_ADMIN'].includes(membership?.role || '');
  if (!canDelete) throw new AppError('You do not have permission to delete this file.', 403);

  await deleteFromCloudinary(file.publicId).catch(() => {});
  await prisma.file.delete({ where: { id } });

  await createAuditLog({ action: 'FILE_DELETED', userId: req.user!.userId, organizationId: orgId, details: { fileName: file.originalName } });

  return successResponse(res, null, 'File deleted.');
};

// GET /files/:id
export const getFile = async (req: Request, res: Response) => {
  const { id } = req.params;

  const file = await prisma.file.findFirst({
    where: { id, organizationId: req.organizationId! },
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      project: { select: { id: true, name: true } },
    },
  });

  if (!file) throw new AppError('File not found.', 404);

  return successResponse(res, file, 'File retrieved.');
};
