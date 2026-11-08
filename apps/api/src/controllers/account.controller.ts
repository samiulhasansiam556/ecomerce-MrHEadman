import type { RequestHandler } from 'express';

import {
  getMyProfile,
  updateMyProfile,
} from '../services/account.service';

import { asyncHandler } from '../utils/asyncHandler';

import type { AuthenticatedUser } from '../middlewares/auth';
import type { UpdateProfileInput } from '../validators/account.validation';

export const getMyProfileController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    const user = await getMyProfile(authUser.id);

    return res.status(200).json({
      success: true,
      data: { user },
    });
  },
);

export const updateMyProfileController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;
    const input = res.locals.validated as UpdateProfileInput;

    const user = await updateMyProfile(authUser.id, input);

    return res.status(200).json({
      success: true,
      data: { user },
    });
  },
);