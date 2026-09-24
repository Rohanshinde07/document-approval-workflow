import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { UnauthorizedError } from '../domain/errors.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser;

    // Check if user still exists in DB by ID, or fallback to email if DB was wiped/re-seeded
    let dbUser = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!dbUser && payload.email) {
      dbUser = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase().trim() } });
    }

    if (!dbUser) {
      return next(new UnauthorizedError('Session expired. Please log in again.'));
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
    };
    next();
  } catch (err) {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
}
