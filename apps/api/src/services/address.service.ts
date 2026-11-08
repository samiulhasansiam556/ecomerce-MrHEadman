import mongoose, { type HydratedDocument } from 'mongoose';

import AddressModel, { type Address } from '../models/address.model';
import { AppError } from '../utils/AppError';

import type {
  CreateAddressInput,
  UpdateAddressInput,
} from '../validators/address.validation';

const MAX_ADDRESSES_PER_USER = 10;

type AddressDocument = HydratedDocument<Address>;

function toAddressResponse(address: {
  _id: mongoose.Types.ObjectId;
  label: string;
  recipientName: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  addressLine: string;
  postalCode?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: address._id.toString(),
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    division: address.division,
    district: address.district,
    area: address.area,
    addressLine: address.addressLine,
    ...(address.postalCode
      ? { postalCode: address.postalCode }
      : {}),
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}

export async function getMyAddresses(userId: string) {
  const addresses = await AddressModel.find({ userId })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();

  return addresses.map((address) => toAddressResponse(address));
}

export async function createAddress(
  userId: string,
  input: CreateAddressInput,
) {
  const session = await mongoose.startSession();

  let createdAddress: AddressDocument | null = null;

  try {
    await session.withTransaction(async () => {
      const count = await AddressModel.countDocuments({
        userId,
      }).session(session);

      if (count >= MAX_ADDRESSES_PER_USER) {
        throw new AppError(
          422,
          'ADDRESS_LIMIT_REACHED',
          'You can save up to 10 addresses',
        );
      }

      if (input.isDefault === true) {
        await AddressModel.updateMany(
          { userId, isDefault: true },
          { $set: { isDefault: false } },
          { session },
        );
      }

      const [address] = await AddressModel.create(
        [
          {
            ...input,
            userId,
            isDefault: input.isDefault ?? false,
          },
        ],
        { session },
      );

      createdAddress = address;
    });
  } finally {
    await session.endSession();
  }

  if (!createdAddress) {
    throw new Error('Address creation failed');
  }

  return toAddressResponse(createdAddress);
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: UpdateAddressInput,
) {
  const session = await mongoose.startSession();

  let updatedAddress: AddressDocument | null = null;

  try {
    await session.withTransaction(async () => {
      const existingAddress = await AddressModel.findOne({
        _id: addressId,
        userId,
      }).session(session);

      if (!existingAddress) {
        throw new AppError(
          404,
          'ADDRESS_NOT_FOUND',
          'Address not found',
        );
      }

      if (input.isDefault === true) {
        await AddressModel.updateMany(
          {
            userId,
            _id: { $ne: addressId },
            isDefault: true,
          },
          { $set: { isDefault: false } },
          { session },
        );
      }

      const result = await AddressModel.findOneAndUpdate(
        { _id: addressId, userId },
        { $set: input },
        {
          new: true,
          runValidators: true,
          session,
        },
      );

      updatedAddress = result as AddressDocument | null;
    });
  } finally {
    await session.endSession();
  }

  if (!updatedAddress) {
    throw new AppError(
      404,
      'ADDRESS_NOT_FOUND',
      'Address not found',
    );
  }

  return toAddressResponse(updatedAddress);
}

export async function deleteAddress(
  userId: string,
  addressId: string,
): Promise<void> {
  const deletedAddress = await AddressModel.findOneAndDelete({
    _id: addressId,
    userId,
  });

  if (!deletedAddress) {
    throw new AppError(
      404,
      'ADDRESS_NOT_FOUND',
      'Address not found',
    );
  }
}

export async function setDefaultAddress(
  userId: string,
  addressId: string,
) {
  const session = await mongoose.startSession();

  let selectedAddress: AddressDocument | null = null;

  try {
    await session.withTransaction(async () => {
      const address = await AddressModel.findOne({
        _id: addressId,
        userId,
      }).session(session);

      if (!address) {
        throw new AppError(
          404,
          'ADDRESS_NOT_FOUND',
          'Address not found',
        );
      }

      await AddressModel.updateMany(
        {
          userId,
          _id: { $ne: addressId },
          isDefault: true,
        },
        { $set: { isDefault: false } },
        { session },
      );

      const result = await AddressModel.findOneAndUpdate(
        { _id: addressId, userId },
        { $set: { isDefault: true } },
        {
          new: true,
          runValidators: true,
          session,
        },
      );

      selectedAddress = result as AddressDocument | null;
    });
  } finally {
    await session.endSession();
  }

  if (!selectedAddress) {
    throw new AppError(
      404,
      'ADDRESS_NOT_FOUND',
      'Address not found',
    );
  }

  return toAddressResponse(selectedAddress);
}