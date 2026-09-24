import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { login, registerUser, getCurrentUser } from '../services/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await login(data.email, data.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await registerUser(data.name, data.email, data.password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getCurrentUser(req.user!.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
