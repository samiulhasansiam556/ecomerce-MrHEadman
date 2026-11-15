
import { Router } from 'express';

import {
  createBrandController,
  listBrandsController,
  getBrandController,
  updateBrandController,
  archiveBrandController,
  restoreBrandController,
} from '../controllers/brand.controller';

import {
  createBrandSchema,
  updateBrandSchema,
  brandIdSchema,
  brandListQuerySchema,
} from '../validators/brand.validation';

import { validate } from '../middlewares/validate';
import {
  requireAuth,
  requireAdmin,
} from '../middlewares/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  '/',
  validate(brandListQuerySchema, 'query'),
  listBrandsController,
);

router.post(
  '/',
  validate(createBrandSchema),
  createBrandController,
);

router.get(
  '/:id',
  validate(brandIdSchema, 'params'),
  getBrandController,
);

router.patch(
  '/:id',
  validate(brandIdSchema, 'params'),
  validate(updateBrandSchema),
  updateBrandController,
);

router.post(
  '/:id/archive',
  validate(brandIdSchema, 'params'),
  archiveBrandController,
);

router.post(
  '/:id/restore',
  validate(brandIdSchema, 'params'),
  restoreBrandController,
);

export default router;
