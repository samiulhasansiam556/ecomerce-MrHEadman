
import mongoose from 'mongoose';

import { AppError } from '../utils/AppError';
import AttributeModel from '../models/attribute.model';

import type {
  CreateAttributeInput,
  UpdateAttributeInput,
  AttributeListQuery,
} from '../validators/attribute.validation';

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
      'An attribute with this key already exists',
    );
  }

  throw error;
}

export async function createAttribute(
  input: CreateAttributeInput,
) {
  try {
    return await AttributeModel.create(input);
  } catch (error) {
    handleDuplicateKey(error);
  }
}

export async function listAttributes(
  query: AttributeListQuery,
) {
  const {
    page,
    limit,
    status,
    inputType,
    search,
    isFilterable,
  } = query;

  const filter: Record<string, unknown> = {};

  if (status) filter.status = status;
  if (inputType) filter.inputType = inputType;

  if (typeof isFilterable === 'boolean') {
    filter.isFilterable = isFilterable;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');

    filter.$or = [
      { name: regex },
      { key: regex },
    ];
  }

  const skip = (page - 1) * limit;

  const [attributes, total] = await Promise.all([
    AttributeModel.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    AttributeModel.countDocuments(filter),
  ]);

  return {
    attributes,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAttributeById(id: string) {
  const attribute = await AttributeModel.findById(id).lean();

  if (!attribute) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Attribute not found',
    );
  }

  return attribute;
}

export async function updateAttribute(
  id: string,
  input: UpdateAttributeInput,
) {
  const attribute = await AttributeModel.findById(id);

  if (!attribute) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Attribute not found',
    );
  }

  try {
    Object.assign(attribute, input);

    await attribute.save();

    return attribute;
  } catch (error) {
    handleDuplicateKey(error);
  }
}

export async function archiveAttribute(id: string) {
  const attribute = await AttributeModel.findById(id);

  if (!attribute) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Attribute not found',
    );
  }

  attribute.status = 'archived';
  await attribute.save();

  return attribute;
}

export async function restoreAttribute(id: string) {
  const attribute = await AttributeModel.findById(id);

  if (!attribute) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Attribute not found',
    );
  }

  attribute.status = 'active';
  await attribute.save();

  return attribute;
}
