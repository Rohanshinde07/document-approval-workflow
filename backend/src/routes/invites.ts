import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import {
  sendProjectInvite,
  getInviteByToken,
  acceptInvite,
  listProjectInvites,
  revokeInvite,
} from '../services/invites.js';
import { login } from '../services/auth.js';

const router = Router();

// ─── Public Routes (no auth required) ─────────────────────────────────────────

// GET /api/invites/:token — get invite details for the accept page
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invite = await getInviteByToken(req.params.token);
    res.json({
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      project: invite.project,
      invitedBy: invite.invitedBy,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/invites/:token/accept — accept invite (registers if new user)
const acceptSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
});

router.post('/:token/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = acceptSchema.parse(req.body);
    const result = await acceptInvite(req.params.token, data);

    // Auto-login: generate a fresh JWT for them
    let token: string | null = null;
    try {
      const loginResult = await login(result.user.email, req.body.password || '');
      token = loginResult.token;
    } catch {
      // Password not given (existing user flow without password) — skip auto-login
    }

    res.json({ ...result, token });
  } catch (err) {
    next(err);
  }
});

// ─── Protected Routes (auth required) ─────────────────────────────────────────
router.use(authenticate);

// POST /api/invites/projects/:id/send — send invite
const sendInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'AUTHOR', 'REVIEWER', 'APPROVER', 'VIEWER']),
});

router.post('/projects/:id/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = sendInviteSchema.parse(req.body);
    const result = await sendProjectInvite(id, req.user!.id, data.email, data.role);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/invites/projects/:id/pending — list pending invites
router.get('/projects/:id/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invites = await listProjectInvites(req.params.id, req.user!.id);
    res.json(invites);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/invites/:inviteId — revoke an invite
router.delete('/:inviteId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await revokeInvite(req.params.inviteId, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
