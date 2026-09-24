import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../domain/errors.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const formattedMessage = err.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: formattedMessage || 'Invalid request body or parameters',
      },
    });
    return;
  }

  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
    },
  });
}
