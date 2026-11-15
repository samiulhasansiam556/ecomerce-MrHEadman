
import { Router } from 'express';

import {
  createAttributeController,
  listAttributesController,
  getAttributeByIdController,
  updateAttributeController,
  archiveAttributeController,
  restoreAttributeController,
} from '../controllers/attribute.controller';

import {
  createAttributeSchema,
  updateAttributeSchema,
  attributeIdSchema,
  attributeListQuerySchema,
} from '../validators/attribute.validation';

import { validate } from '../middlewares/validate';

import {
  requireAuth,
  requireAdmin,
} from '../middlewares/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

// GET /admin/attributes
router.get(
  '/',
  validate(attributeListQuerySchema, 'query'),
  listAttributesController,
);

// POST /admin/attributes
router.post(
  '/',
  validate(createAttributeSchema, 'body'),
  createAttributeController,
);

// GET /admin/attributes/:id
router.get(
  '/:id',
  validate(attributeIdSchema, 'params'),
  getAttributeByIdController,
);

// PATCH /admin/attributes/:id
router.patch(
  '/:id',
  validate(attributeIdSchema, 'params'),
  validate(updateAttributeSchema, 'body'),
  updateAttributeController,
);

// POST /admin/attributes/:id/archive
router.post(
  '/:id/archive',
  validate(attributeIdSchema, 'params'),
  archiveAttributeController,
);

// POST /admin/attributes/:id/restore
router.post(
  '/:id/restore',
  validate(attributeIdSchema, 'params'),
  restoreAttributeController,
);

export default router;
