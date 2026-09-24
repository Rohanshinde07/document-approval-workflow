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

  console.log('Seeding demo database with 4 mock test projects...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Standard Demo Users (No personal emails for privacy)
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

  // =========================================================================
  // Project 1: Test Project - Core Platform Services
  // =========================================================================
  const proj1 = await prisma.project.create({
    data: {
      name: 'Test Project - Core Platform Services',
      description: 'Enterprise backend microservices, unified API gateway, and shared authentication infrastructure.',
      createdById: alice.id,
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: alice.id, role: 'OWNER' },
          { userId: bob.id, role: 'AUTHOR' },
          { userId: carol.id, role: 'REVIEWER' },
          { userId: dave.id, role: 'REVIEWER' },
          { userId: erin.id, role: 'APPROVER' },
          { userId: frank.id, role: 'VIEWER' },
        ],
      },
    },
  });

  const taskArch = await prisma.task.create({
    data: {
      projectId: proj1.id,
      title: 'Platform Architecture & Schemas',
      description: 'Core domain modeling and data flow diagrams',
    },
  });
  const taskApi = await prisma.task.create({
    data: {
      projectId: proj1.id,
      title: 'API Gateway & Security',
      description: 'REST and GraphQL contract definitions',
    },
  });
  const taskDr = await prisma.task.create({
    data: {
      projectId: proj1.id,
      title: 'Disaster Recovery & SLA',
      description: 'High availability and backup validation',
    },
  });

  // Doc 1.1: System Architecture Blueprint (DRAFT)
  await createDocument(proj1.id, bob.id, {
    title: 'System Architecture Blueprint',
    taskId: taskArch.id,
    content: '# Core Platform Architecture\n\nHigh-level architectural overview of distributed microservices, message queues, and tenant isolation.',
    changeSummary: 'Initial architectural draft',
  });

  // Doc 1.2: API Gateway Specification (IN_REVIEW - Carol approved, awaiting Dave)
  const apiDoc = await createDocument(proj1.id, bob.id, {
    title: 'API Gateway Specification',
    taskId: taskApi.id,
    content: '# API Gateway Contract v1\n\nSpecification for `/api/v1` routes, rate limiting tiers (100 req/sec), and JWT validation envelopes.',
    changeSummary: 'v1 Gateway routing spec',
  });
  await submitDocument(apiDoc.id, bob.id);
  await recordDecision(apiDoc.id, carol.id, {
    decision: 'APPROVE',
    comment: 'Rate limiting parameters and route definitions verified.',
  });

  // Doc 1.3: Payment Gateway SLA Agreement (CHANGES_REQUESTED)
  const slaDoc = await createDocument(proj1.id, bob.id, {
    title: 'Payment Gateway SLA Agreement',
    content: '# Third-Party Payment SLA\n\nService level requirements: 99.99% uptime, 250ms p95 latency, and incident escalation rules.',
    changeSummary: 'Initial SLA draft with payment processor',
  });
  await submitDocument(slaDoc.id, bob.id);
  await recordDecision(slaDoc.id, carol.id, {
    decision: 'REQUEST_CHANGES',
    comment: 'Please clarify section 4 penalty clauses and webhook retry backoff behavior.',
  });

  // Doc 1.4: Enterprise Brand Guidelines (IN_APPROVAL - Reviewers approved, awaiting Erin)
  const brandDoc = await createDocument(proj1.id, bob.id, {
    title: 'Enterprise Brand Guidelines',
    content: '# Visual Identity & Design Tokens\n\nDesign system colors, typography scales, accessibility contrasts (WCAG AAA), and logo guidelines.',
    changeSummary: 'Complete brand tokens specification',
  });
  await submitDocument(brandDoc.id, bob.id);
  await recordDecision(brandDoc.id, carol.id, {
    decision: 'APPROVE',
    comment: 'Design tokens and accessibility compliance verified.',
  });
  await recordDecision(brandDoc.id, dave.id, {
    decision: 'APPROVE',
    comment: 'Typography scale and color palette look solid.',
  });

  // Doc 1.5: Production Disaster Recovery Plan (APPROVED - Full 4-Eyes Sign-off & Audit Trail)
  const drDoc = await createDocument(proj1.id, bob.id, {
    title: 'Production Disaster Recovery Plan',
    taskId: taskDr.id,
    content: '# Disaster Recovery Plan v1\n\nOverview of database snapshot frequency and cluster failover targets.',
    changeSummary: 'v1 initial disaster recovery draft',
  });
  await submitDocument(drDoc.id, bob.id);
  await recordDecision(drDoc.id, carol.id, {
    decision: 'REQUEST_CHANGES',
    comment: 'Need exact RTO (< 15 mins) and RPO (< 1 min) metrics with automated runbooks.',
  });

  // Bob creates v2 addressing feedback
  await createVersion(drDoc.id, bob.id, {
    content: '# Production Disaster Recovery Plan v2\n\nComprehensive recovery procedure:\n- Target RTO: 10 minutes\n- Target RPO: 45 seconds\n- Multi-region automated replication\n- Annual drill protocols and team roles',
    changeSummary: 'v2: Added explicit RTO/RPO targets, automated failover runbooks, and failback verification.',
  });

  // Resolve Carol's feedback comment
  const drComments = await prisma.comment.findMany({ where: { documentId: drDoc.id } });
  if (drComments.length > 0) {
    await resolveComment(drComments[0].id, bob.id);
  }

  // Bob resubmits v2
  await submitDocument(drDoc.id, bob.id);
  await recordDecision(drDoc.id, carol.id, {
    decision: 'APPROVE',
    comment: 'RTO and RPO metrics verified and automated runbook approved.',
  });
  await recordDecision(drDoc.id, dave.id, {
    decision: 'APPROVE',
    comment: 'Failover scripts and replication verified.',
  });
  await recordDecision(drDoc.id, erin.id, {
    decision: 'APPROVE',
    comment: 'Executive sign-off granted. Plan certified for compliance.',
  });

  // Doc 1.6: Legacy Monolith Migration Proposal (REJECTED)
  const legacyDoc = await createDocument(proj1.id, bob.id, {
    title: 'Legacy Monolith Migration Proposal',
    content: '# Monolith Migration Strategy\n\nProposal to decommission legacy backend services over 18 months.',
    changeSummary: 'Initial migration roadmap',
  });
  await submitDocument(legacyDoc.id, bob.id);
  await recordDecision(legacyDoc.id, carol.id, {
    decision: 'APPROVE',
    comment: 'Technical feasibility looks good.',
  });
  await recordDecision(legacyDoc.id, dave.id, {
    decision: 'APPROVE',
    comment: 'Approved from infrastructure standpoint.',
  });
  await recordDecision(legacyDoc.id, erin.id, {
    decision: 'REJECT',
    comment: 'Deferred to next fiscal year due to resource allocation constraints.',
  });

  // =========================================================================
  // Project 2: Test Project - Customer Web & Mobile Portal
  // =========================================================================
  const proj2 = await prisma.project.create({
    data: {
      name: 'Test Project - Customer Web & Mobile Portal',
      description: 'Next-generation customer self-service dashboard, mobile application, and billing interface.',
      createdById: alice.id,
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: alice.id, role: 'OWNER' },
          { userId: dave.id, role: 'AUTHOR' },
          { userId: bob.id, role: 'REVIEWER' },
          { userId: carol.id, role: 'APPROVER' },
          { userId: frank.id, role: 'VIEWER' },
        ],
      },
    },
  });

  const taskOnboard = await prisma.task.create({
    data: {
      projectId: proj2.id,
      title: 'Customer Onboarding Journey',
      description: 'Signup, 2FA verification, and organization creation flow',
    },
  });

  // Doc 2.1: Customer Onboarding Spec (IN_REVIEW)
  const onboardDoc = await createDocument(proj2.id, dave.id, {
    title: 'Customer Onboarding Spec',
    taskId: taskOnboard.id,
    content: '# Customer Onboarding UX & Logic\n\nStep 1: Email verification via OTP.\nStep 2: Company profile setup.\nStep 3: Role-based invite dispatch.',
    changeSummary: 'Initial user journey spec',
  });
  await submitDocument(onboardDoc.id, dave.id);

  // Doc 2.2: Mobile App Release Checklist (APPROVED)
  const releaseDoc = await createDocument(proj2.id, dave.id, {
    title: 'Mobile App Release Checklist',
    content: '# Mobile Release Checklist v1\n\nBuild signatures, iOS TestFlight rollout, and Android Play Console release track verification.',
    changeSummary: 'Release readiness checklist',
  });
  await submitDocument(releaseDoc.id, dave.id);
  await recordDecision(releaseDoc.id, bob.id, {
    decision: 'APPROVE',
    comment: 'Build verification verified.',
  });
  await recordDecision(releaseDoc.id, carol.id, {
    decision: 'APPROVE',
    comment: 'Mobile release signed off.',
  });

  // =========================================================================
  // Project 3: Test Project - Security & Regulatory Compliance
  // =========================================================================
  const proj3 = await prisma.project.create({
    data: {
      name: 'Test Project - Security & Regulatory Compliance',
      description: 'SOC2 Type II, ISO-27001 audit controls, and end-to-end data encryption policies.',
      createdById: alice.id,
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: alice.id, role: 'OWNER' },
          { userId: bob.id, role: 'AUTHOR' },
          { userId: carol.id, role: 'REVIEWER' },
          { userId: erin.id, role: 'APPROVER' },
          { userId: frank.id, role: 'VIEWER' },
        ],
      },
    },
  });

  // Doc 3.1: Zero-Trust Access Control Protocol (IN_APPROVAL)
  const zeroTrustDoc = await createDocument(proj3.id, bob.id, {
    title: 'Zero-Trust Access Control Protocol',
    content: '# Zero-Trust Architecture Policy\n\nEnforces mutual TLS across all microservice boundaries, mandatory hardware security keys (FIDO2), and ephemeral IAM roles.',
    changeSummary: 'Complete zero-trust baseline policy',
  });
  await submitDocument(zeroTrustDoc.id, bob.id);
  await recordDecision(zeroTrustDoc.id, carol.id, {
    decision: 'APPROVE',
    comment: 'Security posture aligned with ISO-27001 requirements.',
  });

  // Doc 3.2: Data Retention & Encryption Standard (DRAFT)
  await createDocument(proj3.id, bob.id, {
    title: 'Data Retention & Encryption Standard',
    content: '# Encryption At Rest & Transit Standards\n\nAES-256-GCM encryption for all object storage with annual KMS key rotation schedule.',
    changeSummary: 'Initial policy draft',
  });

  // =========================================================================
  // Project 4: Test Project - Cloud Infrastructure & DevOps
  // =========================================================================
  const proj4 = await prisma.project.create({
    data: {
      name: 'Test Project - Cloud Infrastructure & DevOps',
      description: 'Multi-cloud deployment automation, Kubernetes clustering, and automated CI/CD pipelines.',
      createdById: alice.id,
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: alice.id, role: 'OWNER' },
          { userId: grace.id, role: 'OWNER' },
          { userId: dave.id, role: 'AUTHOR' },
          { userId: carol.id, role: 'REVIEWER' },
          { userId: erin.id, role: 'APPROVER' },
        ],
      },
    },
  });

  // Doc 4.1: Kubernetes Multi-Region Failover Architecture (IN_REVIEW)
  const k8sDoc = await createDocument(proj4.id, dave.id, {
    title: 'Kubernetes Multi-Region Failover Architecture',
    content: '# Multi-Region Cluster Architecture\n\nActive-passive cross-region deployment with automated DNS failover under 60 seconds.',
    changeSummary: 'High-availability infrastructure RFC',
  });
  await submitDocument(k8sDoc.id, dave.id);

  console.log('Database seeded successfully with 4 Test Projects!');
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
