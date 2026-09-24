import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { createDocument, submitDocument, recordDecision, createVersion } from '../services/documents.js';
import { addComment, resolveComment } from '../services/comments.js';

export async function runSeed(force = false) {
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@demo.com' } });
  if (adminUser && !force && !process.argv.includes('--force')) {
    console.log('Seed skipped: Demo admin user already exists.');
    return;
  }

  // Clear existing data to avoid conflict
  await prisma.auditEvent.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.reviewAssignment.deleteMany();
  await prisma.document.updateMany({ data: { currentVersionId: null } });
  await prisma.documentVersion.deleteMany();
  await prisma.document.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectInvite.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding demo database...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: { name: 'System Administrator', email: 'admin@demo.com', passwordHash },
  });
  const alice = await prisma.user.create({
    data: { name: 'Alice Smith', email: 'alice@demo.com', passwordHash },
  });
  const bob = await prisma.user.create({
    data: { name: 'Bob Jones', email: 'bob@demo.com', passwordHash },
  });
  const carol = await prisma.user.create({
    data: { name: 'Carol Danvers', email: 'carol@demo.com', passwordHash },
  });
  const dave = await prisma.user.create({
    data: { name: 'Dave Miller', email: 'dave@demo.com', passwordHash },
  });
  const erin = await prisma.user.create({
    data: { name: 'Erin Wright', email: 'erin@demo.com', passwordHash },
  });
  const frank = await prisma.user.create({
    data: { name: 'Frank Castle', email: 'frank@demo.com', passwordHash },
  });
  const grace = await prisma.user.create({
    data: { name: 'Grace Hopper', email: 'grace@demo.com', passwordHash },
  });

  // Demo Persona Accounts (Quick Switcher)
  const ownerUser = await prisma.user.create({
    data: { name: 'Project Owner', email: 'rohanyshinde07@gmail.com', passwordHash },
  });
  const authorUser = await prisma.user.create({
    data: { name: 'Document Author', email: 'rohantrueview07@gmail.com', passwordHash },
  });
  const reviewerUser = await prisma.user.create({
    data: { name: 'Technical Reviewer', email: 'rohanyshinde21@gmail.com', passwordHash },
  });
  const approverUser = await prisma.user.create({
    data: { name: 'Executive Approver', email: 'rohanyogeshshinde0@gmail.com', passwordHash },
  });
  const viewerUser = await prisma.user.create({
    data: { name: 'Stakeholder Viewer', email: 'k10xlegit@gmail.com', passwordHash },
  });

  // 2. Create Project "Apollo Website Redesign"
  const apollo = await prisma.project.create({
    data: {
      name: 'Apollo Website Redesign',
      description: 'Redesign of the company corporate website and customer portal.',
      createdById: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: alice.id, role: 'OWNER' },
          { userId: ownerUser.id, role: 'OWNER' },
          { userId: bob.id, role: 'AUTHOR' },
          { userId: carol.id, role: 'REVIEWER' },
          { userId: dave.id, role: 'REVIEWER' },
          { userId: erin.id, role: 'APPROVER' },
          { userId: frank.id, role: 'VIEWER' },
        ],
      },
    },
  });

  // Tasks for Apollo
  const taskWireframes = await prisma.task.create({
    data: {
      projectId: apollo.id,
      title: 'Homepage wireframes',
      description: 'UX and layout mocks for homepage',
    },
  });
  const taskApiContract = await prisma.task.create({
    data: {
      projectId: apollo.id,
      title: 'API contract',
      description: 'REST and GraphQL endpoint definitions',
    },
  });
  const taskLaunchChecklist = await prisma.task.create({
    data: {
      projectId: apollo.id,
      title: 'Launch checklist',
      description: 'Deployment and verification procedures',
    },
  });

  // Apollo Document 1: Homepage Spec (DRAFT)
  await createDocument(apollo.id, bob.id, {
    title: 'Homepage Spec',
    taskId: taskWireframes.id,
    content: '# Homepage Specification\n\nDetailed layouts for header, hero banner, and feature grid.',
    changeSummary: 'Initial draft of homepage specs',
  });

  // Apollo Document 2: API Contract (IN_REVIEW)
  const apiContractDoc = await createDocument(apollo.id, bob.id, {
    title: 'API Contract',
    taskId: taskApiContract.id,
    content: '# API Contract\n\nSpecification for `/api/v1` routes and JSON response envelopes.',
    changeSummary: 'Version 1 of API specifications',
  });
  await submitDocument(apiContractDoc.id, bob.id);
  await recordDecision(apiContractDoc.id, carol.id, {
    decision: 'APPROVE',
    comment: 'Endpoints look clean and compliant.',
  });

  // Apollo Document 3: Vendor Agreement (CHANGES_REQUESTED)
  const vendorAgreementDoc = await createDocument(apollo.id, bob.id, {
    title: 'Vendor Agreement',
    content: '# Third-Party Vendor SLA\n\nService level requirements for external API providers.',
    changeSummary: 'Initial SLA draft',
  });
  await submitDocument(vendorAgreementDoc.id, bob.id);
  await recordDecision(vendorAgreementDoc.id, carol.id, {
    decision: 'REQUEST_CHANGES',
    comment: 'Please clarify section 3 payment terms and penalty clauses.',
  });

  // Apollo Document 4: Brand Guidelines (IN_APPROVAL)
  const brandGuidelinesDoc = await createDocument(apollo.id, bob.id, {
    title: 'Brand Guidelines',
    content: '# Visual Identity & Brand System\n\nColor palette, typography scale, and logo usage rules.',
    changeSummary: 'Initial brand guidelines document',
  });
  await submitDocument(brandGuidelinesDoc.id, bob.id);
  await recordDecision(brandGuidelinesDoc.id, carol.id, {
    decision: 'APPROVE',
    comment: 'Color palette is great.',
  });
  await recordDecision(brandGuidelinesDoc.id, dave.id, {
    decision: 'APPROVE',
    comment: 'Typography scale looks consistent.',
  });

  // Apollo Document 5: Launch Report (APPROVED)
  const launchReportDoc = await createDocument(apollo.id, bob.id, {
    title: 'Launch Report',
    taskId: taskLaunchChecklist.id,
    content: '# Launch Readiness Report v1\n\nSummary of load testing and infrastructure checklist.',
    changeSummary: 'v1 initial readiness assessment',
  });
  await submitDocument(launchReportDoc.id, bob.id);
  await recordDecision(launchReportDoc.id, carol.id, {
    decision: 'REQUEST_CHANGES',
    comment: 'Needs detailed budget breakdown and rollback plan.',
  });

  // Bob creates v2
  await createVersion(launchReportDoc.id, bob.id, {
    content: '# Launch Readiness Report v2\n\nAdded section 4: Budget breakdown & rollback procedures.',
    changeSummary: 'Added budget breakdown and emergency rollback procedures.',
  });

  // Find comment by Carol to resolve
  const commentsToResolve = await prisma.comment.findMany({
    where: { documentId: launchReportDoc.id },
  });
  if (commentsToResolve.length > 0) {
    await resolveComment(commentsToResolve[0].id, bob.id);
  }

  // Bob resubmits launch report
  await submitDocument(launchReportDoc.id, bob.id);
  await recordDecision(launchReportDoc.id, carol.id, {
    decision: 'APPROVE',
    comment: 'Budget breakdown looks clear now.',
  });
  await recordDecision(launchReportDoc.id, dave.id, {
    decision: 'APPROVE',
    comment: 'Rollback procedures verified.',
  });
  await recordDecision(launchReportDoc.id, erin.id, {
    decision: 'APPROVE',
    comment: 'Final approval granted for launch!',
  });

  // Apollo Document 6: Legacy Proposal (REJECTED)
  const legacyProposalDoc = await createDocument(apollo.id, bob.id, {
    title: 'Legacy Proposal',
    content: '# Legacy Monolith Migration Proposal\n\nProposal to refactor existing legacy backend into subservices.',
    changeSummary: 'Initial proposal draft',
  });
  await submitDocument(legacyProposalDoc.id, bob.id);
  await recordDecision(legacyProposalDoc.id, carol.id, {
    decision: 'APPROVE',
    comment: 'Technical analysis is sound.',
  });
  await recordDecision(legacyProposalDoc.id, dave.id, {
    decision: 'APPROVE',
    comment: 'Approved from engineering perspective.',
  });
  await recordDecision(legacyProposalDoc.id, erin.id, {
    decision: 'REJECT',
    comment: 'Not aligned with current Q3 strategic priorities.',
  });

  // 3. Create Project "Nova Mobile App"
  const nova = await prisma.project.create({
    data: {
      name: 'Nova Mobile App',
      description: 'Cross-platform iOS and Android mobile app development.',
      createdById: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: grace.id, role: 'OWNER' },
          { userId: carol.id, role: 'APPROVER' },
          { userId: bob.id, role: 'REVIEWER' },
          { userId: dave.id, role: 'AUTHOR' },
        ],
      },
    },
  });

  // Nova Document 1: iOS Onboarding Spec (IN_REVIEW)
  const iosOnboardingDoc = await createDocument(nova.id, dave.id, {
    title: 'iOS Onboarding Spec',
    content: '# iOS Onboarding Architecture\n\nFlow diagrams and screen definitions for user signup.',
    changeSummary: 'Initial onboarding design spec',
  });
  await submitDocument(iosOnboardingDoc.id, dave.id);

  console.log('Database seeding completed successfully!');
}

if (process.argv[1]?.endsWith('seed.js') || process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
