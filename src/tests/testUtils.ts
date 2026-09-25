import { Role } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';
import { createRandomPost, createRandomUser } from '../utils/seedFactories.js';
import jwt from 'jsonwebtoken';

export function generateToken(userId: number, role: Role = 'USER'): string {
  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) {
    throw new Error('SECRET_KEY is not defined in environment variables');
  }
  return jwt.sign({ id: userId, role }, secretKey, { expiresIn: '15m' });
}

export async function createTestUser(role: Role = 'USER') {
  return prisma.user.create({
    data: createRandomUser(role),
  });
}

export async function createTestPost(
  userId: number,
  state: 'PUBLISHED' | 'DRAFT' | 'HIDDEN' = 'PUBLISHED',
) {
  return prisma.post.create({
    data: createRandomPost({ userId, state }),
  });
}
