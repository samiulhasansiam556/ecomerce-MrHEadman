
import { Router } from 'express';

import {
  getAdminEmailLogsController,
  retryAdminEmailController,
} from '../controllers/adminEmailLog.controller';

import {
  requireAuth,
  requireAdmin,
} from '../middlewares/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  '/email-logs',
  getAdminEmailLogsController,
);

router.post(
  '/email-logs/:id/retry',
  retryAdminEmailController,
);

export default router;
