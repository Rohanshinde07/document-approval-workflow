import { prisma } from '../db.js';
import { recordAuditEvent } from './audit.js';
import {
  NotFoundError,
  ForbiddenError,
  BusinessRuleError,
} from '../domain/errors.js';
import { canAddComment, canResolveComment } from '../domain/permissions.js';

export async function addComment(
  documentId: string,
  userId: string,
  body: string
) {
  if (!body || body.trim().length === 0) {
    throw new BusinessRuleError('COMMENT_REQUIRED', 'Comment body cannot be empty');
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { project: true },
  });

  if (!document || !document.currentVersionId) {
    throw new NotFoundError('Document not found');
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: document.projectId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new NotFoundError('Document not found');
  }

  if (!canAddComment(membership.role, document.status as any)) {
    throw new ForbiddenError(
      'Viewers and users on terminal documents cannot add comments'
    );
  }

  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        documentId,
        versionId: document.currentVersionId!,
        authorId: userId,
        body: body.trim(),
      },
      include: {
        author: { select: { id: true, email: true, name: true } },
        version: { select: { id: true, versionNumber: true } },
      },
    });

    await recordAuditEvent(tx, {
      projectId: document.projectId,
      documentId,
      versionId: document.currentVersionId,
      actorId: userId,
      action: 'COMMENT_ADDED',
      metadata: { commentId: comment.id },
    });

    return comment;
  });
}

export async function resolveComment(commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      document: true,
    },
  });

  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  const { document } = comment;

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: document.projectId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new NotFoundError('Comment not found');
  }

  if (!canResolveComment(userId, document.authorId, document.status as any)) {
    throw new ForbiddenError(
      'Only the document author can resolve comments before final decision'
    );
  }

  if (comment.resolvedAt) {
    throw new BusinessRuleError('ALREADY_RESOLVED', 'Comment is already resolved');
  }

  return prisma.$transaction(async (tx) => {
    const updatedComment = await tx.comment.update({
      where: { id: commentId },
      data: {
        resolvedAt: new Date(),
        resolvedById: userId,
        resolvedInVersionId: document.currentVersionId,
      },
      include: {
        author: { select: { id: true, email: true, name: true } },
        resolvedBy: { select: { id: true, email: true, name: true } },
        version: { select: { id: true, versionNumber: true } },
        resolvedInVersion: { select: { id: true, versionNumber: true } },
      },
    });

    await recordAuditEvent(tx, {
      projectId: document.projectId,
      documentId: document.id,
      versionId: document.currentVersionId,
      actorId: userId,
      action: 'COMMENT_RESOLVED',
      metadata: { commentId },
    });

    return updatedComment;
  });
}
