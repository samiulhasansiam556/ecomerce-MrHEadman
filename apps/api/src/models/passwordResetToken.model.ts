
import { model, Schema, Types } from 'mongoose';

export interface PasswordResetToken {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const passwordResetTokenSchema = new Schema<PasswordResetToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: Date,
  },
  {
    timestamps: true,
    collection: 'passwordResetTokens',
  },
);

passwordResetTokenSchema.index(
  { tokenHash: 1 },
  { unique: true, name: 'uniq_password_reset_token_hash' },
);

passwordResetTokenSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 1800,
    name: 'ttl_password_reset_tokens',
  },
);

const PasswordResetTokenModel = model<PasswordResetToken>(
  'PasswordResetToken',
  passwordResetTokenSchema,
);

export default PasswordResetTokenModel;
