import { Router } from 'express';

import { signupController,loginController } from '../controllers/auth.controller';
import { signupLimiter,loginLimiter } from '../middlewares/rateLimit';
import { validate } from '../middlewares/validate';
import { signupSchema,loginSchema } from '../validators/auth.validation';

const router = Router();

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

export default router;