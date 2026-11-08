import { Router } from 'express';

import {
  signupController,
  loginController,
  logoutController,
  refreshController,
} from '../controllers/auth.controller';

import {
  signupLimiter,
  loginLimiter,
} from '../middlewares/rateLimit';

import { requireAuth } from '../middlewares/auth';

import { validate } from '../middlewares/validate';

import {
  signupSchema,
  loginSchema,
} from '../validators/auth.validation';

const router = Router();

// Public authentication
router.post(
  '/signup',
  signupLimiter,
  validate(signupSchema),
  signupController,
);

router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  loginController,
);

// Current authenticated session
router.post(
  '/logout',
  requireAuth,
  logoutController,
);

// Refresh token is validated inside the service.
// Access token is not required here.
router.post(
  '/refresh',
  refreshController,
);

export default router;