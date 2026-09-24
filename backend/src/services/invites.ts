import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ProjectRole } from '@prisma/client';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { sendInviteEmail } from './email.js';
import { recordAuditEvent } from './audit.js';
import { NotFoundError, ForbiddenError, BusinessRuleError } from '../domain/errors.js';
import { canManageMembers } from '../domain/permissions.js';
import { getProjectMembership } from './projects.js';

const INVITE_EXPIRES_HOURS = 72; // 3 days

/**
 * Send an invite email for a project.
 * Works whether or not the target email is already registered.
 */
export async function sendProjectInvite(
  projectId: string,
  requestingUserId: string,
  email: string,
  role: ProjectRole
) {
  // Verify requester is an owner
  const membership = await getProjectMembership(projectId, requestingUserId);
  if (!canManageMembers(membership.role)) {
    throw new ForbiddenError('Only project owners can send invitations.');
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError('Project not found');

  const inviter = await prisma.user.findUnique({ where: { id: requestingUserId } });
  if (!inviter) throw new NotFoundError('Inviter not found');

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existingUser) {
    const existingMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: existingUser.id } },
    });
    if (existingMember) {
      throw new BusinessRuleError('MEMBER_EXISTS', 'This user is already a member of the project.');
    }
  }

  // Cancel any pending invites for same email + project
  await prisma.projectInvite.deleteMany({
    where: { projectId, email: email.toLowerCase().trim(), acceptedAt: null },
  });

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_EXPIRES_HOURS * 60 * 60 * 1000);

  const invite = await prisma.projectInvite.create({
    data: {
      projectId,
      invitedById: requestingUserId,
      email: email.toLowerCase().trim(),
      role,
      token,
      expiresAt,
    },
  });

  const inviteUrl = `${config.appBaseUrl}/invite/${token}`;

  // Send email (or log to console if SMTP not configured)
  await sendInviteEmail({
    toEmail: email,
    inviterName: inviter.name,
    projectName: project.name,
    role,
    inviteUrl,
    expiresAt,
  });

  await recordAuditEvent(prisma, {
    projectId,
    actorId: requestingUserId,
    action: 'INVITE_SENT',
    metadata: { invitedEmail: email, role, inviteId: invite.id },
  });

  return { success: true, inviteId: invite.id, inviteUrl };
}

/**
 * Get invite details by token (public — no auth required).
 */
export async function getInviteByToken(token: string) {
  const invite = await prisma.projectInvite.findUnique({
    where: { token },
    include: {
      project: { select: { id: true, name: true, description: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  if (!invite) throw new NotFoundError('Invitation not found or already used.');
  if (invite.acceptedAt) throw new BusinessRuleError('INVITE_USED', 'This invitation has already been accepted.');
  if (invite.expiresAt < new Date()) throw new BusinessRuleError('INVITE_EXPIRED', 'This invitation has expired.');

  return invite;
}

/**
 * Accept an invite — registers the user if they don't exist, then adds them to the project.
 * Returns a JWT token for auto-login.
 */
export async function acceptInvite(
  token: string,
  payload: { name?: string; password?: string }
) {
  const invite = await getInviteByToken(token);

  let user = await prisma.user.findUnique({ where: { email: invite.email } });

  if (!user) {
    // New user — must provide name + password to register
    if (!payload.name || !payload.password) {
      throw new BusinessRuleError(
        'REGISTRATION_REQUIRED',
        'Please provide your name and a password to create your account.'
      );
    }
    if (payload.password.length < 6) {
      throw new BusinessRuleError('WEAK_PASSWORD', 'Password must be at least 6 characters.');
    }
    const passwordHash = await bcrypt.hash(payload.password, 10);
    user = await prisma.user.create({
      data: {
        email: invite.email,
        name: payload.name.trim(),
        passwordHash,
      },
    });
  } else if (payload.password) {
    // Existing user providing password to accept & auto-login
    const isValid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isValid) {
      throw new BusinessRuleError('INVALID_CREDENTIALS', 'Incorrect password for this account. Default demo password is password123.');
    }
  }

  // Add to project
  const existingMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: invite.projectId, userId: user.id } },
  });

  if (!existingMember) {
    await prisma.projectMember.create({
      data: {
        projectId: invite.projectId,
        userId: user.id,
        role: invite.role,
      },
    });

    await recordAuditEvent(prisma, {
      projectId: invite.projectId,
      actorId: user.id,
      action: 'MEMBER_ADDED',
      metadata: { viaInvite: true, inviteId: invite.id, role: invite.role },
    });
  }

  // Mark invite as accepted
  await prisma.projectInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    projectId: invite.projectId,
    projectName: invite.project.name,
    role: invite.role,
  };
}

/**
 * List pending invites for a project (owner view).
 */
export async function listProjectInvites(projectId: string, requestingUserId: string) {
  const membership = await getProjectMembership(projectId, requestingUserId);
  if (!canManageMembers(membership.role)) {
    throw new ForbiddenError('Only project owners can view invitations.');
  }

  return prisma.projectInvite.findMany({
    where: { projectId, acceptedAt: null, expiresAt: { gt: new Date() } },
    include: {
      invitedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Cancel / revoke a pending invite.
 */
export async function revokeInvite(inviteId: string, requestingUserId: string) {
  const invite = await prisma.projectInvite.findUnique({ where: { id: inviteId } });
  if (!invite) throw new NotFoundError('Invite not found.');

  const membership = await getProjectMembership(invite.projectId, requestingUserId);
  if (!canManageMembers(membership.role)) {
    throw new ForbiddenError('Only project owners can revoke invitations.');
  }

  await prisma.projectInvite.delete({ where: { id: inviteId } });
  return { success: true };
}
