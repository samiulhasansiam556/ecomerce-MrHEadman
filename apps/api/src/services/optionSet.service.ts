import mongoose from 'mongoose';

import OptionSetModel from '../models/optionSet.model';
import {AppError} from '../utils/AppError';

import type {
  CreateOptionSetInput,
  UpdateOptionSetInput,
  OptionSetListQuery,
} from '../validators/optionSet.validation';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function handleDuplicateKey(error: unknown): never {
  if (
    error instanceof mongoose.mongo.MongoServerError &&
    error.code === 11000
  ) {
    throw new AppError(
      409,
      'KEY_TAKEN',
      'An option set with this key already exists',
    );
  }

  throw error;
}

function validateMergedValues(
  type: string,
  values: Array<{ colorHex?: string }>,
) {
  if (
    type === 'color' &&
    values.some((item) => !item.colorHex)
  ) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Every value in a color option set must have a colorHex',
    );
  }
}

export async function createOptionSet(
  input: CreateOptionSetInput,
) {
  try {
    return await OptionSetModel.create(input);
  } catch (error) {
    handleDuplicateKey(error);
  }
}

export async function listOptionSets(
  query: OptionSetListQuery,
) {
  const {
    page,
    limit,
    status,
    type,
    search,
  } = query;

  const filter: Record<string, unknown> = {};

  if (status) filter.status = status;
  if (type) filter.type = type;

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');

    filter.$or = [
      { name: regex },
      { key: regex },
    ];
  }

  const skip = (page - 1) * limit;

  const [optionSets, total] = await Promise.all([
    OptionSetModel.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    OptionSetModel.countDocuments(filter),
  ]);

  return {
    optionSets,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getOptionSetById(id: string) {
  const optionSet = await OptionSetModel
    .findById(id)
    .lean();

  if (!optionSet) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Option set not found',
    );
  }

  return optionSet;
}

export async function updateOptionSet(
  id: string,
  input: UpdateOptionSetInput,
) {
  const optionSet = await OptionSetModel.findById(id);

  if (!optionSet) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Option set not found',
    );
  }

  const nextType = input.type ?? optionSet.type;
  const nextValues = input.values ?? optionSet.values;

  validateMergedValues(nextType, nextValues);

  Object.assign(optionSet, input);

  try {
    await optionSet.save();
    return optionSet;
  } catch (error) {
    handleDuplicateKey(error);
  }
}

export async function archiveOptionSet(id: string) {
  const optionSet = await OptionSetModel.findById(id);

  if (!optionSet) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Option set not found',
    );
  }

  optionSet.status = 'archived';
  await optionSet.save();

  return optionSet;
}

export async function restoreOptionSet(id: string) {
  const optionSet = await OptionSetModel.findById(id);

  if (!optionSet) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Option set not found',
    );
  }

  optionSet.status = 'active';
  await optionSet.save();

  return optionSet;
}