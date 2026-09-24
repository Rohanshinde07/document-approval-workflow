import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { UnauthorizedError, NotFoundError, BusinessRuleError } from '../domain/errors.js';

export async function login(email: string, password: unknown) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new UnauthorizedError('Invalid credentials');
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
  };

  const token = jwt.sign(tokenPayload, config.jwtSecret, {
    expiresIn: '8h',
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

export async function registerUser(name: string, email: string, password: unknown) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new BusinessRuleError('INVALID_NAME', 'Name is required');
  }
  if (typeof email !== 'string' || !email.includes('@')) {
    throw new BusinessRuleError('INVALID_EMAIL', 'Valid email is required');
  }
  if (typeof password !== 'string' || password.length < 6) {
    throw new BusinessRuleError('WEAK_PASSWORD', 'Password must be at least 6 characters');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    throw new BusinessRuleError('EMAIL_EXISTS', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    },
  });

  const tokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
  };

  const token = jwt.sign(tokenPayload, config.jwtSecret, {
    expiresIn: '8h',
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}
