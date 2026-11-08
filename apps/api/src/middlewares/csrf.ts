import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { AppError } from '../utils/AppError';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

// These POST endpoints are exempt from CSRF validation.
// They still require their own rate-limit and origin protections.
const CSRF_EXEMPT_PATHS = new Set([
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

function tokensMatch(
  cookieToken: string,
  headerToken: string,
): boolean {
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (cookieBuffer.length !== headerBuffer.length) {
    return false;
  }

  return timingSafeEqual(cookieBuffer, headerBuffer);
}

export const csrfProtection: RequestHandler = (
  req,
  _res,
  next,
) => {
  // Safe HTTP methods do not require CSRF validation.
  if (
    req.method === 'GET' ||
    req.method === 'HEAD' ||
    req.method === 'OPTIONS'
  ) {
    return next();
  }

  // Skip CSRF validation for the four specified auth endpoints.
  if (
    req.method === 'POST' &&
    CSRF_EXEMPT_PATHS.has(req.path)
  ) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (
    typeof cookieToken !== 'string' ||
    typeof headerToken !== 'string' ||
    !/^[a-f0-9]{64}$/.test(cookieToken) ||
    !/^[a-f0-9]{64}$/.test(headerToken) ||
    !tokensMatch(cookieToken, headerToken)
  ) {
    return next(
      new AppError(
        403,
        'CSRF_INVALID',
        'Missing or invalid CSRF token',
      ),
    );
  }

  return next();
};