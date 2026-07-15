import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';

export function validator<T>(schema: ZodType<T>) {
  return (req: Request<unknown, unknown, T>, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(result.error);
    }

    req.body = result.data;

    next();
  };
}
