
import mongoose from 'mongoose';

import CollectionModel from '../models/collection.model';
import {AppError} from '../utils/AppError';

import type {
  CreateCollectionInput,
  UpdateCollectionInput,
  CollectionListQuery,
} from '../validators/collection.validation';

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
      'SLUG_TAKEN',
      'A collection with this slug already exists',
    );
  }

  throw error;
}

function validateSchedule(
  startsAt?: Date | null,
  endsAt?: Date | null,
) {
  if (
    startsAt &&
    endsAt &&
    startsAt.getTime() > endsAt.getTime()
  ) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'endsAt must be greater than or equal to startsAt',
    );
  }
}

export async function createCollection(
  input: CreateCollectionInput,
) {
  validateSchedule(input.startsAt, input.endsAt);

  try {
    return await CollectionModel.create(input);
  } catch (error) {
    handleDuplicateKey(error);
  }
}

export async function listCollections(
  query: CollectionListQuery,
) {
  const {
    page,
    limit,
    status,
    search,
  } = query;

  const filter: Record<string, unknown> = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    const regex = new RegExp(
      escapeRegex(search),
      'i',
    );

    filter.$or = [
      { name: regex },
      { slug: regex },
    ];
  }

  const skip = (page - 1) * limit;

  const [collections, total] = await Promise.all([
    CollectionModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    CollectionModel.countDocuments(filter),
  ]);

  return {
    collections,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCollectionById(id: string) {
  const collection = await CollectionModel
    .findById(id)
    .lean();

  if (!collection) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Collection not found',
    );
  }

  return collection;
}

export async function updateCollection(
  id: string,
  input: UpdateCollectionInput,
) {
  const collection = await CollectionModel.findById(id);

  if (!collection) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Collection not found',
    );
  }

  const nextStartsAt =
    input.startsAt === undefined
      ? collection.startsAt
      : input.startsAt;

  const nextEndsAt =
    input.endsAt === undefined
      ? collection.endsAt
      : input.endsAt;

  validateSchedule(nextStartsAt, nextEndsAt);

  Object.assign(collection, input);

  await collection.save();

  return collection;
}

export async function archiveCollection(id: string) {
  const collection = await CollectionModel.findById(id);

  if (!collection) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Collection not found',
    );
  }

  collection.status = 'archived';
  await collection.save();

  return collection;
}

export async function restoreCollection(id: string) {
  const collection = await CollectionModel.findById(id);

  if (!collection) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Collection not found',
    );
  }

  collection.status = 'active';
  await collection.save();

  return collection;
}
