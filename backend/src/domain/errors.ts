export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthenticated') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class InvalidTransitionError extends AppError {
  constructor(message = 'Invalid document state transition') {
    super(409, 'INVALID_TRANSITION', message);
  }
}

export class BusinessRuleError extends AppError {
  constructor(code: string, message: string) {
    super(422, code, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation error') {
    super(400, 'VALIDATION_ERROR', message);
  }
}
