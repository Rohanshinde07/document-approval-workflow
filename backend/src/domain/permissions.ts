import { DocumentStatus, AssignmentStage, AssignmentStatus } from './workflow.js';

export type ProjectRole = 'OWNER' | 'AUTHOR' | 'REVIEWER' | 'APPROVER' | 'VIEWER';

export interface DocumentPermissionContext {
  userId: string;
  projectRole: ProjectRole;
  authorId: string;
  documentStatus: DocumentStatus;
  userAssignments: {
    id: string;
    stage: AssignmentStage;
    status: AssignmentStatus;
  }[];
}

export type AllowedAction =
  | 'CREATE_VERSION'
  | 'SUBMIT'
  | 'DECIDE_REVIEW'
  | 'DECIDE_APPROVAL'
  | 'ADD_COMMENT'
  | 'RESOLVE_COMMENT'
  | 'EDIT_DOCUMENT'
  | 'DELETE_DOCUMENT';

export function isTerminalStatus(status: DocumentStatus): boolean {
  return status === 'APPROVED' || status === 'REJECTED';
}

export function canCreateDocument(role: ProjectRole): boolean {
  return role === 'OWNER' || role === 'AUTHOR';
}

export function canManageMembers(role: ProjectRole): boolean {
  return role === 'OWNER';
}

export function canAddComment(role: ProjectRole, status: DocumentStatus): boolean {
  if (isTerminalStatus(status)) return false;
  return role === 'OWNER' || role === 'AUTHOR' || role === 'REVIEWER' || role === 'APPROVER';
}

export function canCreateVersion(userId: string, authorId: string, status: DocumentStatus): boolean {
  if (userId !== authorId) return false;
  return status === 'DRAFT' || status === 'CHANGES_REQUESTED';
}

export function canSubmit(userId: string, authorId: string, status: DocumentStatus): boolean {
  if (userId !== authorId) return false;
  return status === 'DRAFT' || status === 'CHANGES_REQUESTED';
}

export function canResolveComment(userId: string, authorId: string, status: DocumentStatus): boolean {
  if (userId !== authorId) return false;
  return !isTerminalStatus(status);
}

export function computeAllowedActions(ctx: DocumentPermissionContext): AllowedAction[] {
  const actions: AllowedAction[] = [];
  const isAuthor = ctx.userId === ctx.authorId;
  const isTerminal = isTerminalStatus(ctx.documentStatus);

  if (canCreateVersion(ctx.userId, ctx.authorId, ctx.documentStatus)) {
    actions.push('CREATE_VERSION');
  }

  if (canSubmit(ctx.userId, ctx.authorId, ctx.documentStatus)) {
    actions.push('SUBMIT');
  }

  if (canAddComment(ctx.projectRole, ctx.documentStatus)) {
    actions.push('ADD_COMMENT');
  }

  if (canResolveComment(ctx.userId, ctx.authorId, ctx.documentStatus)) {
    actions.push('RESOLVE_COMMENT');
  }

  const pendingAssignments = ctx.userAssignments.filter(
    (a) => a.status === 'PENDING'
  );

  if (ctx.documentStatus === 'IN_REVIEW') {
    const hasPendingReview = pendingAssignments.some(
      (a) => a.stage === 'REVIEW'
    );
    if (hasPendingReview) {
      actions.push('DECIDE_REVIEW');
    }
  }

  if (ctx.documentStatus === 'IN_APPROVAL') {
    const hasPendingApproval = pendingAssignments.some(
      (a) => a.stage === 'APPROVAL'
    );
    if (hasPendingApproval) {
      actions.push('DECIDE_APPROVAL');
    }
  }

  // Edit Draft: Author or Project Owner when in DRAFT
  if (ctx.documentStatus === 'DRAFT' && (isAuthor || ctx.projectRole === 'OWNER')) {
    actions.push('EDIT_DOCUMENT');
  }

  // Delete Document: Project Owner can delete any doc, Author can delete if DRAFT or REJECTED
  if (ctx.projectRole === 'OWNER' || (isAuthor && (ctx.documentStatus === 'DRAFT' || ctx.documentStatus === 'REJECTED'))) {
    actions.push('DELETE_DOCUMENT');
  }

  return actions;
}
