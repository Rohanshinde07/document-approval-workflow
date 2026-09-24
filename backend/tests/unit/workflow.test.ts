import { describe, it, expect } from 'vitest';
import {
  validateVersionCreation,
  validateSubmission,
  processDecision,
} from '../../src/domain/workflow.js';
import {
  InvalidTransitionError,
  BusinessRuleError,
} from '../../src/domain/errors.js';

describe('Workflow Domain Unit Tests', () => {
  describe('validateVersionCreation', () => {
    it('allows version creation in DRAFT and CHANGES_REQUESTED', () => {
      expect(() => validateVersionCreation('DRAFT')).not.toThrow();
      expect(() => validateVersionCreation('CHANGES_REQUESTED')).not.toThrow();
    });

    it('rejects version creation in terminal statuses (APPROVED, REJECTED)', () => {
      expect(() => validateVersionCreation('APPROVED')).toThrow(InvalidTransitionError);
      expect(() => validateVersionCreation('REJECTED')).toThrow(InvalidTransitionError);
    });

    it('rejects version creation in IN_REVIEW and IN_APPROVAL', () => {
      expect(() => validateVersionCreation('IN_REVIEW')).toThrow(InvalidTransitionError);
      expect(() => validateVersionCreation('IN_APPROVAL')).toThrow(InvalidTransitionError);
    });
  });

  describe('validateSubmission', () => {
    const defaultParams = {
      currentStatus: 'DRAFT' as const,
      reviewerUserIds: ['reviewer1'],
      approverUserIds: ['approver1'],
      authorId: 'author1',
      currentVersionNumber: 1,
      lastRoundVersionNumber: null,
      unresolvedCommentCount: 0,
    };

    it('validates successful submit in DRAFT', () => {
      expect(() => validateSubmission(defaultParams)).not.toThrow();
    });

    it('fails if no reviewers exist excluding author (R3)', () => {
      expect(() =>
        validateSubmission({
          ...defaultParams,
          reviewerUserIds: ['author1'],
        })
      ).toThrow(BusinessRuleError);

      try {
        validateSubmission({ ...defaultParams, reviewerUserIds: ['author1'] });
      } catch (err: any) {
        expect(err.code).toBe('NO_REVIEWERS');
      }
    });

    it('fails if no approvers exist excluding author (R3)', () => {
      expect(() =>
        validateSubmission({
          ...defaultParams,
          approverUserIds: ['author1'],
        })
      ).toThrow(BusinessRuleError);

      try {
        validateSubmission({ ...defaultParams, approverUserIds: ['author1'] });
      } catch (err: any) {
        expect(err.code).toBe('NO_APPROVERS');
      }
    });

    it('fails resubmit if new version has not been created (R10)', () => {
      expect(() =>
        validateSubmission({
          ...defaultParams,
          currentStatus: 'CHANGES_REQUESTED',
          currentVersionNumber: 1,
          lastRoundVersionNumber: 1,
        })
      ).toThrow(BusinessRuleError);

      try {
        validateSubmission({
          ...defaultParams,
          currentStatus: 'CHANGES_REQUESTED',
          currentVersionNumber: 1,
          lastRoundVersionNumber: 1,
        });
      } catch (err: any) {
        expect(err.code).toBe('NEW_VERSION_REQUIRED');
      }
    });

    it('fails resubmit if unresolved comments exist (R11)', () => {
      expect(() =>
        validateSubmission({
          ...defaultParams,
          currentStatus: 'CHANGES_REQUESTED',
          currentVersionNumber: 2,
          lastRoundVersionNumber: 1,
          unresolvedCommentCount: 2,
        })
      ).toThrow(BusinessRuleError);

      try {
        validateSubmission({
          ...defaultParams,
          currentStatus: 'CHANGES_REQUESTED',
          currentVersionNumber: 2,
          lastRoundVersionNumber: 1,
          unresolvedCommentCount: 2,
        });
      } catch (err: any) {
        expect(err.code).toBe('UNRESOLVED_COMMENTS');
      }
    });

    it('allows resubmit when new version created and comments resolved', () => {
      expect(() =>
        validateSubmission({
          ...defaultParams,
          currentStatus: 'CHANGES_REQUESTED',
          currentVersionNumber: 2,
          lastRoundVersionNumber: 1,
          unresolvedCommentCount: 0,
        })
      ).not.toThrow();
    });
  });

  describe('processDecision', () => {
    const baseAssignment = {
      id: 'assign1',
      userId: 'rev1',
      stage: 'REVIEW' as const,
      status: 'PENDING' as const,
    };

    it('fails if assignment is not PENDING', () => {
      expect(() =>
        processDecision({
          currentStatus: 'IN_REVIEW',
          assignment: { ...baseAssignment, status: 'APPROVED' },
          decision: 'APPROVE',
          activeRoundAssignments: [baseAssignment],
        })
      ).toThrow(BusinessRuleError);
    });

    it('fails if stage does not match document status (R5)', () => {
      expect(() =>
        processDecision({
          currentStatus: 'IN_APPROVAL',
          assignment: baseAssignment, // REVIEW stage assignment
          decision: 'APPROVE',
          activeRoundAssignments: [baseAssignment],
        })
      ).toThrow(BusinessRuleError);
    });

    it('requires comment when requesting changes (R8)', () => {
      expect(() =>
        processDecision({
          currentStatus: 'IN_REVIEW',
          assignment: baseAssignment,
          decision: 'REQUEST_CHANGES',
          comment: '',
          activeRoundAssignments: [baseAssignment],
        })
      ).toThrow(BusinessRuleError);
    });

    it('advances from IN_REVIEW to IN_APPROVAL when all reviewers approve (R6)', () => {
      const assignment2 = {
        id: 'assign2',
        userId: 'rev2',
        stage: 'REVIEW' as const,
        status: 'APPROVED' as const,
      };

      const result = processDecision({
        currentStatus: 'IN_REVIEW',
        assignment: baseAssignment,
        decision: 'APPROVE',
        activeRoundAssignments: [baseAssignment, assignment2],
      });

      expect(result.nextDocumentStatus).toBe('IN_APPROVAL');
      expect(result.stageAdvanced).toBe(true);
      expect(result.documentApproved).toBe(false);
    });

    it('stays IN_REVIEW if not all reviewers have approved yet', () => {
      const assignment2 = {
        id: 'assign2',
        userId: 'rev2',
        stage: 'REVIEW' as const,
        status: 'PENDING' as const,
      };

      const result = processDecision({
        currentStatus: 'IN_REVIEW',
        assignment: baseAssignment,
        decision: 'APPROVE',
        activeRoundAssignments: [baseAssignment, assignment2],
      });

      expect(result.nextDocumentStatus).toBe('IN_REVIEW');
      expect(result.stageAdvanced).toBe(false);
    });

    it('advances from IN_APPROVAL to APPROVED when all approvers approve (R7)', () => {
      const appAssignment = {
        id: 'assign3',
        userId: 'app1',
        stage: 'APPROVAL' as const,
        status: 'PENDING' as const,
      };

      const result = processDecision({
        currentStatus: 'IN_APPROVAL',
        assignment: appAssignment,
        decision: 'APPROVE',
        activeRoundAssignments: [appAssignment],
      });

      expect(result.nextDocumentStatus).toBe('APPROVED');
      expect(result.documentApproved).toBe(true);
    });

    it('rejects in APPROVAL stage with comment (R9)', () => {
      const appAssignment = {
        id: 'assign3',
        userId: 'app1',
        stage: 'APPROVAL' as const,
        status: 'PENDING' as const,
      };

      const result = processDecision({
        currentStatus: 'IN_APPROVAL',
        assignment: appAssignment,
        decision: 'REJECT',
        comment: 'Rejection reason',
        activeRoundAssignments: [appAssignment],
      });

      expect(result.nextDocumentStatus).toBe('REJECTED');
      expect(result.updatedAssignmentStatus).toBe('REJECTED');
    });

    it('prevents rejection in REVIEW stage', () => {
      expect(() =>
        processDecision({
          currentStatus: 'IN_REVIEW',
          assignment: baseAssignment,
          decision: 'REJECT',
          comment: 'Reason',
          activeRoundAssignments: [baseAssignment],
        })
      ).toThrow(BusinessRuleError);
    });
  });
});
