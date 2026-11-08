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