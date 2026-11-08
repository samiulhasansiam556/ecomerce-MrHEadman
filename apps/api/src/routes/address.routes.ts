import { Router } from 'express';

import {
  getMyAddressesController,
  createAddressController,
  updateAddressController,
  deleteAddressController,
  setDefaultAddressController,
} from '../controllers/address.controller';

import { validate } from '../middlewares/validate';

import {
  createAddressSchema,
  updateAddressSchema,
  addressIdSchema,
} from '../validators/address.validation';

const router = Router();

router.get('/', getMyAddressesController);

router.post(
  '/',
  validate(createAddressSchema),
  createAddressController,
);

router.patch(
  '/:id',
  validate(addressIdSchema, 'params'),
  validate(updateAddressSchema),
  updateAddressController,
);

router.delete(
  '/:id',
  validate(addressIdSchema, 'params'),
  deleteAddressController,
);

router.post(
  '/:id/default',
  validate(addressIdSchema, 'params'),
  setDefaultAddressController,
);

export default router;