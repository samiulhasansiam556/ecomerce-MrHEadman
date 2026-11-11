import { Router } from 'express';

import { requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

import { signUploadController } from '../controllers/media.controller';
import { signUploadSchema } from '../validators/media.validation';

const router = Router();

router.post(
  '/sign-upload',
  requireAuth,
  validate(signUploadSchema),
  signUploadController,
);

export default router;