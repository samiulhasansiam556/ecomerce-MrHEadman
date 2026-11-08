import type { Request, RequestHandler } from 'express';

import {
  getMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../services/address.service';

import { asyncHandler } from '../utils/asyncHandler';
import type { AuthenticatedUser } from '../middlewares/auth';

import type {
  CreateAddressInput,
  UpdateAddressInput,
} from '../validators/address.validation';

function getAddressId(req: Request): string {
  const id = req.params.id;

  if (typeof id !== 'string') {
    throw new Error('Invalid address ID');
  }

  return id;
}

export const getMyAddressesController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    const addresses = await getMyAddresses(authUser.id);

    return res.status(200).json({
      success: true,
      data: { addresses },
    });
  },
);

export const createAddressController: RequestHandler = asyncHandler(
  async (_req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;
    const input = res.locals.validated as CreateAddressInput;

    const address = await createAddress(authUser.id, input);

    return res.status(201).json({
      success: true,
      data: { address },
    });
  },
);

export const updateAddressController: RequestHandler = asyncHandler(
  async (req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;
    const input = res.locals.validated as UpdateAddressInput;

    const address = await updateAddress(
      authUser.id,
      getAddressId(req),
      input,
    );

    return res.status(200).json({
      success: true,
      data: { address },
    });
  },
);

export const deleteAddressController: RequestHandler = asyncHandler(
  async (req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    await deleteAddress(authUser.id, getAddressId(req));

    return res.status(204).send();
  },
);

export const setDefaultAddressController: RequestHandler = asyncHandler(
  async (req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    const address = await setDefaultAddress(
      authUser.id,
      getAddressId(req),
    );

    return res.status(200).json({
      success: true,
      data: { address },
    });
  },
);