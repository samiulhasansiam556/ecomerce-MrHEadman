import type { RequestHandler, Response } from "express";

import {
  signupUser,
  loginUser,
  logoutSession,
  refreshSession,
  changeUserPassword,
} from "../services/auth.service";
import type { ChangePasswordInput } from "../validators/account.validation";

import { asyncHandler } from "../utils/asyncHandler";

import type {
  SignupInput,
  LoginInput,
} from "../validators/auth.validation";

import type { AuthenticatedUser } from "../middlewares/auth";
import { env } from "../config/env";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

const baseCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

const accessCookieOptions = {
  ...baseCookieOptions,
  path: "/api/v1",
};

const refreshCookieOptions = {
  ...baseCookieOptions,
  path: "/api/v1/auth",
};

function setAuthCookies(
  res: Response,
  result: {
    accessToken: string;
    refreshToken: string;
    accessTokenMaxAge: number;
    refreshTokenMaxAge: number;
  },
) {
  // Remove the old refresh cookie scoped to /api/v1
  res.clearCookie(REFRESH_COOKIE, {
    ...baseCookieOptions,
    path: "/api/v1",
  });

  res.cookie(ACCESS_COOKIE, result.accessToken, {
    ...accessCookieOptions,
    maxAge: result.accessTokenMaxAge,
  });

  res.cookie(REFRESH_COOKIE, result.refreshToken, {
    ...refreshCookieOptions,
    maxAge: result.refreshTokenMaxAge,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, accessCookieOptions);

  // Current refresh cookie path
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);

  // Old refresh cookie path (migration cleanup)
  res.clearCookie(REFRESH_COOKIE, {
    ...baseCookieOptions,
    path: "/api/v1",
  });
}

export const signupController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const input = res.locals.validated as SignupInput;
    const result = await signupUser(input);

    setAuthCookies(res, result);

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
      userAgent: req.get("user-agent"),
      ip: req.ip,
    });

    setAuthCookies(res, result);

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
      },
    });
  },
);

export const logoutController: RequestHandler = asyncHandler(
  async (req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;
    const refreshToken = req.cookies?.[REFRESH_COOKIE];

    await logoutSession(
      authUser.id,
      typeof refreshToken === "string" ? refreshToken : undefined,
    );

    clearAuthCookies(res);

    return res.status(204).send();
  },
);

export const refreshController: RequestHandler = asyncHandler(
  async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];

    const result = await refreshSession(
      typeof refreshToken === "string" ? refreshToken : undefined,
      {
        userAgent: req.get("user-agent"),
        ip: req.ip,
      },
    );

    setAuthCookies(res, result);

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
      },
    });
  },
);


export const changePasswordController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;
    const input = res.locals.validated as ChangePasswordInput;

    await changeUserPassword(authUser.id, input);

    // Password change-এর পর বর্তমান browser-এর cookies-ও clear হবে।
    clearAuthCookies(res);

    return res.status(204).send();
  },
);