import { prisma } from '../../src/db.js';

export async function resetDb() {
  try {
    await prisma.auditEvent.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.reviewAssignment.deleteMany();

    // Reset currentVersionId on documents to break circular FK constraint
    await prisma.document.updateMany({
      data: { currentVersionId: null },
    });

    await prisma.documentVersion.deleteMany();
    await prisma.document.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectInvite.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  } catch (err) {
    // ignore if already clean
  }
}
