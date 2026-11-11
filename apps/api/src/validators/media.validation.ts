import { z } from 'zod';

export const signUploadSchema = z.strictObject({
  purpose: z.literal('avatar'),
});

export type SignUploadInput = z.infer<typeof signUploadSchema>;