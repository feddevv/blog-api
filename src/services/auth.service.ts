import { compare, hash } from 'bcrypt';
import { HttpError } from '../errors/HttpError.js';
import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
import { deleteRefreshToken, setRefreshToken } from '../utils/cookies.js';
import { Response } from 'express';

export async function registerUser(username: string, email: string, password: string) {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username: username }, { email: email }],
    },
  });

  if (existingUser) {
    throw new HttpError(409, 'Username or email is already taken');
  }

  const hashedPassword = await hash(password, 10);

  await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
    },
  });
}

export async function loginUser(username: string, password: string, res: Response) {
  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) {
    throw new Error('SECRET_KEY is not defined in environment variables');
  }

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (!user) {
    throw new HttpError(401, 'Username or password is incorrect');
  }

  const isValidPassword = await compare(password, user.password);

  if (!isValidPassword) {
    throw new HttpError(401, 'Username or password is incorrect');
  }

  const accessToken = jwt.sign({ id: user.id, role: user.role }, secretKey, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, secretKey, { expiresIn: '10d' });
  setRefreshToken(res, refreshToken);

  const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return accessToken;
}

export async function getUserById(id: number) {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      username: true,
      role: true,
      id: true,
      email: true,
    },
  });

  if (!user) throw new HttpError(404, 'User not found');

  return user;
}

export async function refreshAccessToken(refreshToken: string, res: Response) {
  if (!refreshToken) throw new HttpError(401, 'Refresh token is missing');

  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) throw new Error('SECRET_KEY is not defined in environment variables');

  try {
    jwt.verify(refreshToken, secretKey);
  } catch {
    deleteRefreshToken(res);
    throw new HttpError(401, 'Invalid or expired token');
  }

  const dbToken = await prisma.refreshToken.findUnique({
    where: {
      token: refreshToken,
    },
    include: {
      user: {
        select: {
          role: true,
        },
      },
    },
  });

  if (!dbToken) {
    deleteRefreshToken(res);
    throw new HttpError(401, 'Invalid or counterfeit token');
  }

  const newAccessToken = jwt.sign({ id: dbToken.userId, role: dbToken.user.role }, secretKey, {
    expiresIn: '15m',
  });
  const newRefreshToken = jwt.sign({ id: dbToken.userId }, secretKey, { expiresIn: '10d' });
  await prisma.refreshToken.update({
    where: {
      id: dbToken.id,
    },
    data: {
      token: newRefreshToken,
    },
  });
  setRefreshToken(res, newRefreshToken);

  return newAccessToken;
}

export async function logoutUser(refreshToken: string, res: Response) {
  if (!refreshToken) return;

  deleteRefreshToken(res);

  await prisma.refreshToken.delete({
    where: {
      token: refreshToken,
    },
  });
}
