
import { z } from 'zod';

const objectIdSchema = z.string().regex(
  /^[a-fA-F0-9]{24}$/,
  'Invalid MongoDB ID',
);

const mediaSchema = z.strictObject({
  publicId: z.string().trim().min(1),
  url: z.string().trim().url(),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  alt: z.string().trim().max(200).optional(),
});

const productImageSchema = z.strictObject({
  publicId: z.string().trim().min(1),
  url: z.string().trim().url(),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  alt: z.string().trim().max(200).optional(),
  order: z.number().int().min(0),
  isMain: z.boolean(),
  optionValue: z.strictObject({
    optionKey: z.string().trim().min(1),
    value: z.string().trim().min(1),
  }).optional(),
});

const attributeValueSchema = z.strictObject({
  key: z.string().trim().min(1),
  value: z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.array(z.string()),
  ]),
});

const variantOptionValueSchema = z.strictObject({
  optionKey: z.string().trim().min(1),
  value: z.string().trim().min(1),
});

const variantInputSchema = z.strictObject({
  sku: z.string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/),
  barcode: z.string().trim().optional(),
  optionValues: z.array(variantOptionValueSchema).default([]),
  price: z.number().int().min(0).optional(),
  salePrice: z.number().int().min(0).optional(),
  image: mediaSchema.optional(),
  stock: z.strictObject({
    onHand: z.number().int().min(0),
  }),
  lowStockThreshold: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});

const seoSchema = z.strictObject({
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
});

const productFields = {
  name: z.string().trim().min(1).max(200),
  slug: z.string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  productCode: z.string().trim().toUpperCase().max(100).optional(),
  description: z.string().trim().min(1),
  categoryId: objectIdSchema,
  brandId: objectIdSchema.optional(),
  productTypeId: objectIdSchema,
  collectionIds: z.array(objectIdSchema).default([]),
  attributeValues: z.array(attributeValueSchema).default([]),
  images: z.array(productImageSchema).max(10).default([]),
  regularPrice: z.number().int().positive(),
  salePrice: z.number().int().positive().optional(),
  saleStartsAt: z.coerce.date().optional(),
  saleEndsAt: z.coerce.date().optional(),
  optionKeys: z.array(z.string().trim().min(1)).default([]),
  sizeChartId: objectIdSchema.optional(),
  isFeatured: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(50)).default([]),
  seo: seoSchema.optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  variants: z.array(variantInputSchema).min(1),
};

export const createProductSchema = z.strictObject(
  productFields,
);

export const updateProductSchema = z.strictObject({
  name: productFields.name.optional(),
  slug: productFields.slug.optional(),
  productCode: productFields.productCode,
  description: productFields.description.optional(),
  categoryId: productFields.categoryId.optional(),
  brandId: productFields.brandId.nullable().optional(),
  productTypeId: productFields.productTypeId.optional(),
  collectionIds: productFields.collectionIds.optional(),
  attributeValues: productFields.attributeValues.optional(),
  images: productFields.images.optional(),
  regularPrice: productFields.regularPrice.optional(),
  salePrice: productFields.salePrice.nullable().optional(),
  saleStartsAt: z.coerce.date().nullable().optional(),
  saleEndsAt: z.coerce.date().nullable().optional(),
  optionKeys: productFields.optionKeys.optional(),
  sizeChartId: productFields.sizeChartId.nullable().optional(),
  isFeatured: productFields.isFeatured.optional(),
  tags: productFields.tags.optional(),
  seo: seoSchema.nullable().optional(),
  status: productFields.status.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' },
);

export const productIdSchema = z.strictObject({
  id: objectIdSchema,
});

export const productListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  categoryId: objectIdSchema.optional(),
  brandId: objectIdSchema.optional(),
  search: z.string().trim().max(100).optional(),
});

export type CreateProductInput = z.infer<
  typeof createProductSchema
>;

export type UpdateProductInput = z.infer<
  typeof updateProductSchema
>;

export type ProductListQuery = z.infer<
  typeof productListQuerySchema
>;

export type VariantInput = z.infer<
  typeof variantInputSchema
>;
