export type ProjectRole = 'OWNER' | 'AUTHOR' | 'REVIEWER' | 'APPROVER' | 'VIEWER';

export type DocumentStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'IN_APPROVAL'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED';

export type AssignmentStage = 'REVIEW' | 'APPROVAL';

export type DecisionType = 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT';

export type AssignmentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'CANCELLED';

export type AllowedAction =
  | 'CREATE_VERSION'
  | 'SUBMIT'
  | 'DECIDE_REVIEW'
  | 'DECIDE_APPROVAL'
  | 'ADD_COMMENT'
  | 'RESOLVE_COMMENT';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description?: string;
  role: ProjectRole;
  createdAt: string;
  memberCount: number;
  documentCount: number;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
  user: User;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  createdAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  content: string;
  changeSummary: string;
  createdById: string;
  createdAt: string;
  createdBy?: User;
}

export interface ReviewAssignment {
  id: string;
  documentId: string;
  versionId: string;
  userId: string;
  stage: AssignmentStage;
  status: AssignmentStatus;
  decidedAt?: string;
  decisionComment?: string;
  createdAt: string;
  user?: User;
}

export interface Comment {
  id: string;
  documentId: string;
  versionId: string;
  authorId: string;
  body: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedById?: string;
  resolvedInVersionId?: string;
  author?: User;
  resolvedBy?: User;
  version?: { id: string; versionNumber: number };
  resolvedInVersion?: { id: string; versionNumber: number };
}

export interface AuditEvent {
  id: string;
  projectId: string;
  documentId?: string;
  versionId?: string;
  actorId: string;
  action: string;
  fromStatus?: DocumentStatus;
  toStatus?: DocumentStatus;
  metadata?: any;
  createdAt: string;
  actor?: User;
  version?: { id: string; versionNumber: number };
}

export interface DocumentDetail {
  id: string;
  projectId: string;
  taskId?: string;
  title: string;
  authorId: string;
  status: DocumentStatus;
  currentVersionId?: string;
  createdAt: string;
  updatedAt: string;
  myRole: ProjectRole;
  project?: { id: string; name: string };
  author?: User;
  task?: Task;
  currentVersion?: DocumentVersion;
  versions: DocumentVersion[];
  currentRoundAssignments: ReviewAssignment[];
  comments: Comment[];
  allowedActions: AllowedAction[];
}

export interface UserQueue {
  awaitingDecision: {
    assignmentId: string;
    stage: AssignmentStage;
    document: DocumentDetail;
  }[];
  needingChanges: DocumentDetail[];
}
