import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/HttpError.js';
import jwt from 'jsonwebtoken';

export function authorize(req: Request, res: Response, next: NextFunction) {
  const bearer = req.headers.authorization;

  if (!bearer) {
    throw new HttpError(401, 'Token not found');
  }

  const token = bearer.split(' ')[1];

  const isValid = jwt.verify(token, process.env.SECRET_KEY!);

  if (!isValid) {
    throw new HttpError(401, 'Invalid or expired token');
  }

  next();
}
