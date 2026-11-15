

import { z } from 'zod';

import { ACTIVE_STATUSES } from '../constants/enums';

const sizeChartColumnSchema = z.strictObject({
  key: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(100),
});

const sizeChartRowSchema = z.strictObject({
  size: z.string().trim().min(1).max(100),
  values: z.record(
    z.string(),
    z.union([
      z.string(),
      z.number().finite(),
    ]),
  ),
});

const sizeChartFields = {
  name: z.string().trim().min(1).max(200),
  unit: z.enum(['inch', 'cm', 'none']),
  columns: z.array(sizeChartColumnSchema),
  rows: z.array(sizeChartRowSchema),
  status: z.enum(ACTIVE_STATUSES).default('active'),
};

export const createSizeChartSchema =
  z.strictObject(sizeChartFields);

export const updateSizeChartSchema =
  z.strictObject({
    name: sizeChartFields.name.optional(),
    unit: sizeChartFields.unit.optional(),
    columns: sizeChartFields.columns.optional(),
    rows: sizeChartFields.rows.optional(),
    status: z.enum(ACTIVE_STATUSES).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one field is required',
    },
  );

export const sizeChartIdSchema = z.strictObject({
  id: z.string().regex(
    /^[a-fA-F0-9]{24}$/,
    'Invalid MongoDB ID',
  ),
});

export const sizeChartListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ACTIVE_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
});

export type CreateSizeChartInput =
  z.infer<typeof createSizeChartSchema>;

export type UpdateSizeChartInput =
  z.infer<typeof updateSizeChartSchema>;

export type SizeChartListQuery =
  z.infer<typeof sizeChartListQuerySchema>;
