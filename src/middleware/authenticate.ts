import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/types.js';
import { HttpError } from '../errors/HttpError.js';
import { Role } from '../generated/prisma/enums.js';
import jwt from 'jsonwebtoken';

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer')) {
    throw new HttpError(401, 'Token not found or invalid format');
  }

  const token = authHeader.split(' ')[1];
  const secretKey = process.env.SECRET_KEY;

  if (!secretKey) {
    throw new Error('SECRET_KEY is not defined in environment variables');
  }

  try {
    const decoded = jwt.verify(token, secretKey) as { id: number; role: Role };

    if (!decoded) {
      throw new HttpError(401, 'Invalid or expired token');
    }

    req.user = { id: decoded.id, role: decoded.role };

    next();
  } catch (err) {
    next(err);
  }
}

export function optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const secretKey = process.env.SECRET_KEY;

  if (!secretKey) {
    throw new Error('SECRET_KEY is not defined in environment variables');
  }

  try {
    const decoded = jwt.verify(token, secretKey) as { id: number; role: Role };

    if (!decoded) {
      throw new HttpError(401, 'Invalid or expired token');
    }

    req.user = { id: decoded.id, role: decoded.role };

    next();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    throw new HttpError(401, 'Invalid or expired token');
  }
}
