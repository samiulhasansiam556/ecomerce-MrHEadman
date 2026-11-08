import type { RequestHandler } from 'express';

import { signupUser } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import type { SignupInput } from '../validators/auth.validation';
import { loginUser } from '../services/auth.service';
import type { LoginInput } from '../validators/auth.validation';
const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1',
};

export const signupController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const input = res.locals.validated as SignupInput;
    const result = await signupUser(input);

    res.cookie(ACCESS_COOKIE, result.accessToken, {
      ...cookieOptions,
      maxAge: result.accessTokenMaxAge,
    });

    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...cookieOptions,
      maxAge: result.refreshTokenMaxAge,
    });

    return res.status(201).json({
      success: true,
      data: {
        user: result.user,
      },
    });

  },
);



export const loginController: RequestHandler = asyncHandler(
  async (req, res) => {
    const input = res.locals.validated as LoginInput;

    const result = await loginUser(input, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });

    res.cookie(ACCESS_COOKIE, result.accessToken, {
      ...cookieOptions,
      maxAge: result.accessTokenMaxAge,
    });

    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...cookieOptions,
      maxAge: result.refreshTokenMaxAge,
    });

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
      },
    });
  },
);