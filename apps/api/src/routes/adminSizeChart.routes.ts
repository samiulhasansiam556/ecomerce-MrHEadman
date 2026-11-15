
import { Router } from 'express';

import {
  createSizeChartController,
  listSizeChartsController,
  getSizeChartController,
  updateSizeChartController,
  archiveSizeChartController,
  restoreSizeChartController,
} from '../controllers/sizeChart.controller';

import {
  createSizeChartSchema,
  updateSizeChartSchema,
  sizeChartIdSchema,
  sizeChartListQuerySchema,
} from '../validators/sizeChart.validation';

import { validate } from '../middlewares/validate';
import {
  requireAuth,
  requireAdmin,
} from '../middlewares/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  '/',
  validate(sizeChartListQuerySchema, 'query'),
  listSizeChartsController,
);

router.post(
  '/',
  validate(createSizeChartSchema),
  createSizeChartController,
);

router.get(
  '/:id',
  validate(sizeChartIdSchema, 'params'),
  getSizeChartController,
);

router.patch(
  '/:id',
  validate(sizeChartIdSchema, 'params'),
  validate(updateSizeChartSchema),
  updateSizeChartController,
);

router.post(
  '/:id/archive',
  validate(sizeChartIdSchema, 'params'),
  archiveSizeChartController,
);

router.post(
  '/:id/restore',
  validate(sizeChartIdSchema, 'params'),
  restoreSizeChartController,
);

export default router;
