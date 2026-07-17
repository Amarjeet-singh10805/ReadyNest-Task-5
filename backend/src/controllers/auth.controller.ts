import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  REFRESH_TOKEN_EXPIRY_DAYS,
} from '../config/jwt';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../config/email';
import { AppError } from '../utils/AppError';
import { successResponse } from '../utils/response';
import { createAuditLog } from '../services/audit.service';

const SALT_ROUNDS = 12;

// Helper to create token pair
const issueTokens = async (
  userId: string,
  email: string,
  role: Role,
  req: Request,
  organizationId?: string
) => {
  const tokenId = uuidv4();
  const accessToken = generateAccessToken({ userId, email, role, organizationId });
  const refreshToken = generateRefreshToken({ userId, tokenId });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    },
  });

  return { accessToken, refreshToken };
};

// POST /auth/register
export const register = async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, organizationName, role} = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('An account with this email already exists.', 409);

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const emailVerifyToken = crypto.randomBytes(32).toString('hex');
  const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        emailVerifyToken,
        emailVerifyExpiry,
        role: role === 'MEMBER' ? Role.MEMBER : Role.ORG_ADMIN,
      },
    });

    // Create default organization
    const slug = organizationName
      ? organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
      : `org-${newUser.id.slice(0, 8)}`;

    const org = await tx.organization.create({
      data: {
        name: organizationName || `${firstName}'s Organization`,
        slug,
      },
    });

    await tx.organizationUser.create({
      data: {
        userId: newUser.id,
        organizationId: org.id,
        role: role === 'MEMBER' ? Role.MEMBER : Role.ORG_ADMIN,
      },
    });

    return { user: newUser, organization: org };
  });

  await sendVerificationEmail(email, emailVerifyToken, firstName).catch(() => {});
  await createAuditLog({ action: 'REGISTER', userId: user.user.id, ipAddress: req.ip });

  return successResponse(res, {
    message: 'Registration successful. Please check your email to verify your account.',
    userId: user.user.id,
  }, 'Account created successfully.', 201);
};

// POST /auth/login
export const login = async (req: Request, res: Response) => {
  const { email, password, organizationId } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      organizations: {
        include: { organization: true },
        where: { isActive: true },
      },
    },
  });

  if (!user) throw new AppError('Invalid email or password.', 401);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError('Invalid email or password.', 401);

  if (!user.isActive) throw new AppError('Your account has been deactivated. Contact support.', 403);

  // Determine active organization
  let activeOrgId = organizationId;
  if (!activeOrgId && user.organizations.length > 0) {
    activeOrgId = user.organizations[0].organizationId;
  }

  if (activeOrgId) {
    const membership = user.organizations.find((o) => o.organizationId === activeOrgId);
    if (!membership) throw new AppError('You are not a member of this organization.', 403);
  }

  const { accessToken, refreshToken } = await issueTokens(
    user.id, user.email, user.role, req, activeOrgId
  );

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createAuditLog({ action: 'LOGIN', userId: user.id, organizationId: activeOrgId, ipAddress: req.ip });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });

  return successResponse(res, {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
    organizations: user.organizations.map((o) => ({
      id: o.organizationId,
      name: o.organization.name,
      slug: o.organization.slug,
      logoUrl: o.organization.logoUrl,
      role: o.role,
    })),
    activeOrganizationId: activeOrgId,
  }, 'Login successful.');
};

// POST /auth/refresh-token
export const refreshToken = async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (!token) throw new AppError('Refresh token required.', 401);

  const decoded = verifyRefreshToken(token);

  const stored = await prisma.refreshToken.findFirst({
    where: { token, userId: decoded.userId, isRevoked: false },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Invalid or expired refresh token.', 401);
  }

  // Rotate refresh token (revoke old, issue new)
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });

  const { accessToken, refreshToken: newRefreshToken } = await issueTokens(
    stored.user.id, stored.user.email, stored.user.role, req
  );

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });

  return successResponse(res, { accessToken }, 'Token refreshed.');
};

// POST /auth/logout
export const logout = async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;

  if (token) {
    await prisma.refreshToken.updateMany({
      where: { token, userId: req.user?.userId },
      data: { isRevoked: true },
    });
  }

  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  await createAuditLog({ action: 'LOGOUT', userId: req.user?.userId, ipAddress: req.ip });

  return successResponse(res, null, 'Logged out successfully.');
};

// POST /auth/verify-email
export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: token,
      emailVerifyExpiry: { gt: new Date() },
    },
  });

  if (!user) throw new AppError('Invalid or expired verification link.', 400);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiry: null,
    },
  });

  const org = await prisma.organizationUser.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });

  if (org) {
    await sendWelcomeEmail(user.email, user.firstName, org.organization.name).catch(() => {});
  }

  await createAuditLog({ action: 'EMAIL_VERIFIED', userId: user.id, ipAddress: req.ip });

  return successResponse(res, null, 'Email verified successfully. Welcome aboard!');
};

// POST /auth/forgot-password
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success (prevent user enumeration)
  if (!user) {
    return successResponse(res, null, 'If that email exists, a reset link has been sent.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpiry: expiry },
  });

  await sendPasswordResetEmail(email, token, user.firstName).catch(() => {});

  return successResponse(res, null, 'If that email exists, a reset link has been sent.');
};

// POST /auth/reset-password
export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: { gt: new Date() },
    },
  });

  if (!user) throw new AppError('Invalid or expired reset link.', 400);

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  // Revoke all refresh tokens
  await prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { isRevoked: true } });
  await createAuditLog({ action: 'PASSWORD_RESET', userId: user.id, ipAddress: req.ip });

  return successResponse(res, null, 'Password reset successful. Please log in with your new password.');
};

// GET /auth/me
export const getMe = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      avatarUrl: true, phone: true, bio: true, role: true,
      isEmailVerified: true, lastLoginAt: true, createdAt: true,
      organizations: {
        where: { isActive: true },
        include: {
          organization: {
            select: { id: true, name: true, slug: true, logoUrl: true, plan: true },
          },
        },
      },
    },
  });

  if (!user) throw new AppError('User not found.', 404);

  return successResponse(res, user, 'Profile retrieved.');
};

// POST /auth/resend-verification
export const resendVerification = async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.isEmailVerified) {
    return successResponse(res, null, 'If applicable, verification email has been sent.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken: token, emailVerifyExpiry: expiry },
  });

  await sendVerificationEmail(email, token, user.firstName).catch(() => {});

  return successResponse(res, null, 'Verification email sent.');
};
