import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken, TokenPayload } from '../config/jwt';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & { dbUser?: any };
      organizationId?: string;
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please log in.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true, isEmailVerified: true },
    });

    if (!user) throw new AppError('User no longer exists.', 401);
    if (!user.isActive) throw new AppError('Your account has been deactivated.', 403);

    req.user = { ...decoded, dbUser: user };

    // Set organization context from header if present
    const rawOrgId = req.headers['x-organization-id'];
    const orgId = (Array.isArray(rawOrgId) ? rawOrgId[0] : rawOrgId) as string | undefined;
    if (orgId) req.organizationId = orgId;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid authentication token.', 401));
    }
    next(error);
  }
};

export const requireEmailVerified = async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user?.dbUser?.isEmailVerified) {
    return next(new AppError('Please verify your email address before continuing.', 403));
  }
  next();
};

export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required.', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

export const requireOrgMembership = async (req: Request, _res: Response, next: NextFunction) => {
  const organizationId = req.params.organizationId || req.organizationId || req.body.organizationId;
  if (!organizationId) return next(new AppError('Organization context required.', 400));

  if (req.user?.role === Role.SUPER_ADMIN) {
    req.organizationId = organizationId;
    return next();
  }

  const membership = await prisma.organizationUser.findUnique({
    where: { userId_organizationId: { userId: req.user!.userId, organizationId } },
  });

  if (!membership?.isActive) {
    return next(new AppError('You are not a member of this organization.', 403));
  }

  req.organizationId = organizationId;
  req.user!.organizationId = organizationId;
  next();
};

export const requireOrgRole = (...roles: Role[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role === Role.SUPER_ADMIN) return next();

    const organizationId = req.params.organizationId || req.organizationId;
    if (!organizationId) return next(new AppError('Organization context required.', 400));

    const membership = await prisma.organizationUser.findUnique({
      where: { userId_organizationId: { userId: req.user!.userId, organizationId } },
    });

    if (!membership || !roles.includes(membership.role)) {
      return next(new AppError('Insufficient permissions in this organization.', 403));
    }
    next();
  };
};
