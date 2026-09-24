import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getUserQueue } from '../services/queue.js';

const router = Router();

router.use(authenticate);

router.get('/queue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queue = await getUserQueue(req.user!.id);
    res.json(queue);
  } catch (err) {
    next(err);
  }
});

export default router;
