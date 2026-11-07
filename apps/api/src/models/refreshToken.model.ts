
import { model, Schema, Types } from 'mongoose';

export interface RefreshToken {
  userId: Types.ObjectId;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedBy?: Types.ObjectId;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<RefreshToken>(
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
    familyId: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: Date,
    replacedBy: {
      type: Schema.Types.ObjectId,
      ref: 'RefreshToken',
    },
    userAgent: String,
    ip: String,
  },
  {
    timestamps: true,
    collection: 'refreshTokens',
  },
);

refreshTokenSchema.index(
  { tokenHash: 1 },
  { unique: true, name: 'uniq_refresh_token_hash' },
);

refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ familyId: 1 });

refreshTokenSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 604800,
    name: 'ttl_refresh_tokens',
  },
);

const RefreshTokenModel = model<RefreshToken>(
  'RefreshToken',
  refreshTokenSchema,
);

export default RefreshTokenModel;
