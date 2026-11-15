
import { Router } from 'express';

import {
  createCollectionController,
  listCollectionsController,
  getCollectionController,
  updateCollectionController,
  archiveCollectionController,
  restoreCollectionController,
} from '../controllers/collection.controller';

import {
  createCollectionSchema,
  updateCollectionSchema,
  collectionIdSchema,
  collectionListQuerySchema,
} from '../validators/collection.validation';

import { validate } from '../middlewares/validate';
import {
  requireAuth,
  requireAdmin,
} from '../middlewares/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  '/',
  validate(collectionListQuerySchema, 'query'),
  listCollectionsController,
);

router.post(
  '/',
  validate(createCollectionSchema),
  createCollectionController,
);

router.get(
  '/:id',
  validate(collectionIdSchema, 'params'),
  getCollectionController,
);

router.patch(
  '/:id',
  validate(collectionIdSchema, 'params'),
  validate(updateCollectionSchema),
  updateCollectionController,
);

router.post(
  '/:id/archive',
  validate(collectionIdSchema, 'params'),
  archiveCollectionController,
);

router.post(
  '/:id/restore',
  validate(collectionIdSchema, 'params'),
  restoreCollectionController,
);

export default router;
