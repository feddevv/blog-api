import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { hash, compare } from 'bcrypt';
import { HttpError } from '../errors/HttpError.js';
import { LoginBody, RegisterBody } from '../validation/authSchemas.js';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types/types.js';
import { deleteRefreshToken, setRefreshToken } from '../utils/cookies.js';

export async function register(
  req: AuthenticatedRequest<unknown, unknown, RegisterBody>,
  res: Response,
) {
  const { username, email, password } = req.body;

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

  res.status(201).json({ message: 'Created' });
}

export async function login(req: AuthenticatedRequest<unknown, unknown, LoginBody>, res: Response) {
  const { username, password } = req.body;

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

  res.json({ token: accessToken });
}

export async function getUser(req: AuthenticatedRequest, res: Response) {
  const { id } = req.user!;

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

  res.json(user);
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;

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

  if (!dbToken) throw new HttpError(401, 'Invalid or counterfeit token');

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

  res.json({ token: newAccessToken });
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;

  deleteRefreshToken(res);

  await prisma.refreshToken.delete({
    where: {
      token: refreshToken,
    },
  });

  res.json({ message: 'Successfully logged out' });
}
