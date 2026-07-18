import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/types.js';
import { HttpError } from '../errors/HttpError.js';

export function isAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  if (req.user.role !== 'ADMIN') {
    throw new HttpError(403, 'Forbidden: Admin access required');
  }

  next();
}
