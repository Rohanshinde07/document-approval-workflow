import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import {
  listProjectsForUser,
  getProjectDetail,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from '../services/projects.js';
import { listDocuments, createDocument } from '../services/documents.js';

import { prisma } from '../db.js';

const router = Router();

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0];
  return param || '';
}

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
});

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'AUTHOR', 'REVIEWER', 'APPROVER', 'VIEWER']),
});

const updateMemberSchema = z.object({
  role: z.enum(['OWNER', 'AUTHOR', 'REVIEWER', 'APPROVER', 'VIEWER']),
});

const createDocumentSchema = z.object({
  title: z.string().min(1),
  taskId: z.string().optional(),
  content: z.string().min(1),
  changeSummary: z.string().optional().default('Initial version'),
});

router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await listProjectsForUser(req.user!.id);
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        createdById: req.user!.id,
        members: {
          create: [{ userId: req.user!.id, role: 'OWNER' }],
        },
      },
    });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = getParam(req.params.id);
    const project = await getProjectDetail(projectId, req.user!.id);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = getParam(req.params.id);
    const data = addMemberSchema.parse(req.body);
    const member = await addProjectMember(
      projectId,
      req.user!.id,
      data.email,
      data.role
    );
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:id/members/:memberId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = getParam(req.params.id);
      const memberId = getParam(req.params.memberId);
      const data = updateMemberSchema.parse(req.body);
      const updated = await updateProjectMemberRole(
        projectId,
        req.user!.id,
        memberId,
        data.role
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id/members/:memberId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = getParam(req.params.id);
      const memberId = getParam(req.params.memberId);
      const result = await removeProjectMember(
        projectId,
        req.user!.id,
        memberId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/:id/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = getParam(req.params.id);
    const status = req.query.status as any;
    const taskId = req.query.taskId as string | undefined;
    const docs = await listDocuments(projectId, req.user!.id, { status, taskId });
    res.json(docs);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = getParam(req.params.id);
    const data = createDocumentSchema.parse(req.body);
    const doc = await createDocument(projectId, req.user!.id, data);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

export default router;
