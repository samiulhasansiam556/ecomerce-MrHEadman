
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

const collectionFields = {
  name: z.string().trim().min(1).max(200),
  slug: slugSchema,
  type: z.literal('manual').default('manual'),
  banner: mediaSchema.optional(),
  description: z.string().trim().max(20000).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  status: z.enum(ACTIVE_STATUSES).default('active'),
};

export const createCollectionSchema =
  z.strictObject(collectionFields);

export const updateCollectionSchema =
  z.strictObject({
    name: collectionFields.name.optional(),
    banner: mediaSchema.nullable().optional(),
    description: z.string().trim().max(20000).nullable().optional(),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
    status: z.enum(ACTIVE_STATUSES).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one field is required',
    },
  );

export const collectionIdSchema = z.strictObject({
  id: z.string().regex(
    /^[a-fA-F0-9]{24}$/,
    'Invalid MongoDB ID',
  ),
});

export const collectionListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ACTIVE_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
});

export type CreateCollectionInput =
  z.infer<typeof createCollectionSchema>;

export type UpdateCollectionInput =
  z.infer<typeof updateCollectionSchema>;

export type CollectionListQuery =
  z.infer<typeof collectionListQuerySchema>;
