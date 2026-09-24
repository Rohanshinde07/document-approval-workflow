import { prisma } from '../db.js';

export async function getUserQueue(userId: string) {
  // Check if user is admin or find their project memberships
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const isAdmin =
    currentUser?.email === 'admin@demo.com' ||
    (currentUser?.email?.startsWith('admin@') ?? false);

  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true, role: true },
  });

  const memberProjectIds = memberships.map((m) => m.projectId);
  const ownedProjectIds = memberships
    .filter((m) => m.role === 'OWNER')
    .map((m) => m.projectId);

  // 1. Find direct pending assignments where user is assigned and status is PENDING
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

  const awaitingMap = new Map<string, any>();

  // Filter assignments matching current active document stage
  for (const assignment of pendingAssignments) {
    const doc = assignment.document;
    const isMatchingStage =
      (doc.status === 'IN_REVIEW' && assignment.stage === 'REVIEW') ||
      (doc.status === 'IN_APPROVAL' && assignment.stage === 'APPROVAL');

    if (isMatchingStage) {
      const key = `${doc.id}:${assignment.stage}`;
      awaitingMap.set(key, {
        assignmentId: assignment.id,
        stage: assignment.stage,
        document: doc,
      });
    }
  }

  // 2. If user is Project Owner or Admin, also include pending workflows across owned projects
  if (isAdmin || ownedProjectIds.length > 0) {
    const projectWhere: any = isAdmin
      ? {}
      : { projectId: { in: ownedProjectIds } };

    const inFlightDocs = await prisma.document.findMany({
      where: {
        ...projectWhere,
        status: { in: ['IN_REVIEW', 'IN_APPROVAL'] },
      },
      include: {
        project: { select: { id: true, name: true } },
        author: { select: { id: true, email: true, name: true } },
        task: { select: { id: true, title: true } },
        currentVersion: {
          select: { id: true, versionNumber: true, changeSummary: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    for (const doc of inFlightDocs) {
      const stage = doc.status === 'IN_APPROVAL' ? 'APPROVAL' : 'REVIEW';
      const key = `${doc.id}:${stage}`;
      if (!awaitingMap.has(key)) {
        awaitingMap.set(key, {
          assignmentId: `owner-view-${doc.id}`,
          stage,
          document: doc,
        });
      }
    }
  }

  const awaitingDecision = Array.from(awaitingMap.values());

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
