import argon2 from 'argon2';
import {
  createHash,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { env } from '../config/env';
import UserModel from '../models/user.model';
import RefreshTokenModel from '../models/refreshToken.model';
import { AppError } from '../utils/AppError';
import type { SignupInput,LoginInput } from '../validators/auth.validation';
import type { ChangePasswordInput } from '../validators/account.validation';
import PasswordResetTokenModel from '../models/passwordResetToken.model';
import { queuePasswordResetEmail } from './emailQueue.service';
import { logger } from '../utils/logger';

import type {
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../validators/auth.validation';

const ACCESS_TOKEN_TTL = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256')
    .update(token)
    .digest('hex');
}

export async function signupUser(input: SignupInput) {
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
  });

  const refreshToken = randomBytes(32).toString('base64url');
  const familyId = randomUUID();
  const now = new Date();

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const users = await UserModel.create(
        [
          {
            name: input.name,
            email: input.email,
            phone: input.phone,
            passwordHash,
            role: 'customer',
          },
        ],
        { session },
      );

      await RefreshTokenModel.create(
        [
          {
            userId: users[0]._id,
            tokenHash: hashToken(refreshToken),
            familyId,
            expiresAt: new Date(
              now.getTime() + REFRESH_TOKEN_TTL,
            ),
          },
        ],
        { session },
      );
    });
  } catch (error) {
    const mongoError = error as { code?: number };

    if (mongoError.code === 11000) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email already exists',
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }

  const createdUser = await UserModel.findOne({
    email: input.email,
  }).select(
    'name email phone role status profileImage tokenVersion createdAt',
  );

  if (!createdUser) {
    throw new Error('User registration failed');
  }

  const accessToken = jwt.sign(
    {
      tokenVersion: createdUser.tokenVersion,
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: createdUser._id.toString(),
      algorithm: 'HS256',
      expiresIn: '15m',
    },
  );

  return {
    accessToken,
    refreshToken,

    user: {
      id: createdUser._id.toString(),
      name: createdUser.name,
      email: createdUser.email,
      phone: createdUser.phone,
      role: createdUser.role,
      ...(createdUser.profileImage
        ? { profileImage: createdUser.profileImage }
        : {}),
      createdAt: createdUser.createdAt,
    },

    accessTokenMaxAge: ACCESS_TOKEN_TTL,
    refreshTokenMaxAge: REFRESH_TOKEN_TTL,
  };
}



export async function loginUser(
  input: LoginInput,
  metadata: {
    userAgent?: string;
    ip?: string;
  },
) {
  const user = await UserModel.findOne({
    email: input.email,
  }).select(
    '+passwordHash name email phone role status profileImage tokenVersion createdAt',
  );

  if (!user) {
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'Invalid email or password',
    );
  }

  const passwordValid = await argon2.verify(
    user.passwordHash,
    input.password,
  );

  if (!passwordValid) {
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'Invalid email or password',
    );
  }

  if (user.status !== 'active') {
    throw new AppError(
      403,
      'ACCOUNT_DISABLED',
      'This account is disabled',
    );
  }

  const refreshToken = randomBytes(32).toString('base64url');
  const familyId = randomUUID();
  const now = new Date();

  await RefreshTokenModel.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    familyId,
    expiresAt: new Date(
      now.getTime() + REFRESH_TOKEN_TTL,
    ),
    userAgent: metadata.userAgent,
    ip: metadata.ip,
  });

  const accessToken = jwt.sign(
    {
      tokenVersion: user.tokenVersion,
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: user._id.toString(),
      algorithm: 'HS256',
      expiresIn: '15m',
    },
  );

  return {
    accessToken,
    refreshToken,

    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      ...(user.profileImage
        ? { profileImage: user.profileImage }
        : {}),
      createdAt: user.createdAt,
    },

    accessTokenMaxAge: ACCESS_TOKEN_TTL,
    refreshTokenMaxAge: REFRESH_TOKEN_TTL,
  };
}



export async function logoutSession(
  userId: string,
  refreshToken?: string,
): Promise<void> {
  if (!refreshToken) return;

  await RefreshTokenModel.updateOne(
    {
      userId,
      tokenHash: hashToken(refreshToken),
      $or: [
        { revokedAt: { $exists: false } },
        { revokedAt: null },
      ],
    },
    {
      $set: { revokedAt: new Date() },
    },
  );
}

export async function refreshSession(
  rawRefreshToken: string | undefined,
  metadata: {
    userAgent?: string;
    ip?: string;
  },
) {
  if (
    typeof rawRefreshToken !== 'string' ||
    rawRefreshToken.length < 20 ||
    rawRefreshToken.length > 200
  ) {
    throw new AppError(
      401,
      'INVALID_REFRESH_TOKEN',
      'Invalid or expired refresh token',
    );
  }

  const tokenHash = hashToken(rawRefreshToken);
  const session = await mongoose.startSession();

  let reuseDetected = false;

  let result:
    | {
        accessToken: string;
        refreshToken: string;
        user: {
          id: string;
          name: string;
          email: string;
          phone: string;
          role: string;
          profileImage?: {
            publicId: string;
            url: string;
          };
          createdAt: Date;
        };
        accessTokenMaxAge: number;
        refreshTokenMaxAge: number;
      }
    | undefined;

  try {
    await session.withTransaction(async () => {
      // Transaction retry হলে flag reset হবে।
      reuseDetected = false;
      result = undefined;

      const oldToken = await RefreshTokenModel.findOne({
        tokenHash,
      }).session(session);

      if (!oldToken) {
        throw new AppError(
          401,
          'INVALID_REFRESH_TOKEN',
          'Invalid or expired refresh token',
        );
      }

      // Previously rotated/revoked token আবার ব্যবহার হয়েছে।
      if (oldToken.revokedAt) {
        await RefreshTokenModel.updateMany(
          {
            familyId: oldToken.familyId,
            $or: [
              { revokedAt: { $exists: false } },
              { revokedAt: null },
            ],
          },
          {
            $set: { revokedAt: new Date() },
          },
          { session },
        );

        reuseDetected = true;
        return;
      }

      const now = new Date();

      if (oldToken.expiresAt <= now) {
        throw new AppError(
          401,
          'INVALID_REFRESH_TOKEN',
          'Invalid or expired refresh token',
        );
      }

      const user = await UserModel.findById(
        oldToken.userId,
      )
        .select(
          'name email phone role status profileImage tokenVersion createdAt',
        )
        .session(session);

      if (!user) {
        throw new AppError(
          401,
          'INVALID_REFRESH_TOKEN',
          'Invalid or expired refresh token',
        );
      }

      if (user.status !== 'active') {
        throw new AppError(
          403,
          'ACCOUNT_DISABLED',
          'This account is disabled',
        );
      }

      const newRefreshToken = randomBytes(32).toString(
        'base64url',
      );

      // নতুন refresh token একই family-র অংশ।
      const [newTokenRecord] = await RefreshTokenModel.create(
        [
          {
            userId: user._id,
            tokenHash: hashToken(newRefreshToken),
            familyId: oldToken.familyId,
            expiresAt: new Date(
              now.getTime() + REFRESH_TOKEN_TTL,
            ),
            userAgent: metadata.userAgent,
            ip: metadata.ip,
          },
        ],
        { session },
      );

      // পুরোনো token revoke + নতুন token-এর reference।
      const rotation = await RefreshTokenModel.updateOne(
        {
          _id: oldToken._id,
          expiresAt: { $gt: now },
          $or: [
            { revokedAt: { $exists: false } },
            { revokedAt: null },
          ],
        },
        {
          $set: {
            revokedAt: now,
            replacedBy: newTokenRecord._id,
          },
        },
        { session },
      );

      if (rotation.modifiedCount !== 1) {
        throw new AppError(
          401,
          'INVALID_REFRESH_TOKEN',
          'Refresh token is no longer valid',
        );
      }

      const accessToken = jwt.sign(
        {
          tokenVersion: user.tokenVersion,
        },
        env.JWT_ACCESS_SECRET,
        {
          subject: user._id.toString(),
          algorithm: 'HS256',
          expiresIn: '15m',
        },
      );

      result = {
        accessToken,
        refreshToken: newRefreshToken,

        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          ...(user.profileImage
            ? { profileImage: user.profileImage }
            : {}),
          createdAt: user.createdAt,
        },

        accessTokenMaxAge: ACCESS_TOKEN_TTL,
        refreshTokenMaxAge: REFRESH_TOKEN_TTL,
      };
    });
  } catch (error) {
    /*
     * Concurrent refresh-এর ক্ষেত্রে অন্য request
     * একই token আগে rotate করে থাকতে পারে।
     * Transaction শেষ হওয়ার পর পুরোনো token পরীক্ষা করি।
     */
    const currentToken = await RefreshTokenModel.findOne({
      tokenHash,
    }).select('familyId revokedAt');

    if (currentToken?.revokedAt) {
      await RefreshTokenModel.updateMany(
        {
          familyId: currentToken.familyId,
          $or: [
            { revokedAt: { $exists: false } },
            { revokedAt: null },
          ],
        },
        {
          $set: { revokedAt: new Date() },
        },
      );

      throw new AppError(
        401,
        'REFRESH_TOKEN_REUSE_DETECTED',
        'Session is no longer valid. Please log in again.',
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }

  if (reuseDetected) {
    throw new AppError(
      401,
      'REFRESH_TOKEN_REUSE_DETECTED',
      'Session is no longer valid. Please log in again.',
    );
  }

  if (!result) {
    throw new AppError(
      401,
      'INVALID_REFRESH_TOKEN',
      'Invalid or expired refresh token',
    );
  }

  return result;
}



export async function changeUserPassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await UserModel.findById(userId).select('+passwordHash');

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  if (user.status !== 'active') {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'This account is disabled');
  }

  const currentPasswordValid = await argon2.verify(
    user.passwordHash,
    input.currentPassword,
  );

  if (!currentPasswordValid) {
    throw new AppError(
      400,
      'CURRENT_PASSWORD_INVALID',
      'Current password is incorrect',
    );
  }

  const newPasswordHash = await argon2.hash(input.newPassword, {
    type: argon2.argon2id,
  });

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Password একই সময়ে অন্য request-এ বদলে গেলে update হবে না।
      const updateResult = await UserModel.updateOne(
        {
          _id: user._id,
          passwordHash: user.passwordHash,
        },
        {
          $set: { passwordHash: newPasswordHash },
          $inc: { tokenVersion: 1 },
        },
        { session },
      );

      if (updateResult.modifiedCount !== 1) {
        throw new AppError(
          409,
          'PASSWORD_CHANGE_CONFLICT',
          'Password was changed by another request. Please try again.',
        );
      }

      // User-এর সব active refresh token revoke হবে।
      await RefreshTokenModel.updateMany(
        {
          userId: user._id,
          $or: [
            { revokedAt: { $exists: false } },
            { revokedAt: null },
          ],
        },
        {
          $set: { revokedAt: new Date() },
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}

const PASSWORD_RESET_TTL = 30 * 60 * 1000;

const PASSWORD_RESET_MESSAGE =
  'If an account with that email exists, a password reset link has been sent.';

export async function forgotUserPassword(
  input: ForgotPasswordInput,
): Promise<{ message: string }> {
  const user = await UserModel.findOne({
    email: input.email,
  }).select('_id email');

  // Email registered না থাকলেও একই response।
  if (!user) {
    return { message: PASSWORD_RESET_MESSAGE };
  }

  const rawToken = randomBytes(32).toString('hex');
  const now = new Date();

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // আগের unused reset tokens invalidate হবে।
      await PasswordResetTokenModel.updateMany(
        {
          userId: user._id,
          $or: [
            { usedAt: { $exists: false } },
            { usedAt: null },
          ],
        },
        {
          $set: { usedAt: now },
        },
        { session },
      );

      await PasswordResetTokenModel.create(
        [
          {
            userId: user._id,
            tokenHash: hashToken(rawToken),
            expiresAt: new Date(
              now.getTime() + PASSWORD_RESET_TTL,
            ),
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  const resetUrl = new URL(
    '/reset-password',
    env.CLIENT_URL,
  );

   resetUrl.searchParams.set('token', rawToken);

  try {
    await queuePasswordResetEmail({
      to: user.email,
      resetUrl: resetUrl.toString(),
      relatedId: user._id.toString(),
    });
  } catch (error) {
    logger.error(
      {
        userId: user._id.toString(),
        errorName:
          error instanceof Error
            ? error.name
            : 'UnknownError',
      },
      'Password reset email could not be queued',
    );
  }

  return { message: PASSWORD_RESET_MESSAGE }
}

export async function resetUserPassword(
  input: ResetPasswordInput,
): Promise<void> {
  const newPasswordHash = await argon2.hash(
    input.newPassword,
    {
      type: argon2.argon2id,
    },
  );

  const now = new Date();
  const tokenHash = hashToken(input.token);

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const resetToken =
        await PasswordResetTokenModel.findOne({
          tokenHash,
          expiresAt: { $gt: now },
          $or: [
            { usedAt: { $exists: false } },
            { usedAt: null },
          ],
        }).session(session);

      if (!resetToken) {
        throw new AppError(
          400,
          'INVALID_RESET_TOKEN',
          'Invalid or expired password reset token',
        );
      }

      // Token একবারই ব্যবহার করা যাবে।
      const consumed =
        await PasswordResetTokenModel.updateOne(
          {
            _id: resetToken._id,
            expiresAt: { $gt: now },
            $or: [
              { usedAt: { $exists: false } },
              { usedAt: null },
            ],
          },
          {
            $set: { usedAt: now },
          },
          { session },
        );

      if (consumed.modifiedCount !== 1) {
        throw new AppError(
          400,
          'INVALID_RESET_TOKEN',
          'Invalid or expired password reset token',
        );
      }

      // Password update + সব access JWT invalidate।
      const userUpdate = await UserModel.updateOne(
        { _id: resetToken.userId },
        {
          $set: {
            passwordHash: newPasswordHash,
          },
          $inc: {
            tokenVersion: 1,
          },
        },
        { session },
      );

      if (userUpdate.modifiedCount !== 1) {
        throw new AppError(
          400,
          'INVALID_RESET_TOKEN',
          'Invalid or expired password reset token',
        );
      }

      // সব active refresh sessions revoke।
      await RefreshTokenModel.updateMany(
        {
          userId: resetToken.userId,
          $or: [
            { revokedAt: { $exists: false } },
            { revokedAt: null },
          ],
        },
        {
          $set: { revokedAt: now },
        },
        { session },
      );

      // একই user-এর অন্য reset tokens-ও invalidate।
      await PasswordResetTokenModel.updateMany(
        {
          userId: resetToken.userId,
          _id: { $ne: resetToken._id },
          $or: [
            { usedAt: { $exists: false } },
            { usedAt: null },
          ],
        },
        {
          $set: { usedAt: now },
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}