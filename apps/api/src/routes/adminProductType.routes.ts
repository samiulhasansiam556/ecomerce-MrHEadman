
import { Router } from 'express';

import {
  createProductTypeController,
  listProductTypesController,
  getProductTypeController,
  updateProductTypeController,
  archiveProductTypeController,
  restoreProductTypeController,
} from '../controllers/productType.controller';

import {
  createProductTypeSchema,
  updateProductTypeSchema,
  productTypeIdSchema,
  productTypeListQuerySchema,
} from '../validators/productType.validation';

import { validate } from '../middlewares/validate';
import {
  requireAuth,
  requireAdmin,
} from '../middlewares/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  '/',
  validate(productTypeListQuerySchema, 'query'),
  listProductTypesController,
);

router.post(
  '/',
  validate(createProductTypeSchema),
  createProductTypeController,
);

router.get(
  '/:id',
  validate(productTypeIdSchema, 'params'),
  getProductTypeController,
);

router.patch(
  '/:id',
  validate(productTypeIdSchema, 'params'),
  validate(updateProductTypeSchema),
  updateProductTypeController,
);

router.post(
  '/:id/archive',
  validate(productTypeIdSchema, 'params'),
  archiveProductTypeController,
);

router.post(
  '/:id/restore',
  validate(productTypeIdSchema, 'params'),
  restoreProductTypeController,
);

export default router;
