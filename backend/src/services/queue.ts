import { prisma } from '../db.js';

export async function getUserQueue(userId: string) {
  // Find pending assignments where user is assigned and status is PENDING
  const pendingAssignments = await prisma.reviewAssignment.findMany({
    where: {
      userId,
      status: 'PENDING',
    },
    include: {
      document: {
        include: {
          project: { select: { id: true, name: true } },
          author: { select: { id: true, email: true, name: true } },
          task: { select: { id: true, title: true } },
          currentVersion: {
            select: { id: true, versionNumber: true, changeSummary: true },
          },
        },
      },
    },
  });

  // Filter assignments matching current active document stage
  const awaitingDecision = pendingAssignments
    .filter((assignment) => {
      const doc = assignment.document;
      if (doc.status === 'IN_REVIEW' && assignment.stage === 'REVIEW') {
        return true;
      }
      if (doc.status === 'IN_APPROVAL' && assignment.stage === 'APPROVAL') {
        return true;
      }
      return false;
    })
    .map((assignment) => ({
      assignmentId: assignment.id,
      stage: assignment.stage,
      document: assignment.document,
    }));

  // Find documents authored by user needing changes
  const needingChanges = await prisma.document.findMany({
    where: {
      authorId: userId,
      status: 'CHANGES_REQUESTED',
    },
    include: {
      project: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
      currentVersion: {
        select: { id: true, versionNumber: true, changeSummary: true },
      },
      _count: {
        select: { comments: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return {
    awaitingDecision,
    needingChanges,
  };
}
