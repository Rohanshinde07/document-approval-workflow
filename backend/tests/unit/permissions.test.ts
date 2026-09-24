import { describe, it, expect } from 'vitest';
import {
  canCreateDocument,
  canManageMembers,
  canAddComment,
  canCreateVersion,
  canSubmit,
  canResolveComment,
  computeAllowedActions,
} from '../../src/domain/permissions.js';

describe('Permissions Domain Unit Tests', () => {
  describe('canCreateDocument', () => {
    it('allows OWNER and AUTHOR', () => {
      expect(canCreateDocument('OWNER')).toBe(true);
      expect(canCreateDocument('AUTHOR')).toBe(true);
    });

    it('denies REVIEWER, APPROVER, VIEWER', () => {
      expect(canCreateDocument('REVIEWER')).toBe(false);
      expect(canCreateDocument('APPROVER')).toBe(false);
      expect(canCreateDocument('VIEWER')).toBe(false);
    });
  });

  describe('canManageMembers', () => {
    it('allows only OWNER', () => {
      expect(canManageMembers('OWNER')).toBe(true);
      expect(canManageMembers('AUTHOR')).toBe(false);
      expect(canManageMembers('REVIEWER')).toBe(false);
      expect(canManageMembers('APPROVER')).toBe(false);
      expect(canManageMembers('VIEWER')).toBe(false);
    });
  });

  describe('canAddComment', () => {
    it('allows non-viewers on non-terminal status', () => {
      expect(canAddComment('AUTHOR', 'DRAFT')).toBe(true);
      expect(canAddComment('REVIEWER', 'IN_REVIEW')).toBe(true);
      expect(canAddComment('APPROVER', 'IN_APPROVAL')).toBe(true);
    });

    it('denies VIEWER and terminal status', () => {
      expect(canAddComment('VIEWER', 'DRAFT')).toBe(false);
      expect(canAddComment('OWNER', 'APPROVED')).toBe(false);
      expect(canAddComment('AUTHOR', 'REJECTED')).toBe(false);
    });
  });

  describe('Document Author restrictions (R1)', () => {
    it('only author can create version in DRAFT / CHANGES_REQUESTED', () => {
      expect(canCreateVersion('user1', 'user1', 'DRAFT')).toBe(true);
      expect(canCreateVersion('user2', 'user1', 'DRAFT')).toBe(false);
      expect(canCreateVersion('user1', 'user1', 'APPROVED')).toBe(false);
    });

    it('only author can submit', () => {
      expect(canSubmit('user1', 'user1', 'DRAFT')).toBe(true);
      expect(canSubmit('user2', 'user1', 'DRAFT')).toBe(false);
    });

    it('only author can resolve comments on non-terminal document', () => {
      expect(canResolveComment('user1', 'user1', 'IN_REVIEW')).toBe(true);
      expect(canResolveComment('user2', 'user1', 'IN_REVIEW')).toBe(false);
      expect(canResolveComment('user1', 'user1', 'APPROVED')).toBe(false);
    });
  });

  describe('computeAllowedActions', () => {
    it('computes actions for author in DRAFT state', () => {
      const actions = computeAllowedActions({
        userId: 'user1',
        projectRole: 'AUTHOR',
        authorId: 'user1',
        documentStatus: 'DRAFT',
        userAssignments: [],
      });

      expect(actions).toContain('CREATE_VERSION');
      expect(actions).toContain('SUBMIT');
      expect(actions).toContain('ADD_COMMENT');
      expect(actions).toContain('RESOLVE_COMMENT');
      expect(actions).not.toContain('DECIDE_REVIEW');
    });

    it('computes DECIDE_REVIEW for reviewer with pending assignment in IN_REVIEW', () => {
      const actions = computeAllowedActions({
        userId: 'rev1',
        projectRole: 'REVIEWER',
        authorId: 'author1',
        documentStatus: 'IN_REVIEW',
        userAssignments: [
          { id: 'a1', stage: 'REVIEW', status: 'PENDING' },
        ],
      });

      expect(actions).toContain('DECIDE_REVIEW');
      expect(actions).toContain('ADD_COMMENT');
      expect(actions).not.toContain('SUBMIT');
    });

    it('returns empty allowed actions for VIEWER in APPROVED status', () => {
      const actions = computeAllowedActions({
        userId: 'v1',
        projectRole: 'VIEWER',
        authorId: 'author1',
        documentStatus: 'APPROVED',
        userAssignments: [],
      });

      expect(actions).toEqual([]);
    });
  });
});
