import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const SAFE_METHODS = new Set([
  'GET',
  'HEAD',
  'OPTIONS',
]);

// Expected origin of the frontend application.
const CLIENT_ORIGIN = new URL(env.CLIENT_URL).origin;

/**
 * Protect state-changing requests against cross-origin requests.
 *
 * Origin must exist and match the configured frontend origin.
 */
export const originProtection: RequestHandler = (
  req,
  _res,
  next,
) => {
  // Safe HTTP methods do not require Origin validation.
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const requestOrigin = req.get('Origin');

  if (
    typeof requestOrigin !== 'string' ||
    requestOrigin !== CLIENT_ORIGIN
  ) {
    return next(
      new AppError(
        403,
        'FORBIDDEN',
        'Request origin is not allowed',
      ),
    );
  }

  return next();
};