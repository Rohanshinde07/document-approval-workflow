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

  // Check if user is admin or find their project memberships
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const isAdmin = currentUser?.role === 'ADMIN';

  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true, role: true },
  });

  const memberProjectIds = memberships.map((m) => m.projectId);
  const ownedProjectIds = memberships
    .filter((m) => m.role === 'OWNER')
    .map((m) => m.projectId);

  // Find documents needing changes: authored by user OR in projects owned by user
  const needingChangesWhere: any = isAdmin
    ? { status: 'CHANGES_REQUESTED' }
    : {
        OR: [
          { authorId: userId },
          ...(ownedProjectIds.length > 0 ? [{ projectId: { in: ownedProjectIds } }] : []),
        ],
        status: 'CHANGES_REQUESTED',
      };

  const needingChanges = await prisma.document.findMany({
    where: needingChangesWhere,
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

  // Find all accessible documents: authored by user OR in their workspace projects
  const myDocsWhere: any = isAdmin
    ? {}
    : {
        OR: [
          { authorId: userId },
          ...(memberProjectIds.length > 0 ? [{ projectId: { in: memberProjectIds } }] : []),
        ],
      };

  const myDocuments = await prisma.document.findMany({
    where: myDocsWhere,
    include: {
      project: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
      author: { select: { id: true, email: true, name: true } },
      currentVersion: {
        select: { id: true, versionNumber: true, changeSummary: true },
      },
      reviewAssignments: {
        where: { status: 'PENDING' },
        include: { user: { select: { name: true, email: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return {
    awaitingDecision,
    needingChanges,
    myDocuments,
  };
}
