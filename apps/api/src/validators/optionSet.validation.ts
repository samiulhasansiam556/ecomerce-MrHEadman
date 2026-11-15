import { z } from 'zod';

import {
  ACTIVE_STATUSES,
  OPTION_SET_TYPES,
} from '../constants/enums';

const optionSetKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/,
    'Key must be lowercase snake_case',
  );

const optionValueSchema = z.strictObject({
  value: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(100),
  colorHex: z
    .string()
    .trim()
    .regex(
      /^#[0-9A-Fa-f]{6}$/,
      'Invalid color hex',
    )
    .optional(),
  order: z.number().int().min(0),
  hidden: z.boolean().optional(),
});

const optionSetFields = {
  name: z.string().trim().min(1).max(100),
  key: optionSetKeySchema,
  type: z.enum(OPTION_SET_TYPES),
  values: z.array(optionValueSchema).min(1).max(200),
  status: z.enum(ACTIVE_STATUSES).default('active'),
};

function validateColorValues(
  data: {
    type: (typeof OPTION_SET_TYPES)[number];
    values: Array<{ colorHex?: string }>;
  },
  ctx: z.RefinementCtx,
) {
  if (data.type === 'color') {
    data.values.forEach((item, index) => {
      if (!item.colorHex) {
        ctx.addIssue({
          code: 'custom',
          path: ['values', index, 'colorHex'],
          message: 'colorHex is required for color option sets',
        });
      }
    });
  }
}

export const createOptionSetSchema = z
  .strictObject(optionSetFields)
  .superRefine(validateColorValues);

export const updateOptionSetSchema = z
  .strictObject({
    name: optionSetFields.name.optional(),
    type: optionSetFields.type.optional(),
    values: optionSetFields.values.optional(),
    status: z.enum(ACTIVE_STATUSES).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one field is required',
    },
  );

export const optionSetIdSchema = z.strictObject({
  id: z.string().regex(
    /^[a-fA-F0-9]{24}$/,
    'Invalid MongoDB ID',
  ),
});

export const optionSetListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ACTIVE_STATUSES).optional(),
  type: z.enum(OPTION_SET_TYPES).optional(),
  search: z.string().trim().max(100).optional(),
});

export type CreateOptionSetInput =
  z.infer<typeof createOptionSetSchema>;

export type UpdateOptionSetInput =
  z.infer<typeof updateOptionSetSchema>;

export type OptionSetListQuery =
  z.infer<typeof optionSetListQuerySchema>;