import { z } from 'zod';

const bdPhoneSchema = z
  .string()
  .transform((value) => {
    const phone = value.trim().replace(/[\s-]/g, '');

    if (phone.startsWith('+880')) return `0${phone.slice(4)}`;
    if (phone.startsWith('880')) return `0${phone.slice(3)}`;

    return phone;
  })
  .pipe(z.string().regex(/^01[3-9]\d{8}$/, 'Invalid Bangladesh phone number'));

export const updateProfileSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(200).optional(),
    phone: bdPhoneSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one profile field is required',
  });

export const changePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1).max(128),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;