
import { z } from 'zod';

const objectIdSchema = z.string().regex(
  /^[a-fA-F0-9]{24}$/,
  'Invalid MongoDB ID',
);

const mediaSchema = z.strictObject({
  publicId: z.string().trim().min(1),
  url: z.string().trim().url(),
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
  alt: z.string().trim().max(200).optional(),
});

const optionValueSchema = z.strictObject({
  optionKey: z.string().trim().min(1),
  value: z.string().trim().min(1),
});

export const createVariantSchema = z.strictObject({
  sku: z.string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/),
  barcode: z.string().trim().optional(),
  optionValues: z.array(optionValueSchema).default([]),
  price: z.number().int().min(0).optional(),
  salePrice: z.number().int().min(0).optional(),
  image: mediaSchema.optional(),
  stock: z.strictObject({
    onHand: z.number().int().min(0),
  }),
  lowStockThreshold: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});

export const updateVariantSchema = z.strictObject({
  barcode: z.string().trim().nullable().optional(),
  price: z.number().int().min(0).nullable().optional(),
  salePrice: z.number().int().min(0).nullable().optional(),
  image: mediaSchema.nullable().optional(),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' },
);

export const variantIdSchema = z.strictObject({
  id: objectIdSchema,
});

export const productVariantParamsSchema = z.strictObject({
  productId: objectIdSchema,
});

export type CreateVariantInput = z.infer<
  typeof createVariantSchema
>;

export type UpdateVariantInput = z.infer<
  typeof updateVariantSchema
>;
