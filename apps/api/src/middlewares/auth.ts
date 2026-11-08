import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { isValidObjectId } from 'mongoose';

import { env } from '../config/env';
import UserModel from '../models/user.model';
import { AppError } from '../utils/AppError';

export const ACCESS_TOKEN_COOKIE = 'access_token';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  status: 'active' | 'disabled';
  tokenVersion: number;
}

/**
 * Require a valid access token.
 *
 * 1. Read access token from cookie.
 * 2. Verify JWT signature and expiry.
 * 3. Validate JWT payload.
 * 4. Load user from database.
 * 5. Check account status.
 * 6. Check token version.
 */
export const requireAuth: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE];

    if (typeof token !== 'string' || !token) {
      return next(
        new AppError(
          401,
          'UNAUTHENTICATED',
          'Authentication required',
        ),
      );
    }

    let payload: JwtPayload;

    try {
      const decoded = jwt.verify(
        token,
        env.JWT_ACCESS_SECRET,
        {
          algorithms: ['HS256'],
        },
      );

      if (typeof decoded === 'string') {
        throw new Error('Invalid token payload');
      }

      payload = decoded;
    } catch {
      return next(
        new AppError(
          401,
          'UNAUTHENTICATED',
          'Invalid or expired access token',
        ),
      );
    }

    const userId = payload.sub;
    const tokenVersion = payload.tokenVersion;

    if (
      typeof userId !== 'string' ||
      !isValidObjectId(userId) ||
      !Number.isInteger(tokenVersion) ||
      typeof tokenVersion !== 'number'
    ) {
      return next(
        new AppError(
          401,
          'UNAUTHENTICATED',
          'Invalid access token',
        ),
      );
    }

    const user = await UserModel.findById(userId).select(
      'name email phone role status tokenVersion',
    );

    if (!user) {
      return next(
        new AppError(
          401,
          'UNAUTHENTICATED',
          'Invalid authentication session',
        ),
      );
    }

    if (user.status !== 'active') {
      return next(
        new AppError(
          403,
          'ACCOUNT_DISABLED',
          'This account is disabled',
        ),
      );
    }

    if (user.tokenVersion !== tokenVersion) {
      return next(
        new AppError(
          401,
          'UNAUTHENTICATED',
          'Authentication session is no longer valid',
        ),
      );
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      tokenVersion: user.tokenVersion,
    };

    res.locals.authUser = authenticatedUser;

    return next();
  } catch (error) {
    return next(error);
  }
};