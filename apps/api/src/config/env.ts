
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const portSchema = z.coerce
  .number()
  .int('Port must be an integer')
  .min(1, 'Port must be at least 1')
  .max(65535, 'Port must not exceed 65535');

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: portSchema.default(5000),

  CLIENT_URL: z.string().url(),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'must be at least 32 chars'),

  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'must be at least 32 chars'),

  // Optional services
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: portSchema.default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  EMAIL_PAYLOAD_ENCRYPTION_KEY: z
  .string()
  .regex(
    /^[a-fA-F0-9]{64}$/,
    'Must be a 32-byte hex encryption key',
  ),
  
  ADMIN_NAME: z.string().trim().min(1).optional(),
  ADMIN_EMAIL: z.string().trim().email().optional(),
  ADMIN_PHONE: z.string().trim().optional(),
  ADMIN_PASSWORD: z.string().min(8).max(128).optional(),

});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');

  for (const issue of parsed.error.issues) {
    console.error(
      ` - ${issue.path.join('.')}: ${issue.message}`,
    );
  }

  process.exit(1);
}

export const env = parsed.data;