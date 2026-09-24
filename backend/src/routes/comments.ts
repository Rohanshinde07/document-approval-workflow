import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { resolveComment } from '../services/comments.js';

const router = Router();

router.use(authenticate);

router.post('/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await resolveComment(commentId, req.user!.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
