import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

function getEmail(req: Request): string {
  const email = req.body?.email;

  if (typeof email !== 'string') {
    return 'missing-email';
  }

  return email.trim().toLowerCase();
}

/**
 * Standard 429 response envelope.
 */
function rateLimitHandler(
  req: Request,
  res: import('express').Response,
) {
  return res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
    },
    requestId: res.locals.requestId,
  });
}

/**
 * General API:
 * 300 requests per 5 minutes per IP.
 */
export const generalApiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Login:
 * 5 attempts per 15 minutes per IP + email.
 *
 * This limit also covers admin login when the same
 * login endpoint is used.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,

  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip ?? 'unknown');
    const email = getEmail(req);

    return `${ip}:${email}`;
  },

  handler: rateLimitHandler,
});

/**
 * Signup:
 * 10 attempts per hour per IP.
 */
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Forgot password:
 * Maximum 3 attempts per hour per email.
 */
export const forgotPasswordEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-8',
  legacyHeaders: false,

  keyGenerator: (req) => getEmail(req),

  handler: rateLimitHandler,
});

/**
 * Forgot password:
 * Maximum 10 attempts per hour per IP.
 *
 * This must be used together with the email limiter.
 */
export const forgotPasswordIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler,
});