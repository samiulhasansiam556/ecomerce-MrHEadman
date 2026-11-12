
import EmailLogModel from '../models/emailLog.model';
import { sendEmailMessage } from '../config/mailer';
import { logger } from '../utils/logger';
import {
  decryptEmailPayload,
  encryptEmailPayload,
} from '../utils/emailPayloadCrypto';

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MINUTES = [1, 5, 15, 60];

const BATCH_SIZE = 50;
const PROCESSING_LEASE_MS = 10 * 60 * 1000;

interface QueueEmailInput {
  type: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  relatedType?: 'order' | 'user' | 'return';
  relatedId?: string;
}

export async function queueEmail(input: QueueEmailInput) {
  return EmailLogModel.create({
    type: input.type,
    to: input.to,
    subject: input.subject,
    status: 'queued',
    attempts: 0,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    payload: {
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    },
  });
}

/**
 * Password reset payload is encrypted before it is stored.
 * The raw reset token must never be stored in plaintext.
 */
export async function queuePasswordResetEmail(
  input: {
    to: string;
    resetUrl: string;
    relatedId: string;
  },
) {
  const payload = encryptEmailPayload({
    text: `Use this link to reset your password: ${input.resetUrl}`,
  });

  return EmailLogModel.create({
    type: 'password_reset',
    to: input.to,
    subject: 'Password reset request',
    status: 'queued',
    attempts: 0,
    relatedType: 'user',
    relatedId: input.relatedId,
    payload,
  });
}

/**
 * Recover jobs left in processing after a worker crash.
 */
async function recoverStaleEmails(): Promise<void> {
  const leaseExpiredAt = new Date(
    Date.now() - PROCESSING_LEASE_MS,
  );

  const now = new Date();

  await EmailLogModel.updateMany(
    {
      status: 'processing',
      processingAt: { $lte: leaseExpiredAt },
      attempts: { $lt: MAX_ATTEMPTS },
    },
    {
      $set: {
        status: 'failed',
        lastError: 'EMAIL_WORKER_LEASE_EXPIRED',
        nextRetryAt: now,
      },
      $unset: {
        processingAt: 1,
      },
    },
  );

  await EmailLogModel.updateMany(
    {
      status: 'processing',
      processingAt: { $lte: leaseExpiredAt },
      attempts: { $gte: MAX_ATTEMPTS },
    },
    {
      $set: {
        status: 'failed',
        lastError: 'EMAIL_WORKER_LEASE_EXPIRED_MAX_ATTEMPTS',
      },
      $unset: {
        processingAt: 1,
        nextRetryAt: 1,
      },
    },
  );
}

function getEmailPayload(
  payload: Record<string, unknown> | undefined,
): { text: string; html?: string } {
  if (!payload) {
    throw new Error('EMAIL_PAYLOAD_INVALID');
  }

  if (payload.kind === 'encrypted-v1') {
    return decryptEmailPayload(payload);
  }

  // Backward compatibility for existing non-encrypted queue items.
  if (typeof payload.text !== 'string' || !payload.text) {
    throw new Error('EMAIL_PAYLOAD_INVALID');
  }

  return {
    text: payload.text,
    ...(typeof payload.html === 'string'
      ? { html: payload.html }
      : {}),
  };
}

export async function processEmailQueue(): Promise<void> {
  await recoverStaleEmails();

  let processed = 0;

  while (processed < BATCH_SIZE) {
    const now = new Date();

    const email = await EmailLogModel.findOneAndUpdate(
      {
        attempts: { $lt: MAX_ATTEMPTS },
        $or: [
          { status: 'queued' },
          {
            status: 'failed',
            nextRetryAt: { $lte: now },
          },
        ],
      },
      {
        $set: {
          status: 'processing',
          processingAt: now,
        },
        $inc: { attempts: 1 },
        $unset: { nextRetryAt: 1 },
      },
      {
        sort: { createdAt: 1 },
        new: true,
      },
    );

    if (!email) break;

    processed += 1;

    try {
      const payload = getEmailPayload(
        email.payload as Record<string, unknown> | undefined,
      );

      await sendEmailMessage({
        to: email.to,
        subject: email.subject,
        text: payload.text,
        ...(payload.html ? { html: payload.html } : {}),
      });

      await EmailLogModel.updateOne(
        { _id: email._id, status: 'processing' },
        {
          $set: {
            status: 'sent',
            sentAt: new Date(),
          },
          $unset: {
            lastError: 1,
            nextRetryAt: 1,
            processingAt: 1,
          },
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 1000)
          : 'EMAIL_DELIVERY_FAILED';

      const exhausted = email.attempts >= MAX_ATTEMPTS;

      const delay =
        RETRY_DELAYS_MINUTES[email.attempts - 1];

      const nextRetryAt = exhausted
        ? undefined
        : new Date(Date.now() + delay * 60 * 1000);

      await EmailLogModel.updateOne(
        { _id: email._id, status: 'processing' },
        {
          $set: {
            status: 'failed',
            lastError: message,
            ...(nextRetryAt ? { nextRetryAt } : {}),
          },
          $unset: {
            processingAt: 1,
          },
        },
      );

      logger.error(
        {
          emailLogId: email._id.toString(),
          attempt: email.attempts,
          exhausted,
          error: message,
        },
        'Email delivery failed',
      );
    }
  }
}
