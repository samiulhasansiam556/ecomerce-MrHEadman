import { NextFunction, Request, RequestHandler, Response } from 'express';

// async controller-এর error নিজে errorHandler-এ পাঠায়
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };