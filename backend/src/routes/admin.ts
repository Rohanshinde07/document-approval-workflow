import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { ForbiddenError } from '../domain/errors.js';
import { prisma } from '../db.js';

const router = Router();

router.use(authenticate);

// Middleware: must be admin
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (
    !req.user ||
    (req.user.email !== 'admin@demo.com' &&
     req.user.email !== 'rohanyshinde07@gmail.com' &&
     !req.user.email.startsWith('admin@'))
  ) {
    return next(new ForbiddenError('Admin access required.'));
  }
  next();
}

router.use(requireAdmin);

// GET /api/admin/stats  — platform-wide metrics
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers,
      totalProjects,
      totalDocuments,
      statusCounts,
      totalComments,
      totalAuditEvents,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.document.count(),
      prisma.document.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.comment.count(),
      prisma.auditEvent.count(),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      byStatus[row.status] = row._count.id;
    }

    res.json({
      totalUsers,
      totalProjects,
      totalDocuments,
      byStatus,
      totalComments,
      totalAuditEvents,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users  — list all users with project membership counts
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            memberships: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      projectCount: u._count.memberships,
    })));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/projects  — list all projects with member + doc counts
router.get('/projects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            members: true,
            documents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      createdBy: p.createdBy,
      memberCount: p._count.members,
      documentCount: p._count.documents,
    })));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/projects/:id/documents — all documents in a project (admin view)
router.get('/projects/:id/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    const docs = await prisma.document.findMany({
      where: { projectId },
      include: {
        author: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true } },
        currentVersion: { select: { versionNumber: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(docs);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit  — recent audit events across the platform
router.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 200);
    const events = await prisma.auditEvent.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        document: { select: { id: true, title: true } },
      },
    });
    res.json(events);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/projects — create a project (admin can create any project)
router.post('/projects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description || null,
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

export default router;
