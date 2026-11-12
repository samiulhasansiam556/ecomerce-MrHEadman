
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';

import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import type { AuthenticatedUser } from '../middlewares/auth';
import {
  listAdminEmailLogs,
  retryAdminEmail,
} from '../services/adminEmailLog.service';

const querySchema = z.object({
  status: z
    .enum(['queued', 'processing', 'sent', 'failed'])
    .optional(),
  type: z.string().trim().min(1).max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idSchema = z.string().refine(
  (value) => Types.ObjectId.isValid(value),
  'Invalid email log ID',
);

export const getAdminEmailLogsController: RequestHandler =
  asyncHandler(async (req, res) => {
    const parsed = querySchema.safeParse({
      status: req.query.status,
      type: req.query.type,
      page: req.query.page ?? 1,
      limit: req.query.limit ?? 20,
    });

    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Invalid email log query',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }

    const result = await listAdminEmailLogs(parsed.data);

    return res.status(200).json({
      success: true,
      data: result,
    });
  });

export const retryAdminEmailController: RequestHandler =
  asyncHandler(async (req, res) => {
    const id = idSchema.safeParse(req.params.id);

    if (!id.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Invalid email log ID',
      );
    }

    const admin = res.locals.authUser as AuthenticatedUser;

    const result = await retryAdminEmail(
      id.data,
      admin.id,
      {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    );

    return res.status(200).json({
      success: true,
      data: {
        email: result,
      },
    });
  });
