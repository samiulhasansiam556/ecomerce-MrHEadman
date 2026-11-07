import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export function requestId(_req: Request, res: Response, next: NextFunction) {
  const id = `req_${randomUUID()}`;
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}