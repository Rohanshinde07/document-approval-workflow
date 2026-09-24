import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../db.js';
import { NotFoundError, ForbiddenError } from '../domain/errors.js';
import { auditDocumentWithGemini, generateDraftWithGemini } from '../services/ai.js';

const router = Router();
router.use(authenticate);

const generateDraftSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  currentContent: z.string().optional(),
});

/**
 * POST /api/ai/audit/:documentId
 * Audit a document's content against enterprise compliance rules using Gemini.
 */
router.post('/audit/:documentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = Array.isArray(req.params.documentId)
      ? req.params.documentId[0]
      : req.params.documentId;

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        project: {
          include: {
            members: {
              where: { userId: req.user!.id },
            },
          },
        },
        currentVersion: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    // Must be a project member or admin
    if (doc.project.members.length === 0 && !req.user!.email.startsWith('admin@')) {
      throw new ForbiddenError('You do not have access to this project');
    }

    const version = doc.currentVersion || doc.versions[0];
    const content = version?.content || 'No content provided.';

    const audit = await auditDocumentWithGemini(doc.title, content, doc.status);
    res.json(audit);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ai/generate-draft
 * Generate or polish specification content using Gemini.
 */
router.post('/generate-draft', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = generateDraftSchema.parse(req.body);
    const content = await generateDraftWithGemini(data.prompt, data.currentContent);
    res.json({ content });
  } catch (err) {
    next(err);
  }
});

export default router;
