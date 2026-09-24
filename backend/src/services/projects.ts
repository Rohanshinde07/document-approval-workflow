import { ProjectRole } from '@prisma/client';
import { prisma } from '../db.js';
import { recordAuditEvent } from './audit.js';
import { NotFoundError, ForbiddenError, BusinessRuleError } from '../domain/errors.js';
import { canManageMembers } from '../domain/permissions.js';

export async function listProjectsForUser(userId: string) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          _count: {
            select: { members: true, documents: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return memberships.map((m) => ({
    id: m.project.id,
    name: m.project.name,
    description: m.project.description,
    role: m.role,
    createdAt: m.project.createdAt,
    memberCount: m.project._count.members,
    documentCount: m.project._count.documents,
  }));
}

export async function getProjectMembership(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new NotFoundError('Project not found');
  }

  return membership;
}

export async function getProjectDetail(projectId: string, userId: string) {
  const membership = await getProjectMembership(projectId, userId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      tasks: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  return {
    ...project,
    myRole: membership.role,
  };
}

export async function addProjectMember(
  projectId: string,
  requestingUserId: string,
  email: string,
  role: ProjectRole
) {
  const requestingMember = await getProjectMembership(projectId, requestingUserId);
  if (!canManageMembers(requestingMember.role)) {
    throw new ForbiddenError('Only project owners can manage members');
  }

  const userToAdd = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!userToAdd) {
    throw new NotFoundError('User with provided email not found');
  }

  const existingMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: userToAdd.id,
      },
    },
  });

  if (existingMember) {
    throw new BusinessRuleError('MEMBER_EXISTS', 'User is already a member of this project');
  }

  return prisma.$transaction(async (tx) => {
    const newMember = await tx.projectMember.create({
      data: {
        projectId,
        userId: userToAdd.id,
        role,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    await recordAuditEvent(tx, {
      projectId,
      actorId: requestingUserId,
      action: 'MEMBER_ADDED',
      metadata: {
        addedUserId: userToAdd.id,
        addedUserEmail: userToAdd.email,
        role,
      },
    });

    return newMember;
  });
}

export async function updateProjectMemberRole(
  projectId: string,
  requestingUserId: string,
  memberId: string,
  newRole: ProjectRole
) {
  const requestingMember = await getProjectMembership(projectId, requestingUserId);
  if (!canManageMembers(requestingMember.role)) {
    throw new ForbiddenError('Only project owners can manage members');
  }

  const targetMember = await prisma.projectMember.findUnique({
    where: { id: memberId },
  });

  if (!targetMember || targetMember.projectId !== projectId) {
    throw new NotFoundError('Project member not found');
  }

  if (targetMember.role === 'OWNER' && newRole !== 'OWNER') {
    const ownerCount = await prisma.projectMember.count({
      where: { projectId, role: 'OWNER' },
    });
    if (ownerCount <= 1) {
      throw new BusinessRuleError(
        'CANNOT_DEMOTE_LAST_OWNER',
        'Cannot demote the last owner of the project'
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const updatedMember = await tx.projectMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    await recordAuditEvent(tx, {
      projectId,
      actorId: requestingUserId,
      action: 'MEMBER_ROLE_CHANGED',
      metadata: {
        targetUserId: targetMember.userId,
        oldRole: targetMember.role,
        newRole,
      },
    });

    return updatedMember;
  });
}

export async function removeProjectMember(
  projectId: string,
  requestingUserId: string,
  memberId: string
) {
  const requestingMember = await getProjectMembership(projectId, requestingUserId);
  if (!canManageMembers(requestingMember.role)) {
    throw new ForbiddenError('Only project owners can manage members');
  }

  const targetMember = await prisma.projectMember.findUnique({
    where: { id: memberId },
  });

  if (!targetMember || targetMember.projectId !== projectId) {
    throw new NotFoundError('Project member not found');
  }

  if (targetMember.role === 'OWNER') {
    const ownerCount = await prisma.projectMember.count({
      where: { projectId, role: 'OWNER' },
    });
    if (ownerCount <= 1) {
      throw new BusinessRuleError(
        'CANNOT_REMOVE_LAST_OWNER',
        'Cannot remove the last owner of the project'
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.projectMember.delete({
      where: { id: memberId },
    });

    await recordAuditEvent(tx, {
      projectId,
      actorId: requestingUserId,
      action: 'MEMBER_REMOVED',
      metadata: {
        removedUserId: targetMember.userId,
        removedRole: targetMember.role,
      },
    });

    return { success: true };
  });
}
