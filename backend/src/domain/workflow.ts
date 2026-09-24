import {
  InvalidTransitionError,
  BusinessRuleError,
} from './errors.js';

export type DocumentStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'IN_APPROVAL'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED';

export type AssignmentStage = 'REVIEW' | 'APPROVAL';

export type AssignmentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'CANCELLED';

export type DecisionType = 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT';

export interface WorkflowAssignment {
  id: string;
  userId: string;
  stage: AssignmentStage;
  status: AssignmentStatus;
}

export interface SubmitValidationParams {
  currentStatus: DocumentStatus;
  reviewerUserIds: string[];
  approverUserIds: string[];
  authorId: string;
  currentVersionNumber: number;
  lastRoundVersionNumber?: number | null;
  unresolvedCommentCount: number;
}

export function validateVersionCreation(status: DocumentStatus): void {
  if (status === 'APPROVED' || status === 'REJECTED') {
    throw new InvalidTransitionError(
      `Cannot create a new version for document in terminal status '${status}'`
    );
  }
  if (status !== 'DRAFT' && status !== 'CHANGES_REQUESTED') {
    throw new InvalidTransitionError(
      `Versions can only be created in DRAFT or CHANGES_REQUESTED status (current: '${status}')`
    );
  }
}

export function validateSubmission(params: SubmitValidationParams): void {
  const {
    currentStatus,
    reviewerUserIds,
    approverUserIds,
    authorId,
    currentVersionNumber,
    lastRoundVersionNumber,
    unresolvedCommentCount,
  } = params;

  if (currentStatus !== 'DRAFT' && currentStatus !== 'CHANGES_REQUESTED') {
    throw new InvalidTransitionError(
      `Cannot submit document in status '${currentStatus}'`
    );
  }

  // R3: Exclude author from reviewer & approver counts
  const eligibleReviewers = reviewerUserIds.filter((id) => id !== authorId);
  const eligibleApprovers = approverUserIds.filter((id) => id !== authorId);

  if (eligibleReviewers.length === 0) {
    throw new BusinessRuleError(
      'NO_REVIEWERS',
      'Project must have at least one reviewer other than the author'
    );
  }

  if (eligibleApprovers.length === 0) {
    throw new BusinessRuleError(
      'NO_APPROVERS',
      'Project must have at least one approver other than the author'
    );
  }

  if (currentStatus === 'CHANGES_REQUESTED') {
    // R10: Requires a new version since last round
    if (
      lastRoundVersionNumber != null &&
      currentVersionNumber <= lastRoundVersionNumber
    ) {
      throw new BusinessRuleError(
        'NEW_VERSION_REQUIRED',
        'Resubmitting requires creating a new version since the last review round'
      );
    }

    // R11: Requires all comments on earlier versions are resolved
    if (unresolvedCommentCount > 0) {
      throw new BusinessRuleError(
        'UNRESOLVED_COMMENTS',
        `Resubmitting requires resolving all comments (${unresolvedCommentCount} unresolved)`
      );
    }
  }
}

export interface DecisionParams {
  currentStatus: DocumentStatus;
  assignment: WorkflowAssignment;
  decision: DecisionType;
  comment?: string | null;
  activeRoundAssignments: WorkflowAssignment[];
}

export interface DecisionResult {
  nextDocumentStatus: DocumentStatus;
  updatedAssignmentStatus: AssignmentStatus;
  cancelledAssignmentIds: string[];
  stageAdvanced: boolean;
  documentApproved: boolean;
}

export function processDecision(params: DecisionParams): DecisionResult {
  const { currentStatus, assignment, decision, comment, activeRoundAssignments } =
    params;

  // R5: Verify assignment is PENDING and matching active stage
  if (assignment.status !== 'PENDING') {
    throw new BusinessRuleError(
      'ASSIGNMENT_NOT_PENDING',
      'Assignment is no longer pending'
    );
  }

  if (currentStatus === 'IN_REVIEW' && assignment.stage !== 'REVIEW') {
    throw new BusinessRuleError(
      'WRONG_STAGE',
      'Cannot perform approval decision while document is in review stage'
    );
  }

  if (currentStatus === 'IN_APPROVAL' && assignment.stage !== 'APPROVAL') {
    throw new BusinessRuleError(
      'WRONG_STAGE',
      'Cannot perform review decision while document is in approval stage'
    );
  }

  if (currentStatus !== 'IN_REVIEW' && currentStatus !== 'IN_APPROVAL') {
    throw new InvalidTransitionError(
      `Cannot record decision on document in status '${currentStatus}'`
    );
  }

  if (decision === 'REQUEST_CHANGES') {
    // R8: Requesting changes requires a non-empty comment
    if (!comment || comment.trim().length === 0) {
      throw new BusinessRuleError(
        'COMMENT_REQUIRED',
        'A comment is required when requesting changes'
      );
    }

    const cancelledIds = activeRoundAssignments
      .filter((a) => a.id !== assignment.id && a.status === 'PENDING')
      .map((a) => a.id);

    return {
      nextDocumentStatus: 'CHANGES_REQUESTED',
      updatedAssignmentStatus: 'CHANGES_REQUESTED',
      cancelledAssignmentIds: cancelledIds,
      stageAdvanced: false,
      documentApproved: false,
    };
  }

  if (decision === 'REJECT') {
    // R9: Rejecting (approvers only) requires a non-empty comment
    if (assignment.stage !== 'APPROVAL') {
      throw new BusinessRuleError(
        'REJECT_NOT_ALLOWED',
        'Only approvers in the approval stage can reject a document'
      );
    }
    if (!comment || comment.trim().length === 0) {
      throw new BusinessRuleError(
        'COMMENT_REQUIRED',
        'A comment is required when rejecting a document'
      );
    }

    const cancelledIds = activeRoundAssignments
      .filter((a) => a.id !== assignment.id && a.status === 'PENDING')
      .map((a) => a.id);

    return {
      nextDocumentStatus: 'REJECTED',
      updatedAssignmentStatus: 'REJECTED',
      cancelledAssignmentIds: cancelledIds,
      stageAdvanced: false,
      documentApproved: false,
    };
  }

  if (decision === 'APPROVE') {
    const stageAssignments = activeRoundAssignments.filter(
      (a) => a.stage === assignment.stage
    );

    // Count how many will be approved after this decision
    const approvedCount = stageAssignments.filter((a) =>
      a.id === assignment.id ? true : a.status === 'APPROVED'
    ).length;

    const allStageApproved = approvedCount === stageAssignments.length;

    if (currentStatus === 'IN_REVIEW') {
      if (allStageApproved) {
        // R6: Move to IN_APPROVAL in same transaction
        return {
          nextDocumentStatus: 'IN_APPROVAL',
          updatedAssignmentStatus: 'APPROVED',
          cancelledAssignmentIds: [],
          stageAdvanced: true,
          documentApproved: false,
        };
      } else {
        return {
          nextDocumentStatus: 'IN_REVIEW',
          updatedAssignmentStatus: 'APPROVED',
          cancelledAssignmentIds: [],
          stageAdvanced: false,
          documentApproved: false,
        };
      }
    }

    if (currentStatus === 'IN_APPROVAL') {
      if (allStageApproved) {
        // R7: Move to APPROVED
        return {
          nextDocumentStatus: 'APPROVED',
          updatedAssignmentStatus: 'APPROVED',
          cancelledAssignmentIds: [],
          stageAdvanced: false,
          documentApproved: true,
        };
      } else {
        return {
          nextDocumentStatus: 'IN_APPROVAL',
          updatedAssignmentStatus: 'APPROVED',
          cancelledAssignmentIds: [],
          stageAdvanced: false,
          documentApproved: false,
        };
      }
    }
  }

  throw new InvalidTransitionError(`Unhandled decision type '${decision}'`);
}
