
import mongoose from 'mongoose';

import EmailLogModel, {
  type EmailStatus,
} from '../models/emailLog.model';
import { createAdminAuditEvent } from './adminAudit.service';
import { AppError } from '../utils/AppError';

interface ListEmailLogsInput {
  status?: EmailStatus;
  type?: string;
  page: number;
  limit: number;
}

export async function listAdminEmailLogs(
  input: ListEmailLogsInput,
) {
  const filter: {
    status?: EmailStatus;
    type?: string;
  } = {};

  if (input.status) filter.status = input.status;
  if (input.type) filter.type = input.type;

  const skip = (input.page - 1) * input.limit;

  const [items, total] = await Promise.all([
    EmailLogModel.find(filter)
      .select(
        '_id type to subject status attempts lastError nextRetryAt sentAt createdAt updatedAt relatedType relatedId',
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(input.limit)
      .lean(),

    EmailLogModel.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
}

export async function retryAdminEmail(
  emailLogId: string,
  adminId: string,
  metadata: {
    ip?: string;
    userAgent?: string;
  },
) {
  const session = await mongoose.startSession();

  let result: unknown;

  try {
    await session.withTransaction(async () => {
      const email = await EmailLogModel.findById(
        emailLogId,
      ).session(session);

      if (!email) {
        throw new AppError(
          404,
          'EMAIL_LOG_NOT_FOUND',
          'Email log not found',
        );
      }

      if (email.status !== 'failed') {
        throw new AppError(
          409,
          'EMAIL_NOT_RETRYABLE',
          'Only failed emails can be retried',
        );
      }

      const updated = await EmailLogModel.findOneAndUpdate(
        {
          _id: email._id,
          status: 'failed',
        },
        {
          $set: {
            status: 'queued',
            attempts: 0,
          },
          $unset: {
            lastError: 1,
            nextRetryAt: 1,
            processingAt: 1,
            sentAt: 1,
          },
        },
        {
          new: true,
          session,
        },
      );

      if (!updated) {
        throw new AppError(
          409,
          'EMAIL_NOT_RETRYABLE',
          'Email status changed; refresh and try again',
        );
      }

      await createAdminAuditEvent({
        actorId: adminId,
        action: 'email.retry',
        targetType: 'emailLog',
        targetId: email._id.toString(),
        before: {
          status: email.status,
          attempts: email.attempts,
        },
        after: {
          status: updated.status,
          attempts: updated.attempts,
        },
        ip: metadata.ip,
        userAgent: metadata.userAgent,
        session,
      });

      result = {
        id: updated._id.toString(),
        status: updated.status,
        attempts: updated.attempts,
      };
    });
  } finally {
    await session.endSession();
  }

  return result;
}
