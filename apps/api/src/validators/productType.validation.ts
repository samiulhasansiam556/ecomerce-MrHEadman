import { z } from 'zod';

import { ACTIVE_STATUSES } from '../constants/enums';

const productTypeKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
    'Key must be lowercase kebab-case',
  );

const attributeSchema = z.strictObject({
  attributeId: z.string().regex(
    /^[a-fA-F0-9]{24}$/,
    'Invalid Attribute ID',
  ),
  required: z.boolean(),
  order: z.number().int().min(0),
  hidden: z.boolean().optional(),
});

const optionSetSchema = z.strictObject({
  optionSetId: z.string().regex(
    /^[a-fA-F0-9]{24}$/,
    'Invalid Option Set ID',
  ),
  order: z.number().int().min(0),
  hidden: z.boolean().optional(),
});

const productTypeFields = {
  name: z.string().trim().min(1).max(100),
  key: productTypeKeySchema,
  attributes: z.array(attributeSchema).max(100),
  optionSetIds: z.array(optionSetSchema).max(50),
  sizeChartEnabled: z.boolean(),
  status: z.enum(ACTIVE_STATUSES).default('active'),
};

export const createProductTypeSchema =
  z.strictObject(productTypeFields);

export const updateProductTypeSchema =
  z.strictObject({
    name: productTypeFields.name.optional(),
    attributes: productTypeFields.attributes.optional(),
    optionSetIds: productTypeFields.optionSetIds.optional(),
    sizeChartEnabled: productTypeFields.sizeChartEnabled.optional(),
    status: z.enum(ACTIVE_STATUSES).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one field is required',
    },
  );

export const productTypeIdSchema = z.strictObject({
  id: z.string().regex(
    /^[a-fA-F0-9]{24}$/,
    'Invalid MongoDB ID',
  ),
});

export const productTypeListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ACTIVE_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
});

export type CreateProductTypeInput =
  z.infer<typeof createProductTypeSchema>;

export type UpdateProductTypeInput =
  z.infer<typeof updateProductTypeSchema>;

export type ProductTypeListQuery =
  z.infer<typeof productTypeListQuerySchema>;