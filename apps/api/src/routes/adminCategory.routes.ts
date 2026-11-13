
import { Router } from 'express';
import { z } from 'zod';

import {
  createCategoryController,
  listCategoriesController,
  getCategoryTreeController,
  getCategoryByIdController,
  updateCategoryController,
  archiveCategoryController,
  restoreCategoryController,
  deleteCategoryController,
} from '../controllers/category.controller';
import {
  moveCategoryController,
  reorderCategoriesController,
} from '../controllers/category.controller';
import {
  moveCategorySchema,
  reorderCategoriesSchema,
} from '../validators/category.validation';
import {
  requireAuth,
  requireAdmin,
} from '../middlewares/auth';

import { validate } from '../middlewares/validate';

import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
  categoryListQuerySchema,
} from '../validators/category.validation';

const router = Router();

const archiveSchema = z.strictObject({
  status: z.enum(['hidden', 'archived']),
});

// All category admin routes require an active admin.
router.use(requireAuth, requireAdmin);

// GET /admin/categories/tree
// Keep this before /:id to avoid route conflicts.
router.get(
  '/tree',
  getCategoryTreeController,
);

// GET /admin/categories
router.get(
  '/',
  validate(categoryListQuerySchema, 'query'),
  listCategoriesController,
);

// POST /admin/categories
router.post(
  '/',
  validate(createCategorySchema, 'body'),
  createCategoryController,
);

router.put(
  '/reorder',
  validate(reorderCategoriesSchema, 'body'),
  reorderCategoriesController,
);

router.post(
  '/:id/move',
  validate(categoryIdSchema, 'params'),
  validate(moveCategorySchema, 'body'),
  moveCategoryController,
);

// GET /admin/categories/:id
router.get(
  '/:id',
  validate(categoryIdSchema, 'params'),
  getCategoryByIdController,
);

// PATCH /admin/categories/:id
router.patch(
  '/:id',
  validate(categoryIdSchema, 'params'),
  validate(updateCategorySchema, 'body'),
  updateCategoryController,
);

// PATCH /admin/categories/:id/archive
router.patch(
  '/:id/archive',
  validate(categoryIdSchema, 'params'),
  validate(archiveSchema, 'body'),
  archiveCategoryController,
);

// POST /admin/categories/:id/restore
router.post(
  '/:id/restore',
  validate(categoryIdSchema, 'params'),
  restoreCategoryController,
);

// DELETE /admin/categories/:id
router.delete(
  '/:id',
  validate(categoryIdSchema, 'params'),
  deleteCategoryController,
);

export default router;
