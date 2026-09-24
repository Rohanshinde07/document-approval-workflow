import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { config } from '../../src/config.js';
import { resetDb } from '../helpers/db.js';

const app = createApp();

describe('Workflow & Security Integration Tests', () => {
  let ownerToken: string;
  let authorToken: string;
  let reviewerToken: string;
  let approverToken: string;
  let viewerToken: string;
  let nonMemberToken: string;

  let ownerUser: any;
  let authorUser: any;
  let reviewerUser: any;
  let approverUser: any;
  let viewerUser: any;
  let nonMemberUser: any;

  let project: any;

  function makeToken(user: { id: string; email: string; name: string }) {
    return jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      config.jwtSecret,
      { expiresIn: '8h' }
    );
  }

  beforeEach(async () => {
    await resetDb();

    const passwordHash = await bcrypt.hash('password123', 10);

    ownerUser = await prisma.user.create({
      data: { name: 'Owner', email: 'owner@test.com', passwordHash },
    });
    authorUser = await prisma.user.create({
      data: { name: 'Author', email: 'author@test.com', passwordHash },
    });
    reviewerUser = await prisma.user.create({
      data: { name: 'Reviewer', email: 'reviewer@test.com', passwordHash },
    });
    approverUser = await prisma.user.create({
      data: { name: 'Approver', email: 'approver@test.com', passwordHash },
    });
    viewerUser = await prisma.user.create({
      data: { name: 'Viewer', email: 'viewer@test.com', passwordHash },
    });
    nonMemberUser = await prisma.user.create({
      data: { name: 'NonMember', email: 'nonmember@test.com', passwordHash },
    });

    ownerToken = makeToken(ownerUser);
    authorToken = makeToken(authorUser);
    reviewerToken = makeToken(reviewerUser);
    approverToken = makeToken(approverUser);
    viewerToken = makeToken(viewerUser);
    nonMemberToken = makeToken(nonMemberUser);

    project = await prisma.project.create({
      data: {
        name: 'Test Project',
        createdById: ownerUser.id,
        members: {
          create: [
            { userId: ownerUser.id, role: 'OWNER' },
            { userId: authorUser.id, role: 'AUTHOR' },
            { userId: reviewerUser.id, role: 'REVIEWER' },
            { userId: approverUser.id, role: 'APPROVER' },
            { userId: viewerUser.id, role: 'VIEWER' },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Document Creation & Permissions', () => {
    it('allows AUTHOR to create a document', async () => {
      const res = await request(app)
        .post(`/api/projects/${project.id}/documents`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({
          title: 'Design Spec',
          content: '# Spec Content',
          changeSummary: 'v1 summary',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Design Spec');
      expect(res.body.status).toBe('DRAFT');
    });

    it('returns 403 if VIEWER attempts to create a document', async () => {
      const res = await request(app)
        .post(`/api/projects/${project.id}/documents`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          title: 'Unauthorized Doc',
          content: 'Content',
        });

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-members of the project', async () => {
      const res = await request(app)
        .get(`/api/projects/${project.id}/documents`)
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Submission & Snapshotting (R3, R4)', () => {
    it('snapshots reviewers and approvers upon submission', async () => {
      const docRes = await request(app)
        .post(`/api/projects/${project.id}/documents`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({
          title: 'Snapshot Test Doc',
          content: 'Doc content',
        });

      const docId = docRes.body.id;

      const submitRes = await request(app)
        .post(`/api/documents/${docId}/submit`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.status).toBe('IN_REVIEW');

      const detailRes = await request(app)
        .get(`/api/documents/${docId}`)
        .set('Authorization', `Bearer ${authorToken}`);

      const assignments = detailRes.body.currentRoundAssignments;
      expect(assignments.length).toBe(2);
      expect(assignments.some((a: any) => a.userId === reviewerUser.id && a.stage === 'REVIEW')).toBe(true);
      expect(assignments.some((a: any) => a.userId === approverUser.id && a.stage === 'APPROVAL')).toBe(true);
    });

    it('fails to submit if project lacks reviewers (R3)', async () => {
      // Create project with only author & approver
      const emptyProj = await prisma.project.create({
        data: {
          name: 'No Reviewers Proj',
          createdById: ownerUser.id,
          members: {
            create: [
              { userId: authorUser.id, role: 'AUTHOR' },
              { userId: approverUser.id, role: 'APPROVER' },
            ],
          },
        },
      });

      const docRes = await request(app)
        .post(`/api/projects/${emptyProj.id}/documents`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ title: 'Doc', content: 'Text' });

      const submitRes = await request(app)
        .post(`/api/documents/${docRes.body.id}/submit`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(submitRes.status).toBe(422);
      expect(submitRes.body.error.code).toBe('NO_REVIEWERS');
    });
  });

  describe('Review & Approval Decision Lifecycle', () => {
    let docId: string;

    beforeEach(async () => {
      const docRes = await request(app)
        .post(`/api/projects/${project.id}/documents`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({
          title: 'Full Lifecycle Doc',
          content: 'Version 1',
        });
      docId = docRes.body.id;

      await request(app)
        .post(`/api/documents/${docId}/submit`)
        .set('Authorization', `Bearer ${authorToken}`);
    });

    it('prevents approver from acting during review stage (R5)', async () => {
      const res = await request(app)
        .post(`/api/documents/${docId}/decision`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({ decision: 'APPROVE' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('WRONG_STAGE');
    });

    it('requires a comment when requesting changes (R8)', async () => {
      const res = await request(app)
        .post(`/api/documents/${docId}/decision`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ decision: 'REQUEST_CHANGES', comment: '' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('COMMENT_REQUIRED');
    });

    it('advances stage on reviewer approval and completes on approver approval', async () => {
      // 1. Reviewer approves -> IN_APPROVAL
      const revRes = await request(app)
        .post(`/api/documents/${docId}/decision`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ decision: 'APPROVE', comment: 'Review LGTM' });

      expect(revRes.status).toBe(200);
      expect(revRes.body.status).toBe('IN_APPROVAL');

      // 2. Approver approves -> APPROVED
      const appRes = await request(app)
        .post(`/api/documents/${docId}/decision`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({ decision: 'APPROVE', comment: 'Final approval' });

      expect(appRes.status).toBe(200);
      expect(appRes.body.status).toBe('APPROVED');

      // Check audit events count
      const auditRes = await request(app)
        .get(`/api/documents/${docId}/audit`)
        .set('Authorization', `Bearer ${authorToken}`);

      const actions = auditRes.body.map((e: any) => e.action);
      expect(actions).toContain('DOCUMENT_CREATED');
      expect(actions).toContain('DOCUMENT_SUBMITTED');
      expect(actions).toContain('REVIEW_APPROVED');
      expect(actions).toContain('STAGE_ADVANCED');
      expect(actions).toContain('APPROVAL_GRANTED');
      expect(actions).toContain('DOCUMENT_APPROVED');
    });

    it('handles Request Changes, new version creation, comment resolution, and resubmission', async () => {
      // 1. Reviewer requests changes
      await request(app)
        .post(`/api/documents/${docId}/decision`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ decision: 'REQUEST_CHANGES', comment: 'Fix typo in section 2' });

      let docDetail = await request(app)
        .get(`/api/documents/${docId}`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(docDetail.body.status).toBe('CHANGES_REQUESTED');
      expect(docDetail.body.comments.length).toBe(1);
      const commentId = docDetail.body.comments[0].id;

      // 2. Attempt resubmit without new version -> 422 (R10)
      const badSubmit1 = await request(app)
        .post(`/api/documents/${docId}/submit`)
        .set('Authorization', `Bearer ${authorToken}`);
      expect(badSubmit1.status).toBe(422);
      expect(badSubmit1.body.error.code).toBe('NEW_VERSION_REQUIRED');

      // 3. Create v2
      await request(app)
        .post(`/api/documents/${docId}/versions`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ content: 'Version 2 with fix', changeSummary: 'Fixed typo' });

      // 4. Attempt resubmit with unresolved comment -> 422 (R11)
      const badSubmit2 = await request(app)
        .post(`/api/documents/${docId}/submit`)
        .set('Authorization', `Bearer ${authorToken}`);
      expect(badSubmit2.status).toBe(422);
      expect(badSubmit2.body.error.code).toBe('UNRESOLVED_COMMENTS');

      // 5. Resolve comment
      await request(app)
        .post(`/api/comments/${commentId}/resolve`)
        .set('Authorization', `Bearer ${authorToken}`);

      // 6. Resubmit succeeds!
      const validResubmit = await request(app)
        .post(`/api/documents/${docId}/submit`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(validResubmit.status).toBe(200);
      expect(validResubmit.body.status).toBe('IN_REVIEW');
    });
  });

  describe('Database Trigger Immutable Audit Log', () => {
    it('prevents direct UPDATE and DELETE on audit_events at database level', async () => {
      // Ensure SQLite immutability triggers are active
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER IF NOT EXISTS audit_events_no_update BEFORE UPDATE ON audit_events
        BEGIN
          SELECT RAISE(ABORT, 'audit_events is append-only');
        END;
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER IF NOT EXISTS audit_events_no_delete BEFORE DELETE ON audit_events
        BEGIN
          SELECT RAISE(ABORT, 'audit_events is append-only');
        END;
      `);

      const docRes = await request(app)
        .post(`/api/projects/${project.id}/documents`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ title: 'Audit Test', content: 'Data' });

      const auditEvent = await prisma.auditEvent.findFirst({
        where: { documentId: docRes.body.id },
      });

      expect(auditEvent).not.toBeNull();

      // Attempt UPDATE
      await expect(
        prisma.$executeRaw`UPDATE audit_events SET action = 'DOCUMENT_APPROVED' WHERE id = ${auditEvent!.id}`
      ).rejects.toThrow(/audit_events is append-only/);

      // Attempt DELETE
      await expect(
        prisma.$executeRaw`DELETE FROM audit_events WHERE id = ${auditEvent!.id}`
      ).rejects.toThrow(/audit_events is append-only/);

      // Clean up triggers so resetDb can clean up
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS audit_events_no_update;`);
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS audit_events_no_delete;`);
    });
  });
});
