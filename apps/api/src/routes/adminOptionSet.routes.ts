import { Router } from 'express';

import {
  createOptionSetController,
  listOptionSetsController,
  getOptionSetController,
  updateOptionSetController,
  archiveOptionSetController,
  restoreOptionSetController,
} from '../controllers/optionSet.controller';

import {
  createOptionSetSchema,
  updateOptionSetSchema,
  optionSetIdSchema,
  optionSetListQuerySchema,
} from '../validators/optionSet.validation';

import { validate } from '../middlewares/validate';
import {
  requireAuth,
  requireAdmin,
} from '../middlewares/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  '/',
  validate(optionSetListQuerySchema, 'query'),
  listOptionSetsController,
);

router.post(
  '/',
  validate(createOptionSetSchema, 'body'),
  createOptionSetController,
);

router.get(
  '/:id',
  validate(optionSetIdSchema, 'params'),
  getOptionSetController,
);

router.patch(
  '/:id',
  validate(optionSetIdSchema, 'params'),
  validate(updateOptionSetSchema, 'body'),
  updateOptionSetController,
);

router.post(
  '/:id/archive',
  validate(optionSetIdSchema, 'params'),
  archiveOptionSetController,
);

router.post(
  '/:id/restore',
  validate(optionSetIdSchema, 'params'),
  restoreOptionSetController,
);

export default router;