
import { Router } from 'express';

import { createProductController ,getAdminProductsController} from '../controllers/product.controller';

import {
  requireAuth,
  requireAdmin,
} from '../middlewares/auth';

import { validate } from '../middlewares/validate';

import { createProductSchema,productListQuerySchema } from '../validators/product.validation';

const router = Router();

// All product admin routes require an active admin.
router.use(requireAuth, requireAdmin);

// POST /admin/products


router.get(
  '/',
  validate(productListQuerySchema, 'query'),
  getAdminProductsController,
);
router.post(
  '/',
  validate(createProductSchema, 'body'),
  createProductController,
);

export default router;
