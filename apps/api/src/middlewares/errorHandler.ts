
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

function isMalformedJsonError(err: unknown): boolean {
  if (!(err instanceof SyntaxError)) {
    return false;
  }

  const parserError = err as SyntaxError & {
    status?: number;
    type?: string;
  };

  return (
    parserError.status === 400 &&
    parserError.type === 'entity.parse.failed'
  );
}

export function notFound(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const requestId = res.locals.requestId;

  // Malformed JSON body
  if (isMalformedJsonError(err)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid JSON request body',
        details: [
          {
            field: 'body',
            message: 'Request body contains invalid JSON',
          },
        ],
      },
      requestId,
    });
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      requestId,
    });
  }

  // Known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      requestId,
    });
  }

  // Unexpected errors — never expose internal error details
  const errorName =
    err instanceof Error ? err.name : 'UnknownError';

  logger.error(
    { requestId, errorName },
    'Unhandled error',
  );

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    },
    requestId,
  });
}
