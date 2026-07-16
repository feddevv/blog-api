import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';

interface RequestSchemas {
  body?: ZodType<any, any, any>;
  query?: ZodType<any, any, any>;
  params?: ZodType<any, any, any>;
}

export function validator(schemas: RequestSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
