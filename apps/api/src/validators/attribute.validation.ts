
import { z } from 'zod';

import {
  ACTIVE_STATUSES,
  ATTRIBUTE_INPUT_TYPES,
} from '../constants/enums';

const attributeKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/,
    'Key must be lowercase snake_case',
  );

const optionSchema = z.strictObject({
  value: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(100),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color hex')
    .optional(),
  order: z.number().int().min(0),
  hidden: z.boolean().optional(),
});

const attributeFields = {
  name: z.string().trim().min(1).max(100),
  key: attributeKeySchema,
  inputType: z.enum(ATTRIBUTE_INPUT_TYPES),
  options: z.array(optionSchema).max(200).optional(),
  unit: z.string().trim().max(30).optional(),
  isFilterable: z.boolean(),
  status: z.enum(ACTIVE_STATUSES),
};

function validateOptionsForInputType(
  data: {
    inputType: (typeof ATTRIBUTE_INPUT_TYPES)[number];
    options?: unknown[];
  },
  ctx: z.RefinementCtx,
) {
  const needsOptions =
    data.inputType === 'select' ||
    data.inputType === 'multiselect' ||
    data.inputType === 'color';

  if (needsOptions && (!data.options || data.options.length === 0)) {
    ctx.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Options are required for this input type',
    });
  }

  if (!needsOptions && data.options !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Options are not allowed for this input type',
    });
  }
}

export const createAttributeSchema = z
  .strictObject(attributeFields)
  .superRefine(validateOptionsForInputType);

export const updateAttributeSchema = z
  .strictObject({
    name: attributeFields.name.optional(),
    inputType: attributeFields.inputType.optional(),
    options: attributeFields.options,
    unit: attributeFields.unit,
    isFilterable: attributeFields.isFilterable.optional(),
    status: attributeFields.status.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const attributeIdSchema = z.strictObject({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid MongoDB ID'),
});

export const attributeListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ACTIVE_STATUSES).optional(),
  inputType: z.enum(ATTRIBUTE_INPUT_TYPES).optional(),
  search: z.string().trim().max(100).optional(),
  isFilterable: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export type CreateAttributeInput =
  z.infer<typeof createAttributeSchema>;

export type UpdateAttributeInput =
  z.infer<typeof updateAttributeSchema>;

export type AttributeListQuery =
  z.infer<typeof attributeListQuerySchema>;
