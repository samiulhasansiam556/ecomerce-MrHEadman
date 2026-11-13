
import { z } from 'zod';

import {
  ACTIVE_STATUSES,
  AUDIENCES,
} from '../constants/enums';

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid MongoDB ID');

const mediaSchema = z.strictObject({
  publicId: z.string().trim().min(1).max(500),
  url: z.string().trim().url().max(2000),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  alt: z.string().trim().max(200).optional(),
});

const seoSchema = z.strictObject({
  title: z.string().trim().max(70).optional(),
  description: z.string().trim().max(200).optional(),
});

const categoryFields = {
  name: z.string().trim().min(1).max(100),

  // Optional: service will generate slug from name.
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),

  parentId: objectIdSchema.nullable().optional(),

  image: mediaSchema.optional(),
  banner: mediaSchema.optional(),

  description: z.string().trim().max(10000).optional(),

  seo: seoSchema.optional(),

  productTypeId: objectIdSchema.nullable().optional(),
  sizeChartId: objectIdSchema.nullable().optional(),

  audience: z.enum(AUDIENCES).optional(),

  status: z.enum(ACTIVE_STATUSES).optional(),

  order: z.number().int().min(0).optional(),
};

export const createCategorySchema = z.strictObject({
  ...categoryFields,
});

export const updateCategorySchema = z
  .strictObject({
    name: categoryFields.name.optional(),
    slug: categoryFields.slug,
    parentId: categoryFields.parentId,
    image: categoryFields.image,
    banner: categoryFields.banner,
    description: categoryFields.description,
    seo: categoryFields.seo,
    productTypeId: categoryFields.productTypeId,
    sizeChartId: categoryFields.sizeChartId,
    audience: categoryFields.audience,
    status: categoryFields.status,
    order: categoryFields.order,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const categoryIdSchema = z.strictObject({
  id: objectIdSchema,
});

export const categoryListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ACTIVE_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
  parentId: objectIdSchema.nullable().optional(),
  level: z.coerce.number().int().min(1).max(3).optional(),
});

export type CreateCategoryInput = z.infer<
  typeof createCategorySchema
>;

export type UpdateCategoryInput = z.infer<
  typeof updateCategorySchema
>;



export const moveCategorySchema = z.strictObject({
  parentId: objectIdSchema.nullable(),
  order: z.number().int().min(0),
});

export const reorderCategoriesSchema = z.strictObject({
  parentId: objectIdSchema.nullable(),
  orderedIds: z
    .array(objectIdSchema)
    .min(1)
    .max(500)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      'Duplicate category IDs are not allowed',
    ),
});

export type MoveCategoryInput = z.infer<
  typeof moveCategorySchema
>;

export type ReorderCategoriesInput = z.infer<
  typeof reorderCategoriesSchema
>;
