import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';

export async function clearAllMockData() {
  console.log('Clearing all mock data from database...');

  // Delete in correct order to respect foreign key relations
  await prisma.auditEvent.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.reviewAssignment.deleteMany();

  // Break circular foreign key
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

  console.log('All mock projects, documents, reviews, comments, and users cleared.');

  // Create fresh clean accounts
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Primary User account for Rohan
  const rohan = await prisma.user.create({
    data: {
      name: 'Rohan Shinde',
      email: 'rohanyshinde07@gmail.com',
      passwordHash,
    },
  });

  // 2. System Admin account
  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@demo.com',
      passwordHash,
    },
  });

  console.log(`Clean setup ready!`);
  console.log(`- Rohan: ${rohan.email}`);
  console.log(`- Admin: ${admin.email}`);
  console.log(`Total projects: 0, Total documents: 0`);
}

clearAllMockData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
