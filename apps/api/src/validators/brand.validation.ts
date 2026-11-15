
import { z } from 'zod';

import { ACTIVE_STATUSES } from '../constants/enums';

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug must be lowercase kebab-case',
  );

const mediaSchema = z.strictObject({
  publicId: z.string().trim().min(1),
  url: z.string().trim().url(),
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
  alt: z.string().trim().max(200).optional(),
});

const brandFields = {
  name: z.string().trim().min(1).max(200),
  slug: slugSchema,
  logo: mediaSchema.optional(),
  description: z.string().trim().max(10000).optional(),
  status: z.enum(ACTIVE_STATUSES).default('active'),
};

export const createBrandSchema =
  z.strictObject(brandFields);

export const updateBrandSchema =
  z.strictObject({
    name: brandFields.name.optional(),
    slug: slugSchema.optional(),
    logo: mediaSchema.nullable().optional(),
    description: z.string().trim().max(10000).nullable().optional(),
    status: z.enum(ACTIVE_STATUSES).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one field is required',
    },
  );

export const brandIdSchema = z.strictObject({
  id: z.string().regex(
    /^[a-fA-F0-9]{24}$/,
    'Invalid MongoDB ID',
  ),
});

export const brandListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ACTIVE_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
});

export type CreateBrandInput =
  z.infer<typeof createBrandSchema>;

export type UpdateBrandInput =
  z.infer<typeof updateBrandSchema>;

export type BrandListQuery =
  z.infer<typeof brandListQuerySchema>;
