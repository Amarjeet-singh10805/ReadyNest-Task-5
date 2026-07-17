import { Request, Response } from 'express';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { successResponse, paginatedResponse, getPaginationParams } from '../utils/response';
import { sendInvitationEmail } from '../config/email';
import { createAuditLog } from '../services/audit.service';
import { logger } from '../config/logger';

// POST /invitations
export const sendInvitation = async (req: Request, res: Response) => {
  const { email, role, organizationId, message } = req.body;
  const orgId = organizationId || req.organizationId!;

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError('Organization not found.', 404);

  // Check existing member
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const membership = await prisma.organizationUser.findUnique({
      where: { userId_organizationId: { userId: existingUser.id, organizationId: orgId } },
    });
    if (membership?.isActive) throw new AppError('This user is already a member of this organization.', 409);
  }

  // If pending invite exists — refresh token instead of erroring
  const existingInvitation = await prisma.invitation.findFirst({
    where: { email, organizationId: orgId, status: 'PENDING' },
  });

  if (existingInvitation) {
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updated = await prisma.invitation.update({
      where: { id: existingInvitation.id },
      data: { token: newToken, expiresAt: newExpiry },
    });

    const inviterUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { firstName: true, lastName: true },
    });
    const inviterName = inviterUser
      ? `${inviterUser.firstName} ${inviterUser.lastName}`
      : 'A team member';

    // Non-blocking email
    sendInvitationEmail(email, inviterName, org.name, newToken, role || 'MEMBER').catch((err) => {
      logger.warn(`Email failed (invitation still refreshed): ${err.message}`);
    });

    const refreshedInviteUrl = `${process.env.FRONTEND_URL}/invitations/accept?token=${newToken}`;
    logger.info(`Invite link for ${email}: ${refreshedInviteUrl}`);

    return successResponse(res, { ...updated, inviteUrl: refreshedInviteUrl }, 'Invitation refreshed and resent.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      email,
      role: role || Role.MEMBER,
      organizationId: orgId,
      invitedById: req.user!.userId,
      token,
      expiresAt,
      message,
    },
    include: {
      invitedBy: { select: { firstName: true, lastName: true } },
    },
  });

  const inviterName = `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`;

  // Non-blocking email
  sendInvitationEmail(email, inviterName, org.name, token, role || 'MEMBER').catch((err) => {
    logger.warn(`Email failed (invitation still created): ${err.message}`);
  });

  const inviteUrl = `${process.env.FRONTEND_URL}/invitations/accept?token=${token}`;
  logger.info(`Invite link for ${email}: ${inviteUrl}`);

  await createAuditLog({
    action: 'INVITATION_SENT',
    userId: req.user!.userId,
    organizationId: orgId,
    details: { email, role },
  });

  return successResponse(res, { ...invitation, inviteUrl }, 'Invitation sent.', 201);
};

// GET /invitations
export const getInvitations = async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { status } = req.query;
  const orgId = req.organizationId!;

  const where: any = { organizationId: orgId };
  if (status) where.status = status;

  const [invitations, total] = await prisma.$transaction([
    prisma.invitation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    }),
    prisma.invitation.count({ where }),
  ]);

  return paginatedResponse(res, invitations, { page, limit, total }, 'Invitations retrieved.');
};

// POST /invitations/accept
export const acceptInvitation = async (req: Request, res: Response) => {
  const { token, firstName, lastName, password } = req.body;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invitation) throw new AppError('Invalid invitation link.', 400);
  if (invitation.status !== 'PENDING') throw new AppError('This invitation has already been used.', 400);
  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
    throw new AppError('This invitation has expired.', 400);
  }

  let user = await prisma.user.findUnique({ where: { email: invitation.email } });
  const isNewUser = !user;

  await prisma.$transaction(async (tx) => {
    if (!user) {
      if (!firstName || !lastName || !password) {
        throw new AppError('Name and password are required for new users.', 400);
      }
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 12);
      user = await tx.user.create({
        data: {
          email: invitation.email,
          firstName,
          lastName,
          password: hashedPassword,
          isEmailVerified: true,
          role: invitation.role,
        },
      });
    }

    await tx.organizationUser.upsert({
      where: { userId_organizationId: { userId: user!.id, organizationId: invitation.organizationId } },
      update: { isActive: true, role: invitation.role },
      create: { userId: user!.id, organizationId: invitation.organizationId, role: invitation.role },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
  });

  await createAuditLog({
    action: 'INVITATION_ACCEPTED',
    userId: user!.id,
    organizationId: invitation.organizationId,
    details: { invitationId: invitation.id },
  });

  return successResponse(res, {
    organizationId: invitation.organizationId,
    organizationName: invitation.organization.name,
    userId: user!.id,
    isNewUser,
  }, 'Invitation accepted. Welcome aboard!');
};

// DELETE /invitations/:id
export const cancelInvitation = async (req: Request, res: Response) => {
  const { id } = req.params;

  const invitation = await prisma.invitation.findFirst({
    where: { id, organizationId: req.organizationId! },
  });
  if (!invitation) throw new AppError('Invitation not found.', 404);

  await prisma.invitation.update({ where: { id }, data: { status: 'DECLINED' } });

  return successResponse(res, null, 'Invitation cancelled.');
};

// POST /invitations/:id/resend
export const resendInvitation = async (req: Request, res: Response) => {
  const { id } = req.params;

  const invitation = await prisma.invitation.findFirst({
    where: { id, organizationId: req.organizationId!, status: 'PENDING' },
    include: {
      organization: true,
      invitedBy: { select: { firstName: true, lastName: true } },
    },
  });
  if (!invitation) throw new AppError('Invitation not found or not pending.', 404);

  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newToken = crypto.randomBytes(32).toString('hex');

  const updated = await prisma.invitation.update({
    where: { id },
    data: { token: newToken, expiresAt: newExpiry },
  });

  const inviterName = `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`;

  // Non-blocking email
  sendInvitationEmail(invitation.email, inviterName, invitation.organization.name, newToken, invitation.role).catch((err) => {
    logger.warn(`Email failed (invitation still resent): ${err.message}`);
  });

  logger.info(`Resent invite link for ${invitation.email}: ${process.env.FRONTEND_URL}/invitations/accept?token=${newToken}`);

  return successResponse(res, updated, 'Invitation resent.');
};