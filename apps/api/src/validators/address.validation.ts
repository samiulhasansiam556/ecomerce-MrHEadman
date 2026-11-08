import { z } from 'zod';

function normalizeBdPhone(value: string): string {
  const phone = value.trim().replace(/[\s-]/g, '');

  if (phone.startsWith('+880')) {
    return `0${phone.slice(4)}`;
  }

  if (phone.startsWith('880')) {
    return `0${phone.slice(3)}`;
  }

  return phone;
}

const phoneSchema = z
  .string()
  .transform(normalizeBdPhone)
  .pipe(
    z.string().regex(
      /^01[3-9]\d{8}$/,
      'Invalid Bangladesh phone number',
    ),
  );

const addressFields = {
  label: z.string().trim().min(1).max(50),
  recipientName: z.string().trim().min(1).max(200),
  phone: phoneSchema,
  division: z.string().trim().min(1).max(100),
  district: z.string().trim().min(1).max(100),
  area: z.string().trim().min(1).max(150),
  addressLine: z.string().trim().min(1).max(500),
  postalCode: z.string().trim().max(20).optional(),
  isDefault: z.boolean().optional(),
};

export const createAddressSchema = z.strictObject(addressFields);

export const updateAddressSchema = z
  .strictObject({
    label: addressFields.label.optional(),
    recipientName: addressFields.recipientName.optional(),
    phone: addressFields.phone.optional(),
    division: addressFields.division.optional(),
    district: addressFields.district.optional(),
    area: addressFields.area.optional(),
    addressLine: addressFields.addressLine.optional(),
    postalCode: addressFields.postalCode,
    isDefault: addressFields.isDefault,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const addressIdSchema = z.strictObject({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid address ID'),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;