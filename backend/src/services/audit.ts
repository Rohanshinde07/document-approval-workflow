import { Prisma, AuditAction, DocumentStatus } from '@prisma/client';
import { prisma } from '../db.js';

export interface AuditEventParams {
  projectId: string;
  documentId?: string | null;
  versionId?: string | null;
  actorId: string;
  action: AuditAction | string;
  fromStatus?: DocumentStatus | string | null;
  toStatus?: DocumentStatus | string | null;
  metadata?: any;
}

export async function recordAuditEvent(
  tx: Prisma.TransactionClient | typeof prisma,
  params: AuditEventParams
) {
  let metadataValue: any = params.metadata ?? null;
  const isSqlite = process.env.DATABASE_URL?.startsWith('file:');
  if (isSqlite && metadataValue !== null && typeof metadataValue !== 'string') {
    metadataValue = JSON.stringify(metadataValue);
  }

  return (tx as any).auditEvent.create({
    data: {
      projectId: params.projectId,
      documentId: params.documentId,
      versionId: params.versionId,
      actorId: params.actorId,
      action: params.action,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      metadata: metadataValue,
    },
  });
}
