import { DocumentStatus } from '@prisma/client';
import { prisma } from '../db.js';
import { recordAuditEvent } from './audit.js';
import {
  NotFoundError,
  ForbiddenError,
  BusinessRuleError,
} from '../domain/errors.js';
import {
  canCreateDocument,
  computeAllowedActions,
} from '../domain/permissions.js';
import {
  validateVersionCreation,
  validateSubmission,
  processDecision,
  DecisionType,
} from '../domain/workflow.js';
import { getProjectMembership } from './projects.js';
import {
  sendReviewerAssignedEmail,
  sendChangesRequestedEmail,
  sendStageAdvancedToApproversEmail,
  sendFinalDecisionEmail,
} from './email.js';

export async function listDocuments(
  projectId: string,
  userId: string,
  filters?: { status?: DocumentStatus; taskId?: string }
) {
  await getProjectMembership(projectId, userId);

  const whereClause: any = { projectId };
  if (filters?.status) {
    whereClause.status = filters.status;
  }
  if (filters?.taskId) {
    whereClause.taskId = filters.taskId;
  }

  const docs = await prisma.document.findMany({
    where: whereClause,
    include: {
      author: { select: { id: true, email: true, name: true } },
      task: { select: { id: true, title: true } },
      currentVersion: {
        select: { id: true, versionNumber: true, changeSummary: true, createdAt: true },
      },
      _count: {
        select: { comments: true, versions: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return docs;
}

export async function createDocument(
  projectId: string,
  userId: string,
  data: {
    title: string;
    taskId?: string;
    content: string;
    changeSummary: string;
  }
) {
  const membership = await getProjectMembership(projectId, userId);
  if (!canCreateDocument(membership.role)) {
    throw new ForbiddenError('Only project owners and authors can create documents');
  }

  if (data.taskId) {
    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
    });
    if (!task || task.projectId !== projectId) {
      throw new BusinessRuleError(
        'INVALID_TASK',
        'Linked task does not belong to this project'
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: {
        projectId,
        taskId: data.taskId || null,
        title: data.title.trim(),
        authorId: userId,
        status: 'DRAFT',
      },
    });

    const version = await tx.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: 1,
        content: data.content,
        changeSummary: data.changeSummary || 'Initial version',
        createdById: userId,
      },
    });

    const updatedDocument = await tx.document.update({
      where: { id: document.id },
      data: { currentVersionId: version.id },
      include: {
        author: { select: { id: true, email: true, name: true } },
        currentVersion: true,
      },
    });

    await recordAuditEvent(tx, {
      projectId,
      documentId: document.id,
      versionId: version.id,
      actorId: userId,
      action: 'DOCUMENT_CREATED',
      toStatus: 'DRAFT',
      metadata: { title: document.title, versionNumber: 1 },
    });

    return updatedDocument;
  });
}

export async function getDocumentDetail(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      project: { select: { id: true, name: true } },
      author: { select: { id: true, email: true, name: true } },
      task: { select: { id: true, title: true } },
      currentVersion: true,
      versions: {
        orderBy: { versionNumber: 'desc' },
        include: {
          createdBy: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

  // Check project membership (404 for non-members)
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

  // Current version assignments
  let currentRoundAssignments: any[] = [];
  if (document.currentVersionId) {
    currentRoundAssignments = await prisma.reviewAssignment.findMany({
      where: { versionId: document.currentVersionId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Comments for this document
  const comments = await prisma.comment.findMany({
    where: { documentId },
    include: {
      author: { select: { id: true, email: true, name: true } },
      resolvedBy: { select: { id: true, email: true, name: true } },
      version: { select: { id: true, versionNumber: true } },
      resolvedInVersion: { select: { id: true, versionNumber: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // User assignments for allowed actions calculation
  const userAssignments = currentRoundAssignments
    .filter((a) => a.userId === userId)
    .map((a) => ({
      id: a.id,
      stage: a.stage,
      status: a.status,
    }));

  const allowedActions = computeAllowedActions({
    userId,
    projectRole: membership.role,
    authorId: document.authorId,
    documentStatus: document.status as any,
    userAssignments,
  });

  return {
    ...document,
    myRole: membership.role,
    currentRoundAssignments,
    comments,
    allowedActions,
  };
}

export async function getAuditTrail(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { projectId: true },
  });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

  await getProjectMembership(document.projectId, userId);

  const events = await prisma.auditEvent.findMany({
    where: { documentId },
    include: {
      actor: { select: { id: true, email: true, name: true } },
      version: { select: { id: true, versionNumber: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return events.map((e: any) => {
    if (typeof e.metadata === 'string') {
      try {
        e.metadata = JSON.parse(e.metadata);
      } catch {}
    }
    return e;
  });
}

export async function getVersion(
  documentId: string,
  versionNumber: number,
  userId: string
) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { projectId: true },
  });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

  await getProjectMembership(document.projectId, userId);

  const version = await prisma.documentVersion.findUnique({
    where: {
      documentId_versionNumber: {
        documentId,
        versionNumber,
      },
    },
    include: {
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });

  if (!version) {
    throw new NotFoundError('Document version not found');
  }

  return version;
}

async function lockDocument(tx: any, documentId: string) {
  const isPostgres = !process.env.DATABASE_URL?.startsWith('file:');
  if (isPostgres) {
    await tx.$executeRaw`SELECT id FROM documents WHERE id = ${documentId} FOR UPDATE`;
  }
}

export async function createVersion(
  documentId: string,
  userId: string,
  data: { content: string; changeSummary: string }
) {
  return prisma.$transaction(async (tx) => {
    // Lock document row
    await lockDocument(tx, documentId);

    const document = await tx.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    // Check membership (404 if not member)
    const membership = await tx.projectMember.findUnique({
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

    // R1: Only author can create version
    if (document.authorId !== userId) {
      throw new ForbiddenError('Only the document author can create new versions');
    }

    // R2: Validate status
    validateVersionCreation(document.status as any);

    // Get max version number
    const maxVersionAggregate = await tx.documentVersion.aggregate({
      where: { documentId },
      _max: { versionNumber: true },
    });

    const newVersionNumber = (maxVersionAggregate._max.versionNumber || 0) + 1;

    const version = await tx.documentVersion.create({
      data: {
        documentId,
        versionNumber: newVersionNumber,
        content: data.content,
        changeSummary: data.changeSummary || `Version ${newVersionNumber}`,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
      },
    });

    await tx.document.update({
      where: { id: documentId },
      data: { currentVersionId: version.id },
    });

    await recordAuditEvent(tx, {
      projectId: document.projectId,
      documentId,
      versionId: version.id,
      actorId: userId,
      action: 'VERSION_CREATED',
      fromStatus: document.status,
      toStatus: document.status,
      metadata: { versionNumber: newVersionNumber },
    });

    return version;
  });
}

export async function submitDocument(documentId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    // Lock document row
    await lockDocument(tx, documentId);

    const document = await tx.document.findUnique({
      where: { id: documentId },
      include: {
        currentVersion: true,
      },
    });

    if (!document || !document.currentVersion) {
      throw new NotFoundError('Document or current version not found');
    }

    // Check membership
    const membership = await tx.projectMember.findUnique({
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

    // R1: Author only
    if (document.authorId !== userId) {
      throw new ForbiddenError('Only the document author can submit the document');
    }

    // Fetch project members and their roles
    const projectMembers = await tx.projectMember.findMany({
      where: { projectId: document.projectId },
    });

    const reviewerUserIds = projectMembers
      .filter((m) => m.role === 'REVIEWER')
      .map((m) => m.userId);

    const approverUserIds = projectMembers
      .filter((m) => m.role === 'APPROVER')
      .map((m) => m.userId);

    // Find last round version number
    const lastAssignment = await tx.reviewAssignment.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      include: { version: true },
    });

    const lastRoundVersionNumber = lastAssignment?.version?.versionNumber ?? null;

    // Count unresolved comments on earlier versions
    const unresolvedComments = await tx.comment.count({
      where: {
        documentId,
        resolvedAt: null,
      },
    });

    // Domain validation (R3, R4, R10, R11)
    validateSubmission({
      currentStatus: document.status as any,
      reviewerUserIds,
      approverUserIds,
      authorId: document.authorId,
      currentVersionNumber: document.currentVersion.versionNumber,
      lastRoundVersionNumber,
      unresolvedCommentCount: unresolvedComments,
    });

    const eligibleReviewers = reviewerUserIds.filter((id) => id !== userId);
    const eligibleApprovers = approverUserIds.filter((id) => id !== userId);

    // Snapshot assignments (R4)
    const assignmentsToCreate = [
      ...eligibleReviewers.map((rId) => ({
        documentId,
        versionId: document.currentVersionId!,
        userId: rId,
        stage: 'REVIEW' as const,
        status: 'PENDING' as const,
      })),
      ...eligibleApprovers.map((aId) => ({
        documentId,
        versionId: document.currentVersionId!,
        userId: aId,
        stage: 'APPROVAL' as const,
        status: 'PENDING' as const,
      })),
    ];

    await tx.reviewAssignment.createMany({
      data: assignmentsToCreate,
    });

    const updatedDoc = await tx.document.update({
      where: { id: documentId },
      data: { status: 'IN_REVIEW' },
    });

    await recordAuditEvent(tx, {
      projectId: document.projectId,
      documentId,
      versionId: document.currentVersionId,
      actorId: userId,
      action: 'DOCUMENT_SUBMITTED',
      fromStatus: document.status,
      toStatus: 'IN_REVIEW',
      metadata: {
        reviewerUserIds: eligibleReviewers,
        approverUserIds: eligibleApprovers,
        versionNumber: document.currentVersion.versionNumber,
      },
    });

    // Asynchronously dispatch reviewer notifications
    (async () => {
      try {
        const reviewers = await prisma.user.findMany({
          where: { id: { in: eligibleReviewers } },
          select: { email: true, name: true },
        });
        const author = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        const proj = await prisma.project.findUnique({
          where: { id: document.projectId },
          select: { name: true },
        });
        for (const rev of reviewers) {
          sendReviewerAssignedEmail({
            toEmail: rev.email,
            reviewerName: rev.name,
            authorName: author?.name || 'Author',
            docTitle: document.title,
            docId: document.id,
            projectName: proj?.name || 'Project',
          }).catch(console.error);
        }
      } catch (err) {
        console.error('[Notification Dispatch Error]', err);
      }
    })();

    return updatedDoc;
  });
}

export async function recordDecision(
  documentId: string,
  userId: string,
  data: {
    decision: DecisionType;
    comment?: string | null;
  }
) {
  return prisma.$transaction(async (tx) => {
    // Lock document row
    await lockDocument(tx, documentId);

    const document = await tx.document.findUnique({
      where: { id: documentId },
    });

    if (!document || !document.currentVersionId) {
      throw new NotFoundError('Document not found');
    }

    // Check membership
    const membership = await tx.projectMember.findUnique({
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

    // R1: Author cannot review/approve their own document
    if (document.authorId === userId) {
      throw new ForbiddenError('Document author cannot decide on their own document');
    }

    // Fetch user's PENDING assignment for current version
    const userAssignment = await tx.reviewAssignment.findFirst({
      where: {
        versionId: document.currentVersionId,
        userId,
        status: 'PENDING',
      },
    });

    if (!userAssignment) {
      throw new BusinessRuleError(
        'ASSIGNMENT_NOT_PENDING',
        'You do not have a pending assignment for this document round'
      );
    }

    // Fetch all assignments for current version
    const activeRoundAssignments = await tx.reviewAssignment.findMany({
      where: { versionId: document.currentVersionId },
    });

    // Run domain decision processing
    const decisionResult = processDecision({
      currentStatus: document.status as any,
      assignment: {
        id: userAssignment.id,
        userId: userAssignment.userId,
        stage: userAssignment.stage as any,
        status: userAssignment.status as any,
      },
      decision: data.decision,
      comment: data.comment,
      activeRoundAssignments: activeRoundAssignments.map((a) => ({
        id: a.id,
        userId: a.userId,
        stage: a.stage as any,
        status: a.status as any,
      })),
    });

    // Update assignment decision
    await tx.reviewAssignment.update({
      where: { id: userAssignment.id },
      data: {
        status: decisionResult.updatedAssignmentStatus as any,
        decidedAt: new Date(),
        decisionComment: data.comment?.trim() || null,
      },
    });

    // R12: Decision comments stored as comments row
    if (
      (data.decision === 'REQUEST_CHANGES' || data.decision === 'REJECT') &&
      data.comment
    ) {
      await tx.comment.create({
        data: {
          documentId,
          versionId: document.currentVersionId,
          authorId: userId,
          body: data.comment.trim(),
        },
      });
    }

    // Cancel other pending assignments if changes requested or rejected
    if (decisionResult.cancelledAssignmentIds.length > 0) {
      await tx.reviewAssignment.updateMany({
        where: {
          id: { in: decisionResult.cancelledAssignmentIds },
        },
        data: { status: 'CANCELLED' },
      });
    }

    // Update document status
    const updatedDocument = await tx.document.update({
      where: { id: documentId },
      data: { status: decisionResult.nextDocumentStatus as any },
    });

    // Audit log records
    const primaryAction =
      userAssignment.stage === 'REVIEW'
        ? data.decision === 'APPROVE'
          ? 'REVIEW_APPROVED'
          : 'CHANGES_REQUESTED'
        : data.decision === 'APPROVE'
        ? 'APPROVAL_GRANTED'
        : data.decision === 'REQUEST_CHANGES'
        ? 'CHANGES_REQUESTED'
        : 'DOCUMENT_REJECTED';

    await recordAuditEvent(tx, {
      projectId: document.projectId,
      documentId,
      versionId: document.currentVersionId,
      actorId: userId,
      action: primaryAction as any,
      fromStatus: document.status,
      toStatus: decisionResult.nextDocumentStatus as any,
      metadata: {
        decision: data.decision,
        comment: data.comment || null,
        stage: userAssignment.stage,
      },
    });

    // System consequence: stage advanced (IN_REVIEW -> IN_APPROVAL)
    if (decisionResult.stageAdvanced) {
      await recordAuditEvent(tx, {
        projectId: document.projectId,
        documentId,
        versionId: document.currentVersionId,
        actorId: userId, // actor = last reviewer
        action: 'STAGE_ADVANCED',
        fromStatus: 'IN_REVIEW',
        toStatus: 'IN_APPROVAL',
        metadata: { trigger: 'ALL_REVIEWERS_APPROVED' },
      });
    }

    // System consequence: final approval (IN_APPROVAL -> APPROVED)
    if (decisionResult.documentApproved) {
      await recordAuditEvent(tx, {
        projectId: document.projectId,
        documentId,
        versionId: document.currentVersionId,
        actorId: userId,
        action: 'DOCUMENT_APPROVED',
        fromStatus: 'IN_APPROVAL',
        toStatus: 'APPROVED',
        metadata: { trigger: 'ALL_APPROVERS_APPROVED' },
      });
    }

    // Asynchronously dispatch workflow notifications based on decision outcome
    (async () => {
      try {
        const author = await prisma.user.findUnique({
          where: { id: document.authorId },
          select: { email: true, name: true },
        });
        const actor = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        const proj = await prisma.project.findUnique({
          where: { id: document.projectId },
          select: { name: true },
        });
        const docTitle = document.title;
        const projectName = proj?.name || 'Project';

        if (data.decision === 'REQUEST_CHANGES' && author) {
          sendChangesRequestedEmail({
            toEmail: author.email,
            authorName: author.name,
            reviewerName: actor?.name || 'Reviewer',
            docTitle,
            docId: documentId,
            projectName,
            commentText: data.comment || undefined,
          }).catch(console.error);
        } else if (decisionResult.stageAdvanced) {
          // Notify approvers that document has passed review and needs final approval
          const approvers = await prisma.reviewAssignment.findMany({
            where: {
              versionId: document.currentVersionId!,
              stage: 'APPROVAL',
            },
            include: { user: { select: { email: true, name: true } } },
          });
          for (const app of approvers) {
            sendStageAdvancedToApproversEmail({
              toEmail: app.user.email,
              approverName: app.user.name,
              docTitle,
              docId: documentId,
              projectName,
            }).catch(console.error);
          }
        } else if (decisionResult.documentApproved && author) {
          sendFinalDecisionEmail({
            toEmail: author.email,
            authorName: author.name,
            approverName: actor?.name || 'Approver',
            docTitle,
            docId: documentId,
            projectName,
            decision: 'APPROVED',
            notes: data.comment || undefined,
          }).catch(console.error);
        } else if (decisionResult.nextDocumentStatus === 'REJECTED' && author) {
          sendFinalDecisionEmail({
            toEmail: author.email,
            authorName: author.name,
            approverName: actor?.name || 'Approver',
            docTitle,
            docId: documentId,
            projectName,
            decision: 'REJECTED',
            notes: data.comment || undefined,
          }).catch(console.error);
        }
      } catch (err) {
        console.error('[Notification Dispatch Error]', err);
      }
    })();

    return updatedDocument;
  });
}
