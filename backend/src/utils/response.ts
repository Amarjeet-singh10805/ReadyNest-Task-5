import { Response } from 'express';

export const successResponse = (
  res: Response,
  data: any,
  message: string = 'Success',
  statusCode: number = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const paginatedResponse = (
  res: Response,
  data: any[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  message: string = 'Success'
) => {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
  });
};

export const getPaginationParams = (query: any) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const getSortParams = (query: any, defaultField: string = 'createdAt') => {
  const sortBy = query.sortBy || defaultField;
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  return { [sortBy]: sortOrder };
};

// Safely extract a single string from any query param type
export const qs = (val: any): string | undefined => {
  if (val === undefined || val === null) return undefined;
  if (Array.isArray(val)) return val[0] ? String(val[0]) : undefined;
  if (typeof val === 'object') return undefined;
  return String(val);
};
