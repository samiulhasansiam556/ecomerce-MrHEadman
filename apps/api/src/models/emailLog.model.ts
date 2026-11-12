
import { model, Schema, Types } from 'mongoose';

export type EmailStatus =
  | 'queued'
  | 'processing'
  | 'sent'
  | 'failed';

export interface EmailLog {
  type: string;
  to: string;
  subject: string;
  status: EmailStatus;
  attempts: number;
  lastError?: string;
  nextRetryAt?: Date;
  processingAt?: Date;
  relatedType?: 'order' | 'user' | 'return';
  relatedId?: Types.ObjectId;
  payload?: Record<string, unknown>;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emailLogSchema = new Schema<EmailLog>(
  {
    type: { type: String, required: true, trim: true },
    to: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subject: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'sent', 'failed'],
      default: 'queued',
      required: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    lastError: { type: String, maxlength: 1000 },
    nextRetryAt: Date,
    processingAt: Date,
    relatedType: {
      type: String,
      enum: ['order', 'user', 'return'],
    },
    relatedId: Schema.Types.ObjectId,
    payload: { type: Schema.Types.Mixed },
    sentAt: Date,
  },
  {
    timestamps: true,
    collection: 'emailLogs',
    versionKey: false,
  },
);

emailLogSchema.index({ status: 1, nextRetryAt: 1 });
emailLogSchema.index({ status: 1, processingAt: 1 });
emailLogSchema.index({ relatedId: 1 });

emailLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90 },
);

const EmailLogModel = model<EmailLog>(
  'EmailLog',
  emailLogSchema,
);

export default EmailLogModel;
