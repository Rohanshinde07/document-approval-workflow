import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import {
  getDocumentDetail,
  getAuditTrail,
  getVersion,
  createVersion,
  submitDocument,
  recordDecision,
} from '../services/documents.js';
import { addComment } from '../services/comments.js';
import { prisma } from '../db.js';

const router = Router();

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0];
  return param || '';
}

const createVersionSchema = z.object({
  content: z.string().min(1),
  changeSummary: z.string().optional().default(''),
});

const decisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REQUEST_CHANGES', 'REJECT']),
  comment: z.string().optional().nullable(),
});

const addCommentSchema = z.object({
  body: z.string().min(1),
});

router.use(authenticate);

// GET /api/documents — list all accessible documents across projects
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin =
      req.user!.email === 'admin@demo.com' ||
      req.user!.email === 'rohanyshinde07@gmail.com' ||
      req.user!.email.startsWith('admin@');

    const whereClause = isAdmin
      ? {}
      : {
          project: {
            members: {
              some: { userId: req.user!.id },
            },
          },
        };

    const docs = await prisma.document.findMany({
      where: whereClause,
      include: {
        project: { select: { id: true, name: true } },
        author: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true } },
        currentVersion: { select: { versionNumber: true, changeSummary: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(docs);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docId = getParam(req.params.id);
    const doc = await getDocumentDetail(docId, req.user!.id);
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docId = getParam(req.params.id);
    const audit = await getAuditTrail(docId, req.user!.id);
    res.json(audit);
  } catch (err) {
    next(err);
  }
});

router.get(
  '/:id/versions/:number',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = getParam(req.params.id);
      const versionStr = getParam(req.params.number);
      const versionNumber = parseInt(versionStr, 10);
      const version = await getVersion(docId, versionNumber, req.user!.id);
      res.json(version);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/:id/versions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docId = getParam(req.params.id);
    const data = createVersionSchema.parse(req.body);
    const version = await createVersion(docId, req.user!.id, data);
    res.status(201).json(version);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docId = getParam(req.params.id);
    const updated = await submitDocument(docId, req.user!.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/decision', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docId = getParam(req.params.id);
    const data = decisionSchema.parse(req.body);
    const updated = await recordDecision(docId, req.user!.id, data);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docId = getParam(req.params.id);
    const data = addCommentSchema.parse(req.body);
    const comment = await addComment(docId, req.user!.id, data.body);
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

export default router;
