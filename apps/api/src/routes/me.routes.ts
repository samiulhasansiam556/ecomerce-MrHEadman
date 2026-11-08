import { Router } from 'express';

import {
  getMyProfileController,
  updateMyProfileController,
} from '../controllers/account.controller';

import { requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { updateProfileSchema } from '../validators/account.validation';
import addressRoutes from './address.routes';
const router = Router();

router.use(requireAuth);

router.get('/', getMyProfileController);

router.patch(
  '/',
  validate(updateProfileSchema),
  updateMyProfileController,
);

router.use('/addresses', addressRoutes);

export default router;