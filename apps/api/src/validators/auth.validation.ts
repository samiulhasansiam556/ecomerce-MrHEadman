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

export const signupSchema = z.strictObject({
  name: z.string().trim().min(1).max(200),

  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),

  phone: z
    .string()
    .transform(normalizeBdPhone)
    .pipe(
      z.string().regex(
        /^01[3-9]\d{8}$/,
        'Invalid Bangladesh phone number',
      ),
    ),

  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

export type SignupInput = z.infer<typeof signupSchema>;



export const loginSchema = z.strictObject({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),

  password: z.string().min(1).max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;


export const forgotPasswordSchema = z.strictObject({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
});

export type ForgotPasswordInput = z.infer<
  typeof forgotPasswordSchema
>;

export const resetPasswordSchema = z.strictObject({
  token: z.string().regex(/^[a-f0-9]{64}$/),

  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

export type ResetPasswordInput = z.infer<
  typeof resetPasswordSchema
>; 