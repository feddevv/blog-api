import z, { ZodError } from 'zod';
import { HttpError } from '../errors/HttpError.js';
import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  message: string;
  errors?: z.core.$ZodIssue[];
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction,
) {
  let statusCode: number | null = null;
  let message = 'Something went wrong!';

  if (err instanceof Error) {
    message = err.message;
  }

  const errorResponse: ErrorResponse = { message };
  if (err instanceof HttpError) {
    statusCode = err.statusCode;
  } else if (err instanceof ZodError) {
    errorResponse.message = 'Validation failed';
    errorResponse.errors = err.issues;
    statusCode = 422;
  } else {
    errorResponse.message = 'Something went wrong!';
    console.error(err);
  }

  res.status(statusCode ?? 500).json(errorResponse);
}
